import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MDocument } from "@mastra/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 4000; // OpenAI limit is 4096, use 4000 to be safe

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chunkTextForSpeech(text: string): Promise<string[]> {
  // Create MDocument from text
  const doc = MDocument.fromText(text);

  // Use sentence strategy for natural speech patterns
  const chunks = await doc.chunk({
    strategy: "sentence",
    maxSize: MAX_CHARS,
    minSize: 50,
    overlap: 0,
    sentenceEnders: [".", "!", "?", "。", "！", "？"], // Support multiple languages
  });

  // Extract text from chunks
  return chunks.map((chunk) => chunk.text);
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use alloy voice by default (calm, clear, professional)
    // Other options: ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer
    const selectedVoice = voice || "alloy";

    // Check if text needs to be chunked
    if (text.length > MAX_CHARS) {
      const chunks = await chunkTextForSpeech(text);

      // Process chunks and combine audio
      const audioChunks: Buffer[] = [];

      for (const chunk of chunks) {
        const response = await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: selectedVoice,
          input: chunk,
          response_format: "mp3",
          speed: 0.9,
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        audioChunks.push(buffer);
      }

      // Combine all chunks into a single buffer
      const combined = Buffer.concat(audioChunks);

      return new NextResponse(combined, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": combined.length.toString(),
        },
      });
    }

    // For short text, stream directly using OpenAI's streaming
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice,
      input: text,
      response_format: "mp3",
      speed: 0.9,
    });

    // Convert response to web stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
