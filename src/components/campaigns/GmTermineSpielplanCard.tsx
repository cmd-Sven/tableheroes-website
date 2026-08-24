"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Monitor,
  XCircle,
  Loader2,
  Rocket,
  ClipboardList,
  Sparkles,
  LayoutGrid,
  Wand2,
  UserCheck,
  UserMinus,
  Archive,
} from "lucide-react";
import {
  archiveScheduledSessionQuietly,
  cancelSession,
  markSessionPlanningComplete,
  setPlanningDummyPlayerCount,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { StartSessionBackgroundModal } from "@/src/components/dashboard/StartSessionBackgroundModal";
import { setGmConfirmed } from "@/src/app/dashboard/campaigns/[id]/session-rsvp-actions";
import {
  applyGmConfirmToTerminePlayer,
  countTerminePendingPlayers,
} from "@/src/lib/session-rsvp/gm-confirm-optimistic";
import { isSessionStatusLive, isSessionStatusScheduled } from "@/src/lib/session-status";
import { APP_TIMEZONE } from "@/src/lib/datetime/berlin";

export type GmTerminePlayerRsvp = {
  userId: string;
  username: string;
  characterName?: string | null;
  status: "zusage" | "via_online" | "absage" | "offen" | "gm_override";
  label: string;
  /** GM kann Spieler ohne Zusage (oder nach Absage) für den Start freigeben */
  canGmManuallyConfirm?: boolean;
};

export type GmTermineNextSession = {
  id: string;
  title: string | null;
  startTime: string;
  status: string;
  rsvpDeadlineDays: number | null;
  isLive: boolean;
  canStart: boolean;
  pendingCount: number;
  /** false solange GM die Planung nicht abgeschlossen hat (neue Termine) */
  gmPrepComplete: boolean;
  /** Physische Platzhalter am Tisch (wie Live-Session), 0–3 */
  planningDummySlotCount: number;
};

type Props = {
  campaignId: string;
  nextSession: GmTermineNextSession | null;
  players: GmTerminePlayerRsvp[];
};

function formatSessionDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function deadlineSummary(startTime: string, days: number | null): string {
  if (days == null || Number.isNaN(days)) {
    return "Anmeldefrist: nicht gesetzt (Spieler können bis zum Termin zu- oder absagen).";
  }
  const start = new Date(startTime);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - days);
  const formatted = new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(deadline);
  return `Anmeldefrist: ${days} Tag(e) vor dem Termin · Rückmeldung bis ${formatted} Uhr`;
}

function RsvpIcon({ status }: { status: GmTerminePlayerRsvp["status"] }) {
  switch (status) {
    case "zusage":
    case "via_online":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />;
    case "gm_override":
      return <UserCheck className="h-4 w-4 shrink-0 text-accent-gold" />;
    case "absage":
      return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
    default:
      return <CircleDashed className="h-4 w-4 shrink-0 text-amber-400" />;
  }
}

const cardClass =
  "rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg";

