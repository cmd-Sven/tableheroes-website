import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import type { BestariumCreatureRow } from "@/src/app/dashboard/worlds/world-bestarium-actions";
import { pickRpcString } from "@/src/lib/bestarium-image";

export type CampaignBestariumCreature = BestariumCreatureRow & {
  is_revealed: boolean;
  /** Anzeigename des verknüpften Ortes (nicht in DB-Zeile, aus locations geladen). */
  location_name: string | null;
};

export type BestariumPlayerListRow = {
  id: string;
  name: string;
  sort_order: number;
  image_url: string | null;
  creature_type: string | null;
  location_name: string | null;
};

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
    const rows = ((data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? ""),
      name: String(pickRpcString(row, ["name", "Name"]) ?? ""),
      sort_order: Number(row.sort_order ?? row.Sort_order ?? 0) || 0,
      image_url: pickRpcString(row, ["image_url", "imageUrl", "IMAGE_URL"]),
      creature_type: pickRpcString(row, ["creature_type", "creatureType", "CREATURE_TYPE"]),
      location_name: pickRpcString(row, ["location_name", "locationName", "LOCATION_NAME"]),
    })) as BestariumPlayerListRow[];
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
  const creatureRows = (creatures || []) as BestariumCreatureRow[];
  const locIds = [
    ...new Set(creatureRows.map((c) => c.location_id).filter(Boolean) as string[]),
  ];
  const locNames = new Map<string, string>();
  if (locIds.length > 0) {
    const { data: locRows } = await (supabase.from("locations") as any)
      .select("id, name")
      .in("id", locIds)
      .eq("world_id", worldId);
    for (const row of (locRows as any[]) || []) {
      if (row?.id) locNames.set(String(row.id), String(row.name ?? "").trim() || "");
    }
  }

  const gm = creatureRows.map((c) => ({
    ...c,
    location_name: c.location_id ? locNames.get(c.location_id) ?? null : null,
    is_revealed: visibility[c.id] ?? false,
  })) as CampaignBestariumCreature[];

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
  const rowRaw = Array.isArray(data) ? data[0] : data;
  if (!rowRaw || typeof rowRaw !== "object") return null;
  const row = rowRaw as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    name: String(pickRpcString(row, ["name", "Name"]) ?? ""),
    physical_description: pickRpcString(row, ["physical_description", "physicalDescription"]),
    player_knowledge: pickRpcString(row, ["player_knowledge", "playerKnowledge"]),
    image_url: pickRpcString(row, ["image_url", "imageUrl", "IMAGE_URL"]),
  };
}
