"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Wand2,
  Pencil,
  Trash2,
  MoreVertical,
  Square,
  Sparkles,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Copy,
  Radio,
  Archive,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { SessionWizardModal } from "@/src/components/dashboard/SessionWizardModal";
import { CampaignEventModal } from "@/src/components/dashboard/CampaignEventModal";
import { SessionEditModal } from "@/src/components/dashboard/SessionEditModal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteSession,
  cancelSession,
  markSessionPlanningComplete,
  archiveScheduledSessionQuietly,
  setPlanningDummyPlayerCount,
} from "./session-actions";
import { StartSessionBackgroundModal } from "@/src/components/dashboard/StartSessionBackgroundModal";
import { SessionChronistModeControl } from "@/src/components/session/SessionChronistModeControl";
import { SessionEndWrapUpModal } from "@/src/components/session/SessionEndWrapUpModal";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";
import {
  PastSessionsGallery,
  type SessionArchiveItem,
} from "@/src/components/dashboard/campaigns/PastSessionsGallery";
import { LastSessionRecapCard } from "@/src/components/chronicle/LastSessionRecapCard";
import type { LatestPublishedPlayerRecap } from "@/src/lib/session-chronicle/latest-published-recap";
import { isSessionStatusLive, isSessionStatusScheduled, canEditSessionSchedule } from "@/src/lib/session-status";
import {
  isMissedScheduledSession,
  isScheduledInGraceOverdue,
} from "@/src/lib/session-focus";
import { getSessionTypeLabel, sessionSupportsLiveBoard } from "@/src/lib/session-type";

type SessionItem = {
  id: string;
  title: string | null;
  start_time: string;
  end_time?: string | null;
  type: string;
  status: string;
  canStart?: boolean;
  pendingCount?: number;
  hasAcceptedRsvps?: boolean;
  gm_prep_complete?: boolean;
  registration_closed_on_landing?: boolean | null;
  /** Aus session_live_states — Platzhalter am Tisch (0–3) */
  planning_dummy_player_count?: number;
  transcription_mode?: string | null;
};

function parseTranscriptionMode(value: unknown): TranscriptionMode | null {
  if (value === "table" || value === "jitsi") return value;
  return null;
}

import { formatSessionDateTimeDe } from "@/src/lib/datetime/berlin";

function formatSessionDateTime(startTime: string) {
  const { formattedDate, formattedTime } = formatSessionDateTimeDe(startTime);
  const startDate = new Date(startTime);
  return { formattedDate, formattedTime, startDate };
}

function pastSessionStatusLabel(session: SessionItem): string {
  if (isMissedScheduledSession(session)) {
    return "Nicht gestartet (Termin vorbei)";
  }
  const st = String(session.status ?? "").toLowerCase();
  if (st === "cancelled") return "Abgesagt";
  if (st === "completed") return "Beendet / archiviert";
  if (isSessionStatusLive(session.status)) return "Verwaiste Live-Session";
  return session.status;
}

function sessionCardBorderClass(session: SessionItem): string {
  const live = isSessionStatusLive(session.status);
  const scheduled = isSessionStatusScheduled(session.status);
  if (live) return "border-red-800/50";
  if (scheduled && isScheduledInGraceOverdue(session)) {
    return "border-amber-600/50 ring-1 ring-amber-900/40";
  }
  if (scheduled) return "border-emerald-800/40";
  return "border-hero-border/30";
}