export function GmTermineSpielplanCard({ campaignId, nextSession, players }: Props) {
  const router = useRouter();
  const [startBgSessionId, setStartBgSessionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);
  const [playersLocal, setPlayersLocal] = useState(players);
  const [nextSessionLocal, setNextSessionLocal] = useState(nextSession);
  const [dummyLocal, setDummyLocal] = useState(nextSession?.planningDummySlotCount ?? 0);

  useEffect(() => {
    if (confirmingUserId) return;
    setPlayersLocal(players);
  }, [players, confirmingUserId]);

  useEffect(() => {
    if (confirmingUserId) return;
    setNextSessionLocal(nextSession);
  }, [nextSession, confirmingUserId]);

  useEffect(() => {
    setDummyLocal(nextSession?.planningDummySlotCount ?? 0);
  }, [nextSession?.id, nextSession?.planningDummySlotCount]);

  const base = `/dashboard/campaigns/${campaignId}`;
  const scheduleUrl = `${base}/schedule`;

  const handleStart = (sessionId: string) => {
    if (isPending) return;
    setStartBgSessionId(sessionId);
  };

  const handlePrepComplete = (sessionId: string) => {
    if (isPending) return;
    startTransition(async () => {
      try {
        await markSessionPlanningComplete(sessionId);
        router.refresh();
      } catch (err: unknown) {
        alert(
          err instanceof Error ? err.message : "Planung konnte nicht gespeichert werden.",
        );
      }
    });
  };

  const handleGmConfirmPlayer = (sessionId: string, playerUserId: string) => {
    if (confirmingUserId) return;

    const rollbackPlayers = playersLocal;
    const rollbackSession = nextSessionLocal;

    setPlayersLocal((prev) => {
      const nextPlayers = prev.map((p) =>
        p.userId === playerUserId ? applyGmConfirmToTerminePlayer(p) : p,
      );
      const pending = countTerminePendingPlayers(nextPlayers);
      setNextSessionLocal((current) =>
        current
          ? {
              ...current,
              pendingCount: pending,
              canStart: pending === 0 && current.gmPrepComplete,
            }
          : current,
      );
      return nextPlayers;
    });

    setConfirmingUserId(playerUserId);
    void (async () => {
      try {
        const res = await setGmConfirmed(sessionId, playerUserId, true);
        if (!res.success) {
          throw new Error(res.error ?? "Bestätigung fehlgeschlagen.");
        }
        toast.success("Spieler als dabei markiert.");
      } catch (err: unknown) {
        setPlayersLocal(rollbackPlayers);
        setNextSessionLocal(rollbackSession);
        toast.error(
          err instanceof Error ? err.message : "Bestätigung fehlgeschlagen.",
        );
      } finally {
        setConfirmingUserId(null);
      }
    })();
  };

  const bumpDummy = (delta: number) => {
    if (!nextSessionLocal?.id || isPending) return;
    const sid = nextSessionLocal.id;
    const next = Math.min(3, Math.max(0, dummyLocal + delta));
    if (next === dummyLocal) return;
    startTransition(async () => {
      try {
        await setPlanningDummyPlayerCount(sid, next);
        setDummyLocal(next);
        toast.success("Platzhalter gespeichert.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  const handleCancelSession = () => {
    if (!nextSessionLocal?.id || isPending) return;
    if (
      !window.confirm(
        "Termin absagen? Nur Spieler mit Zusage oder „Via Online“ erhalten eine Nachricht in ihrer Nachrichten-Karte.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await cancelSession(nextSessionLocal.id);
        toast.success("Termin wurde abgesagt.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Absage fehlgeschlagen.");
      }
    });
  };

  const handleArchiveQuiet = () => {
    if (!nextSessionLocal?.id || isPending) return;
    if (
      !window.confirm(
        "Diesen Termin ohne Benachrichtigung an Spieler archivieren? Er verschwindet aus der Übersicht (Status: abgeschlossen).",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await archiveScheduledSessionQuietly(nextSessionLocal.id);
        toast.success("Termin wurde archiviert.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Archivieren fehlgeschlagen.");
      }
    });
  };

  const responded = playersLocal.filter((p) => p.status !== "offen").length;
  const open = playersLocal.filter((p) => p.status === "offen").length;
  const sched = nextSessionLocal ? isSessionStatusScheduled(nextSessionLocal.status) : false;
  const liveNs = nextSessionLocal ? isSessionStatusLive(nextSessionLocal.status) : false;

  return (
    <div className={`${cardClass} lg:col-span-2 xl:col-span-3`}>
      <StartSessionBackgroundModal
        open={startBgSessionId != null}
        sessionId={startBgSessionId}
        onOpenChange={(open) => !open && setStartBgSessionId(null)}
        onStarted={(sid) => {
          router.push(`/session/${sid}`);
          setStartBgSessionId(null);
        }}
      />
      <div className="flex flex-col gap-4 border-b border-hero-border pb-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarClock className="h-6 w-6 shrink-0 text-accent-gold mt-0.5" />
          <div>
            <h2 className="font-cinzel font-bold text-xl text-accent-gold mb-1">
              Termine &amp; Spielplan
            </h2>
            <p className="font-libre text-sm text-gray-400">
              Nächster Termin, Anmeldefrist und Rückmeldungen deiner Spieler.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {sched && nextSessionLocal && (
            <>
              <Link
                href={`/session/${nextSessionLocal.id}`}
                className="inline-flex items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Tisch vorbereiten &amp; testen
              </Link>
              {nextSessionLocal.isLive && (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/sessions/${nextSessionLocal.id}/stage-prep#szenen-mediathek`}
                  className="inline-flex items-center justify-center gap-2 rounded border border-hero-border/50 bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-accent-gold hover:text-white transition-colors"
                  title="Szenen-Bilder hochladen und ins Bühnendeck legen"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Szenen-Mediathek
                </Link>
              )}
            </>
          )}
          {!nextSessionLocal ? (
            <Link
              href={scheduleUrl}
              className="inline-flex items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/15 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/25 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Session vorbereiten &amp; planen
            </Link>
          ) : liveNs ? (
            <Link
              href={`/session/${nextSessionLocal!.id}`}
              className="inline-flex items-center justify-center gap-2 rounded border border-red-600/60 bg-red-900/30 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-red-200 hover:bg-red-900/50 transition-colors"
            >
              <Monitor className="h-4 w-4" />
              Zur Live-Session
            </Link>
          ) : sched && nextSessionLocal?.canStart ? (
            <button
              type="button"
              onClick={() => handleStart(nextSessionLocal.id)}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Session starten
            </button>
          ) : sched &&
            nextSessionLocal &&
            nextSessionLocal.pendingCount === 0 &&
            !nextSessionLocal.gmPrepComplete ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <span className="rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 font-barlow text-xs uppercase text-amber-200 text-center sm:text-right">
                Planung offen: Kartensatz, Szenen &amp; Co. vorbereiten, dann abschließen.
              </span>
              <button
                type="button"
                onClick={() => handlePrepComplete(nextSessionLocal.id)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded border border-hero-border bg-hero-dark px-5 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:border-hero-vibrant hover:bg-background-dark transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
                Planung abschließen
              </button>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-600 bg-gray-800/50 px-5 py-2.5 font-barlow font-bold uppercase text-xs text-gray-500 cursor-not-allowed"
                title="Erst Planung abschließen, dann Session starten."
              >
                Session starten
              </button>
            </div>
          ) : sched && nextSessionLocal ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <span className="rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 font-barlow text-xs uppercase text-amber-200 text-center sm:text-right">
                {nextSessionLocal.pendingCount === 1
                  ? "Es fehlt noch 1 Spieler"
                  : `Es fehlen noch ${nextSessionLocal.pendingCount} Spieler`}{" "}
                (Zusage oder deine Freigabe unten)
              </span>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-600 bg-gray-800/50 px-5 py-2.5 font-barlow font-bold uppercase text-xs text-gray-500 cursor-not-allowed"
                title="Alle Spieler müssen zugesagt haben oder du markierst sie in der Liste als dabei."
              >
                Session starten
              </button>
            </div>
          ) : (
            <Link
              href={scheduleUrl}
              className="inline-flex items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/15 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/25 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Termine verwalten
            </Link>
          )}

          <Link
            href={scheduleUrl}
            className="inline-flex items-center justify-center gap-1 font-barlow text-xs uppercase text-gray-500 hover:text-hero-vibrant transition-colors"
          >
            NPCs, Szenen, Lore &amp; Co. – Vorbereitung &amp; alle Termine
          </Link>
        </div>
      </div>

      {!nextSessionLocal ? (
        <div className="rounded border border-hero-border/30 bg-background-dark p-4">
          <p className="font-libre text-sm text-gray-400">
            Es ist noch kein Termin geplant. Unter{" "}
            <strong className="text-gray-300">Session vorbereiten &amp; planen</strong> legst du
            Sitzungen an und kannst NPCs, Hintergründe, Lore und Fraktionen für den Abend
            vorbereiten.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-hero-border/40 bg-background-dark p-4">
            <p className="font-barlow font-bold text-lg text-white">
              {nextSessionLocal.title?.trim() || "Nächste Session"}
            </p>
            <p className="font-libre text-sm text-gray-300 mt-1">
              {formatSessionDate(nextSessionLocal.startTime)} Uhr
            </p>
            <p
              className={`font-libre text-xs mt-2 ${
                nextSessionLocal.isLive ? "text-amber-200/90" : "text-gray-500"
              }`}
            >
              {nextSessionLocal.isLive
                ? "Modus: Tisch vor Ort – maximal ein Spieler kann „Via Online“ zuschalten."
                : "Modus: Online-Sitzung (ohne begrenzten Hybrid-Platz)."}
            </p>
            {sched && (
              <p className="font-libre text-sm text-accent-gold/90 mt-3 border-t border-hero-border/30 pt-3">
                {deadlineSummary(nextSessionLocal.startTime, nextSessionLocal.rsvpDeadlineDays)}
              </p>
            )}
            {sched && !nextSessionLocal.gmPrepComplete ? (
              <Link
                href={scheduleUrl}
                className="mt-3 inline-flex items-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                Session mit KI ausarbeiten
              </Link>
            ) : null}
          </div>

          {liveNs ? (
            <p className="font-libre text-sm text-gray-500">
              Diese Sitzung läuft bereits. Rückmeldungen bezogen sich auf den Start des
              Termins; zur Nachbereitung nutze die Session-Ansicht.
            </p>
          ) : playersLocal.length > 0 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="font-barlow font-bold text-xs uppercase text-gray-500">
                  Rückmeldungen ({responded} von {playersLocal.length} · {open} offen)
                </h3>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {playersLocal.map((p) => (
                  <li
                    key={p.userId}
                    className="flex flex-wrap items-center gap-2 rounded border border-hero-border/25 bg-hero-dark/20 px-3 py-2"
                  >
                    <RsvpIcon status={p.status} />
                    <span className="font-barlow text-sm text-white truncate min-w-0 flex-1 basis-[40%]">
                      {p.characterName?.trim() || p.username}
                      {p.characterName?.trim() &&
                      p.username &&
                      p.characterName.trim() !== p.username ? (
                        <span className="font-libre text-xs text-gray-500">
                          {" "}
                          · {p.username}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`font-libre text-xs shrink-0 ${
                        p.status === "offen" ? "text-amber-400" : "text-gray-400"
                      }`}
                    >
                      {p.label}
                    </span>
                    {p.canGmManuallyConfirm && sched && nextSessionLocal?.id ? (
                      <button
                        type="button"
                        onClick={() => handleGmConfirmPlayer(nextSessionLocal.id, p.userId)}
                        disabled={confirmingUserId === p.userId}
                        className="ml-auto inline-flex min-w-[7.5rem] items-center justify-center gap-1 shrink-0 rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                      >
                        {confirmingUserId === p.userId ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            Speichern…
                          </>
                        ) : (
                          "Als dabei markieren"
                        )}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {playersLocal.length === 0 && sched && (
            <p className="font-libre text-sm text-gray-500 italic">
              Keine bestätigten Spieler in der Kampagne – Rückmeldungen erscheinen, sobald
              Teilnehmer akzeptiert sind.
            </p>
          )}

          {nextSessionLocal && (sched || liveNs) ? (
            <div className="space-y-3 rounded border border-hero-border/30 bg-background-dark/60 p-4">
              <div>
                <h3 className="font-barlow font-bold text-xs uppercase text-gray-500">
                  Platzhalter am Tisch
                </h3>
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Wie in der Live-Session: nur physisch am Tisch, ohne Account, ohne Rucksack,
                  ohne Protokollierung.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/40 p-1">
                    <button
                      type="button"
                      disabled={isPending || dummyLocal <= 0}
                      onClick={() => bumpDummy(-1)}
                      className="grid h-8 w-8 place-items-center rounded font-barlow text-lg font-bold text-white hover:bg-hero-dark disabled:opacity-40"
                      aria-label="Platzhalter entfernen"
                    >
                      −
                    </button>
                    <span className="min-w-[3.5rem] text-center font-barlow text-sm font-bold text-accent-gold">
                      {dummyLocal} / 3
                    </span>
                    <button
                      type="button"
                      disabled={isPending || dummyLocal >= 3}
                      onClick={() => bumpDummy(1)}
                      className="grid h-8 w-8 place-items-center rounded font-barlow text-lg font-bold text-white hover:bg-hero-dark disabled:opacity-40"
                      aria-label="Platzhalter hinzufügen"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              {dummyLocal > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: dummyLocal }, (_, i) => (
                    <li
                      key={`dummy-${i}`}
                      className="flex flex-col gap-0.5 rounded border border-dashed border-amber-800/50 bg-amber-950/20 px-3 py-2"
                    >
                      <span className="font-barlow text-sm text-amber-100/95">
                        Platzhalter {i + 1}
                      </span>
                      <span className="font-libre text-[11px] text-gray-500">
                        Kein Account · kein Rucksack · kein Tracking
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {sched ? (
                <div className="flex flex-col gap-2 border-t border-hero-border/25 pt-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCancelSession}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded border border-amber-800/60 bg-amber-950/35 px-4 py-2.5 font-barlow text-xs font-bold uppercase text-amber-100 hover:bg-amber-950/55 disabled:opacity-50 sm:min-w-[12rem]"
                  >
                    <UserMinus className="h-4 w-4 shrink-0" aria-hidden />
                    Termin absagen
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleArchiveQuiet}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded border border-hero-border/60 bg-background-dark px-4 py-2.5 font-barlow text-xs font-bold uppercase text-gray-200 hover:border-hero-vibrant hover:text-white disabled:opacity-50 sm:min-w-[12rem]"
                  >
                    <Archive className="h-4 w-4 shrink-0" aria-hidden />
                    Archivieren (ohne Nachricht)
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
