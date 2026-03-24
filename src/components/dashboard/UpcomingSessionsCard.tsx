"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Swords, Shield, Zap, ChevronRight, AlertTriangle, CheckCircle, Check } from "lucide-react";
import type {
  UpcomingSession,
  SessionParticipant,
  RsvpStatus,
} from "@/src/lib/types/dashboard-widgets";
import { setSessionRsvp, setGmConfirmed, updateSessionRsvpSettings } from "@/src/app/dashboard/campaigns/[id]/session-rsvp-actions";

type Props = {
  sessions: UpcomingSession[];
  /** Wenn true: alle Sessions anzeigen, kein "Mehr Termine anzeigen"-Button */
  showAll?: boolean;
  /** GM-Ansicht: RSVPs, Deadline, manuelle Bestätigung */
  isGM?: boolean;
  /** Kampagnen-IDs ohne Charakter: RSVP ausgeblendet, Hinweis statt Dropdown */
  rsvpBlockedCampaignIds?: string[];
};

/* ------------------------------------------------------------------ */
/* Einzelner Teilnehmer-Avatar mit Tooltip                            */
/* ------------------------------------------------------------------ */
function ParticipantAvatar({ p }: { p: SessionParticipant }) {
  const hasChar = !!p.characterName;
  const avatarSrc = p.characterAvatarUrl || p.avatarUrl;
  const initials = (p.characterName ?? p.username)?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="group/avatar relative flex flex-col items-center">
      {/* Avatar Circle */}
      <div
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-hero-border/60 bg-background-dark shadow-md transition-transform group-hover/avatar:scale-110 group-hover/avatar:border-accent-gold"
        title={p.characterName ?? p.username}
      >
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={p.characterName ?? p.username}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-barlow font-bold text-sm text-white">
            {initials}
          </div>
        )}

        {/* Live-Indikator-Ring */}
        {hasChar && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background-dark bg-hero-vibrant" />
        )}
      </div>

      {/* Tooltip on Hover */}
      <div className="pointer-events-none absolute -top-[4.5rem] left-1/2 z-30 -translate-x-1/2 scale-90 opacity-0 transition-all group-hover/avatar:scale-100 group-hover/avatar:opacity-100">
        <div className="whitespace-nowrap rounded-md border border-hero-border/50 bg-background-dark/95 px-3 py-2 text-center shadow-xl backdrop-blur-sm">
          <p className="font-cinzel font-bold text-xs text-accent-gold leading-tight">
            {p.characterName ?? p.username}
          </p>
          {hasChar && (
            <p className="font-libre text-[10px] text-gray-400 mt-0.5">
              {p.characterClass ?? "Klasse?"} · Stufe{" "}
              {p.characterLevel ?? "?"}
            </p>
          )}
        </div>
        {/* Tooltip-Pfeil */}
        <div className="mx-auto h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-hero-border/50" />
      </div>
    </div>
  );
}

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "Zusage", label: "Zusage" },
  { value: "Absage", label: "Absage" },
  { value: "Via Online", label: "Via Online" },
];

