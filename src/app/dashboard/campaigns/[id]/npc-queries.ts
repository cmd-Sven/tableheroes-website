import "server-only";

import { createClient } from "@/src/lib/supabase/server";
import { logPostgrestError } from "@/src/lib/supabase/format-postgrest-error";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";

/**
 * Reine Datenqueries (kein "use server") – für Server Components und RSC-Render.
 * NICHT aus Client Components importieren.
 */

export async function getNPCs(campaignId: string, userId: string, isGM: boolean = false) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { id: string; world_id: string | null } | null;
  if (!campaign || !campaign.world_id) return [];

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select("*")
    .eq("world_id", campaign.world_id)
    .order("created_at", { ascending: false });

  if (error) {
    logPostgrestError("Fetch NPCs Error:", error);
    return [];
  }

  const visibility = await getVisibilityForCampaign(campaignId, "npc");
  let npcs = (npcsRaw || []).map((npc: any) => ({
    ...npc,
    is_revealed: visibility[npc.id] ?? false,
  }));

  if (!isGM) {
    npcs = npcs.filter((npc: any) => npc.is_revealed === true);
  }

  const { data: favorites } = await (supabase.from("npc_favorites") as any)
    .select("npc_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { npc_id: string }) => f.npc_id));

  const enrichedNPCs = npcs.map((npc: any) => {
    return {
      ...npc,
      is_favorite: favoriteIds.has(npc.id),
      active_quests: [],
      has_active_quest: false,
      has_active_quest_as_giver: false,
      active_quest_titles_as_giver: [],
      quests_as_giver: [],
      quests_as_participant: [],
    };
  });

  return enrichedNPCs;
}

/** Leichte NSC-Liste für Sessions-Tab (ohne Quest-Enrichment). */
export async function getNpcSessionOptions(
  campaignId: string,
  userId: string,
  isGM: boolean,
  worldId?: string | null,
) {
  const supabase = await createClient();

  let resolvedWorldId = worldId ?? null;
  if (!resolvedWorldId) {
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("world_id")
      .eq("id", campaignId)
      .single();
    resolvedWorldId = (campaignRaw as { world_id?: string | null } | null)?.world_id ?? null;
  }
  if (!resolvedWorldId) return [];

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select("id, name, title")
    .eq("world_id", resolvedWorldId)
    .order("name", { ascending: true });

  if (error) {
    logPostgrestError("Fetch NPC session options error:", error);
    return [];
  }

  if (isGM) return (npcsRaw as any[]) || [];

  const visibility = await getVisibilityForCampaign(campaignId, "npc");
  return ((npcsRaw as any[]) || []).filter(
    (npc) => visibility[npc.id] === true,
  );
}
