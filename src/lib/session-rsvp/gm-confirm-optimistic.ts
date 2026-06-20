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
    };
  }
  return {
    ...player,
    status: "zusage",
    label: "Vom GM als dabei markiert",
    canGmManuallyConfirm: false,
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