/* ------------------------------------------------------------------ */
/* Session-Karte (Spieler: mit RSVP-Dropdown)                          */
/* ------------------------------------------------------------------ */
function SessionRowPlayer({
  session,
  rsvpBlocked,
}: {
  session: UpcomingSession;
  rsvpBlocked?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const startDate = new Date(session.startTime);
  const isLive = session.status === "Live";

  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(startDate);

  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);

  const handleRsvpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as RsvpStatus;
    if (!value) return;
    startTransition(async () => {
      const res = await setSessionRsvp(session.id, value, {
        campaignId: session.campaignId,
        isLive: session.isLive,
      });
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  const deadlineHighlight = session.deadlineReached && !session.userRsvp;
  const isScheduled = session.status === "Scheduled";

  return (
    <div
      className={`group relative block overflow-hidden rounded-lg border transition-all ${
        deadlineHighlight
          ? "border-amber-500/70 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
          : "border-hero-border/30 hover:border-accent-gold/60 hover:shadow-[0_0_20px_rgba(202,185,38,0.1)]"
      }`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/card-bg-greenWood.webp"
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-background-dark/70 to-background-dark/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-5">
        <Link
          href={
            isLive
              ? `/session/${session.id}`
              : `/dashboard/campaigns/${session.campaignId}`
          }
          className="block"
        >
          {/* Top Row: Kampagne + Status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <p className="font-barlow font-bold text-[10px] uppercase tracking-wider text-hero-vibrant/80 mb-0.5">
                {session.campaignName}
              </p>
              <h3 className="font-cinzel font-bold text-base text-white group-hover:text-accent-gold transition-colors truncate">
                {session.title || "Nächste Session"}
              </h3>
            </div>

            {/* Status Badge */}
            {isLive ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-red-900/60 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-red-300 border border-red-600/50 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse">
                <Zap className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-900/40 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-blue-300 border border-blue-700/50">
                <Clock className="h-3 w-3" />
                Geplant
              </span>
            )}
          </div>

          {/* Date/Time Row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Calendar className="h-3.5 w-3.5 text-accent-gold/70" />
              <span className="font-barlow font-bold text-xs uppercase">
                {formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="h-3.5 w-3.5 text-accent-gold/70" />
              <span className="font-barlow font-bold text-xs">
                {formattedTime} Uhr
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-hero-border/20 pt-3">
            {/* Participants */}
            {session.participants.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <Shield className="h-3.5 w-3.5 text-accent-gold/60" />
                  <span className="font-barlow font-bold text-[10px] uppercase text-gray-500">
                    Helden
                  </span>
                </div>

                {/* Avatar Stack */}
                <div className="flex items-center -space-x-2">
                  {session.participants.slice(0, 6).map((p) => (
                    <ParticipantAvatar key={p.userId} p={p} />
                  ))}
                  {session.participants.length > 6 && (
                    <div className="relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 border-hero-border/60 bg-background-card font-barlow font-bold text-xs text-gray-400">
                      +{session.participants.length - 6}
                    </div>
                  )}
                </div>

                {/* Compact Class/Level List (visible on larger screens) */}
                <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 ml-3">
                  {session.participants
                    .filter((p) => p.characterName)
                    .slice(0, 4)
                    .map((p) => (
                      <span
                        key={p.userId}
                        className="font-libre text-[10px] text-gray-500"
                      >
                        <span className="text-accent-gold/80 font-bold">
                          {p.characterName}
                        </span>{" "}
                        · {p.characterClass} Lvl {p.characterLevel}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <p className="font-libre text-xs text-gray-500 italic">
                Noch keine Teilnehmer bestätigt
              </p>
            )}
          </div>
        </Link>

        {/* RSVP Dropdown (nur bei geplanten Sessions) */}
        {isScheduled && (
          <div className="mt-3 pt-3 border-t border-hero-border/20" onClick={(e) => e.stopPropagation()}>
            {rsvpBlocked ? (
              <p className="font-libre text-xs text-gray-400 leading-relaxed">
                Rückmeldung nur mit Charakter möglich.{" "}
                <Link
                  href={`/dashboard/campaigns/${session.campaignId}/character/new`}
                  className="text-hero-vibrant underline hover:text-accent-gold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Charakter anlegen
                </Link>
              </p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                {deadlineHighlight && (
                  <span className="flex items-center gap-1.5 font-barlow font-bold text-amber-400 text-xs uppercase">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Anmeldefrist!
                  </span>
                )}
                <select
                  value={session.userRsvp ?? ""}
                  onChange={handleRsvpChange}
                  disabled={isPending}
                  className="flex-1 max-w-[180px] rounded border border-hero-border bg-slate-900/80 px-3 py-2 font-barlow font-bold text-xs text-white focus:border-hero-vibrant outline-none disabled:opacity-50"
                >
                  <option value="">Deine Teilnahme…</option>
                  {RSVP_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.value === "Via Online" && session.viaOnlineTaken && session.userRsvp !== "Via Online"}
                    >
                      {opt.value === "Via Online" && session.viaOnlineTaken && session.userRsvp !== "Via Online"
                        ? "Via Online (ausgebucht)"
                        : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Session-Karte (GM: RSVPs, Deadline, Bestätigung)                   */
/* ------------------------------------------------------------------ */
function SessionRowGM({ session }: { session: UpcomingSession }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const startDate = new Date(session.startTime);
  const isLive = session.status === "Live";
  const isScheduled = session.status === "Scheduled";

  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(startDate);

  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);

  const playingRsvps = session.rsvps.filter(
    (r) => r.rsvpStatus === "Zusage" || r.rsvpStatus === "Via Online"
  );
  const allConfirmed =
    playingRsvps.length > 0 &&
    playingRsvps.every((r) => r.gmConfirmed);

  const handleGmConfirm = (userId: string, confirmed: boolean) => {
    startTransition(async () => {
      await setGmConfirmed(session.id, userId, confirmed);
      router.refresh();
    });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const days = val === "" ? null : (Number(val) as 1 | 2 | 3);
    startTransition(async () => {
      await updateSessionRsvpSettings(session.id, days, session.isLive);
      router.refresh();
    });
  };

  return (
    <div className="group relative block overflow-hidden rounded-lg border border-hero-border/30 bg-background-dark/30">
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-barlow font-bold text-[10px] uppercase tracking-wider text-hero-vibrant/80 mb-0.5">
              {session.campaignName}
            </p>
            <h3 className="font-cinzel font-bold text-base text-white">
              {session.title || "Nächste Session"}
            </h3>
            <p className="font-libre text-xs text-gray-500 mt-1">
              {formattedDate} • {formattedTime} Uhr
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 font-barlow font-bold uppercase text-[10px] ${
            isLive ? "bg-red-900/60 text-red-300" : "bg-blue-900/40 text-blue-300"
          }`}>
            {session.status}
          </span>
        </div>

        {isScheduled && (
          <>
            {/* Anmeldefrist */}
            <div className="flex items-center gap-2 mb-3">
              <span className="font-barlow font-bold text-[10px] uppercase text-gray-500">Anmeldefrist:</span>
              <select
                value={session.rsvpDeadlineDays ?? ""}
                onChange={handleDeadlineChange}
                disabled={isPending}
                className="rounded border border-hero-border bg-slate-900 px-2 py-1 font-barlow text-xs text-white"
              >
                <option value="">Keine</option>
                <option value="1">1 Tag vorher</option>
                <option value="2">2 Tage vorher</option>
                <option value="3">3 Tage vorher</option>
              </select>
            </div>

            {/* RSVP-Liste */}
            <div className="border-t border-hero-border/20 pt-3 space-y-2">
              {session.rsvps.map((r) => (
                <div key={r.userId} className="flex items-center justify-between gap-2">
                  <span className="font-libre text-sm text-gray-300 truncate">
                    {r.characterName || r.username}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-barlow text-[10px] uppercase ${
                      r.rsvpStatus === "Zusage" || r.rsvpStatus === "Via Online"
                        ? "text-hero-vibrant"
                        : r.rsvpStatus === "Absage"
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}>
                      {r.rsvpStatus ?? "—"}
                    </span>
                    {(r.rsvpStatus === "Zusage" || r.rsvpStatus === "Via Online") && (
                      <button
                        type="button"
                        onClick={() => handleGmConfirm(r.userId, !r.gmConfirmed)}
                        disabled={isPending}
                        className={`rounded px-2 py-0.5 font-barlow font-bold text-[10px] uppercase ${
                          r.gmConfirmed
                            ? "bg-hero-vibrant/30 text-hero-vibrant"
                            : "bg-amber-900/40 text-amber-400 hover:bg-amber-800/50"
                        }`}
                      >
                        {r.gmConfirmed ? "✓" : "Bestätigen"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Alle bereit */}
            {allConfirmed && session.rsvps.some((r) => r.rsvpStatus === "Zusage" || r.rsvpStatus === "Via Online") && (
              <div className="mt-3 flex items-center gap-2 rounded bg-hero-vibrant/20 border border-hero-vibrant/50 px-3 py-2">
                <CheckCircle className="h-5 w-5 text-hero-vibrant shrink-0" />
                <span className="font-barlow font-bold text-sm text-hero-vibrant uppercase">
                  Alle Spieler sind bereit, plane jetzt den Spielabend.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vergangene Session (read-only, kein Betreten)                       */
/* ------------------------------------------------------------------ */
function PastSessionRow({ session }: { session: UpcomingSession }) {
  const startDate = new Date(session.startTime);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(startDate);
  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);

  return (
    <div className="relative overflow-hidden rounded-lg border border-hero-dark/50 bg-background-card/70 opacity-90">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/card-bg-greenWood.webp"
          alt=""
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/95 via-background-dark/85 to-background-dark/70" />
      </div>
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-barlow font-bold text-[10px] uppercase tracking-wider text-hero-vibrant/60 mb-0.5">
              {session.campaignName}
            </p>
            <h3 className="font-cinzel font-bold text-base text-gray-300 truncate">
              {session.title || "Session"}
            </h3>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-700/50 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-gray-400 border border-gray-600/50">
            <Check className="h-3 w-3" />
            Beendet
          </span>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <span className="font-barlow font-bold text-xs uppercase">{formattedDate}</span>
          <span className="font-barlow text-xs">{formattedTime} Uhr</span>
        </div>
        <p className="mt-2 font-libre text-xs text-gray-500 italic">
          Abgeschlossen vom Spielleiter · Kein erneuter Eintritt möglich
        </p>
      </div>
    </div>
  );
}

/** Vergangene/beendete Termine – nur Anzeige, kein Betreten. */
export function PastSessionsCard({ sessions }: { sessions: UpcomingSession[] }) {
  if (sessions.length === 0) return null;

  return (
    <div className="w-full p-4 space-y-3">
      {sessions.map((s) => (
        <PastSessionRow key={s.id} session={s} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Haupt-Komponente                                                    */
/* ------------------------------------------------------------------ */
export function UpcomingSessionsCard({
  sessions,
  showAll = false,
  isGM = false,
  rsvpBlockedCampaignIds = [],
}: Props) {
  if (sessions.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="relative overflow-hidden rounded-lg border border-dashed border-hero-dark bg-background-card py-12 text-center">
          <div className="relative z-10">
            <div className="mb-4 mx-auto grid h-16 w-16 place-items-center rounded-full border border-hero-border bg-background-dark">
              <Swords className="h-8 w-8 text-accent-gold" />
            </div>
            <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
              Keine Termine geplant
            </h3>
            <p className="max-w-sm mx-auto font-libre text-gray-400">
              Sobald eine Session geplant wird, erscheint sie hier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displaySessions = showAll ? sessions : sessions.slice(0, 2);
  const hasMore = !showAll && sessions.length > 2;

  const blockedSet = new Set(rsvpBlockedCampaignIds);

  return (
    <div className="w-full p-4 space-y-3">
      {displaySessions.map((s) =>
        isGM ? (
          <SessionRowGM key={s.id} session={s} />
        ) : (
          <SessionRowPlayer
            key={s.id}
            session={s}
            rsvpBlocked={blockedSet.has(s.campaignId)}
          />
        )
      )}
      {hasMore && (
        <Link
          href="/dashboard/sessions"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-hero-border/40 bg-hero-dark/30 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/50 hover:border-hero-vibrant/60 transition-colors"
        >
          Mehr Termine anzeigen
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
