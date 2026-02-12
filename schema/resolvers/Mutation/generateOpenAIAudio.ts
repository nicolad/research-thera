import type { MutationResolvers } from "./../../types.generated";
import OpenAI from "openai";
import { uploadToR2, generateAudioKey } from "@/lib/r2-uploader";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateOpenAIAudio: NonNullable<
  MutationResolvers["generateOpenAIAudio"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  try {
    const { text, voice, model, speed, responseFormat, uploadToCloud } =
      args.input;

    if (!text) {
      throw new Error("Text is required");
    }

    // Map GraphQL enums to OpenAI API values
    const openAIVoice = voice?.toLowerCase() || "alloy";
    const openAIModel = model
      ? model === "GPT_4O_MINI_TTS"
        ? "gpt-4o-mini-tts"
        : model === "TTS_1_HD"
          ? "tts-1-hd"
          : "tts-1"
      : "gpt-4o-mini-tts";
    const format = responseFormat?.toLowerCase() || "mp3";

    // Generate audio using OpenAI TTS
    const response = await openai.audio.speech.create({
      model: openAIModel,
      voice: openAIVoice as any,
      input: text,
      response_format: format as any,
      speed: speed || 0.9,
    });

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2 if requested
    if (uploadToCloud) {
      const key = generateAudioKey("graphql-tts");
      const result = await uploadToR2({
        key,
        body: buffer,
        contentType: `audio/${format}`,
        metadata: {
          voice: openAIVoice,
          model: openAIModel,
          textLength: text.length.toString(),
          generatedBy: userEmail,
        },
      });

      return {
        success: true,
        message: "Audio generated and uploaded to R2",
        audioBuffer: null,
        audioUrl: result.publicUrl,
        key: result.key,
        sizeBytes: result.sizeBytes,
        duration: null,
      };
    }

    // Convert to base64 for GraphQL response
    const base64Audio = buffer.toString("base64");

    return {
      success: true,
      message: "Audio generated successfully",
      audioBuffer: base64Audio,
      audioUrl: null,
      key: null,
      sizeBytes: buffer.length,
      duration: null,
    };
  } catch (error) {
    console.error("OpenAI TTS Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to generate audio",
      audioBuffer: null,
      audioUrl: null,
      key: null,
      sizeBytes: null,
      duration: null,
    };
  }
};
