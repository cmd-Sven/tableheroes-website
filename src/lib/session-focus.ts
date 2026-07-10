import {
  isSessionStatusLive,
  isSessionStatusScheduled,
  isSessionStatusTerminal,
} from "@/src/lib/session-status";

const STALE_LIVE_MS = 48 * 60 * 60 * 1000;

/** Stunden nach geplantem Start, in denen eine nicht gestartete Session noch aktiv bleibt. */
export const SCHEDULED_NOT_STARTED_GRACE_HOURS = 4;

/** Nach Ablauf dieses Fensters ab geplantem Start gilt ein „Scheduled“-Termin als verpasst (Archiv-Bereich). */
export const SCHEDULED_STALE_GRACE_MS =
  SCHEDULED_NOT_STARTED_GRACE_HOURS * 60 * 60 * 1000;

/** @deprecated Alias — gleiche Bedeutung wie SCHEDULED_STALE_GRACE_MS */
const SCHEDULED_GRACE_MS = SCHEDULED_STALE_GRACE_MS;

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

/** Geplanter Termin, dessen Start länger als die Toleranz zurückliegt (nie gestartet). */
export function isMissedScheduledSession<T extends SessionFocusRow>(
  session: T,
  now: Date = new Date(),
): boolean {
  if (!isSessionStatusScheduled(session.status)) return false;
  if (!session.start_time) return false;
  const startMs = new Date(session.start_time).getTime();
  if (Number.isNaN(startMs)) return false;
  return startMs < now.getTime() - SCHEDULED_STALE_GRACE_MS;
}

/**
 * Geplant, Start liegt in der Vergangenheit, aber noch innerhalb des Toleranzfensters —
 * Session wurde noch nicht gestartet, bleibt planbar und startbar.
 */
export function isScheduledInGraceOverdue<T extends SessionFocusRow>(
  session: T,
  now: Date = new Date(),
): boolean {
  if (!isSessionStatusScheduled(session.status) || !session.start_time) return false;
  const startMs = new Date(session.start_time).getTime();
  if (Number.isNaN(startMs)) return false;
  if (startMs >= now.getTime()) return false;
  return startMs >= now.getTime() - SCHEDULED_STALE_GRACE_MS;
}

/** Alias für UI: Termin vorbei, aber noch nicht gestartet (innerhalb der Toleranz). */
export function isNotStartedScheduledSession<T extends SessionFocusRow>(
  session: T,
  now: Date = new Date(),
): boolean {
  return isScheduledInGraceOverdue(session, now);
}

/**
 * Fokus-Termin: zuerst nicht-verwaiste Live-Session, dann nicht gestartete Termine
 * im Toleranzfenster, sonst zeitlich nächste gültige geplante Session.
 */
export function pickCampaignFocusSession<T extends SessionFocusRow>(
  sessions: T[],
  now: Date = new Date(),
): T | null {
  const active = sessions.filter((s) => {
    if (isSessionStatusTerminal(s.status)) return false;
    if (isStaleLiveSession(s, now)) return false;
    if (isMissedScheduledSession(s, now)) return false;
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

  const notStarted = sched.filter((s) => isNotStartedScheduledSession(s, now));
  if (notStarted.length > 0) {
    return [...notStarted].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    )[0]!;
  }

  const sorted = [...sched].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const graceCutoff = now.getTime() - SCHEDULED_GRACE_MS;
  const picked = sorted.find((s) => new Date(s.start_time).getTime() >= graceCutoff);
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
      if (isMissedScheduledSession(s, now)) return true;
      return false;
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const otherActive = sessions
    .filter((s) => {
      if (focus && s.id === focus.id) return false;
      if (isSessionStatusTerminal(s.status)) return false;
      if (isStaleLiveSession(s, now)) return false;
      if (isMissedScheduledSession(s, now)) return false;
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
    if (isMissedScheduledSession(s, now)) return false;
    if (!isSessionStatusLive(s.status) && !isSessionStatusScheduled(s.status)) return false;
    return true;
  });

  const lives = active.filter((s) => isSessionStatusLive(s.status));
  const sched = active.filter((s) => isSessionStatusScheduled(s.status));
  lives.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  sched.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  return [...lives, ...sched];
}
