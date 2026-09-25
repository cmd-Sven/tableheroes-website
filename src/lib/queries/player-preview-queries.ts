import { createAdminClient } from "@/src/lib/supabase/server";

export type PlayerPreviewCharacter = {
  id: string;
  name: string;
  className: string;
  level: number;
  campaignName: string | null;
};

export type PlayerPreviewCampaign = {
  id: string;
  name: string;
};

export type PlayerPreviewRow = {
  id: string;
  label: string;
  username: string | null;
  avatarUrl: string | null;
  characters: PlayerPreviewCharacter[];
  campaigns: PlayerPreviewCampaign[];
};

const ACTIVE_MEMBER_STATUSES = ["Approved", "Active"];

/** Alle Konten mit Rolle Spieler, plus Charaktere und aktive Kampagnen. Nur serverseitig nach GM/Admin-Check. */
export async function listRegisteredPlayersForPreview(): Promise<PlayerPreviewRow[]> {
  const admin = createAdminClient();

  const { data: usersRaw, error } = await (admin.from("users") as any)
    .select("id, username, display_name, avatar_url, primary_role")
    .eq("primary_role", "Player")
    .order("username", { ascending: true });

  if (error) throw new Error(error.message);

  const users = (usersRaw as any[]) ?? [];
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id as string);

  const [{ data: membersRaw, error: memberError }, { data: charsRaw, error: charError }] =
    await Promise.all([
      (admin.from("campaign_members") as any)
        .select("user_id, campaign_id, character_id, status, campaigns ( id, name )")
        .in("user_id", userIds)
        .in("status", ACTIVE_MEMBER_STATUSES),
      (admin.from("characters") as any)
        .select("id, user_id, campaign_id, name, class, level, status")
        .in("user_id", userIds)
        .in("status", ["Active", "Approved"]),
    ]);

  if (memberError) throw new Error(memberError.message);
  if (charError) throw new Error(charError.message);

  const members = (membersRaw as any[]) ?? [];
  const extraCampaignIds = [
    ...new Set(
      ((charsRaw as any[]) ?? [])
        .map((character) => character.campaign_id as string | null)
        .filter((id): id is string => !!id),
    ),
  ];
  const campaignNameById = new Map<string, string>();
  if (extraCampaignIds.length > 0) {
    const { data: campaignRows } = await (admin.from("campaigns") as any)
      .select("id, name")
      .in("id", extraCampaignIds);
    for (const row of (campaignRows as any[]) ?? []) {
      campaignNameById.set(row.id as string, (row.name as string | null) ?? "Kampagne");
    }
  }

  const charactersByUser = new Map<string, any[]>();
  for (const character of (charsRaw as any[]) ?? []) {
    const list = charactersByUser.get(character.user_id) ?? [];
    list.push(character);
    charactersByUser.set(character.user_id, list);
  }

  return users
    .map((user) => {
      const mine = members.filter((m) => m.user_id === user.id);
      const campaigns: PlayerPreviewCampaign[] = [];
      const seenCampaigns = new Set<string>();

      for (const member of mine) {
        const campaign = member.campaigns;
        if (!campaign?.id || seenCampaigns.has(campaign.id)) continue;
        seenCampaigns.add(campaign.id);
        const name =
          campaignNameById.get(campaign.id) ??
          ((campaign.name as string | null) ?? "Kampagne");
        campaignNameById.set(campaign.id as string, name);
        campaigns.push({ id: campaign.id as string, name });
      }

      const characters: PlayerPreviewCharacter[] = (charactersByUser.get(user.id) ?? []).map(
        (character) => ({
          id: character.id as string,
          name: (character.name as string | null) ?? "Charakter",
          className: (character.class as string | null) ?? "",
          level: Number(character.level) || 1,
          campaignName: character.campaign_id
            ? campaignNameById.get(character.campaign_id) ?? null
            : null,
        }),
      );

      const label =
        (user.display_name as string | null)?.trim() ||
        (user.username as string | null)?.trim() ||
        "Spieler";

      return {
        id: user.id as string,
        label,
        username: (user.username as string | null) ?? null,
        avatarUrl: (user.avatar_url as string | null) ?? null,
        characters,
        campaigns,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}
