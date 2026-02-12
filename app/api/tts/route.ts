import { NextRequest, NextResponse } from "next/server";
import { elevenlabs, THERAPEUTIC_VOICES } from "@/lib/elevenlabs";
import { MDocument } from "@mastra/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 9500; // ElevenLabs limit is 10,000, use 9,500 to be safe

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
    const { text, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use George voice by default (professional, calm, reassuring)
    const selectedVoiceId = voiceId || THERAPEUTIC_VOICES.george.id;

    // Check if text needs to be chunked
    if (text.length > MAX_CHARS) {
      const chunks = await chunkTextForSpeech(text);

      // Process chunks and combine audio
      const audioChunks: Uint8Array[] = [];

      for (const chunk of chunks) {
        const audioStream = await elevenlabs.textToSpeech.stream(
          selectedVoiceId,
          {
            modelId: "eleven_multilingual_v2",
            text: chunk,
            outputFormat: "mp3_44100_128",
            voiceSettings: {
              stability: 0.5,
              similarityBoost: 0.75,
              useSpeakerBoost: true,
              speed: 0.9,
            },
          },
        );

        const reader = audioStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) audioChunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Combine all chunks into a single buffer
      const totalLength = audioChunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0,
      );
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return new NextResponse(combined, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": combined.length.toString(),
        },
      });
    }

    // For short text, stream directly
    const audioStream = await elevenlabs.textToSpeech.stream(selectedVoiceId, {
      modelId: "eleven_multilingual_v2",
      text,
      outputFormat: "mp3_44100_128",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        useSpeakerBoost: true,
        speed: 0.9,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = audioStream.getReader();
        try {
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
        } finally {
          reader.releaseLock();
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
