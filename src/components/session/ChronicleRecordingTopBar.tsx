"use client";

import { CheckCircle2, Pause, Play, Square } from "lucide-react";
import type { TranscriptionStatus } from "@/src/lib/session-chronicle/constants";
import type { CaptureHealthStatus } from "@/src/lib/session-chronicle/capture-health";
import { MicLevelVisual, MicSignalBadge } from "@/src/components/session/MicLevelVisual";

type Props = {
  /** Spieler: nur Status-Anzeige. GM: inkl. Mikro-Visualisierung. */
  role: "gm" | "player";
  transcriptionStatus: TranscriptionStatus | null;
  showWhenIdle?: boolean;
  /** GM während Aufnahme / Test */
  waveformLevels?: number[];
  hasSignal?: boolean;
  peakLevel?: number;
  micActive?: boolean;
  deviceLabel?: string | null;
  compactWaveform?: boolean;
  serverUploadedChunkCount?: number;
  captureHealth?: CaptureHealthStatus;
  /** GM: Aufnahme-Dialog öffnen (wenn idle). */
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onTogglePause?: () => void;
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
  peakLevel = 0,
  micActive = false,
  deviceLabel = null,
  compactWaveform = true,
  serverUploadedChunkCount = 0,
  captureHealth = "idle",
  onStartRecording,
  onStopRecording,
  onTogglePause,
}: Props) {
  const status = transcriptionStatus;
  const isRecording = status === "recording" || (micActive && !status);
  const isPaused = status === "paused";
  const isActive = isRecording || isPaused;
  const isIdle = !isActive;
  const visible =
    role === "player" ||
    showWhenIdle ||
    isRecording ||
    isPaused ||
    micActive;

  const uploadHealthy =
    captureHealth === "healthy" ||
    (captureHealth === "waiting-first-upload" && serverUploadedChunkCount > 0);
  const uploadWarning =
    captureHealth === "upload-stalled" ||
    captureHealth === "no-signal" ||
    captureHealth === "reconnect-needed" ||
    captureHealth === "tab-background" ||
    captureHealth === "capture-stalled";

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

      {!playerOnly && micActive && !isActive && waveformLevels.length > 0 ? (
        <MicLevelVisual
          levels={waveformLevels}
          active={micActive}
          compact={compactWaveform}
          className="hidden sm:flex max-w-[5rem]"
        />
      ) : null}

      {!playerOnly && micActive && !isActive ? (
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

      {!playerOnly && isActive && serverUploadedChunkCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded border border-emerald-600/40 bg-emerald-950/40 px-1.5 py-0.5 font-barlow text-[8px] font-bold uppercase text-emerald-200">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          {serverUploadedChunkCount} Chunk{serverUploadedChunkCount === 1 ? "" : "s"}
        </span>
      ) : null}

      {!playerOnly && isActive && uploadHealthy && serverUploadedChunkCount === 0 ? (
        <span className="font-barlow text-[8px] font-bold uppercase text-emerald-300/90">
          Erfasst…
        </span>
      ) : null}

      {!playerOnly && isActive && uploadWarning ? (
        <span className="font-barlow text-[8px] font-bold uppercase text-amber-300">
          Prüfen
        </span>
      ) : null}

      {!playerOnly && isIdle && onStartRecording ? (
        <button
          type="button"
          onClick={onStartRecording}
          className="ml-1 rounded border border-red-500/60 bg-red-950/50 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-red-200 hover:bg-red-900/50"
        >
          Aufnahme starten
        </button>
      ) : null}

      {!playerOnly && isActive && onTogglePause ? (
        <button
          type="button"
          onClick={onTogglePause}
          className="ml-1 rounded border border-amber-700/50 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-amber-200 hover:bg-amber-950/40"
        >
          {isPaused ? "Fortsetzen" : "Pause"}
        </button>
      ) : null}

      {!playerOnly && isActive && onStopRecording ? (
        <button
          type="button"
          onClick={onStopRecording}
          className="ml-1 rounded border border-red-600 bg-red-900/60 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-red-100 hover:bg-red-800/70"
        >
          Beenden
        </button>
      ) : null}

      {playerOnly && isActive ? (
        <span className="font-libre text-[10px] text-red-200 sm:text-xs">
          Audio wird aufgezeichnet
        </span>
      ) : null}
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
