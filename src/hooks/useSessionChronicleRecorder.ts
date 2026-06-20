"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_CHUNK_OVERLAP_MS,
  type LiveMarkerType,
  type TranscriptionMode,
  type TranscriptionStatus,
} from "@/src/lib/session-chronicle/constants";
import {
  resolveCaptureHealth,
  type CaptureHealthStatus,
} from "@/src/lib/session-chronicle/capture-health";
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
  const [serverUploadedChunkCount, setServerUploadedChunkCount] = useState(0);
  const [uploadQueueSize, setUploadQueueSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [localCaptureActive, setLocalCaptureActive] = useState(false);
  const [audioSliceCount, setAudioSliceCount] = useState(0);
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
  const localCaptureRef = useRef(false);
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

  useEffect(() => {
    localCaptureRef.current = localCaptureActive;
  }, [localCaptureActive]);

  const refreshStatus = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
        { credentials: "same-origin" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        transcriptionSession?: {
          status?: TranscriptionStatus;
          started_at?: string | null;
        };
        chunks?: Array<{ chunk_index: number }>;
      };
      if (res.ok && data.transcriptionSession?.status) {
        const status = data.transcriptionSession.status;
        setServerStatus(status);

        const chunkCount = (data.chunks ?? []).length;
        setServerUploadedChunkCount(chunkCount);

        const maxIdx = (data.chunks ?? []).reduce(
          (max, c) => Math.max(max, Number(c.chunk_index ?? 0)),
          -1,
        );
        if (maxIdx >= 0) setCurrentChunkIndex(maxIdx + 1);

        if (status === "stopped" || status === "idle") {
          setPhase("idle");
          setRecordingStartedAt(null);
          return;
        }

        if (!localCaptureRef.current) {
          if (status === "paused") {
            setPhase("idle");
          } else if (status === "recording") {
            setPhase("idle");
          }
          const startedAtRaw = data.transcriptionSession.started_at;
          if (startedAtRaw && recordingStartedAt == null) {
            const parsed = Date.parse(startedAtRaw);
            if (Number.isFinite(parsed)) {
              setRecordingStartedAt(parsed);
            }
          }
          return;
        }

        if (status === "paused") {
          setPhase("paused");
        } else if (status === "recording") {
          setPhase((p) => (p === "idle" || p === "error" ? "recording" : p));
        }
      }
    } catch {
      /* ignore status poll errors */
    }
  }, [enabled, recordingStartedAt, sessionId]);

  useEffect(() => {
    if (enabled) void refreshStatus();
  }, [enabled, refreshStatus]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void refreshStatus();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [enabled, refreshStatus]);

  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!localCaptureActive) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [localCaptureActive]);

  const stopWaveformLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startWaveformLoop = useCallback(() => {
    stopWaveformLoop();
    const tickFrame = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        const bars = 24;
        const step = Math.max(1, Math.floor(data.length / bars));
        const levels: number[] = [];
        let max = 0;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += Math.abs(((data[i * step + j] ?? 128) - 128) / 128);
          }
          const level = Math.min(1, sum / step);
          levels.push(level);
          if (level > max) max = level;
        }
        setWaveformLevels(levels);
        setPeakLevel(max);
        setHasSignal(max >= 0.05);
      }
      rafRef.current = requestAnimationFrame(tickFrame);
    };
    rafRef.current = requestAnimationFrame(tickFrame);
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
      const ext = item.mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", item.blob, `chunk-${item.chunkIndex}.${ext}`);
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
        setServerUploadedChunkCount((count) =>
          Math.max(count, item.chunkIndex + 1),
        );
        setUploadQueueSize(uploadQueueRef.current.length);
        setError(null);
        void refreshStatus();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
        break;
      }
    }
    uploadBusyRef.current = false;
    setUploadQueueSize(uploadQueueRef.current.length);
  }, [refreshStatus, sessionId]);

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
    setLocalCaptureActive(false);
    setAudioSliceCount(0);
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
      let worker: Worker;
      try {
        worker = new Worker(
          new URL("../workers/session-audio-chunk.worker.ts", import.meta.url),
        );
      } catch (e: unknown) {
        throw new Error(
          e instanceof Error
            ? e.message
            : "Audio-Worker konnte nicht gestartet werden.",
        );
      }
      worker.onerror = () => {
        setError(
          "Audio-Verarbeitung im Browser fehlgeschlagen. Seite neu laden und Mikrofon erneut verbinden.",
        );
        setPhase("error");
      };
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
        if (blob.size === 0) {
          setError("Leerer Audio-Chunk — Mikrofon prüfen.");
          return;
        }
        enqueueUpload({
          chunkIndex: msg.chunkIndex,
          blob,
          durationMs: msg.durationMs,
          overlapMs: msg.overlapMs ?? AUDIO_CHUNK_OVERLAP_MS,
          mimeType: msg.mimeType.split(";")[0]?.trim() || "audio/webm",
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
      setAudioSliceCount((count) => count + 1);
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
    setLocalCaptureActive(true);
    setAudioSliceCount(0);
  }, [setupWorker, startWaveformLoop]);

  const reconnectLocalCapture = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setPhase("starting");
    try {
      if (localCaptureRef.current) {
        teardownCapture();
      }
      if (recordingStartedAt == null) {
        setRecordingStartedAt(Date.now());
      }
      await startMicCapture();
      setPhase(serverStatus === "paused" ? "paused" : "recording");
      if (serverStatus === "paused") {
        mediaRecorderRef.current?.pause();
      }
    } catch (e: unknown) {
      teardownCapture();
      setPhase("error");
      setError(
        e instanceof Error ? e.message : "Mikrofon konnte nicht verbunden werden.",
      );
    }
  }, [enabled, recordingStartedAt, serverStatus, startMicCapture, teardownCapture]);

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
        setServerUploadedChunkCount(0);
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
    async (type: LiveMarkerType, label?: string): Promise<boolean> => {
      if (phaseRef.current !== "recording" && phaseRef.current !== "paused") {
        return false;
      }

      const atMs =
        recordingStartedAt != null ? Math.max(0, Date.now() - recordingStartedAt) : 0;
      const marker: LiveMarker = { type, at_ms: atMs, label: label?.trim() || undefined };
      chunkMarkersRef.current.push(marker);

      if (type === "pause") {
        try {
          await togglePause();
        } catch {
          return false;
        }
      }

      try {
        const res = await fetch(
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
        if (!res.ok) {
          return false;
        }
      } catch {
        /* Marker lokal gespeichert, Upload folgt mit Chunk */
      }

      return true;
    },
    [currentChunkIndex, recordingStartedAt, sessionId, togglePause],
  );

  const waitForUploadQueue = useCallback(async () => {
    let attempts = 0;
    while (
      (uploadQueueRef.current.length > 0 || uploadBusyRef.current) &&
      attempts < 120
    ) {
      await new Promise((r) => window.setTimeout(r, 250));
      attempts += 1;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const locallyActive =
      phaseRef.current === "recording" || phaseRef.current === "paused";

    setError(null);
    try {
      if (locallyActive) {
        mediaRecorderRef.current?.stop();
        await new Promise((r) => window.setTimeout(r, 400));
        workerRef.current?.postMessage({ type: "flush" });
        await new Promise((r) => window.setTimeout(r, 600));
        await waitForUploadQueue();
      }

      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/stop`,
        { method: "POST", credentials: "same-origin" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Aufnahme konnte nicht beendet werden.");
      }

      teardownCapture();
      setPhase("idle");
      setServerStatus("stopped");
      setRecordingStartedAt(null);
      setWaveformLevels(Array.from({ length: 24 }, () => 0));
      void refreshStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Stop fehlgeschlagen.");
    }
  }, [refreshStatus, sessionId, teardownCapture, waitForUploadQueue]);

  const elapsedMs =
    recordingStartedAt != null &&
    (phase === "recording" ||
      phase === "paused" ||
      (!localCaptureActive &&
        (serverStatus === "recording" || serverStatus === "paused")))
      ? Date.now() - recordingStartedAt
      : 0;
  void tick;

  const captureHealth: CaptureHealthStatus = useMemo(
    () =>
      resolveCaptureHealth({
        phase,
        localCaptureActive,
        serverStatus,
        elapsedMs,
        hasSignal,
        audioSliceCount,
        serverUploadedChunkCount,
        uploadQueueSize,
        error,
      }),
    [
      audioSliceCount,
      elapsedMs,
      error,
      hasSignal,
      localCaptureActive,
      phase,
      serverStatus,
      serverUploadedChunkCount,
      uploadQueueSize,
    ],
  );

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
    serverUploadedChunkCount,
    uploadQueueSize,
    elapsedMs,
    localCaptureActive,
    audioSliceCount,
    captureHealth,
    startRecording,
    reconnectLocalCapture,
    togglePause,
    stopRecording,
    addMarker,
    refreshStatus,
    isTableMode: plannedMode === "table" || plannedMode === null,
  };
}

export type UseSessionChronicleRecorderReturn = ReturnType<
  typeof useSessionChronicleRecorder
>;
