"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Calendar, Clock, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { setSessionRsvp } from "@/src/app/dashboard/campaigns/[id]/session-rsvp-actions";
import type { RsvpStatus } from "@/src/lib/types/dashboard-widgets";
import { getSessionTypeLabel, sessionRequiresCharacter, sessionSupportsLiveBoard } from "@/src/lib/session-type";
import { formatSessionDateTimeDe } from "@/src/lib/datetime/berlin";

type Props = {
  campaignId: string;
  session: {
    id: string;
    title: string | null;
    start_time: string;
    status: string;
    rsvp_deadline_days?: number | null;
    is_live?: boolean;
    type?: string | null;
  };
  userRsvp: RsvpStatus | null;
  deadlineReached: boolean;
  viaOnlineTaken: boolean;
  hasCharacter: boolean;
  requiresCharacter?: boolean;
};

function feedbackMessage(status: RsvpStatus): string {
  switch (status) {
    case "Zusage":
      return "Termin zugesagt";
    case "Absage":
      return "Termin abgesagt";
    case "Via Online":
      return "Via Online bestätigt";
    default:
      return "Rückmeldung gespeichert";
  }
}

export function PlayerCampaignNextSession({
  campaignId,
  session,
  userRsvp,
  deadlineReached,
  viaOnlineTaken,
  hasCharacter,
  requiresCharacter: requiresCharacterProp,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticRsvp, setOptimisticRsvp] = useState<RsvpStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requiresCharacter =
    requiresCharacterProp ?? sessionRequiresCharacter(session.type);
  const isGameSession = sessionSupportsLiveBoard(session.type);
  const displayRsvp = optimisticRsvp ?? userRsvp;

  useEffect(() => {
    if (userRsvp && optimisticRsvp && userRsvp === optimisticRsvp) {
      setOptimisticRsvp(null);
    }
  }, [userRsvp, optimisticRsvp]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [feedback]);

  const isLive = session.status === "Live";
  const isScheduled = session.status === "Scheduled";
  const startDate = new Date(session.start_time);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(startDate);
  const { formattedTime } = formatSessionDateTimeDe(session.start_time);

  const chooseRsvp = (value: RsvpStatus) => {
    if (!value || isPending) return;
    setFeedback(null);
    setOptimisticRsvp(value);
    startTransition(async () => {
      const res = await setSessionRsvp(session.id, value, {
        campaignId,
        isLive: session.is_live !== false,
        sessionType: session.type,
      });
      if (!res.success || res.error) {
        setOptimisticRsvp(null);
        alert(res.error || "Rückmeldung konnte nicht gespeichert werden.");
        return;
      }
      setFeedback(feedbackMessage(value));
      router.refresh();
    });
  };

  const joinHref = `/session/${session.id}`;
  const deadlineHighlight = deadlineReached && !displayRsvp && isScheduled;

  return (
    <section className="rounded-lg border border-hero-border/50 bg-gradient-to-br from-background-card to-hero-dark/30 p-5 shadow-lg">
      <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent-gold" />
        Nächster Termin
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
            <p className="mt-1 font-barlow text-[10px] uppercase text-gray-500">
              {getSessionTypeLabel(session.type)}
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

        {isLive && isGameSession ? (
          <Link
            href={joinHref}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Session beitreten
          </Link>
        ) : isScheduled ? (
          <div className="mt-3 space-y-3">
            {!hasCharacter && requiresCharacter ? (
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
                {feedback && (
                  <div
                    className="flex items-center gap-2 rounded-md border border-green-600/60 bg-green-950/50 px-3 py-2.5 font-barlow font-bold text-sm text-green-200"
                    role="status"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" aria-hidden />
                    {feedback}
                  </div>
                )}
                <p className="mb-2 font-libre text-xs text-gray-400">
                  Rechtzeitig innerhalb der Frist: 10 Punkte. Danach: 5 Punkte. Ohne Rückmeldung: −2 Punkte.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => chooseRsvp("Zusage")}
                    className={`rounded px-4 py-2 font-barlow text-xs font-bold uppercase ${
                      displayRsvp === "Zusage"
                        ? "bg-hero-vibrant text-black"
                        : "border border-hero-vibrant/50 text-hero-vibrant hover:bg-hero-vibrant/15"
                    }`}
                  >
                    Zusagen
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => chooseRsvp("Absage")}
                    className={`rounded px-4 py-2 font-barlow text-xs font-bold uppercase ${
                      displayRsvp === "Absage"
                        ? "bg-red-800 text-white"
                        : "border border-red-700/60 text-red-200 hover:bg-red-950/40"
                    }`}
                  >
                    Absagen
                  </button>
                  {session.is_live !== false ? (
                    <button
                      type="button"
                      disabled={
                        isPending || (viaOnlineTaken && displayRsvp !== "Via Online")
                      }
                      onClick={() => chooseRsvp("Via Online")}
                      className={`rounded px-4 py-2 font-barlow text-xs font-bold uppercase disabled:opacity-40 ${
                        displayRsvp === "Via Online"
                          ? "bg-accent-gold text-black"
                          : "border border-accent-gold/50 text-accent-gold hover:bg-accent-gold/10"
                      }`}
                    >
                      {viaOnlineTaken && displayRsvp !== "Via Online"
                        ? "Via Online belegt"
                        : "Via Online"}
                    </button>
                  ) : null}
                </div>
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