/** Dropdown mit Bearbeiten/Löschen/Absagen/Archivieren/Beenden für GM */
function SessionActionsDropdown({
  isStarting,
  onEdit,
  onEditSchedule,
  onDelete,
  onCancel,
  onArchiveQuiet,
  onEnd,
  hasAcceptedRsvps,
  isLive,
  isScheduled,
  canEditSchedule,
}: {
  isStarting: boolean;
  onEdit?: () => void;
  onEditSchedule?: () => void;
  onDelete: () => void;
  onCancel?: () => void;
  onArchiveQuiet?: () => void;
  onEnd?: () => void;
  hasAcceptedRsvps?: boolean;
  isLive?: boolean;
  isScheduled?: boolean;
  canEditSchedule?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded p-2 text-gray-400 hover:text-white hover:bg-hero-dark transition-colors"
        title="Aktionen"
        aria-label="Session-Aktionen"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded border border-hero-dark bg-background-card py-1 shadow-xl">
          {isLive && onEnd ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEnd();
              }}
              disabled={isStarting}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-amber-400 hover:bg-amber-900/30 transition-colors disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              Session beenden
            </button>
          ) : (
            <>
              {canEditSchedule && onEditSchedule ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onEditSchedule();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-hero-vibrant hover:bg-hero-dark transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Termin ändern
                </button>
              ) : onEdit ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-gray-300 hover:bg-hero-dark hover:text-hero-vibrant transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </button>
              ) : null}
              {isScheduled && onCancel ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onCancel();
                  }}
                  disabled={isStarting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-amber-400 hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" />
                  Absagen (Zugesagte informiert)
                </button>
              ) : null}
              {isScheduled && onArchiveQuiet ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onArchiveQuiet();
                  }}
                  disabled={isStarting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-gray-300 hover:bg-hero-dark hover:text-white transition-colors disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  Archivieren (ohne Nachricht)
                </button>
              ) : null}
              {!hasAcceptedRsvps ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onDelete();
                  }}
                  disabled={isStarting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-sm uppercase text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  campaignId: string;
  worldId?: string | null;
  isGM: boolean;
  characterStatus?: string;
  focusSession: SessionItem | null;
  otherUpcomingSessions: SessionItem[];
  pastSessionRows: SessionItem[];
  /** Vollständige aktive Liste (Fokus zuerst) */
  upcomingSessions: SessionItem[];
  archives?: SessionArchiveItem[];
  latestPublishedPlayerRecap?: LatestPublishedPlayerRecap | null;
  locations: Array<{ id: string; name: string; type: string }>;
  npcs: Array<{ id: string; name: string; title: string | null }>;
};

