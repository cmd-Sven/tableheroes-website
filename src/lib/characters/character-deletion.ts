export type CharacterDeletionState = {
  canDelete: boolean;
  isCampaignLinked: boolean;
  reason: string | null;
};

/** Mitgliedschafts-Status, bei denen campaign_members.character_id als aktiv gilt */
const ACTIVE_MEMBER_LINK_STATUSES = new Set([
  "Approved",
  "Active",
  "Drafting",
  "Changes_Proposed",
  "Applied",
  "In_Review",
]);

/** Charakter-Status, die eine aktive Kampagne-Verknüpfung blockieren */
const BLOCKING_CHARACTER_STATUSES = new Set([
  "Active",
  "Approved",
  "Pending_Approval",
]);

type CharacterLike = {
  id: string;
  status?: string | null;
  campaign_id?: string | null;
};

type MemberLike = {
  character_id?: string | null;
  status?: string | null;
} | null;

/**
 * Prüft, ob ein Spieler einen Charakter löschen darf.
 * Kampagnenverknüpfte Charaktere nur nach Entfernung aus der Kampagne (GM).
 */
export function evaluateCharacterDeletionState(
  character: CharacterLike,
  member: MemberLike,
): CharacterDeletionState {
  const charId = String(character.id);
  const charStatus = String(character.status ?? "").trim();

  if (
    member?.character_id &&
    String(member.character_id) === charId &&
    ACTIVE_MEMBER_LINK_STATUSES.has(String(member.status ?? ""))
  ) {
    return {
      canDelete: false,
      isCampaignLinked: true,
      reason:
        "Dieser Charakter ist noch mit einer Kampagne verknüpft. Der Spielleiter muss ihn zuerst aus der Kampagne entfernen.",
    };
  }

  if (BLOCKING_CHARACTER_STATUSES.has(charStatus)) {
    if (charStatus === "Pending_Approval") {
      return {
        canDelete: false,
        isCampaignLinked: true,
        reason:
          "Dieser Charakter wartet auf Freigabe durch den Spielleiter und kann nicht gelöscht werden.",
      };
    }
    return {
      canDelete: false,
      isCampaignLinked: true,
      reason:
        "Aktive Kampagnen-Charaktere können nicht gelöscht werden. Lasse den Charakter zuerst vom Spielleiter aus der Kampagne entfernen.",
    };
  }

  return {
    canDelete: true,
    isCampaignLinked: false,
    reason: null,
  };
}
