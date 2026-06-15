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

  const factionsWithCounts = await Promise.all(
    factions.map(async (faction: any) => {
      const { count } = await (supabase.from("npcs") as any)
        .select("id", { count: "exact", head: true })
        .eq("faction_id", faction.id);
      return {
        ...faction,
        is_revealed: visibility[faction.id] ?? false,
        member_count: count || 0,
      };
    }),
  );

  return factionsWithCounts;
}
