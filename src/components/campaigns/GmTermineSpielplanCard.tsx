"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  startSession,
  markSessionPlanningComplete,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";

export type GmTerminePlayerRsvp = {
  userId: string;
  username: string;
  status: "zusage" | "via_online" | "absage" | "offen";
  label: string;
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
};

type Props = {
  campaignId: string;
  nextSession: GmTermineNextSession | null;
  players: GmTerminePlayerRsvp[];
};

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function deadlineSummary(startTime: string, days: number | null): string {
  if (days == null || Number.isNaN(days)) {
    return "Anmeldefrist: nicht gesetzt (Spieler können bis zum Termin zu- oder absagen).";
  }
  const start = new Date(startTime);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - days);
  const formatted = new Intl.DateTimeFormat("de-DE", {
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
  const [isPending, startTransition] = useTransition();
  const base = `/dashboard/campaigns/${campaignId}`;
  const scheduleUrl = `${base}/schedule`;

  const handleStart = (sessionId: string) => {
    if (isPending) return;
    startTransition(async () => {
      try {
        await startSession(sessionId);
        router.push(`/session/${sessionId}`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Session konnte nicht gestartet werden.");
      }
    });
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

  const responded = players.filter((p) => p.status !== "offen").length;
  const open = players.filter((p) => p.status === "offen").length;

  return (
    <div className={`${cardClass} lg:col-span-2 xl:col-span-3`}>
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
          {nextSession?.status === "Scheduled" && (
            <Link
              href={`/session/${nextSession.id}`}
              className="inline-flex items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-accent-gold/20 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Tisch vorbereiten &amp; testen
            </Link>
          )}
          {!nextSession ? (
            <Link
              href={scheduleUrl}
              className="inline-flex items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/15 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/25 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Session vorbereiten &amp; planen
            </Link>
          ) : nextSession.status === "Live" ? (
            <Link
              href={`/session/${nextSession.id}`}
              className="inline-flex items-center justify-center gap-2 rounded border border-red-600/60 bg-red-900/30 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-red-200 hover:bg-red-900/50 transition-colors"
            >
              <Monitor className="h-4 w-4" />
              Zur Live-Session
            </Link>
          ) : nextSession.status === "Scheduled" && nextSession.canStart ? (
            <button
              type="button"
              onClick={() => handleStart(nextSession.id)}
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
          ) : nextSession.status === "Scheduled" &&
            nextSession.pendingCount === 0 &&
            !nextSession.gmPrepComplete ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <span className="rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 font-barlow text-xs uppercase text-amber-200 text-center sm:text-right">
                Planung offen: Kartensatz, Szenen &amp; Co. vorbereiten, dann abschließen.
              </span>
              <button
                type="button"
                onClick={() => handlePrepComplete(nextSession.id)}
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
          ) : nextSession.status === "Scheduled" ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <span className="rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 font-barlow text-xs uppercase text-amber-200 text-center sm:text-right">
                Noch {nextSession.pendingCount}{" "}
                {nextSession.pendingCount === 1 ? "Rückmeldung" : "Rückmeldungen"} offen
              </span>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-600 bg-gray-800/50 px-5 py-2.5 font-barlow font-bold uppercase text-xs text-gray-500 cursor-not-allowed"
                title="Alle Spieler müssen zuerst zu- oder absagen."
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

      {!nextSession ? (
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
              {nextSession.title?.trim() || "Nächste Session"}
            </p>
            <p className="font-libre text-sm text-gray-300 mt-1">
              {formatSessionDate(nextSession.startTime)} Uhr
            </p>
            <p
              className={`font-libre text-xs mt-2 ${
                nextSession.isLive ? "text-amber-200/90" : "text-gray-500"
              }`}
            >
              {nextSession.isLive
                ? "Modus: Tisch vor Ort – maximal ein Spieler kann „Via Online“ zuschalten."
                : "Modus: Online-Sitzung (ohne begrenzten Hybrid-Platz)."}
            </p>
            {nextSession.status === "Scheduled" && (
              <p className="font-libre text-sm text-accent-gold/90 mt-3 border-t border-hero-border/30 pt-3">
                {deadlineSummary(nextSession.startTime, nextSession.rsvpDeadlineDays)}
              </p>
            )}
          </div>

          {nextSession.status === "Live" ? (
            <p className="font-libre text-sm text-gray-500">
              Diese Sitzung läuft bereits. Rückmeldungen bezogen sich auf den Start des
              Termins; zur Nachbereitung nutze die Session-Ansicht.
            </p>
          ) : players.length > 0 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="font-barlow font-bold text-xs uppercase text-gray-500">
                  Rückmeldungen ({responded} von {players.length} · {open} offen)
                </h3>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {players.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center gap-2 rounded border border-hero-border/25 bg-hero-dark/20 px-3 py-2"
                  >
                    <RsvpIcon status={p.status} />
                    <span className="font-barlow text-sm text-white truncate flex-1">
                      {p.username}
                    </span>
                    <span
                      className={`font-libre text-xs shrink-0 ${
                        p.status === "offen" ? "text-amber-400" : "text-gray-400"
                      }`}
                    >
                      {p.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {players.length === 0 && nextSession.status === "Scheduled" && (
            <p className="font-libre text-sm text-gray-500 italic">
              Keine bestätigten Spieler in der Kampagne – Rückmeldungen erscheinen, sobald
              Teilnehmer akzeptiert sind.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
