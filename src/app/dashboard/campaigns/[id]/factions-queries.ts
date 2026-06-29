import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";

const PLAYER_MEMBER_STATUSES = [
  "Approved",
  "Active",
  "Drafting",
  "In_Review",
  "Changes_Proposed",
] as const;

/** Fraktionen mit Member-Count und campaign_visibility (RSC, kein "use server"). */
export async function getFactionsWithMembers(campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
  if (!campaign || !campaign.world_id) return [];

  const isGM = campaign.gm_id === user.id;
  if (!isGM) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .in("status", [...PLAYER_MEMBER_STATUSES])
      .maybeSingle();
    if (!member) return [];
  }

  const { data: factions, error: factionsError } = await (supabase.from("factions") as any)
    .select("*")
    .eq("world_id", campaign.world_id)
    .order("created_at", { ascending: false });

  if (factionsError) {
    console.error("Fetch Factions Error:", factionsError);
    console.error("Fehlerinhalt:", JSON.stringify(factionsError, null, 2));
    return [];
  }
  if (!factions?.length) return [];

  const visibility = await getVisibilityForCampaign(campaignId, "faction");

  const { data: npcFactionRows } = await (supabase.from("npcs") as any)
    .select("faction_id")
    .eq("world_id", campaign.world_id)
    .not("faction_id", "is", null);

  const memberCountByFaction = new Map<string, number>();
  for (const row of (npcFactionRows as { faction_id?: string | null }[]) || []) {
    const factionId = row.faction_id ? String(row.faction_id) : "";
    if (!factionId) continue;
    memberCountByFaction.set(factionId, (memberCountByFaction.get(factionId) ?? 0) + 1);
  }

  return factions.map((faction: any) => ({
    ...faction,
    is_revealed: visibility[faction.id] ?? false,
    member_count: memberCountByFaction.get(String(faction.id)) ?? 0,
  }));
}