export function SessionsTab({
  campaignId,
  worldId = null,
  isGM,
  characterStatus,
  focusSession,
  otherUpcomingSessions,
  pastSessionRows,
  upcomingSessions: _upcomingSessions,
  archives = [],
  latestPublishedPlayerRecap = null,
  locations,
  npcs,
}: Props) {
  const canJoinSession = isGM || characterStatus === "Active";
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [startBgSessionId, setStartBgSessionId] = useState<string | null>(null);
  const [isStarting, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [wrapUpSessionId, setWrapUpSessionId] = useState<string | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleDelete = (sessionId: string) => {
    if (!confirm("Termin wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    startTransition(async () => {
      try {
        await deleteSession(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Fehler beim Löschen.");
      }
    });
  };

  const handleStartSession = (sessionId: string) => {
    if (isStarting) return;
    setStartBgSessionId(sessionId);
  };

  const handleMarkPrepComplete = (sessionId: string) => {
    if (isStarting) return;
    startTransition(async () => {
      try {
        await markSessionPlanningComplete(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Planung konnte nicht gespeichert werden.");
      }
    });
  };

  const handleJoinLive = (sessionId: string) => {
    router.push(`/session/${sessionId}`);
  };

  const handleCancel = (sessionId: string) => {
    if (
      !confirm(
        "Termin absagen? Nur Spieler mit Zusage oder „Via Online“ erhalten eine Nachricht in ihrer Nachrichten-Karte.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await cancelSession(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Fehler beim Absagen.");
      }
    });
  };

  const handleEndSession = (sessionId: string) => {
    setWrapUpSessionId(sessionId);
  };

  const handleArchiveQuiet = (sessionId: string) => {
    if (
      !confirm(
        "Diesen geplanten Termin ohne Benachrichtigung an Spieler archivieren? Er verschwindet aus der Übersicht (Status: abgeschlossen).",
      )
    )
      return;
    startTransition(async () => {
      try {
        await archiveScheduledSessionQuietly(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Archivieren fehlgeschlagen.");
      }
    });
  };

  const handlePlanningDummy = (sessionId: string, next: number) => {
    if (isStarting) return;
    startTransition(async () => {
      try {
        await setPlanningDummyPlayerCount(sessionId, next);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Platzhalter konnten nicht gespeichert werden.");
      }
    });
  };

  async function copySessionLink(sessionId: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/session/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Session-Link kopiert.");
    } catch {
      toast.error("Link konnte nicht kopiert werden.");
    }
  }

  function renderScheduleEditButton(session: SessionItem) {
    if (!isGM || !canEditSessionSchedule(session.status)) return null;
    return (
      <button
        type="button"
        onClick={() => setEditingSession(session)}
        className="inline-flex items-center gap-1.5 rounded border border-hero-border/50 bg-hero-dark/50 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Termin ändern
      </button>
    );
  }

  function renderSessionActions(session: SessionItem) {
    const live = isSessionStatusLive(session.status);
    const scheduled = isSessionStatusScheduled(session.status);
    const canSchedule = canEditSessionSchedule(session.status);
    if (!isGM || (!scheduled && !live)) return null;
    return (
      <SessionActionsDropdown
        isStarting={isStarting}
        onEditSchedule={canSchedule ? () => setEditingSession(session) : undefined}
        canEditSchedule={canSchedule}
        onDelete={() => handleDelete(session.id)}
        onCancel={() => handleCancel(session.id)}
        onArchiveQuiet={
          scheduled ? () => handleArchiveQuiet(session.id) : undefined
        }
        onEnd={() => handleEndSession(session.id)}
        hasAcceptedRsvps={session.hasAcceptedRsvps}
        isLive={live}
        isScheduled={scheduled}
      />
    );
  }

  function renderScheduledGmControls(session: SessionItem) {
    if (!isGM || !isSessionStatusScheduled(session.status)) return null;
    if (!sessionSupportsLiveBoard(session.type)) {
      return (
        <p className="font-libre text-[10px] text-gray-500 italic max-w-xs text-right">
          Termin ohne Live-Bühne — Spieler melden sich per RSVP an.
        </p>
      );
    }
    return (
      <>
        <Link
          href={`/session/${session.id}`}
          className="inline-flex items-center gap-1 rounded border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:bg-accent-gold/20 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Vorbereiten
        </Link>
        <Link
          href={`/dashboard/campaigns/${campaignId}/sessions/${session.id}/stage-prep#szenen-mediathek`}
          className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-accent-gold hover:text-white transition-colors"
          title="Szenen-Bilder hochladen und ins Bühnendeck legen"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Szenen-Mediathek
        </Link>
        {session.canStart ? (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => handleStartSession(session.id)}
              disabled={isStarting}
              className="inline-flex items-center gap-1 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-background-dark hover:bg-hero-dark transition-colors disabled:opacity-50"
            >
              Session starten
            </button>
            {(session.pendingCount ?? 0) > 0 && (
              <span className="font-libre text-[10px] text-amber-400">
                Warnung: {session.pendingCount} ohne Zusage/Freigabe
              </span>
            )}
          </div>
        ) : (session.pendingCount ?? 0) === 0 && session.gm_prep_complete === false ? (
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
            <span
              className="inline-flex items-center gap-1 rounded bg-amber-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-amber-400 border border-amber-700/60"
              title="Vorbereitung abschließen, dann starten."
            >
              Planung offen
            </span>
            <button
              type="button"
              onClick={() => handleMarkPrepComplete(session.id)}
              disabled={isStarting}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-hero-vibrant hover:border-hero-vibrant disabled:opacity-50"
            >
              Planung abschließen
            </button>
          </div>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded bg-amber-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-amber-400 border border-amber-700/60"
            title="Jeder Spieler braucht eine Zusage (oder Via Online) oder deine manuelle Freigabe."
          >
            Noch {(session.pendingCount ?? 0)} Spieler ohne Zusage/Freigabe
          </span>
        )}
      </>
    );
  }

  const hasActiveFocus = focusSession != null;
  const hasOther = otherUpcomingSessions.length > 0;
  const hasPastRows = pastSessionRows.length > 0;
  const hasAnyUpcoming = hasActiveFocus || hasOther;

  return (
    <>
      <StartSessionBackgroundModal
        open={startBgSessionId != null}
        sessionId={startBgSessionId}
        onOpenChange={(open) => !open && setStartBgSessionId(null)}
        onStarted={(sid) => router.push(`/session/${sid}`)}
      />
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-hero-dark">
          <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-gold" />
            Termine
          </h2>
          {isGM && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(true)}
                className="flex items-center gap-1 rounded border border-hero-border bg-background-dark px-3 py-1.5 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:border-hero-vibrant transition-colors"
              >
                <Plus className="h-4 w-4" />
                Spielplanung
              </button>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1 rounded bg-hero-dark px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                Spielabend planen
              </button>
            </div>
          )}
        </div>

        {!hasAnyUpcoming ? (
          <p className="font-libre text-gray-400 text-center py-8">
            Kein aktiver oder geplanter Termin. Lege eine neue Session an oder öffne das Archiv.
          </p>
        ) : null}

        {focusSession ? (
          <div className="mb-8">
            {!isGM && latestPublishedPlayerRecap ? (
              <LastSessionRecapCard
                campaignId={campaignId}
                worldId={worldId}
                recap={latestPublishedPlayerRecap}
                className="mb-6"
              />
            ) : null}
            <p className="mb-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {isSessionStatusLive(focusSession.status)
                ? "Aktuell"
                : isScheduledInGraceOverdue(focusSession)
                  ? "Nächster Termin (Start liegt zurück — noch im Toleranzfenster)"
                  : "Nächster Termin"}
            </p>
            {(() => {
              const { formattedDate, formattedTime } = formatSessionDateTime(focusSession.start_time);
              const live = isSessionStatusLive(focusSession.status);
              const scheduled = isSessionStatusScheduled(focusSession.status);
              const graceOverdue = isScheduledInGraceOverdue(focusSession);
              const borderClass = sessionCardBorderClass(focusSession);
              const CardInner = (
                <div
                  className={`relative overflow-hidden rounded-xl border-2 bg-background-dark p-6 md:p-8 ${borderClass}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      {live ? (
                        <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/70 bg-red-950/50 px-3 py-1 font-barlow text-[10px] font-extrabold uppercase tracking-widest text-red-200">
                          <Radio className="h-3.5 w-3.5 animate-pulse text-red-400" />
                          Jetzt live
                        </span>
                      ) : null}
                      {scheduled && graceOverdue ? (
                        <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-600/70 bg-amber-950/40 px-3 py-1 font-barlow text-[10px] font-extrabold uppercase tracking-widest text-amber-100">
                          Überfällig (noch startbar, 24h-Toleranz)
                        </span>
                      ) : null}
                      <h3 className="font-cinzel text-2xl font-bold text-white md:text-3xl">
                        {focusSession.title || "Session"}
                      </h3>
                      <p className="mt-2 font-barlow text-sm uppercase text-accent-gold">
                        {formattedDate} · {formattedTime} Uhr
                      </p>
                      {scheduled && isGM ? (
                        <div className="mt-2">{renderScheduleEditButton(focusSession)}</div>
                      ) : null}
                      <p className="mt-1 font-libre text-xs text-gray-500">
                        {getSessionTypeLabel(focusSession.type)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                      {renderSessionActions(focusSession)}
                      {isGM && live && sessionSupportsLiveBoard(focusSession.type) ? (
                        <button
                          type="button"
                          onClick={() => void copySessionLink(focusSession.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent-gold/60 bg-accent-gold/10 px-4 py-2.5 font-barlow text-xs font-extrabold uppercase text-accent-gold hover:bg-accent-gold/20"
                        >
                          <Copy className="h-4 w-4" />
                          Session-Link kopieren
                        </button>
                      ) : null}
                      {live && canJoinSession && sessionSupportsLiveBoard(focusSession.type) ? (
                        <button
                          type="button"
                          onClick={() => handleJoinLive(focusSession.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-6 py-3 font-barlow text-sm font-extrabold uppercase tracking-wide text-white shadow-lg hover:bg-red-600"
                        >
                          Sitzung beitreten
                        </button>
                      ) : live && !canJoinSession && sessionSupportsLiveBoard(focusSession.type) ? (
                        <span className="font-libre text-xs text-gray-500 italic">
                          Freischaltung ausstehend (Charakter Status Active).
                        </span>
                      ) : null}
                      {scheduled && isGM ? renderScheduledGmControls(focusSession) : null}
                    </div>
                  </div>
                  {isGM && (scheduled || live) && sessionSupportsLiveBoard(focusSession.type) ? (
                    <div className="mt-4 border-t border-hero-border/30 pt-4">
                      <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                        Platzhalter am Tisch
                      </p>
                      <p className="mt-1 font-libre text-xs text-gray-500">
                        Rein physisch — wie in der Live-Session: kein Account, kein Rucksack, kein
                        Tracking.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/40 p-1">
                          <button
                            type="button"
                            disabled={isStarting || (focusSession.planning_dummy_player_count ?? 0) <= 0}
                            onClick={() =>
                              handlePlanningDummy(
                                focusSession.id,
                                Math.max(
                                  0,
                                  (Math.round(Number(focusSession.planning_dummy_player_count ?? 0)) ||
                                    0) - 1,
                                ),
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded font-barlow text-lg font-bold text-white hover:bg-hero-dark disabled:opacity-40"
                            aria-label="Platzhalter entfernen"
                          >
                            −
                          </button>
                          <span className="min-w-[3.5rem] text-center font-barlow text-sm font-bold text-accent-gold">
                            {Math.min(
                              3,
                              Math.max(
                                0,
                                Math.round(Number(focusSession.planning_dummy_player_count ?? 0)) || 0,
                              ),
                            )}{" "}
                            / 3
                          </span>
                          <button
                            type="button"
                            disabled={isStarting || (focusSession.planning_dummy_player_count ?? 0) >= 3}
                            onClick={() =>
                              handlePlanningDummy(
                                focusSession.id,
                                Math.min(
                                  3,
                                  (Math.round(Number(focusSession.planning_dummy_player_count ?? 0)) ||
                                    0) + 1,
                                ),
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded font-barlow text-lg font-bold text-white hover:bg-hero-dark disabled:opacity-40"
                            aria-label="Platzhalter hinzufügen"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {isGM && scheduled && sessionSupportsLiveBoard(focusSession.type) ? (
                    <div className="mt-4 border-t border-hero-border/30 pt-4">
                      <SessionChronistModeControl
                        sessionId={focusSession.id}
                        initialMode={parseTranscriptionMode(focusSession.transcription_mode)}
                        variant="compact"
                        onModeChange={() => router.refresh()}
                      />
                    </div>
                  ) : null}
                </div>
              );

              return live ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, scale: [1, 1.012, 1] }}
                  transition={{
                    opacity: { duration: 0.35 },
                    y: { duration: 0.35 },
                    scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="rounded-xl shadow-[0_0_28px_rgba(220,38,38,0.25)]"
                >
                  {CardInner}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {CardInner}
                </motion.div>
              );
            })()}
          </div>
        ) : null}

        {hasOther ? (
          <div className="mb-8">
            <h3 className="mb-3 font-barlow text-xs font-bold uppercase text-gray-500">Weitere geplante Termine</h3>
            <div className="space-y-2">
              {otherUpcomingSessions.map((session) => {
                const { formattedDate, formattedTime } = formatSessionDateTime(session.start_time);
                const live = isSessionStatusLive(session.status);
                const scheduled = isSessionStatusScheduled(session.status);
                const graceOverdue = isScheduledInGraceOverdue(session);
                const rowBorder = sessionCardBorderClass(session);
                return (
                  <div
                    key={session.id}
                    className={`flex flex-col gap-3 rounded-lg border-2 bg-background-dark/90 p-3 ${rowBorder}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {graceOverdue && scheduled ? (
                        <p className="mb-1 font-barlow text-[9px] font-bold uppercase text-amber-400">
                          Überfällig (Toleranzfenster)
                        </p>
                      ) : null}
                      <p className="font-barlow font-bold text-sm text-white">
                        {session.title || "Session"} · {formattedDate} · {formattedTime}
                      </p>
                      {scheduled && isGM ? (
                        <div className="mt-1.5">{renderScheduleEditButton(session)}</div>
                      ) : null}
                      <span
                        className={`mt-1 inline-block rounded px-2 py-0.5 font-barlow text-[9px] font-bold uppercase ${
                          live ? "bg-red-900/40 text-red-200" : graceOverdue ? "bg-amber-900/40 text-amber-100" : "bg-emerald-900/30 text-emerald-200"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {renderSessionActions(session)}
                      {live && canJoinSession && sessionSupportsLiveBoard(session.type) ? (
                        <button
                          type="button"
                          onClick={() => handleJoinLive(session.id)}
                          className="rounded bg-red-900/60 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-red-100 hover:bg-red-800"
                        >
                          Beitreten
                        </button>
                      ) : null}
                      {scheduled && isGM ? renderScheduledGmControls(session) : null}
                    </div>
                    </div>
                    {scheduled && isGM && sessionSupportsLiveBoard(session.type) ? (
                      <SessionChronistModeControl
                        sessionId={session.id}
                        initialMode={parseTranscriptionMode(session.transcription_mode)}
                        variant="compact"
                        onModeChange={() => router.refresh()}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {(hasPastRows || archives.length > 0) && (
          <div className="mt-6 border-t border-hero-dark/60 pt-4">
            <button
              type="button"
              onClick={() => setArchiveOpen((o) => !o)}
              className="mb-3 flex w-full items-center justify-between rounded-lg border border-hero-border/40 bg-background-dark/60 px-4 py-3 font-barlow text-sm font-bold uppercase text-gray-300 hover:border-accent-gold/40 hover:text-accent-gold"
            >
              <span>Vergangene Sessions / Archiv</span>
              {archiveOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {archiveOpen ? (
              <div className="space-y-4">
                {hasPastRows ? (
                  <ul className="space-y-2">
                    {pastSessionRows.map((session) => {
                      const { formattedDate, formattedTime } = formatSessionDateTime(session.start_time);
                      const label = pastSessionStatusLabel(session);
                      return (
                        <li
                          key={session.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-hero-dark/50 bg-black/25 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-barlow text-xs font-bold text-gray-300">
                              {session.title || "Session"}
                            </p>
                            <p className="font-libre text-[10px] text-gray-500">
                              {formattedDate} {formattedTime} · {label}
                            </p>
                          </div>
                          {isGM && isSessionStatusScheduled(session.status) ? (
                            <SessionActionsDropdown
                              isStarting={isStarting}
                              onEditSchedule={() => setEditingSession(session)}
                              canEditSchedule
                              onDelete={() => handleDelete(session.id)}
                              hasAcceptedRsvps={session.hasAcceptedRsvps}
                              isScheduled
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {archives.length > 0 ? (
                  <PastSessionsGallery
                    campaignId={campaignId}
                    worldId={worldId}
                    isGM={isGM}
                    archives={archives}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {!hasPastRows && archives.length > 0 && !hasAnyUpcoming ? (
          <PastSessionsGallery
            campaignId={campaignId}
            worldId={worldId}
            isGM={isGM}
            archives={archives}
          />
        ) : null}
      </div>

      {isGM && (
        <>
          <SessionWizardModal
            campaignId={campaignId}
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            locations={locations}
            npcs={npcs}
            onSuccess={handleSuccess}
          />
          <CampaignEventModal
            campaignId={campaignId}
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            onSuccess={handleSuccess}
          />
          {editingSession && (
            <SessionEditModal
              session={editingSession}
              campaignId={campaignId}
              isOpen={!!editingSession}
              onClose={() => setEditingSession(null)}
              onSuccess={handleSuccess}
            />
          )}
          <SessionEndWrapUpModal
            open={wrapUpSessionId != null}
            onClose={() => setWrapUpSessionId(null)}
            sessionId={wrapUpSessionId ?? ""}
            campaignId={campaignId}
            isRecordingActive={false}
            onComplete={(path) => {
              setWrapUpSessionId(null);
              router.push(path);
            }}
          />
        </>
      )}
    </>
  );
}
