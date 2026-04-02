/**
 * Spieler zählt für Session-Start als „dabei“, wenn er zugesagt hat (Zusage / Via Online)
 * oder der GM ihn manuell bestätigt hat (gm_confirmed).
 */
export function isPlayerReadyForSessionStart(
  row:
    | { rsvp_status: string | null | undefined; gm_confirmed?: boolean | null }
    | undefined
    | null,
): boolean {
  if (!row) return false;
  const st = row.rsvp_status != null ? String(row.rsvp_status) : "";
  const playing = st === "Zusage" || st === "Via Online";
  return playing || !!row.gm_confirmed;
}
