import type { GmTerminePlayerRsvp } from "@/src/components/campaigns/GmTermineSpielplanCard";
import type { SessionRsvp } from "@/src/lib/types/dashboard-widgets";

/** Lokales UI-Update nach GM-Freigabe (Termine & Spielplan). */
export function applyGmConfirmToTerminePlayer(
  player: GmTerminePlayerRsvp,
): GmTerminePlayerRsvp {
  if (!player.canGmManuallyConfirm) return player;
  if (player.status === "absage") {
    return {
      ...player,
      status: "gm_override",
      label: "Abgesagt · vom GM für Start freigegeben",
      canGmManuallyConfirm: false,
      canGmManuallyDecline: true,
    };
  }
  return {
    ...player,
    status: "zusage",
    label: "Vom GM als dabei markiert",
    canGmManuallyConfirm: false,
    canGmManuallyDecline: true,
  };
}

/** Lokales UI-Update, nachdem der GM eine mündliche Absage festgehalten hat. */
export function applyGmDeclineToTerminePlayer(
  player: GmTerminePlayerRsvp,
): GmTerminePlayerRsvp {
  if (!player.canGmManuallyDecline) return player;
  return {
    ...player,
    status: "absage",
    label: "Vom GM als nicht dabei markiert",
    canGmManuallyConfirm: true,
    canGmManuallyDecline: false,
  };
}

export function countTerminePendingPlayers(players: GmTerminePlayerRsvp[]): number {
  return players.filter((p) => p.status === "offen" || p.status === "absage").length;
}

/** Lokales UI-Update nach GM-Freigabe (Dashboard-Terminkarte). */
export function applyGmConfirmToSessionRsvp(rsvp: SessionRsvp): SessionRsvp {
  return {
    ...rsvp,
    gmConfirmed: true,
    rsvpStatus: rsvp.rsvpStatus ?? "Zusage",
  };
}
