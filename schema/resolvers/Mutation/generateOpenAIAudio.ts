import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db/d1";

export const generateOpenAIAudio: NonNullable<
  MutationResolvers["generateOpenAIAudio"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const {
    text,
    storyId,
    voice,
    model,
    speed,
    responseFormat,
    instructions,
  } = args.input;

  if (!text) {
    throw new Error("Text is required");
  }

  const workerUrl = process.env.TTS_WORKER_URL;
  if (!workerUrl) {
    console.warn("[TTS Worker] TTS_WORKER_URL is not configured");
    return {
      success: false,
      message: "TTS_WORKER_URL is not configured",
      jobId: null,
      audioBuffer: null,
      audioUrl: null,
      key: null,
      sizeBytes: null,
      duration: null,
    };
  }

  // Deduplication: return existing job if one is already RUNNING for this story
  if (storyId) {
    const existing = await d1.execute({
      sql: `SELECT id FROM generation_jobs
            WHERE story_id = ? AND user_id = ? AND type = 'AUDIO' AND status = 'RUNNING'
            ORDER BY created_at DESC LIMIT 1`,
      args: [storyId, userEmail],
    });
    if (existing.rows.length > 0) {
      const existingJobId = existing.rows[0].id as string;
      console.log(`[TTS Worker] job ${existingJobId} already running for story ${storyId}`);
      return {
        success: true,
        message: "Audio generation already in progress",
        jobId: existingJobId,
        audioBuffer: null,
        audioUrl: null,
        key: null,
        sizeBytes: null,
        duration: null,
      };
    }
  }

  // Create a new RUNNING job for tracking + deduplication
  const jobId = crypto.randomUUID();
  if (storyId) {
    // goalId is required by the schema — fetch it from the story row
    const storyRow = await d1.execute({
      sql: `SELECT goal_id FROM stories WHERE id = ? AND user_id = ?`,
      args: [storyId, userEmail],
    });
    const goalId = storyRow.rows[0]?.goal_id as number | undefined;
    if (goalId) {
      await d1.execute({
        sql: `INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
              VALUES (?, ?, 'AUDIO', ?, ?, 'RUNNING', 0)`,
        args: [jobId, userEmail, goalId, storyId],
      });
    }
  }

  const openAIVoice = voice?.toLowerCase() ?? "onyx";
  const openAIModel =
    model === "GPT_4O_MINI_TTS"
      ? "gpt-4o-mini-tts"
      : model === "TTS_1_HD"
        ? "tts-1-hd"
        : "tts-1";
  const format = responseFormat?.toLowerCase() ?? "mp3";

  const payload = {
    text,
    storyId,
    jobId,
    voice: openAIVoice,
    model: openAIModel,
    responseFormat: format,
    speed: speed ?? 0.9,
    userEmail,
    ...(instructions ? { instructions } : {}),
  };

  // Fire-and-forget: dispatch to the CF worker, await only the 202 ACK (~200ms).
  // The worker uses ctx.waitUntil to process TTS async and updates the job in D1.
  try {
    const resp = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": process.env.WORKER_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.error(`[TTS Worker] rejected: ${resp.status}`, await resp.text());
    }
  } catch (err) {
    console.error("[TTS Worker] dispatch error:", err);
  }

  return {
    success: true,
    message: "Audio generation started",
    jobId,
    audioBuffer: null,
    audioUrl: null,
    key: null,
    sizeBytes: null,
    duration: null,
  };
};
