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

  // If we ever create an object URL (base64 -> Blob), keep it so user can replay without regenerating.
  // Revoke only when replaced or on unmount.
  const objectUrlRef = useRef<string | null>(null);

  // Track the last playable src (R2 URL or object URL). Prefer this over existingAudioUrl
  // right after generation/regeneration (before parent refetch updates existingAudioUrl).
  const lastPlayableSrcRef = useRef<string | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const [generateAudio, { loading: generatingAudio }] =
    useGenerateOpenAiAudioMutation();

  const revokeObjectUrlIfAny = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      // Do NOT clear audio.src here; keeping it allows replay without reloading in some browsers.
    }
    if (wavesurferRef.current) {
      wavesurferRef.current.pause();
    }
    setIsPlayingAudio(false);
    setCurrentTime(0);
    audioRef.current = null;
  };

  const resetAudioState = () => {
    stopPlayback();
    if (wavesurferRef.current) {
      wavesurferRef.current.empty();
    }
    setAudioDuration(null);
    setCurrentTime(0);
    lastPlayableSrcRef.current = null;
  };

  const wireAudioEvents = (audio: HTMLAudioElement) => {
    const onLoadedMetadata = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setAudioDuration(d);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      stopPlayback();
    };

    const onError = (e: Event) => {
      console.error("Audio playback error:", e);
      stopPlayback();
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  };

  const playUrl = async (src: string) => {
    // Stop any existing playback first
    stopPlayback();

    setIsPlayingAudio(true);

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";

    const unwire = wireAudioEvents(audio);
    audioRef.current = audio;

    audio.src = src;
    lastPlayableSrcRef.current = src;

    // Load audio into WaveSurfer if available
    if (wavesurferRef.current) {
      try {
        await wavesurferRef.current.load(src);
      } catch (err) {
        console.warn("WaveSurfer load error:", err);
      }
    }

    try {
      await audio.play();
      if (wavesurferRef.current) {
        wavesurferRef.current.play();
      }
    } catch (err) {
      console.error("Play error:", err);
      unwire();
      stopPlayback();
    }
  };

  const playBase64Audio = async (audioBuffer: string) => {
    stopPlayback();

    try {
      // If buffer is a data URL, strip prefix
      const base64 = audioBuffer.includes(",")
        ? audioBuffer.split(",").pop()!
        : audioBuffer;

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mpeg" });

      // Replace old object URL if any
      revokeObjectUrlIfAny();

      const blobUrl = URL.createObjectURL(blob);
      objectUrlRef.current = blobUrl;
      lastPlayableSrcRef.current = blobUrl;

      setIsPlayingAudio(true);

      const audio = new Audio(blobUrl);
      audio.preload = "metadata";

      wireAudioEvents(audio);
      audioRef.current = audio;

      // Load blob URL into WaveSurfer
      if (wavesurferRef.current) {
        try {
          await wavesurferRef.current.load(blobUrl);
        } catch (err) {
          console.warn("WaveSurfer load error (blob):", err);
        }
      }

      await audio.play();
      if (wavesurferRef.current) {
        wavesurferRef.current.play();
      }
    } catch (error) {
      console.error("Base64 audio playback error:", error);
      stopPlayback();
    }
  };

  const handleTextToSpeech = async (regenerate = false) => {
    // If currently playing, clicking acts as stop
    if (isPlayingAudio) {
      stopPlayback();
      return;
    }

    // If regenerating, reset everything first
    if (regenerate) {
      resetAudioState();
    }

    // If we already have a playable src from this session and not regenerating, replay it.
    if (!regenerate && lastPlayableSrcRef.current) {
      await playUrl(lastPlayableSrcRef.current);
      return;
    }

    // If we have existing audio and not regenerating, play it.
    if (!regenerate && existingAudioUrl) {
      await playUrl(existingAudioUrl);
      return;
    }

    // Otherwise generate new audio
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

      // If backend provides duration, use it immediately (UI updates even before metadata loads).
      if (
        typeof payload.duration === "number" &&
        Number.isFinite(payload.duration)
      ) {
        setAudioDuration(payload.duration);
      }

      const audioUrl = payload.audioUrl;
      const audioBuffer = payload.audioBuffer;

      if (audioUrl) {
        try {
          await playUrl(audioUrl);
          return;
        } catch (e) {
          console.error("R2 playback failed, trying base64 fallback:", e);
        }
      }

      if (audioBuffer) {
        await playBase64Audio(audioBuffer);
        return;
      }

      throw new Error("No audio data received");
    } catch (error) {
      console.error("TTS Error:", error);
      stopPlayback();
    }
  };

  const handleRegenerateAudio = () => {
    void handleTextToSpeech(true);
  };

  const handleDownload = () => {
    const audioUrl = existingAudioUrl || lastPlayableSrcRef.current;
    if (!audioUrl) return;

    const anchor = document.createElement("a");
    anchor.href = audioUrl;
    anchor.download = `story-${storyId}-audio.mp3`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
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

    // Sync WaveSurfer with audio duration
    ws.on("ready", () => {
      const d = ws.getDuration();
      if (Number.isFinite(d) && d > 0) setAudioDuration(d);
    });

    // Sync WaveSurfer time updates
    ws.on("timeupdate", (currentTime) => {
      setCurrentTime(currentTime);
    });

    ws.on("finish", () => {
      setIsPlayingAudio(false);
      setCurrentTime(0);
    });

    return () => {
      ws.destroy();
    };
  }, []);

  // Preload duration for existing R2 URL so it shows before pressing Play
  useEffect(() => {
    if (!existingAudioUrl) return;

    let cancelled = false;
    setIsLoadingMetadata(true);

    const a = new Audio();
    a.preload = "metadata";
    a.crossOrigin = "anonymous";

    const onLoaded = () => {
      if (cancelled) return;
      const d = a.duration;
      if (Number.isFinite(d) && d > 0) setAudioDuration(d);
      setIsLoadingMetadata(false);
    };

    const onErr = (e: Event) => {
      if (cancelled) return;
      console.warn("Could not load audio metadata:", e);
      setIsLoadingMetadata(false);
    };

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("error", onErr);

    a.src = existingAudioUrl;
    a.load();

    return () => {
      cancelled = true;
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("error", onErr);
      a.src = "";
    };
  }, [existingAudioUrl]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      revokeObjectUrlIfAny();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnyAudio =
    Boolean(existingAudioUrl) || Boolean(lastPlayableSrcRef.current);
  const timeLabel =
    audioDuration != null
      ? `${formatDuration(isPlayingAudio ? currentTime : 0)} / ${formatDuration(audioDuration)}`
      : isPlayingAudio
        ? formatDuration(currentTime)
        : null;

  // Card UI when audio exists OR we've generated something in-session
  if (hasAnyAudio) {
    return (
      <Card
        style={{
          background: "var(--indigo-2)",
          borderColor: "var(--indigo-6)",
        }}
      >
        <Flex direction="column" gap="2" p="3">
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

            {isLoadingMetadata && (
              <Badge color="indigo" variant="soft" size="1">
                Loading metadata…
              </Badge>
            )}

            {timeLabel && (
              <Badge color="indigo" variant="soft" size="1">
                {timeLabel}
              </Badge>
            )}
          </Flex>

          {/* WaveSurfer Waveform */}
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
              disabled={
                generatingAudio ||
                (!storyContent &&
                  !existingAudioUrl &&
                  !lastPlayableSrcRef.current)
              }
            >
              {generatingAudio ? (
                <Spinner />
              ) : isPlayingAudio ? (
                <StopIcon />
              ) : (
                <SpeakerLoudIcon />
              )}
              {isPlayingAudio ? "Stop Playback" : "Play Audio"}
            </Button>

            {!isPlayingAudio && (
              <>
                <Button
                  color="indigo"
                  variant="soft"
                  onClick={handleRegenerateAudio}
                  disabled={generatingAudio || !storyContent}
                >
                  {generatingAudio ? <Spinner /> : null}
                  Regenerate
                </Button>

                <Button
                  color="indigo"
                  variant="soft"
                  onClick={handleDownload}
                  disabled={!existingAudioUrl && !lastPlayableSrcRef.current}
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

  // No audio exists yet: show generate
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
