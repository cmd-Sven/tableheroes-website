/**
 * Session-Status aus DB/PostgREST — robuste Vergleiche (trim, Groß-/Kleinschreibung).
 * Listen sollen geplante Termine nicht verlieren, nur weil der String minimal abweicht.
 */

export function normalizeSessionStatusValue(status: unknown): string {
  return String(status ?? "").trim().toLowerCase();
}

export function isSessionStatusTerminal(status: unknown): boolean {
  const s = normalizeSessionStatusValue(status);
  return s === "completed" || s === "cancelled";
}

export function isSessionStatusScheduled(status: unknown): boolean {
  return normalizeSessionStatusValue(status) === "scheduled";
}

export function isSessionStatusLive(status: unknown): boolean {
  return normalizeSessionStatusValue(status) === "live";
}

/** Kampagne / Sessions-Tab: geplant oder live (nicht beendet / nicht abgesagt). */
export function isSessionStatusScheduledOrLive(status: unknown): boolean {
  const s = normalizeSessionStatusValue(status);
  return s === "scheduled" || s === "live";
}
