/**
 * Kartenquellen der Lite-Bühne: vorhandene NPCs, Bestiarium, Szenen, Fraktionen, Lore-Orte.
 */
import "server-only";

import { getCampaignSceneMedia } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { createClient } from "@/src/lib/supabase/server";
import { isLocationType } from "@/src/lib/lore-types";
import type { LiteCatalog } from "@/src/lib/live-lite/types";

const EMPTY: LiteCatalog = {
  npcs: [],
  beasts: [],
  scenes: [],
  factions: [],
  locations: [],
};

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function loadLiveLiteCatalog(
  campaignId: string,
  worldId: string | null,
): Promise<LiteCatalog> {
  if (!worldId) return EMPTY;
  const supabase = await createClient();

  const [npcRes, beastRes, factionRes, loreRes, scenes] = await Promise.all([
    (supabase.from("npcs") as any)
      .select("id, name, title, image_url")
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
    (supabase.from("bestarium_creatures") as any)
      .select("id, name, creature_type, image_url")
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
    (supabase.from("factions") as any)
      .select(
        "id, name, image_url, banner_url, type, current_status, image_display, banner_display",
      )
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
    (supabase.from("world_lore") as any)
      .select("id, name, type, image_url")
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
    getCampaignSceneMedia(campaignId).catch(() => []),
  ]);

  const npcs = ((npcRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: textOrNull(row.name) ?? "NPC",
    title: textOrNull(row.title),
    image_url: textOrNull(row.image_url),
  }));

  const beasts = ((beastRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: textOrNull(row.name) ?? "Kreatur",
    creature_type: textOrNull(row.creature_type),
    image_url: textOrNull(row.image_url),
  }));

  const factions = ((factionRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: textOrNull(row.name) ?? "Fraktion",
    image_url: textOrNull(row.image_url),
    banner_url: textOrNull(row.banner_url),
    type: textOrNull(row.type),
    current_status: textOrNull(row.current_status),
    image_display: row.image_display ?? null,
    banner_display: row.banner_display ?? null,
  }));

  const locations = ((loreRes.data ?? []) as Record<string, unknown>[])
    .filter((row) => isLocationType(String(row.type ?? "")))
    .map((row) => ({
      id: String(row.id),
      name: textOrNull(row.name) ?? "Ort",
      type: textOrNull(row.type),
      image_url: textOrNull(row.image_url),
    }));

  return {
    npcs,
    beasts,
    scenes: scenes
      .filter((scene) => Boolean(scene.image_url?.trim()))
      .map((scene) => ({
        id: scene.id,
        title: scene.title,
        image_url: scene.image_url,
        category: scene.category,
        player_notes: scene.player_notes,
        image_is_ai_generated: scene.image_is_ai_generated === true,
      })),
    factions,
    locations,
  };
}
