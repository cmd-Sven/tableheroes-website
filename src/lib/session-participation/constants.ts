/** Basis-Punkte pro erfolgreicher Session-Teilnahme (Spieler-Account, nicht Charakter-XP). */
export const SESSION_PARTICIPATION_BASE_POINTS = 5;

export function buildSessionParticipationReason(
  sessionTitle: string | null | undefined,
  sessionId: string,
): string {
  const label = sessionTitle?.trim() || "Spieleabend";
  return `Teilnahme am Spieleabend: ${label} (${sessionId.slice(0, 8)})`;
}

export function buildSessionExtraPointsReason(
  sessionTitle: string | null | undefined,
  customReason: string,
): string {
  const label = sessionTitle?.trim() || "Spieleabend";
  const detail = customReason.trim();
  return detail
    ? `Extrapunkte (${label}): ${detail}`
    : `Extrapunkte (${label})`;
}
