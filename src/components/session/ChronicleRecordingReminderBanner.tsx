"use client";

import { AlertTriangle, CheckCircle2, Mic, RefreshCw, X } from "lucide-react";
import type { CaptureHealthStatus } from "@/src/lib/session-chronicle/capture-health";
import {
  captureHealthDescription,
  captureHealthTitle,
} from "@/src/lib/session-chronicle/capture-health";

type Variant = "not-recording" | "jitsi-mode" | CaptureHealthStatus;

type Props = {
  variant: Variant;
  onStartRecording?: () => void;
  onReconnect?: () => void;
  onDismiss?: () => void;
  error?: string | null;
  uploadedChunkCount?: number;
};

function bannerStyles(variant: Variant): string {
  if (variant === "healthy") {
    return "border-emerald-600/50 bg-emerald-950/85";
  }
  if (variant === "waiting-first-upload") {
    return "border-emerald-700/40 bg-emerald-950/70";
  }
  if (variant === "jitsi-mode") {
    return "border-amber-600/50 bg-amber-950/85";
  }
  return "border-red-500/50 bg-red-950/85";
}

function iconForVariant(variant: Variant) {
  if (variant === "healthy") {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />;
  }
  return (
    <AlertTriangle
      className={`mt-0.5 h-5 w-5 shrink-0 ${
        variant === "waiting-first-upload" ? "text-emerald-300" : "text-red-300"
      }`}
      aria-hidden
    />
  );
}

function titleForVariant(variant: Variant): string {
  if (variant === "not-recording") return "Chronist nimmt noch nicht auf";
  if (variant === "jitsi-mode") return "Chronist: Tisch-Modus erforderlich";
  return captureHealthTitle(variant);
}

function descriptionForVariant(variant: Variant, uploadedChunkCount: number): string {
  if (variant === "not-recording") {
    return "Die Session ist live, aber der Chronist läuft nicht. Klicke auf „Aufnahme starten“, bestätige den Hinweis und erlaube das Mikrofon. Lass diesen Tab während der Runde geöffnet.";
  }
  if (variant === "jitsi-mode") {
    return "Die Audio-Aufnahme funktioniert aktuell nur im Tisch-Modus. Wechsle den Chronist-Modus in der Seitenleiste und starte danach die Aufnahme.";
  }
  if (variant === "healthy" && uploadedChunkCount > 0) {
    return `${uploadedChunkCount} Audio-Chunk${uploadedChunkCount === 1 ? "" : "s"} gespeichert. ${captureHealthDescription(variant)}`;
  }
  return captureHealthDescription(variant);
}

export function ChronicleRecordingReminderBanner({
  variant,
  onStartRecording,
  onReconnect,
  onDismiss,
  error,
  uploadedChunkCount = 0,
}: Props) {
  const isJitsi = variant === "jitsi-mode";
  const isHealthy = variant === "healthy";
  const showReconnect = variant === "reconnect-needed" && onReconnect;
  const showStart = variant === "not-recording" && onStartRecording;

  return (
    <div
      className={`relative z-20 border-b px-4 py-3 sm:px-6 ${bannerStyles(variant)}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {iconForVariant(variant)}
          <div className="min-w-0 space-y-1">
            <p className="font-barlow text-sm font-bold uppercase tracking-wide text-white">
              {titleForVariant(variant)}
            </p>
            <p className="font-libre text-sm leading-relaxed text-gray-200">
              {descriptionForVariant(variant, uploadedChunkCount)}
            </p>
            {error ? (
              <p className="font-libre text-xs text-red-300">
                Letzter Fehler: {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showStart ? (
            <button
              type="button"
              onClick={onStartRecording}
              className="inline-flex items-center gap-1.5 rounded border border-red-400/60 bg-red-900/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-red-100 hover:bg-red-800/60"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden />
              Aufnahme starten
            </button>
          ) : null}
          {showReconnect ? (
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex items-center gap-1.5 rounded border border-red-400/60 bg-red-900/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-red-100 hover:bg-red-800/60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Mikrofon verbinden
            </button>
          ) : null}
          {onDismiss && !isHealthy ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-black/20 px-2.5 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:bg-black/40"
              aria-label="Hinweis für diese Session ausblenden"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Ausblenden
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
