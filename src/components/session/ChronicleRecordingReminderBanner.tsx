"use client";

import { AlertTriangle, Mic, X } from "lucide-react";

type Variant = "not-recording" | "jitsi-mode";

type Props = {
  variant: Variant;
  onStartRecording?: () => void;
  onDismiss: () => void;
  error?: string | null;
};

export function ChronicleRecordingReminderBanner({
  variant,
  onStartRecording,
  onDismiss,
  error,
}: Props) {
  const isJitsi = variant === "jitsi-mode";

  return (
    <div
      className={`relative z-20 border-b px-4 py-3 sm:px-6 ${
        isJitsi
          ? "border-amber-600/50 bg-amber-950/85"
          : "border-red-500/50 bg-red-950/85"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${isJitsi ? "text-amber-300" : "text-red-300"}`}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="font-barlow text-sm font-bold uppercase tracking-wide text-white">
              {isJitsi
                ? "Chronist: Tisch-Modus erforderlich"
                : "Chronist nimmt noch nicht auf"}
            </p>
            <p className="font-libre text-sm leading-relaxed text-gray-200">
              {isJitsi ? (
                <>
                  Die Audio-Aufnahme funktioniert aktuell nur im{" "}
                  <strong>Tisch-Modus</strong>. Wechsle den Chronist-Modus in der
                  Seitenleiste und starte danach die Aufnahme.
                </>
              ) : (
                <>
                  Die Session ist live, aber der Chronist läuft nicht. Klicke oben auf{" "}
                  <strong>„Aufnahme starten“</strong>, bestätige den Hinweis und erlaube
                  das Mikrofon. Lass diesen Tab während der Runde geöffnet.
                </>
              )}
            </p>
            {error ? (
              <p className="font-libre text-xs text-red-300">
                Letzter Fehler: {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!isJitsi && onStartRecording ? (
            <button
              type="button"
              onClick={onStartRecording}
              className="inline-flex items-center gap-1.5 rounded border border-red-400/60 bg-red-900/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-red-100 hover:bg-red-800/60"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden />
              Aufnahme starten
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded border border-white/15 bg-black/20 px-2.5 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:bg-black/40"
            aria-label="Hinweis für diese Session ausblenden"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Ausblenden
          </button>
        </div>
      </div>
    </div>
  );
}
