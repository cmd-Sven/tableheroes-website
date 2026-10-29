/**
 * Spieler zählt für Session-Start als „dabei“, wenn er zugesagt hat (Zusage / Via Online)
 * oder der GM ihn manuell bestätigt hat (gm_confirmed).
 */
export function isPlayerReadyForSessionStart(
  row:
    | { rsvp_status?: string | null; gm_confirmed?: boolean | null }
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
export const SESSION_RSVP_CHANGED_BROADCAST = "session_rsvp_changed";

export type SessionRsvpRosterPlayer = {
  userId: string;
  username: string;
  characterName: string | null;
  status: "zusage" | "via_online" | "absage" | "offen" | "gm_override";
  label: string;
  canGmManuallyConfirm: boolean;
  canGmManuallyDecline: boolean;
};

/** Eine Zeile der GM-Liste: dabei, abgesagt oder noch offen. */
export function buildSessionRsvpRosterPlayer(input: {
  userId: string;
  username: string;
  characterName: string | null;
  row:
    | { rsvp_status?: string | null; gm_confirmed?: boolean | null }
    | null
    | undefined;
  allowGmActions: boolean;
}): SessionRsvpRosterPlayer {
  const { userId, username, characterName, row, allowGmActions } = input;
  const ready = isPlayerReadyForSessionStart(row);
  const st = row?.rsvp_status != null ? String(row.rsvp_status) : "";

  if (ready) {
    if (st === "Zusage") {
      return {
        userId,
        username,
        characterName,
        status: "zusage",
        label: "Termin angenommen",
        canGmManuallyConfirm: false,
        canGmManuallyDecline: allowGmActions,
      };
    }
    if (st === "Via Online") {
      return {
        userId,
        username,
        characterName,
        status: "via_online",
        label: "Online dabei",
        canGmManuallyConfirm: false,
        canGmManuallyDecline: allowGmActions,
      };
    }
    if (st === "Absage" && row?.gm_confirmed) {
      return {
        userId,
        username,
        characterName,
        status: "gm_override",
        label: "Abgesagt · vom GM für den Tisch freigegeben",
        canGmManuallyConfirm: false,
        canGmManuallyDecline: allowGmActions,
      };
    }
    return {
      userId,
      username,
      characterName,
      status: "zusage",
      label: "Vom GM als dabei markiert",
      canGmManuallyConfirm: false,
      canGmManuallyDecline: allowGmActions,
    };
  }

  if (st === "Absage") {
    return {
      userId,
      username,
      characterName,
      status: "absage",
      label: "Abgesagt",
      canGmManuallyConfirm: allowGmActions,
      canGmManuallyDecline: false,
    };
  }

  return {
    userId,
    username,
    characterName,
    status: "offen",
    label: "Noch keine Rückmeldung",
    canGmManuallyConfirm: allowGmActions,
    canGmManuallyDecline: allowGmActions,
  };
}

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
