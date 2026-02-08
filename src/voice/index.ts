/**
 * Voice module - centralized voice and text-to-speech functionality
 * Uses Mastra's ElevenLabs voice integration for agent-based TTS
 * and direct ElevenLabs API for custom audio generation
 */

export {
  elevenlabs,
  THERAPEUTIC_VOICES,
  getVoiceId,
  createElevenLabsVoice,
  createAudioFileFromText,
  createAudioStreamFromText,
  getSpeakers,
} from "./elevenlabs";
