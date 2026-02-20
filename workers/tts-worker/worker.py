"""
TTS Worker — Cloudflare Python Worker

Receives TTS generation requests from the Next.js app, runs the full
OpenAI TTS → R2 upload → D1 update pipeline synchronously, and returns
200 with the audioUrl on success or 4xx/5xx with an error message on failure.
TTS fetches are I/O-bound so they do not count against the CPU time limit.

Deploy:
    wrangler deploy --config workers/tts-worker/wrangler.toml

Secrets (set once):
    wrangler secret put OPENAI_API_KEY   --config workers/tts-worker/wrangler.toml
    wrangler secret put R2_PUBLIC_DOMAIN --config workers/tts-worker/wrangler.toml
    wrangler secret put WORKER_SECRET    --config workers/tts-worker/wrangler.toml
"""

import json
import random
import string
import time
from datetime import datetime, timezone

from pyodide.ffi import to_js
from workers import WorkerEntrypoint, Response, fetch

MAX_CHARS = 4000


# ---------------------------------------------------------------------------
# Text chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str) -> list:
    """Split text into chunks that fit within OpenAI's 4096-char limit."""
    if len(text) <= MAX_CHARS:
        return [text]

    chunks = []
    current = ""

    for para in text.split("\n\n"):
        if len(current) + len(para) + 2 <= MAX_CHARS:
            current = (current + "\n\n" + para).strip() if current else para
        else:
            if current:
                chunks.append(current)
            # Paragraph itself too long — split by sentence endings
            if len(para) > MAX_CHARS:
                current = ""
                for sentence in para.replace(". ", ".|").replace("! ", "!|").replace("? ", "?|").split("|"):
                    if len(current) + len(sentence) + 1 <= MAX_CHARS:
                        current = (current + " " + sentence).strip() if current else sentence
                    else:
                        if current:
                            chunks.append(current)
                        current = sentence
                # Flush remaining sentence fragment so it doesn't bleed into next paragraph
                if current:
                    chunks.append(current)
                current = ""
            else:
                current = para

    if current:
        chunks.append(current.strip())

    return chunks or [text]


# ---------------------------------------------------------------------------
# TTS + R2 + D1 pipeline
# ---------------------------------------------------------------------------

def log(level: str, event: str, **kwargs) -> None:
    """Emit a structured JSON log line visible in Workers Logs."""
    print(json.dumps({"level": level, "event": event, **kwargs}))


async def update_job(env, job_id: str, status: str, error: str | None = None) -> None:
    """Update the generation_jobs row for this TTS job."""
    if not job_id:
        return
    try:
        if error:
            stmt = env.DB.prepare(
                "UPDATE generation_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?"
            ).bind(status, json.dumps({"message": error}), datetime.now(timezone.utc).isoformat(), job_id)
        else:
            stmt = env.DB.prepare(
                "UPDATE generation_jobs SET status = ?, updated_at = ? WHERE id = ?"
            ).bind(status, datetime.now(timezone.utc).isoformat(), job_id)
        await stmt.run()
    except Exception as exc:
        log("warn", "tts.job_update_failed", job_id=job_id, error=str(exc))


