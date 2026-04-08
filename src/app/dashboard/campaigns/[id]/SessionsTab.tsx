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
} from "lucide-react";
import { SessionWizardModal } from "@/src/components/dashboard/SessionWizardModal";
import { SessionEditModal } from "@/src/components/dashboard/SessionEditModal";
import { useRouter } from "next/navigation";
import {
  deleteSession,
  cancelSession,
  endSession,
  markSessionPlanningComplete,
} from "./session-actions";
import { StartSessionBackgroundModal } from "@/src/components/dashboard/StartSessionBackgroundModal";

type SessionItem = {
  id: string;
  title: string | null;
  start_time: string;
  end_time?: string | null;
  type: string;
  status: string;
  canStart?: boolean;
  pendingCount?: number;
  /** true wenn mindestens ein Spieler mit Zusage/Via Online */
  hasAcceptedRsvps?: boolean;
  /** false = GM muss Planung abschließen (neue Termine); undefined = ältere Daten ohne Spalte */
  gm_prep_complete?: boolean;
};

/** Dropdown mit Bearbeiten/Löschen/Absagen/Beenden für GM */
function SessionActionsDropdown({
  isStarting,
  onEdit,
  onDelete,
  onCancel,
  onEnd,
  hasAcceptedRsvps,
  isLive,
}: {
  isStarting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel?: () => void;
  onEnd?: () => void;
  /** true = nur Absagen möglich, false = Löschen möglich */
  hasAcceptedRsvps?: boolean;
  /** true = Live-Session, nur „Session beenden“ anzeigen */
  isLive?: boolean;
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
              {hasAcceptedRsvps && onCancel ? (
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
                  Absagen
                </button>
              ) : (
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  campaignId: string;
  isGM: boolean;
  /** Spieler: Nur bei Status 'Active' darf der Spieler Sessions betreten. */
  characterStatus?: string;
  upcomingSessions: Array<SessionItem>;
  locations: Array<{ id: string; name: string; type: string }>;
  npcs: Array<{ id: string; name: string; title: string | null }>;
};

export function SessionsTab({ campaignId, isGM, characterStatus, upcomingSessions, locations, npcs }: Props) {
  const canJoinSession = isGM || characterStatus === "Active";
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [startBgSessionId, setStartBgSessionId] = useState<string | null>(null);
  const [isStarting, startTransition] = useTransition();
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
    if (!confirm("Termin absagen? Zugesagte Spieler erhalten eine Benachrichtigung in ihrer Nachrichten-Karte.")) return;
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
    if (!confirm("Session beenden? Das Journal wird ins Logbuch übernommen.")) return;
    startTransition(async () => {
      try {
        await endSession(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Fehler beim Beenden der Session.");
      }
    });
  };

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
            Nächste Sessions
          </h2>
          {isGM && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1 rounded bg-hero-dark px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              🪄 Session planen
            </button>
          )}
        </div>

        {!upcomingSessions || upcomingSessions.length === 0 ? (
          <p className="font-libre text-gray-400 text-center py-8">
            Noch keine geplanten Sessions.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const startDate = new Date(session.start_time);
              const formattedDate = new Intl.DateTimeFormat("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(startDate);
              const formattedTime = new Intl.DateTimeFormat("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(startDate);

              const isLive = session.status === "Live";
              const isScheduled = session.status === "Scheduled";
              const isEnded =
                session.status === "Completed" || session.status === "Ended";

              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded border bg-background-dark p-4 transition-colors group ${
                    isLive
                      ? "border-red-700/70 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      : "border-hero-border/30 hover:border-hero-vibrant"
                  }`}
                >
                  <div>
                    <p className="font-barlow font-bold text-white group-hover:text-hero-vibrant transition-colors">
                      {session.title || "Session"} • {formattedDate} • {formattedTime} Uhr
                    </p>
                    <p className="font-libre text-xs text-gray-500">
                      {session.type === "GameSession" ? "Spielabend" : session.type}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {isGM && (isScheduled || isEnded || isLive) && (
                      <SessionActionsDropdown
                        isStarting={isStarting}
                        onEdit={() => setEditingSession(session)}
                        onDelete={() => handleDelete(session.id)}
                        onCancel={() => handleCancel(session.id)}
                        onEnd={() => handleEndSession(session.id)}
                        hasAcceptedRsvps={session.hasAcceptedRsvps}
                        isLive={isLive}
                      />
                    )}
                    <span
                      className={`rounded px-2 py-1 font-barlow font-bold uppercase text-xs ${
                        isLive
                          ? "bg-red-900/40 text-red-300 border border-red-600/70"
                          : isScheduled
                          ? "bg-blue-900/30 text-blue-400 border border-blue-700/60"
                          : "bg-gray-700/30 text-gray-400 border border-gray-600/60"
                      }`}
                    >
                      {session.status}
                    </span>

                    {isLive && (
                      canJoinSession ? (
                        <button
                          type="button"
                          onClick={() => handleJoinLive(session.id)}
                          className="inline-flex items-center gap-1 rounded bg-red-900/60 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-red-200 hover:bg-red-800/80 transition-colors animate-pulse"
                        >
                          🔴 Laufender Session beitreten
                        </button>
                      ) : (
                        <span className="font-libre text-[10px] text-gray-500 italic" title="Charakter muss vom GM freigeschaltet sein (Status Active).">
                          Freischaltung ausstehend
                        </span>
                      )
                    )}

                    {isScheduled && isGM && (
                      <Link
                        href={`/session/${session.id}`}
                        className="inline-flex items-center gap-1 rounded border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:bg-accent-gold/20 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Vorbereiten
                      </Link>
                    )}

                    {isScheduled && isGM && (
                      session.canStart ? (
                        <button
                          type="button"
                          onClick={() => handleStartSession(session.id)}
                          disabled={isStarting}
                          className="inline-flex items-center gap-1 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-background-dark hover:bg-hero-dark transition-colors disabled:opacity-50"
                        >
                          🚀 Session starten
                        </button>
                      ) : (session.pendingCount ?? 0) === 0 &&
                        session.gm_prep_complete === false ? (
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
                          title="Jeder Spieler braucht eine Zusage (oder Via Online) oder deine manuelle Freigabe in der Übersicht „Termine & Spielplan“."
                        >
                          Noch {(session.pendingCount ?? 0)} Spieler ohne Zusage/Freigabe
                        </span>
                      )
                    )}

                    {isEnded && !isLive && (
                      <span className="font-libre text-[11px] text-gray-500">
                        Beendet
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          {editingSession && (
            <SessionEditModal
              session={editingSession}
              campaignId={campaignId}
              isOpen={!!editingSession}
              onClose={() => setEditingSession(null)}
              onSuccess={handleSuccess}
            />
          )}
        </>
      )}
    </>
  );
}

