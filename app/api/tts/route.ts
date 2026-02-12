import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MDocument } from "@mastra/rag";
import { uploadToR2, generateAudioKey } from "@/lib/r2-uploader";

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
    const { text, voice, uploadToCloud } = await request.json();

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

      // Upload to R2 if requested
      if (uploadToCloud) {
        const key = generateAudioKey("tts");
        const result = await uploadToR2({
          key,
          body: combined,
          contentType: "audio/mpeg",
          metadata: {
            voice: selectedVoice,
            model: "gpt-4o-mini-tts",
            textLength: text.length.toString(),
            chunks: chunks.length.toString(),
          },
        });

        return NextResponse.json({
          success: true,
          audioUrl: result.publicUrl,
          key: result.key,
          sizeBytes: result.sizeBytes,
        });
      }

      // Return audio directly
      return new NextResponse(combined, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": combined.length.toString(),
        },
      });
    }

    // For short text, stream directly
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice,
      input: text,
      response_format: "mp3",
      speed: 0.9,
    });

    // Upload to R2 if requested
    if (uploadToCloud) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const key = generateAudioKey("tts");
      const result = await uploadToR2({
        key,
        body: buffer,
        contentType: "audio/mpeg",
        metadata: {
          voice: selectedVoice,
          model: "gpt-4o-mini-tts",
          textLength: text.length.toString(),
        },
      });

      return NextResponse.json({
        success: true,
        audioUrl: result.publicUrl,
        key: result.key,
        sizeBytes: result.sizeBytes,
      });
    }

    // Convert response to web stream for direct streaming
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
