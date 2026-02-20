"use client";

import { useEffect, useRef, useState } from "react";
import { Flex, Text, Card, Badge, Button, Spinner } from "@radix-ui/themes";
import { SpeakerLoudIcon, StopIcon, DownloadIcon } from "@radix-ui/react-icons";
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

function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0)
    return "--:--";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const [generateAudio, { loading: generatingAudio }] =
    useGenerateOpenAiAudioMutation();

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const loadAudioSrc = (src: string) => {
    setAudioSrc(src);
  };

  const base64ToBlob = (base64: string): string => {
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    revokeObjectUrl();
    const blobUrl = URL.createObjectURL(
      new Blob([bytes], { type: "audio/mpeg" }),
    );
    objectUrlRef.current = blobUrl;
    return blobUrl;
  };

  const handleTextToSpeech = async (regenerate = false) => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (regenerate) {
      setAudioSrc("");
      setDuration(null);
      setCurrentTime(0);
    }

    if (!regenerate && audioSrc) {
      audioRef.current?.play();
      return;
    }

    if (!regenerate && existingAudioUrl) {
      loadAudioSrc(existingAudioUrl);
      audioRef.current?.play();
      return;
    }

    setTtsError(null);
    try {
      const result = await generateAudio({
        variables: {
          input: {
            text: storyContent,
            storyId,
            voice: OpenAittsVoice.Onyx,
            model: OpenAittsModel.Gpt_4OMiniTts,
            speed: 0.9,
            responseFormat: OpenAiAudioFormat.Mp3,
            uploadToCloud: true,
          },
        },
      });

      const audioUrl = result.data?.generateOpenAIAudio?.audioUrl;
      if (audioUrl) {
        loadAudioSrc(audioUrl);
        if (onAudioGenerated) onAudioGenerated();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Audio generation failed";
      setTtsError(msg);
      console.error("TTS Error:", error);
      stopPlayback();
    }
  };

  const handleDownload = () => {
    if (!audioSrc) return;
    const a = document.createElement("a");
    a.href = audioSrc;
    a.download = `story-${storyId}-audio.mp3`;
    a.click();
  };

  // Load existing audio when prop arrives
  useEffect(() => {
    if (existingAudioUrl && !audioSrc) {
      loadAudioSrc(existingAudioUrl);
    }
  }, [existingAudioUrl, audioSrc]);

  // Cleanup
  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, []);

  const hasAudio = Boolean(audioSrc || existingAudioUrl);

  const timeLabel = duration
    ? `${formatDuration(isPlaying ? currentTime : 0)} / ${formatDuration(duration)}`
    : isPlaying
      ? formatDuration(currentTime)
      : null;

  if (hasAudio) {
    return (
      <Card
        style={{
          background: "var(--indigo-2)",
          borderColor: "var(--indigo-6)",
        }}
      >
        <Flex direction="column" gap="2" p="3">
          <audio
            ref={audioRef}
            src={audioSrc}
            controls
            crossOrigin="anonymous"
            preload="metadata"
            style={{ width: "100%" }}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={stopPlayback}
            onError={(e) => {
              console.error("Audio error:", e);
              stopPlayback();
            }}
          />

          <Flex align="center" gap="2" style={{ flexWrap: "wrap" }}>
            <SpeakerLoudIcon color="indigo" />
            <Text size="2" weight="medium" color="indigo">
              Audio Available
            </Text>

            {audioGeneratedAt && (
              <Badge color="indigo" variant="soft" size="1">
                Generated {new Date(audioGeneratedAt).toLocaleDateString()}
              </Badge>
            )}

            {timeLabel && (
              <Badge color="indigo" variant="soft" size="1">
                {timeLabel}
              </Badge>
            )}
          </Flex>

          <Flex gap="2" style={{ flexWrap: "wrap" }}>
            <Button
              color="indigo"
              variant="solid"
              onClick={() => void handleTextToSpeech(false)}
              disabled={generatingAudio}
            >
              {generatingAudio ? (
                <Spinner />
              ) : isPlaying ? (
                <StopIcon />
              ) : (
                <SpeakerLoudIcon />
              )}
              {isPlaying ? "Stop" : "Play"}
            </Button>

            {!isPlaying && (
              <>
                <Button
                  color="indigo"
                  variant="soft"
                  onClick={() => void handleTextToSpeech(true)}
                  disabled={generatingAudio || !storyContent}
                >
                  {generatingAudio ? <Spinner /> : null}
                  Regenerate
                </Button>

                <Button
                  color="indigo"
                  variant="soft"
                  onClick={handleDownload}
                  disabled={!audioSrc}
                >
                  <DownloadIcon />
                  Download
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2" align="start">
      <Flex justify="start" align="center" gap="3">
        <Button
          color="indigo"
          variant="solid"
          onClick={() => void handleTextToSpeech(true)}
          disabled={!storyContent || generatingAudio}
        >
          {generatingAudio ? <Spinner /> : <SpeakerLoudIcon />}
          {generatingAudio ? "Generating…" : "Generate Audio"}
        </Button>
        {generatingAudio && (
          <Text size="2" color="gray">
            This may take a moment…
          </Text>
        )}
      </Flex>
      {ttsError && (
        <Text size="2" color="red">
          {ttsError}
        </Text>
      )}
    </Flex>
  );
}