async def process_tts(body: dict, env) -> dict:
    """
    Run the full TTS pipeline.
    Returns a dict with audioUrl, key, sizeBytes on success.
    Raises RuntimeError on failure.
    """
    text          = body.get("text", "")
    story_id      = body.get("storyId")
    job_id        = body.get("jobId")
    voice         = body.get("voice", "onyx")
    model         = body.get("model", "gpt-4o-mini-tts")
    fmt           = body.get("responseFormat", "mp3")
    user_email    = body.get("userEmail")
    speed         = float(body.get("speed", 0.9))
    instructions  = body.get("instructions")

    chunks = chunk_text(text)
    log("info", "tts.started", story_id=story_id, chunks=len(chunks),
        text_len=len(text), voice=voice, model=model)

    async def fetch_chunk(i: int, chunk: str) -> bytes:
        payload: dict = {
            "model":           model,
            "input":           chunk,
            "voice":           voice,
            "response_format": fmt,
        }
        # speed is only valid for tts-1 / tts-1-hd; gpt-4o-mini-tts uses instructions
        if model in ("tts-1", "tts-1-hd"):
            payload["speed"] = speed
        if instructions:
            payload["instructions"] = instructions

        tts_resp = await fetch(
            "https://api.openai.com/v1/audio/speech",
            method="POST",
            headers={
                "Authorization": f"Bearer {env.OPENAI_API_KEY}",
                "Content-Type":  "application/json",
            },
            body=json.dumps(payload),
        )

        if not tts_resp.ok:
            err = await tts_resp.text()
            log("error", "tts.openai_failed", story_id=story_id,
                chunk=i, status=tts_resp.status, error=err)
            raise RuntimeError(f"OpenAI TTS failed ({tts_resp.status}): {err}")

        data = await tts_resp.bytes()
        log("info", "tts.chunk_done", story_id=story_id, chunk=i, total=len(chunks))
        return data

    # Sequential fetch — asyncio.gather in CF Python Workers returns JS-proxy objects
    # that silently break bytes() conversion; sequential is safe and correct.
    buf = bytearray()
    for i, chunk in enumerate(chunks):
        buf.extend(await fetch_chunk(i, chunk))
    combined = bytes(buf)

    # Upload to R2
    rnd       = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    audio_key = f"graphql-tts/audio-{int(time.time() * 1000)}-{rnd}.{fmt}"

    # to_js() converts Python bytes → JS Uint8Array (ArrayBufferView) which R2 accepts
    # httpMetadata must also be a JS object, not a Python dict
    await env.TTS_BUCKET.put(
        audio_key,
        to_js(combined),
        httpMetadata=to_js({"contentType": f"audio/{fmt}"}),
    )

    # Strip trailing slash from domain to avoid double-slash in URL
    audio_url = f"{env.R2_PUBLIC_DOMAIN.rstrip('/')}/{audio_key}"
    log("info", "tts.r2_uploaded", story_id=story_id,
        key=audio_key, size_bytes=len(combined))

    # Update story row in D1
    if story_id and user_email:
        now  = datetime.now(timezone.utc).isoformat()
        stmt = env.DB.prepare(
            "UPDATE stories "
            "SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ? "
            "WHERE id = ? AND user_id = ?"
        ).bind(audio_key, audio_url, now, now, story_id, user_email)
        await stmt.run()
        log("info", "tts.d1_updated", story_id=story_id, audio_url=audio_url)
    else:
        log("warn", "tts.d1_skipped", story_id=story_id,
            reason="missing story_id or user_email")

    return {"audioUrl": audio_url, "key": audio_key, "sizeBytes": len(combined)}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        if request.method != "POST":
            return Response("Method Not Allowed", status=405)

        # Shared-secret auth — prevents arbitrary callers
        if request.headers.get("X-Worker-Secret") != self.env.WORKER_SECRET:
            return Response("Unauthorized", status=401)

        try:
            body = await request.json()
        except Exception:
            return Response(
                json.dumps({"error": "Invalid JSON"}),
                status=400,
                headers={"Content-Type": "application/json"},
            )

        if not body.get("text"):
            return Response(
                json.dumps({"error": "text is required"}),
                status=400,
                headers={"Content-Type": "application/json"},
            )

        story_id = body.get("storyId")
        job_id   = body.get("jobId")
        log("info", "tts.accepted", story_id=story_id, job_id=job_id,
            text_len=len(body.get("text", "")), voice=body.get("voice"))

        async def run():
            try:
                result = await process_tts(body, self.env)
                await update_job(self.env, job_id, "SUCCEEDED")
                log("info", "tts.completed", story_id=story_id, job_id=job_id,
                    audio_url=result["audioUrl"])
            except Exception as exc:
                error_msg = str(exc)
                await update_job(self.env, job_id, "FAILED", error=error_msg)
                log("error", "tts.failed", story_id=story_id, job_id=job_id, error=error_msg)

        # Return 202 immediately; worker keeps running via waitUntil
        self.ctx.waitUntil(run())

        return Response(
            json.dumps({"accepted": True, "jobId": job_id}),
            status=202,
            headers={"Content-Type": "application/json"},
        )
