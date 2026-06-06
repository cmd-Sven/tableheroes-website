"use client";

import { Mic, Pause, Settings } from "lucide-react";
import { MicLevelVisual, MicSignalBadge } from "@/src/components/session/MicLevelVisual";
import type { UseSessionChronicleRecorderReturn } from "@/src/hooks/useSessionChronicleRecorder";

type Props = {
  recorder: Pick<
    UseSessionChronicleRecorderReturn,
    | "phase"
    | "waveformLevels"
    | "hasSignal"
    | "peakLevel"
    | "deviceLabel"
    | "elapsedMs"
  >;
  onOpenSettings?: () => void;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ChronicleMicMonitor({ recorder, onOpenSettings }: Props) {
  const isRecording = recorder.phase === "recording";
  const isPaused = recorder.phase === "paused";
  if (!isRecording && !isPaused) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-24 left-3 z-30 sm:bottom-28 sm:left-4"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto w-[min(100vw-1.5rem,13rem)] rounded-xl border px-3 py-2.5 shadow-xl backdrop-blur-sm ${
          isRecording
            ? "border-red-500/50 bg-background-card/95 shadow-red-950/30"
            : "border-amber-600/45 bg-background-card/95 shadow-amber-950/20"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {isRecording ? (
              <Mic className="h-3.5 w-3.5 shrink-0 animate-pulse text-red-400" />
            ) : (
              <Pause className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            )}
            <span
              className={`font-barlow text-[9px] font-bold uppercase tracking-wide ${
                isRecording ? "text-red-300" : "text-amber-200"
              }`}
            >
              {isRecording ? "Mikro aktiv" : "Pausiert"}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-gray-400">
            {formatElapsed(recorder.elapsedMs)}
          </span>
        </div>

        <MicLevelVisual
          levels={recorder.waveformLevels}
          active={isRecording}
          variant={isRecording ? "monitor" : "default"}
          peakLevel={recorder.peakLevel}
          className="w-full"
        />

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <MicSignalBadge
              hasSignal={recorder.hasSignal}
              isActive={isRecording}
              deviceLabel={recorder.deviceLabel}
              compact
            />
          </div>
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="grid h-7 w-7 shrink-0 place-items-center rounded border border-white/20 bg-white/10 text-gray-300 transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
              title="Chronist steuern"
              aria-label="Chronist steuern"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
