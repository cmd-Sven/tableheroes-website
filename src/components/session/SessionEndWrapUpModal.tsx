"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  Info,
  Loader2,
  MapPin,
  Mic,
  Power,
  Users,
  X,
} from "lucide-react";
import {
  carryOverSessionBoardState,
  getSessionWrapUpPreview,
} from "@/src/app/dashboard/campaigns/[id]/session-wrap-up-actions";
import { endSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import {
  formatWrapUpDuration,
  type SessionWrapUpPreview,
  type SessionWrapUpTask,
} from "@/src/lib/session-wrap-up/types";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  campaignId: string;
  isRecordingActive: boolean;
  onStopRecording?: () => Promise<void>;
  onComplete: (redirectPath: string) => void;
};

function formatSessionDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TaskIcon({ kind }: { kind: SessionWrapUpTask["kind"] }) {
  if (kind === "warning") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />;
  }
  if (kind === "action") {
    return <ArrowRight className="h-4 w-4 shrink-0 text-hero-vibrant" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-gray-400" />;
}

export function SessionEndWrapUpModal({
  open,
  onClose,
  sessionId,
  campaignId,
  isRecordingActive,
  onStopRecording,
  onComplete,
}: Props) {
  const [preview, setPreview] = useState<SessionWrapUpPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [carryOver, setCarryOver] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoadError(null);
    setPreview(null);
    void getSessionWrapUpPreview(sessionId)
      .then((data) => {
        if (!data) {
          setLoadError("Übersicht konnte nicht geladen werden.");
          return;
        }
        setPreview(data);
        setCarryOver(Boolean(data.nextSession && data.board.hasCarryOverContent));
      })
      .catch(() => {
        setLoadError("Übersicht konnte nicht geladen werden.");
      });
  }, [open, sessionId]);

  if (!open) return null;

  function resolveRedirectPath(data: SessionWrapUpPreview): string {
    const hasChronistFollowUp =
      data.inbox.pendingCount > 0 ||
      data.chronist.failedChunks > 0 ||
      data.chronist.pendingWhisper + data.chronist.pendingSummarize > 0;
    if (hasChronistFollowUp) {
      return `/dashboard/campaigns/${campaignId}/chronist`;
    }
    return `/dashboard/campaigns/${campaignId}?tab=sessions`;
  }

  function handleConfirmEnd() {
    if (!preview || isPending) return;
    startTransition(async () => {
      try {
        if (isRecordingActive && onStopRecording) {
          await onStopRecording();
          await new Promise((r) => window.setTimeout(r, 800));
        }

        if (carryOver && preview.nextSession) {
          const carryResult = await carryOverSessionBoardState(
            sessionId,
            preview.nextSession.id,
          );
          if (!carryResult.ok) {
            throw new Error(carryResult.error);
          }
        }

        await endSession(sessionId);
        onComplete(resolveRedirectPath(preview));
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Session konnte nicht beendet werden.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-wrap-up-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-hero-border/50 bg-background-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="session-wrap-up-title"
              className="font-barlow text-xl font-bold uppercase tracking-wide text-white"
            >
              Session abschließen
            </h2>
            <p className="mt-1 font-libre text-sm text-gray-400">
              {preview?.sessionTitle?.trim() || "Live-Session"} — Übersicht vor dem Archivieren
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded border border-hero-border/50 p-2 text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loadError ? (
            <p className="font-libre text-sm text-red-300">{loadError}</p>
          ) : !preview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-libre text-sm">Lade Session-Übersicht…</span>
            </div>
          ) : (
            <>
              {preview.chronist.used ? (
                <section className="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-red-300" />
                    <h3 className="font-barlow text-xs font-bold uppercase text-red-200">
                      Chronist-Aufnahme
                    </h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-libre text-sm text-gray-300 sm:grid-cols-4">
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Audio gesamt</dt>
                      <dd className="font-medium text-white">
                        {formatWrapUpDuration(preview.chronist.totalAudioMs)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Chunks</dt>
                      <dd className="font-medium text-white">
                        {preview.chronist.chunkCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Verarbeitet</dt>
                      <dd className="font-medium text-emerald-300">
                        {preview.chronist.processedChunks}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Status</dt>
                      <dd className="font-medium text-white">
                        {preview.chronist.recordingActive
                          ? "Noch aktiv"
                          : preview.chronist.transcriptionStatus === "stopped"
                            ? "Beendet"
                            : (preview.chronist.transcriptionStatus ?? "—")}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : (
                <section className="rounded-lg border border-hero-border/30 bg-background-dark/50 p-4">
                  <p className="font-libre text-sm text-gray-400">
                    Keine Chronist-Aufnahme in dieser Session.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-hero-border/30 bg-background-dark/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent-gold" />
                  <h3 className="font-barlow text-xs font-bold uppercase text-gray-300">
                    Aktuelle Bühne & Szene
                  </h3>
                </div>
                <ul className="space-y-2 font-libre text-sm text-gray-300">
                  <li>
                    <span className="text-gray-500">NSCs auf der Bühne: </span>
                    {preview.board.stageNpcCount > 0 ? (
                      <span className="text-white">
                        {preview.board.stageNpcNames.join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Keine</span>
                    )}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>{preview.board.locationName ?? "Kein Ort gesetzt"}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Cloud className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>
                      {preview.board.weatherLabel} · {preview.board.temperatureLabel}
                      {preview.board.dayPhaseLabel
                        ? ` · ${preview.board.dayPhaseLabel}`
                        : ""}
                    </span>
                  </li>
                  {preview.board.inGameDate || preview.board.inGameTime ? (
                    <li>
                      <span className="text-gray-500">Ingame-Zeit: </span>
                      {[preview.board.inGameDate, preview.board.inGameTime]
                        .filter(Boolean)
                        .join(" · ")}
                    </li>
                  ) : null}
                </ul>
              </section>

              {preview.nextSession ? (
                <section className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={carryOver}
                      onChange={(e) => setCarryOver(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-hero-border text-accent-gold"
                    />
                    <span>
                      <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
                        In nächste Session übernehmen
                      </span>
                      <span className="mt-1 block font-libre text-sm text-gray-300 leading-relaxed">
                        NSCs auf der Bühne, Wetter, Temperatur, Tageszeit, Ort und
                        Hintergrund werden für{" "}
                        <strong className="text-white">
                          {preview.nextSession.title?.trim() ||
                            formatSessionDate(preview.nextSession.startTime)}
                        </strong>{" "}
                        vorbereitet — sinnvoll, wenn das Abenteuer direkt weitergeht.
                      </span>
                    </span>
                  </label>
                </section>
              ) : (
                <section className="rounded-lg border border-hero-border/25 bg-background-dark/40 p-4">
                  <p className="font-libre text-sm text-gray-400">
                    Kein nächster Termin geplant. Lege einen neuen Termin an, wenn du Bühne
                    und Wetter manuell in der Vorbereitung setzen willst.
                  </p>
                </section>
              )}

              <section>
                <h3 className="mb-3 font-barlow text-xs font-bold uppercase text-gray-400">
                  Danach erledigen (optional)
                </h3>
                <ul className="space-y-2">
                  {preview.followUpTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex gap-3 rounded-lg border border-hero-border/25 bg-background-dark/40 px-3 py-2.5"
                    >
                      <TaskIcon kind={task.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="font-barlow text-[11px] font-bold uppercase text-gray-200">
                          {task.title}
                        </p>
                        <p className="mt-0.5 font-libre text-xs text-gray-400 leading-relaxed">
                          {task.description}
                        </p>
                        {task.href ? (
                          <Link
                            href={task.href}
                            className="mt-1 inline-block font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Öffnen
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400 hover:text-white disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleConfirmEnd}
            disabled={isPending || !preview}
            className="inline-flex items-center gap-2 rounded border border-red-600 bg-red-900/70 px-4 py-2 font-barlow text-xs font-bold uppercase text-red-100 hover:bg-red-800/80 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            Session archivieren & beenden
          </button>
        </div>
      </div>
    </div>
  );
}
