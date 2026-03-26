import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";

/**
 * Reine Datenqueries (kein "use server") – für Server Components.
 */

export async function getLoreEntries(campaignId: string) {
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
  if (!campaign) return [];
  if (!campaign.world_id) return [];

  const isGM = campaign.gm_id === user.id;
  if (!isGM) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .in("status", ["Accepted", "Active", "Drafting", "In_Review"])
      .maybeSingle();
    if (!member) return [];
  }

  const { data: lore, error } = await (supabase.from("world_lore") as any)
    .select("*")
    .eq("world_id", campaign.world_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch Lore Entries Error:", error);
    console.error("Fehlerinhalt:", JSON.stringify(error, null, 2));
    return [];
  }

  const visibility = await getVisibilityForCampaign(campaignId, "lore");
  let list = (lore || []).map((entry: any) => ({
    ...entry,
    is_revealed: visibility[entry.id] ?? false,
  }));

  if (!isGM) {
    list = list.filter((e: any) => e.is_revealed);
  }

  const { data: favorites } = await (supabase.from("lore_favorites") as any)
    .select("lore_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { lore_id: string }) => f.lore_id));

  const loreIds = list.map((l: any) => l.id);
  const { data: recentSecrets } = await (supabase.from("secrets") as any)
    .select("entity_id, created_at")
    .eq("entity_type", "lore")
    .in("entity_id", loreIds)
    .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  const loreWithRecentSecrets = new Set(
    (recentSecrets || []).map((s: { entity_id: string }) => s.entity_id),
  );

  const enrichedLore = list.map((entry: any) => {
    const hasRecentSecret = loreWithRecentSecrets.has(entry.id);
    const isNew = entry.created_at
      ? (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60) < 48
      : false;

    return {
      ...entry,
      is_favorite: favoriteIds.has(entry.id),
      has_recent_secret: hasRecentSecret && !isNew,
    };
  });

  return enrichedLore;
}
