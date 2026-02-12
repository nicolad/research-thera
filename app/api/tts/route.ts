import { NextRequest, NextResponse } from "next/server";
import { elevenlabs, THERAPEUTIC_VOICES } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 9500; // ElevenLabs limit is 10,000, use 9,500 to be safe

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If a single paragraph is too long, split by sentences
    if (paragraph.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
    } else if (currentChunk.length + paragraph.length + 2 > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
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
      const chunks = splitTextIntoChunks(text, MAX_CHARS);

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
