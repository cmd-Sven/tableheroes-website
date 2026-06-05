"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SIGNAL_THRESHOLD = 0.06;
const BAR_COUNT = 24;

export type MicMonitorPhase = "idle" | "starting" | "active" | "error";

export type MicMonitorApi = ReturnType<typeof useMicMonitor>;

export function useMicMonitor() {
  const [phase, setPhase] = useState<MicMonitorPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0),
  );
  const [hasSignal, setHasSignal] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setWaveformLevels(Array.from({ length: BAR_COUNT }, () => 0));
    setHasSignal(false);
    setPeakLevel(0);
  }, [stopLoop]);

  const startLoop = useCallback(() => {
    stopLoop();
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
        const levels: number[] = [];
        let max = 0;
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          const level = sum / step / 255;
          levels.push(level);
          if (level > max) max = level;
        }
        setWaveformLevels(levels);
        setPeakLevel(max);
        if (max >= SIGNAL_THRESHOLD) setHasSignal(true);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  const start = useCallback(async () => {
    setError(null);
    setPhase("starting");
    setHasSignal(false);
    try {
      teardown();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
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
      startLoop();
      setPhase("active");
    } catch (e: unknown) {
      teardown();
      setPhase("error");
      setError(
        e instanceof Error
          ? e.message
          : "Mikrofon-Zugriff fehlgeschlagen. Bitte Berechtigung prüfen.",
      );
    }
  }, [startLoop, teardown]);

  const stop = useCallback(() => {
    teardown();
    setPhase("idle");
    setDeviceLabel(null);
  }, [teardown]);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  return {
    phase,
    error,
    deviceLabel,
    waveformLevels,
    hasSignal,
    peakLevel,
    isActive: phase === "active",
    start,
    stop,
  };
}

/** Analyser-Schleife für bestehende Streams (Chronist-Aufnahme). */
export function useAnalyserLevels(analyser: AnalyserNode | null, enabled: boolean) {
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0),
  );
  const [hasSignal, setHasSignal] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !analyser) {
      setWaveformLevels(Array.from({ length: BAR_COUNT }, () => 0));
      setHasSignal(false);
      setPeakLevel(0);
      return;
    }

    const tick = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
      const levels: number[] = [];
      let max = 0;
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
        const level = sum / step / 255;
        levels.push(level);
        if (level > max) max = level;
      }
      setWaveformLevels(levels);
      setPeakLevel(max);
      if (max >= SIGNAL_THRESHOLD) setHasSignal(true);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, enabled]);

  return { waveformLevels, hasSignal, peakLevel };
}

export { BAR_COUNT, SIGNAL_THRESHOLD };
