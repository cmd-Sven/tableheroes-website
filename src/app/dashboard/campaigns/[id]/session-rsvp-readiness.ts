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

/** Spieler hat zu- oder abgesagt (inkl. Via Online). Absage zählt als Rückmeldung. */
export function hasPlayerRsvpResponse(
  row: { rsvp_status?: string | null } | null | undefined,
): boolean {
  if (!row?.rsvp_status) return false;
  const st = String(row.rsvp_status);
  return st === "Zusage" || st === "Absage" || st === "Via Online";
}

/**
 * Wer erscheint in der Session-RSVP-Liste (inkl. manuelle GM-Bestätigung).
 * Der SL selbst ist normalerweise kein Teilnehmer — außer er hat einen
 * Kampagnen-Charakter (GM-PC), sonst fehlt die Figur in der Terminliste.
 */
export function isOnSessionRsvpRoster(input: {
  memberUserId: string | null | undefined;
  gmUserId: string;
  hasCharacter: boolean;
}): boolean {
  const uid = String(input.memberUserId ?? "").trim();
  if (!uid) return false;
  if (uid === input.gmUserId) return input.hasCharacter;
  return true;
}
