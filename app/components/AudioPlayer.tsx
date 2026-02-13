"use client";

import { useEffect, useRef, useState } from "react";
import { Flex, Text, Card, Badge, Button, Spinner } from "@radix-ui/themes";
import { SpeakerLoudIcon, StopIcon, DownloadIcon } from "@radix-ui/react-icons";
import WaveSurfer from "wavesurfer.js";
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
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

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
    if (wavesurferRef.current) {
      syncingRef.current = true;
      wavesurferRef.current.seekTo(0);
      syncingRef.current = false;
    }
    setIsPlaying(false);
  };

  const loadAudioSrc = async (src: string) => {
    setAudioSrc(src);
    if (wavesurferRef.current) {
      try {
        await wavesurferRef.current.load(src);
      } catch (err) {
        console.warn("WaveSurfer load error:", err);
      }
    }
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
      if (wavesurferRef.current) wavesurferRef.current.empty();
    }

    if (!regenerate && audioSrc) {
      audioRef.current?.play();
      return;
    }

    if (!regenerate && existingAudioUrl) {
      await loadAudioSrc(existingAudioUrl);
      audioRef.current?.play();
      return;
    }

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

      const payload = result.data?.generateOpenAIAudio;
      if (!payload?.success) {
        throw new Error(payload?.message || "Failed to generate audio");
      }

      if (onAudioGenerated) onAudioGenerated();

      if (
        typeof payload.duration === "number" &&
        Number.isFinite(payload.duration)
      ) {
        setDuration(payload.duration);
      }

      const src =
        payload.audioUrl ||
        (payload.audioBuffer ? base64ToBlob(payload.audioBuffer) : null);
      if (!src) throw new Error("No audio data received");

      await loadAudioSrc(src);
      audioRef.current?.play();
    } catch (error) {
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

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#a5b4fc",
      progressColor: "#6366f1",
      cursorColor: "#4f46e5",
      height: 80,
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      const d = ws.getDuration();
      if (Number.isFinite(d) && d > 0) setDuration(d);
    });

    ws.on("interaction" as any, (progress: number) => {
      if (syncingRef.current || !audioRef.current) return;
      const d = audioRef.current.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      audioRef.current.currentTime = Math.min(d, Math.max(0, progress * d));
    });

    return () => ws.destroy();
  }, []);

  // Load existing audio into waveform
  useEffect(() => {
    if (existingAudioUrl && !audioSrc) {
      loadAudioSrc(existingAudioUrl);
    }
  }, [existingAudioUrl, audioSrc]);

  // Cleanup
  useEffect(() => {
    return () => {
      revokeObjectUrl();
      if (wavesurferRef.current) wavesurferRef.current.destroy();
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
            crossOrigin="anonymous"
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setCurrentTime(t);
              if (wavesurferRef.current && duration) {
                syncingRef.current = true;
                wavesurferRef.current.seekTo(
                  Math.min(1, Math.max(0, t / duration)),
                );
                syncingRef.current = false;
              }
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

          <div
            ref={waveformRef}
            style={{
              width: "100%",
              marginTop: "8px",
              background: "var(--indigo-3)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          />

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
    <Flex justify="start">
      <Button
        color="indigo"
        variant="solid"
        onClick={() => void handleTextToSpeech(true)}
        disabled={!storyContent || generatingAudio}
      >
        {generatingAudio ? <Spinner /> : <SpeakerLoudIcon />}
        Generate Audio
      </Button>
    </Flex>
  );
}
