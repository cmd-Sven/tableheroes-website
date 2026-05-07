import {
  isSessionStatusLive,
  isSessionStatusScheduled,
  isSessionStatusTerminal,
} from "@/src/lib/session-status";

const STALE_LIVE_MS = 48 * 60 * 60 * 1000;
const SCHEDULED_GRACE_MS = 24 * 60 * 60 * 1000;

/** Live-Session, deren Start mehr als 48h zurückliegt („verwaist“). */
export function isStaleLiveSession(
  session: { status: unknown; start_time?: string | null },
  now: Date = new Date(),
): boolean {
  if (!isSessionStatusLive(session.status) || !session.start_time) return false;
  return now.getTime() - new Date(session.start_time).getTime() > STALE_LIVE_MS;
}

export type SessionFocusRow = {
  id: string;
  start_time: string;
  status: string;
  [key: string]: unknown;
};

/**
 * Fokus-Termin: zuerst nicht-verwaiste Live-Session, sonst zeitlich nächste geplante Session
 * (mit 24h-Toleranz für leicht überfällige Scheduled).
 */
export function pickCampaignFocusSession<T extends SessionFocusRow>(
  sessions: T[],
  now: Date = new Date(),
): T | null {
  const active = sessions.filter((s) => {
    if (isSessionStatusTerminal(s.status)) return false;
    if (isStaleLiveSession(s, now)) return false;
    return isSessionStatusLive(s.status) || isSessionStatusScheduled(s.status);
  });

  const lives = active.filter((s) => isSessionStatusLive(s.status));
  if (lives.length > 0) {
    return [...lives].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    )[0]!;
  }

  const sched = active.filter((s) => isSessionStatusScheduled(s.status));
  if (sched.length === 0) return null;
  const sorted = [...sched].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const graceMs = now.getTime() - SCHEDULED_GRACE_MS;
  const picked =
    sorted.find((s) => new Date(s.start_time).getTime() >= graceMs) ?? sorted[0];
  return picked ?? null;
}

/**
 * Fokus, übrige aktive Termine (sortiert nach Start), Archiv-Zeilen (beendet/abgesagt/verwaiste Live).
 */
export function partitionCampaignSessionsForTab<T extends SessionFocusRow>(
  sessions: T[],
  now: Date = new Date(),
): {
  focus: T | null;
  otherActive: T[];
  pastArchiveRows: T[];
} {
  const focus = pickCampaignFocusSession(sessions, now);

  const pastArchiveRows = sessions
    .filter((s) => {
      if (isSessionStatusTerminal(s.status)) return true;
      if (isStaleLiveSession(s, now)) return true;
      return false;
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const otherActive = sessions
    .filter((s) => {
      if (focus && s.id === focus.id) return false;
      if (isSessionStatusTerminal(s.status)) return false;
      if (isStaleLiveSession(s, now)) return false;
      return isSessionStatusLive(s.status) || isSessionStatusScheduled(s.status);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return { focus, otherActive, pastArchiveRows };
}

/** Sortierung für Dashboard-Listen: Live (nicht verwaist) zuerst, dann nächste Scheduled. */
export function sortSessionsForDashboardFocus<T extends SessionFocusRow>(
  sessions: T[],
  now: Date = new Date(),
): T[] {
  const active = sessions.filter((s) => {
    if (isSessionStatusTerminal(s.status)) return false;
    if (isStaleLiveSession(s, now)) return false;
    if (!isSessionStatusLive(s.status) && !isSessionStatusScheduled(s.status)) return false;
    return true;
  });

  const lives = active.filter((s) => isSessionStatusLive(s.status));
  const sched = active.filter((s) => isSessionStatusScheduled(s.status));
  lives.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  sched.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  return [...lives, ...sched];
}
