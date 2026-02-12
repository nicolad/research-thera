"use client";

import { useState } from "react";
import { Flex, Text, Card, Badge } from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import { SpeakerLoudIcon, StopIcon } from "@radix-ui/react-icons";
import {
  useGenerateOpenAiAudioMutation,
  OpenAittsVoice,
  OpenAittsModel,
  OpenAiAudioFormat,
} from "@/app/__generated__/hooks";

interface AudioPlayerProps {
  storyId: number;
  storyContent: string;
  existingAudioUrl?: string | null;
  audioGeneratedAt?: string | null;
  onAudioGenerated?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function AudioPlayer({
  storyId,
  storyContent,
  existingAudioUrl,
  audioGeneratedAt,
  onAudioGenerated,
}: AudioPlayerProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  const [generateAudio, { loading: generatingAudio }] =
    useGenerateOpenAiAudioMutation();

  const handleRegenerateAudio = () => {
    setForceRegenerate(true);
    handleTextToSpeech();
  };

  const handleTextToSpeech = async () => {
    if (isPlayingAudio && audioElement) {
      // Stop playback
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlayingAudio(false);
      setAudioElement(null);
      return;
    }

    try {
      setIsPlayingAudio(true);

      // Check if story already has audio and not forcing regeneration
      if (existingAudioUrl && !forceRegenerate) {
        console.log("Playing existing audio from R2:", existingAudioUrl);

        const audio = new Audio();
        audio.crossOrigin = "anonymous";

        audio.onloadstart = () => {
          console.log("Audio loading started");
        };

        audio.onloadedmetadata = () => {
          console.log("Audio metadata loaded, duration:", audio.duration);
          if (audio.duration && !isNaN(audio.duration)) {
            setAudioDuration(audio.duration);
          }
        };

        audio.oncanplay = () => {
          console.log("Audio can play");
        };

        audio.onended = () => {
          console.log("Audio playback ended");
          setIsPlayingAudio(false);
          setAudioElement(null);
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlayingAudio(false);
          setAudioElement(null);
        };

        setAudioElement(audio);
        audio.src = existingAudioUrl;

        try {
          await audio.play();
          console.log("Audio playback started successfully");
        } catch (playError) {
          console.error("Play error:", playError);
          setIsPlayingAudio(false);
          setAudioElement(null);
        }
        return;
      }

      // Generate new audio using GraphQL mutation
      const result = await generateAudio({
        variables: {
          input: {
            text: storyContent,
            storyId: storyId,
            voice: OpenAittsVoice.Alloy,
            model: OpenAittsModel.Gpt_4OMiniTts,
            speed: 0.9,
            responseFormat: OpenAiAudioFormat.Mp3,
            uploadToCloud: true, // Upload to Cloudflare R2
          },
        },
      });

      if (!result.data?.generateOpenAIAudio.success) {
        throw new Error(
          result.data?.generateOpenAIAudio.message ||
            "Failed to generate audio",
        );
      }

      // Notify parent component to refetch data
      if (onAudioGenerated) {
        onAudioGenerated();
      }

      // Capture audio duration from mutation result
      const duration = result.data.generateOpenAIAudio.duration;
      if (duration) {
        setAudioDuration(duration);
        console.log(`Audio duration captured: ${duration.toFixed(2)}s`);
      }

      // Reset force regenerate flag
      setForceRegenerate(false);

      // Check if we got a cloud URL
      const audioUrl = result.data.generateOpenAIAudio.audioUrl;
      const audioBuffer = result.data.generateOpenAIAudio.audioBuffer;

      if (audioUrl) {
        console.log("Playing audio from R2:", audioUrl);

        // Use cloud URL directly
        const audio = new Audio();

        // Add CORS mode for R2
        audio.crossOrigin = "anonymous";

        audio.onloadstart = () => {
          console.log("Audio loading started");
        };

        audio.onloadedmetadata = () => {
          console.log("Audio metadata loaded, duration:", audio.duration);
          if (audio.duration && !isNaN(audio.duration)) {
            setAudioDuration(audio.duration);
          }
        };

        audio.oncanplay = () => {
          console.log("Audio can play");
        };

        audio.onended = () => {
          console.log("Audio playback ended");
          setIsPlayingAudio(false);
          setAudioElement(null);
        };

        audio.onerror = (e) => {
          console.error("R2 audio playback error, trying base64 fallback:", e);

          // If R2 fails and we have audioBuffer, try base64 fallback
          if (audioBuffer) {
            console.log("Switching to base64 audio fallback");
            playBase64Audio(audioBuffer);
          } else {
            setIsPlayingAudio(false);
            setAudioElement(null);
          }
        };

        setAudioElement(audio);
        audio.src = audioUrl;

        try {
          await audio.play();
          console.log("Audio playback started successfully");
        } catch (playError) {
          console.error("Play error, trying base64 fallback:", playError);
          if (audioBuffer) {
            playBase64Audio(audioBuffer);
          } else {
            setIsPlayingAudio(false);
            setAudioElement(null);
          }
        }
        return;
      }

      // Fallback to base64 audio buffer (like CRM implementation)
      if (audioBuffer) {
        playBase64Audio(audioBuffer);
        return;
      }

      throw new Error("No audio data received");
    } catch (error) {
      console.error("TTS Error:", error);
      setIsPlayingAudio(false);
      setAudioElement(null);
    }
  };

  const playBase64Audio = async (audioBuffer: string) => {
    try {
      console.log("Playing audio from base64 buffer");

      // Convert base64 to blob (like CRM implementation)
      const binaryString = atob(audioBuffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mpeg" });

      // Create audio element
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioElement(null);
        URL.revokeObjectURL(blobUrl);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setAudioElement(null);
        URL.revokeObjectURL(blobUrl);
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsPlayingAudio(false);
      setAudioElement(null);
    }
  };

  // Show audio available card if there's already audio
  if (existingAudioUrl) {
    return (
      <Card
        style={{
          background: "var(--indigo-2)",
          borderColor: "var(--indigo-6)",
        }}
      >
        <Flex direction="column" gap="2" p="3">
          <Flex align="center" gap="2">
            <SpeakerLoudIcon color="indigo" />
            <Text size="2" weight="medium" color="indigo">
              Audio Available
            </Text>
            {audioGeneratedAt && (
              <Badge color="indigo" variant="soft" size="1">
                Generated {new Date(audioGeneratedAt).toLocaleDateString()}
              </Badge>
            )}
            {audioDuration && (
              <Badge color="indigo" variant="soft" size="1">
                {formatDuration(audioDuration)}
              </Badge>
            )}
          </Flex>
          <Flex gap="2">
            <GlassButton
              variant="primary"
              size="medium"
              onClick={handleTextToSpeech}
              disabled={generatingAudio}
              loading={generatingAudio}
            >
              {isPlayingAudio ? (
                <>
                  <StopIcon />
                  Stop Playback
                </>
              ) : (
                <>
                  <SpeakerLoudIcon />
                  Play Audio
                </>
              )}
            </GlassButton>
            {!isPlayingAudio && (
              <GlassButton
                variant="secondary"
                size="medium"
                onClick={handleRegenerateAudio}
                disabled={generatingAudio}
              >
                Regenerate
              </GlassButton>
            )}
          </Flex>
        </Flex>
      </Card>
    );
  }

  // Show generate button if no audio exists
  return (
    <Flex justify="start">
      <GlassButton
        variant="primary"
        size="large"
        onClick={handleTextToSpeech}
        disabled={!storyContent || generatingAudio}
        loading={generatingAudio}
      >
        <SpeakerLoudIcon />
        Generate Audio
      </GlassButton>
    </Flex>
  );
}
