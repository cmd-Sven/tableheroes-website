"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_CHUNK_OVERLAP_MS,
  type LiveMarkerType,
  type TranscriptionMode,
  type TranscriptionStatus,
} from "@/src/lib/session-chronicle/constants";
import type { LiveMarker } from "@/src/lib/session-chronicle/types";

type RecorderPhase = "idle" | "starting" | "recording" | "paused" | "error";

type UseSessionChronicleRecorderOptions = {
  sessionId: string;
  enabled: boolean;
  plannedMode: TranscriptionMode | null;
};

export function useSessionChronicleRecorder({
  sessionId,
  enabled,
  plannedMode,
}: UseSessionChronicleRecorderOptions) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [serverStatus, setServerStatus] = useState<TranscriptionStatus>("idle");
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [uploadQueueSize, setUploadQueueSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() =>
    Array.from({ length: 24 }, () => 0),
  );
  const [hasSignal, setHasSignal] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunkMarkersRef = useRef<LiveMarker[]>([]);
  const uploadBusyRef = useRef(false);
  const uploadQueueRef = useRef<
    Array<{
      chunkIndex: number;
      blob: Blob;
      durationMs: number;
      overlapMs: number;
      mimeType: string;
    }>
  >([]);
  const phaseRef = useRef<RecorderPhase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const refreshStatus = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
        { credentials: "same-origin" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        transcriptionSession?: { status?: TranscriptionStatus };
        chunks?: Array<{ chunk_index: number }>;
      };
      if (res.ok && data.transcriptionSession?.status) {
        setServerStatus(data.transcriptionSession.status);
        if (data.transcriptionSession.status === "paused") {
          setPhase("paused");
        } else if (data.transcriptionSession.status === "recording") {
          setPhase((p) => (p === "idle" ? "recording" : p));
        }
        const maxIdx = (data.chunks ?? []).reduce(
          (max, c) => Math.max(max, Number(c.chunk_index ?? 0)),
          -1,
        );
        if (maxIdx >= 0) setCurrentChunkIndex(maxIdx + 1);
      }
    } catch {
      /* ignore status poll errors */
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    if (enabled) void refreshStatus();
  }, [enabled, refreshStatus]);

  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const stopWaveformLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startWaveformLoop = useCallback(() => {
    stopWaveformLoop();
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = 24;
        const step = Math.max(1, Math.floor(data.length / bars));
        const levels: number[] = [];
        let max = 0;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          const level = sum / step / 255;
          levels.push(level);
          if (level > max) max = level;
        }
        setWaveformLevels(levels);
        setPeakLevel(max);
        if (max >= 0.06) setHasSignal(true);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopWaveformLoop]);

  const processUploadQueue = useCallback(async () => {
    if (uploadBusyRef.current) return;
    uploadBusyRef.current = true;
    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current[0];
      setUploadQueueSize(uploadQueueRef.current.length);
      const formData = new FormData();
      formData.append("chunkIndex", String(item.chunkIndex));
      formData.append("durationMs", String(item.durationMs));
      formData.append("overlapMs", String(item.overlapMs));
      formData.append("mimeType", item.mimeType);
      formData.append("audio", item.blob, `chunk-${item.chunkIndex}.webm`);
      if (chunkMarkersRef.current.length > 0) {
        formData.append("liveMarkers", JSON.stringify(chunkMarkersRef.current));
        chunkMarkersRef.current = [];
      }
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/transcription/upload-chunk`,
          { method: "POST", body: formData, credentials: "same-origin" },
        );
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Chunk-Upload fehlgeschlagen.");
        }
        uploadQueueRef.current.shift();
        setCurrentChunkIndex(item.chunkIndex + 1);
        setUploadQueueSize(uploadQueueRef.current.length);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
        break;
      }
    }
    uploadBusyRef.current = false;
    setUploadQueueSize(uploadQueueRef.current.length);
  }, [sessionId]);

  const enqueueUpload = useCallback(
    (payload: {
      chunkIndex: number;
      blob: Blob;
      durationMs: number;
      overlapMs: number;
      mimeType: string;
    }) => {
      uploadQueueRef.current.push(payload);
      setUploadQueueSize(uploadQueueRef.current.length);
      void processUploadQueue();
    },
    [processUploadQueue],
  );

  const teardownCapture = useCallback(() => {
    stopWaveformLoop();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setHasSignal(false);
    setPeakLevel(0);
    setDeviceLabel(null);
    workerRef.current?.postMessage({ type: "reset" });
    workerRef.current?.terminate();
    workerRef.current = null;
  }, [stopWaveformLoop]);

  useEffect(() => {
    return () => {
      teardownCapture();
    };
  }, [teardownCapture]);

  const setupWorker = useCallback(
    (mime: string) => {
      workerRef.current?.terminate();
      const worker = new Worker(
        new URL("../workers/session-audio-chunk.worker.ts", import.meta.url),
      );
      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data as
          | {
              type: "chunk-ready" | "flush-ready";
              chunkIndex: number;
              buffer: ArrayBuffer;
              mimeType: string;
              durationMs: number;
              overlapMs?: number;
            }
          | undefined;
        if (!msg || (msg.type !== "chunk-ready" && msg.type !== "flush-ready")) return;
        const blob = new Blob([msg.buffer], { type: msg.mimeType });
        enqueueUpload({
          chunkIndex: msg.chunkIndex,
          blob,
          durationMs: msg.durationMs,
          overlapMs: msg.overlapMs ?? AUDIO_CHUNK_OVERLAP_MS,
          mimeType: msg.mimeType,
        });
      };
      workerRef.current = worker;
      worker.postMessage({ type: "reset" });
      return mime;
    },
    [enqueueUpload],
  );

  const startMicCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;
    const track = stream.getAudioTracks()[0];
    setDeviceLabel(track?.label?.trim() || "Standard-Mikrofon");

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    startWaveformLoop();

    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    const mimeType =
      preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";

    setupWorker(mimeType);

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (ev) => {
      if (!ev.data || ev.data.size === 0) return;
      if (phaseRef.current === "paused") return;
      const buffer = await ev.data.arrayBuffer();
      workerRef.current?.postMessage(
        {
          type: "audio",
          buffer,
          durationMs: 1000,
          mimeType,
        },
        [buffer],
      );
    };

    recorder.start(1000);
  }, [setupWorker, startWaveformLoop]);

  const startRecording = useCallback(
    async (mode: TranscriptionMode, noticeAcknowledged: boolean) => {
      if (!enabled) return;
      setError(null);
      setPhase("starting");
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/transcription/start`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              mode,
              recordingNoticeAcknowledged: noticeAcknowledged,
            }),
          },
        );
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Chronist konnte nicht gestartet werden.");
        }
        setServerStatus("recording");
        setRecordingStartedAt(Date.now());
        chunkMarkersRef.current = [];
        setHasSignal(false);
        await startMicCapture();
        setPhase("recording");
      } catch (e: unknown) {
        teardownCapture();
        setPhase("error");
        setError(e instanceof Error ? e.message : "Start fehlgeschlagen.");
      }
    },
    [enabled, sessionId, startMicCapture, teardownCapture],
  );

  const togglePause = useCallback(async () => {
    const nextPaused = phase === "recording";
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/pause`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ paused: nextPaused }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Pause fehlgeschlagen.");
      }
      if (nextPaused) {
        mediaRecorderRef.current?.pause();
        setPhase("paused");
        setServerStatus("paused");
      } else {
        mediaRecorderRef.current?.resume();
        setPhase("recording");
        setServerStatus("recording");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Pause fehlgeschlagen.");
    }
  }, [phase, sessionId]);

  const addMarker = useCallback(
    async (type: LiveMarkerType, label?: string) => {
      const atMs =
        recordingStartedAt != null ? Math.max(0, Date.now() - recordingStartedAt) : 0;
      const marker: LiveMarker = { type, at_ms: atMs, label: label?.trim() || undefined };
      chunkMarkersRef.current.push(marker);

      if (type === "pause") {
        await togglePause();
      }

      try {
        await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/transcription/marker`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              type,
              at_ms: atMs,
              label: label?.trim() || undefined,
              chunk_index: currentChunkIndex,
            }),
          },
        );
      } catch {
        /* Marker lokal gespeichert, Upload folgt mit Chunk */
      }
    },
    [currentChunkIndex, recordingStartedAt, sessionId, togglePause],
  );

  const elapsedMs =
    recordingStartedAt != null && (phase === "recording" || phase === "paused")
      ? Date.now() - recordingStartedAt
      : 0;
  void tick;

  return {
    plannedMode,
    phase,
    serverStatus,
    error,
    waveformLevels,
    hasSignal,
    peakLevel,
    deviceLabel,
    currentChunkIndex,
    uploadQueueSize,
    elapsedMs,
    startRecording,
    togglePause,
    addMarker,
    refreshStatus,
    isTableMode: plannedMode === "table" || plannedMode === null,
  };
}

export type UseSessionChronicleRecorderReturn = ReturnType<
  typeof useSessionChronicleRecorder
>;
