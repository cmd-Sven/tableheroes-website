import {
  SESSION_PARTICIPATION_BASE_POINTS,
} from "./constants";

export type SessionParticipationPresence = "online" | "physical" | "both";

export type SessionParticipationPlayer = {
  userId: string;
  username: string;
  characterName: string | null;
  presence: SessionParticipationPresence | null;
  eligible: boolean;
  basePoints: number;
};

export function normalizeUserIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((id) => id.length > 0);
}

export function resolveSessionParticipationPlayers(params: {
  memberRows: Array<{
    user_id: string;
    username: string;
    character_name: string | null;
  }>;
  onlinePresentUserIds: string[];
  physicallyPresentUserIds: string[];
  gmUserIds: string[];
}): SessionParticipationPlayer[] {
  const online = new Set(params.onlinePresentUserIds.map(String));
  const physical = new Set(params.physicallyPresentUserIds.map(String));
  const gmIds = new Set(params.gmUserIds.map(String));

  return params.memberRows
    .filter((row) => !gmIds.has(String(row.user_id)))
    .map((row) => {
      const userId = String(row.user_id);
      const wasOnline = online.has(userId);
      const wasPhysical = physical.has(userId);
      let presence: SessionParticipationPresence | null = null;
      if (wasOnline && wasPhysical) presence = "both";
      else if (wasOnline) presence = "online";
      else if (wasPhysical) presence = "physical";

      const eligible = wasOnline || wasPhysical;
      return {
        userId,
        username: row.username || "Spieler",
        characterName: row.character_name,
        presence,
        eligible,
        basePoints: eligible ? SESSION_PARTICIPATION_BASE_POINTS : 0,
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username, "de"));
}
