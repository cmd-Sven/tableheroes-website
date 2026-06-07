import { createAdminClient } from "@/src/lib/supabase/server";

export type CampaignPartyRosterEntry = {
  characterName: string;
  playerTableName: string | null;
  platformUsername: string;
};

function spokenAliases(entry: CampaignPartyRosterEntry): string[] {
  const aliases = new Set<string>();
  const table = entry.playerTableName?.trim();
  const character = entry.characterName.trim();
  if (table) aliases.add(table);
  if (character) aliases.add(character);
  return [...aliases];
}

export function formatPartyRosterForPrompt(entries: CampaignPartyRosterEntry[]): string {
  if (entries.length === 0) {
    return "Keine Party-Roster-Daten hinterlegt (GM kann echte Tischnamen in den Kampagnenmitgliedern pflegen).";
  }

  return entries
    .map((entry) => {
      const aliases = spokenAliases(entry);
      const aliasText = aliases.length > 0 ? aliases.map((a) => `„${a}"`).join(", ") : "—";
      return `- Charakter „${entry.characterName}" — im Transkript evtl. als: ${aliasText}`;
    })
    .join("\n");
}

export async function loadCampaignPartyRoster(
  campaignId: string,
): Promise<CampaignPartyRosterEntry[]> {
  const admin = createAdminClient();

  const { data: membersRaw, error: membersError } = await (admin.from("campaign_members") as any)
    .select("user_id, character_id, player_table_name, status")
    .eq("campaign_id", campaignId)
    .in("status", ["Approved", "Active"]);

  let members = (membersRaw ?? []) as Array<{
    user_id: string;
    character_id: string | null;
    player_table_name: string | null;
  }>;

  if (membersError) {
    const missingColumn =
      membersError.message.includes("player_table_name") ||
      membersError.message.includes("schema cache");
    if (!missingColumn) {
      return [];
    }
    const { data: fallbackRaw } = await (admin.from("campaign_members") as any)
      .select("user_id, character_id, status")
      .eq("campaign_id", campaignId)
      .in("status", ["Approved", "Active"]);
    members = ((fallbackRaw ?? []) as Array<{
      user_id: string;
      character_id: string | null;
    }>).map((row) => ({
      ...row,
      player_table_name: null,
    }));
  }

  const characterIds = [
    ...new Set(
      members
        .map((m) => m.character_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const userIds = [...new Set(members.map((m) => m.user_id).filter(Boolean))];

  const characterNameById = new Map<string, string>();
  if (characterIds.length > 0) {
    const { data: charRows } = await (admin.from("characters") as any)
      .select("id, name")
      .in("id", characterIds);
    for (const row of (charRows ?? []) as Array<{ id: string; name: string }>) {
      characterNameById.set(String(row.id), String(row.name ?? "").trim());
    }
  }

  const usernameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: userRows } = await (admin.from("users") as any)
      .select("id, username")
      .in("id", userIds);
    for (const row of (userRows ?? []) as Array<{ id: string; username: string }>) {
      usernameById.set(String(row.id), String(row.username ?? "Spieler").trim());
    }
  }

  const roster: CampaignPartyRosterEntry[] = [];

  for (const member of members) {
    if (!member.character_id) continue;
    const characterName = characterNameById.get(member.character_id);
    if (!characterName) continue;
    roster.push({
      characterName,
      playerTableName: member.player_table_name?.trim() || null,
      platformUsername: usernameById.get(member.user_id) ?? "Spieler",
    });
  }

  return roster.sort((a, b) => a.characterName.localeCompare(b.characterName, "de"));
}
