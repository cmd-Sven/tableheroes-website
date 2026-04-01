"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

function formatRemainingGerman(ms: number): string {
  if (ms <= 0) return "abgelaufen – bitte jetzt im Termin-Bereich zu- oder absagen";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) {
    return `${d} Tag${d === 1 ? "" : "e"}, ${h} Std.`;
  }
  if (h > 0) {
    return `${h} Std., ${m} Min.`;
  }
  return `${Math.max(1, m)} Min.`;
}

type Props = {
  sessionTitle: string | null;
  /** Ende der Anmeldefrist (23:59:59), ISO */
  rsvpDeadlineEndIso: string | null;
  /** Session-Beginn (Fallback-Hinweis ohne Tages-Frist) */
  sessionStartIso: string;
};

export function PlayerRsvpDeadlineBanner({
  sessionTitle,
  rsvpDeadlineEndIso,
  sessionStartIso,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const endMs = rsvpDeadlineEndIso
    ? new Date(rsvpDeadlineEndIso).getTime()
    : null;
  const remaining = endMs != null ? endMs - now : null;
  const fristText =
    endMs != null && !Number.isNaN(endMs)
      ? formatRemainingGerman(remaining ?? 0)
      : null;

  const startFmt = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(sessionStartIso));

  return (
    <div
      className="rounded-lg border-2 border-amber-600/70 bg-gradient-to-r from-amber-950/90 via-amber-900/85 to-amber-950/90 px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
      role="status"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Bell className="h-5 w-5 text-amber-300 animate-pulse" aria-hidden />
          <span className="font-barlow font-extrabold text-sm uppercase tracking-wide text-amber-100">
            Teilnahme bestätigen
          </span>
        </div>
        <p className="font-libre text-sm text-amber-50/95 leading-snug">
          Bestätige deine Teilnahme für die nächste Session
          {sessionTitle?.trim() ? (
            <span className="font-semibold text-white">
              {" "}
              „{sessionTitle.trim()}“
            </span>
          ) : null}
          {fristText ? (
            <>
              {" "}
              – Frist läuft in <span className="font-bold text-amber-200">{fristText}</span> ab.
            </>
          ) : (
            <>
              {" "}
              (Termin: <span className="font-semibold text-white">{startFmt}</span> Uhr). Bitte gib unten im Bereich „Nächste Sitzung“ deine Rückmeldung ab.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
