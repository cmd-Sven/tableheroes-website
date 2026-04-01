"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Calendar, Clock, Zap, AlertTriangle } from "lucide-react";
import { setSessionRsvp } from "@/src/app/dashboard/campaigns/[id]/session-rsvp-actions";
import type { RsvpStatus } from "@/src/lib/types/dashboard-widgets";

type Props = {
  campaignId: string;
  session: {
    id: string;
    title: string | null;
    start_time: string;
    status: string;
    rsvp_deadline_days?: number | null;
    is_live?: boolean;
  };
  userRsvp: RsvpStatus | null;
  deadlineReached: boolean;
  viaOnlineTaken: boolean;
  hasCharacter: boolean;
};

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "Zusage", label: "Zusage" },
  { value: "Absage", label: "Absage" },
  { value: "Via Online", label: "Via Online" },
];

export function PlayerCampaignNextSession({
  campaignId,
  session,
  userRsvp,
  deadlineReached,
  viaOnlineTaken,
  hasCharacter,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isLive = session.status === "Live";
  const isScheduled = session.status === "Scheduled";
  const startDate = new Date(session.start_time);

  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
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
        campaignId,
        isLive: session.is_live !== false,
      });
      if (!res.success || res.error) {
        alert(res.error || "Rückmeldung konnte nicht gespeichert werden.");
        return;
      }
      router.refresh();
    });
  };

  const joinHref = `/session/${session.id}`;
  const deadlineHighlight = deadlineReached && !userRsvp && isScheduled;

  return (
    <section className="rounded-lg border border-hero-border/50 bg-gradient-to-br from-background-card to-hero-dark/30 p-5 shadow-lg">
      <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent-gold" />
        Nächste Sitzung
      </h3>

      <div
        className={`rounded-md border p-4 ${
          deadlineHighlight
            ? "border-amber-500/60 bg-amber-950/20"
            : "border-hero-border/40 bg-background-dark/40"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-cinzel font-bold text-white text-lg truncate">
              {session.title?.trim() || "Termin"}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-libre text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent-gold/80" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-accent-gold/80" />
                {formattedTime} Uhr
              </span>
            </div>
          </div>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/50 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-red-300 border border-red-600/40 animate-pulse">
              <Zap className="h-3.5 w-3.5" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-900/40 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-blue-200 border border-blue-700/40">
              Geplant
            </span>
          )}
        </div>

        {isLive ? (
          <Link
            href={joinHref}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Session beitreten
          </Link>
        ) : isScheduled ? (
          <div className="mt-3 space-y-3">
            {!hasCharacter ? (
              <p className="font-libre text-sm text-gray-400">
                Rückmeldung erst mit Charakter möglich.{" "}
                <Link
                  href={`/dashboard/campaigns/${campaignId}/character/new`}
                  className="text-hero-vibrant underline hover:text-accent-gold"
                >
                  Charakter anlegen
                </Link>
              </p>
            ) : (
              <>
                {deadlineHighlight && (
                  <p className="flex items-center gap-2 font-barlow font-bold text-xs uppercase text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Anmeldefrist – bitte zu- oder absagen
                  </p>
                )}
                <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
                  Deine Teilnahme
                </label>
                <select
                  value={userRsvp ?? ""}
                  onChange={handleRsvpChange}
                  disabled={isPending}
                  className="w-full max-w-xs rounded border border-hero-dark bg-slate-900/90 px-3 py-2.5 font-barlow font-bold text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-50"
                >
                  <option value="">Bitte wählen…</option>
                  {RSVP_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={
                        opt.value === "Via Online" &&
                        viaOnlineTaken &&
                        userRsvp !== "Via Online"
                      }
                    >
                      {opt.value === "Via Online" &&
                      viaOnlineTaken &&
                      userRsvp !== "Via Online"
                        ? "Via Online (belegt)"
                        : opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        ) : (
          <p className="font-libre text-sm text-gray-500 mt-2">
            Keine Aktion für diesen Termin-Status nötig.
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-hero-border/20">
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=sessions`}
            className="font-barlow font-bold uppercase text-xs text-hero-vibrant hover:text-accent-gold transition-colors"
          >
            Alle Termine anzeigen
          </Link>
        </div>
      </div>
    </section>
  );
}
