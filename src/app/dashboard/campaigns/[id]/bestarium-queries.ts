import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import type { BestariumCreatureRow } from "@/src/app/dashboard/worlds/world-bestarium-actions";

export type CampaignBestariumCreature = BestariumCreatureRow & { is_revealed: boolean };

export type BestariumPlayerListRow = { id: string; name: string; sort_order: number };

export type BestariumPlayerDetail = {
  id: string;
  name: string;
  physical_description: string | null;
  player_knowledge: string | null;
  image_url: string | null;
};

/**
 * Alle Kreaturen der Welt der Kampagne; GM sieht alle mit Sichtbarkeits-Flag, Spieler nur freigegebene (minimale Felder).
 */
export async function getBestariumCreaturesForCampaign(campaignId: string, isGM: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { gm: [] as CampaignBestariumCreature[], player: [] as BestariumPlayerListRow[] };

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRaw as { world_id: string | null } | null)?.world_id;
  if (!worldId) return { gm: [], player: [] };

  if (!isGM) {
    const { data, error } = await (supabase as any).rpc("bestarium_for_player_list", {
      p_campaign_id: campaignId,
    });
    if (error) {
      console.error("[getBestariumCreaturesForCampaign] rpc list", error);
      return { gm: [], player: [] };
    }
    const rows = (data || []) as BestariumPlayerListRow[];
    return { gm: [], player: rows };
  }

  const { data: creatures, error } = await (supabase.from("bestarium_creatures") as any)
    .select("*")
    .eq("world_id", worldId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getBestariumCreaturesForCampaign]", error);
    return { gm: [], player: [] };
  }

  const visibility = await getVisibilityForCampaign(campaignId, "bestarium");
  const gm = ((creatures || []) as BestariumCreatureRow[]).map((c) => ({
    ...c,
    is_revealed: visibility[c.id] ?? false,
  }));

  return { gm, player: [] };
}

/** Spieler: Detail nur über RPC (keine Statblock-Spalten). */
export async function getBestariumPlayerDetail(
  campaignId: string,
  creatureId: string
): Promise<BestariumPlayerDetail | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("bestarium_for_player_detail", {
    p_campaign_id: campaignId,
    p_creature_id: creatureId,
  });

  if (error) {
    console.error("[getBestariumPlayerDetail]", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: String((row as any).id),
    name: String((row as any).name ?? ""),
    physical_description: (row as any).physical_description ?? null,
    player_knowledge: (row as any).player_knowledge ?? null,
    image_url: (row as any).image_url ?? null,
  };
}
