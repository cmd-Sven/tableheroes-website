"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Swords, Shield, Zap } from "lucide-react";
import type {
  UpcomingSession,
  SessionParticipant,
} from "@/src/lib/types/dashboard-widgets";

type Props = {
  sessions: UpcomingSession[];
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

/* ------------------------------------------------------------------ */
/* Session-Karte                                                       */
/* ------------------------------------------------------------------ */
function SessionRow({ session }: { session: UpcomingSession }) {
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

  return (
    <Link
      href={
        isLive
          ? `/session/${session.id}`
          : `/dashboard/campaigns/${session.campaignId}`
      }
      className="group relative block overflow-hidden rounded-lg border border-hero-border/30 transition-all hover:border-accent-gold/60 hover:shadow-[0_0_20px_rgba(202,185,38,0.1)]"
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
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Haupt-Komponente                                                    */
/* ------------------------------------------------------------------ */
export function UpcomingSessionsCard({
  sessions,
}: Props) {
  if (sessions.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="relative overflow-hidden rounded-lg border border-dashed border-hero-dark bg-background-card/50 py-12 text-center">
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

  return (
    <div className="w-full p-4 space-y-3">
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} />
      ))}
    </div>
  );
}
