"use client";

import { Pause, Play, Square } from "lucide-react";
import type { TranscriptionStatus } from "@/src/lib/session-chronicle/constants";
import { MicLevelVisual, MicSignalBadge } from "@/src/components/session/MicLevelVisual";

type Props = {
  /** Spieler: nur Status-Anzeige. GM: inkl. Mikro-Visualisierung. */
  role: "gm" | "player";
  transcriptionStatus: TranscriptionStatus | null;
  showWhenIdle?: boolean;
  /** GM während Aufnahme / Test */
  waveformLevels?: number[];
  hasSignal?: boolean;
  micActive?: boolean;
  deviceLabel?: string | null;
  compactWaveform?: boolean;
};

function statusLabel(status: TranscriptionStatus | null): string {
  switch (status) {
    case "recording":
      return "Aufnahme läuft";
    case "paused":
      return "Aufnahme pausiert";
    case "stopped":
      return "Aufnahme beendet";
    case "idle":
      return "Chronist bereit";
    default:
      return "Keine Aufnahme";
  }
}

export function ChronicleRecordingTopBar({
  role,
  transcriptionStatus,
  showWhenIdle = false,
  waveformLevels = [],
  hasSignal = false,
  micActive = false,
  deviceLabel = null,
  compactWaveform = true,
}: Props) {
  const status = transcriptionStatus;
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const visible =
    role === "player" ||
    showWhenIdle ||
    isRecording ||
    isPaused ||
    micActive;

  if (!visible) return null;

  const playerOnly = role === "player";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
        isRecording
          ? "border-red-500/50 bg-red-950/40"
          : isPaused
            ? "border-amber-600/50 bg-amber-950/35"
            : "border-hero-border/40 bg-background-dark/70"
      }`}
      title={statusLabel(status)}
      aria-label={`Chronist: ${statusLabel(status)}`}
    >
      <div className="flex items-center gap-1">
        <StatusIcon
          status={status}
          micActive={micActive && !isRecording && !isPaused}
          readOnly={playerOnly}
        />
      </div>

      {!playerOnly && micActive && waveformLevels.length > 0 ? (
        <MicLevelVisual
          levels={waveformLevels}
          active={micActive}
          compact={compactWaveform}
          className="hidden sm:flex max-w-[5rem]"
        />
      ) : null}

      {!playerOnly && micActive ? (
        <MicSignalBadge
          hasSignal={hasSignal}
          isActive={micActive}
          deviceLabel={deviceLabel}
          compact
        />
      ) : null}

      <span
        className={`hidden font-barlow font-bold uppercase tracking-wide md:inline ${
          isRecording
            ? "text-[9px] text-red-300"
            : isPaused
              ? "text-[9px] text-amber-200"
              : "text-[9px] text-gray-500"
        }`}
      >
        {micActive && !status
          ? "Mikro-Test"
          : statusLabel(status)}
      </span>
    </div>
  );
}

function StatusIcon({
  status,
  micActive,
  readOnly,
}: {
  status: TranscriptionStatus | null;
  micActive: boolean;
  readOnly: boolean;
}) {
  const base =
    "grid h-8 w-8 place-items-center rounded border transition-colors";
  const disabled = readOnly ? "cursor-default" : "";

  if (status === "recording" || (micActive && !status)) {
    return (
      <span
        className={`${base} ${disabled} border-red-500/70 bg-red-900/50 text-red-200`}
        aria-hidden
      >
        <Play className="h-4 w-4 fill-current animate-pulse" />
      </span>
    );
  }

  if (status === "paused") {
    return (
      <span
        className={`${base} ${disabled} border-amber-600/60 bg-amber-950/50 text-amber-100`}
        aria-hidden
      >
        <Pause className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span
      className={`${base} ${disabled} border-gray-600/50 bg-gray-900/50 text-gray-400`}
      aria-hidden
    >
      <Square className="h-3.5 w-3.5 fill-current" />
    </span>
  );
}
