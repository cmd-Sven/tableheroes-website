import "server-only";

import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import { getLoreLocationOptions } from "@/src/app/dashboard/campaigns/[id]/lore-queries";
import { getCampaignShops } from "@/src/app/dashboard/campaigns/[id]/shop-queries";
import { getCampaignCreatureStates } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import { resolveBestariumImageUrl } from "@/src/lib/bestarium-image";
import {
  BESTARIUM_SESSION_SELECT,
  NPC_SESSION_STAGE_SELECT,
  SCENE_MEDIA_SESSION_SELECT,
  FACTION_LIST_SELECT,
} from "@/src/lib/queries/entity-list-columns";
import type { LiveCampaignShopOption } from "@/src/app/session/[sessionId]/StageNpcShopControls";

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((id) => id.length > 0);
}

/**
 * null oder [] = Stage-Pool „alles erlaubt“ (bestehendes Verhalten).
 * Nicht-leeres Deck = nur diese IDs (+ Live-Sichtbarkeit).
 */
function resolveNeededIds(
  deckIds: string[] | null,
  liveIds: string[],
): { mode: "all" | "subset"; ids: string[] } {
  if (deckIds == null || deckIds.length === 0) {
    return { mode: "all", ids: [] };
  }
  const merged = new Set<string>([...deckIds.map(String), ...liveIds.map(String)]);
  merged.delete("");
  return { mode: "subset", ids: [...merged] };
}

export type SessionStageCatalog = {
  allCampaignNpcs: Array<{
    id: string;
    name: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    is_revealed: boolean;
    is_merchant: boolean;
    shop_id: string | null;
    faction_id: string | null;
    current_location_id: string | null;
    home_location_id: string | null;
  }>;
  allCampaignFactions: Array<{
    id: string;
    name: string;
    image_url: string | null;
    image_display: unknown;
    banner_url: string | null;
    banner_display: unknown;
    type: string | null;
    description: string | null;
    current_status: string | null;
    is_revealed: boolean;
  }>;
  allCampaignCreatures: Array<{
    id: string;
    name: string;
    creature_type: string | null;
    image_url: string | null;
    physical_description: string | null;
    challenge_rating: number | null;
    known_loot: string | null;
    is_revealed: boolean;
  }>;
  allSceneMedia: Array<{
    id: string;
    title: string;
    image_url: string;
    category: string;
    player_notes: string | null;
    image_is_ai_generated: boolean;
  }>;
  initialCreatureStates: Awaited<ReturnType<typeof getCampaignCreatureStates>>;
  loreLocationOptions: Awaited<ReturnType<typeof getLoreLocationOptions>>;
  campaignShops: LiveCampaignShopOption[];
};

/**
 * Stage-Deck-first: nur benötigte Entities laden (bzw. schlanke Full-Liste wenn Deck offen).
 */
export async function loadSessionStageCatalog(opts: {
  campaignId: string;
  worldId: string | null;
  viewAsGM: boolean;
  liveState: Record<string, unknown> | null;
  stageDeckNpcIds: string[] | null;
  stageDeckFactionIds: string[] | null;
  stageDeckSceneMediaIds: string[] | null;
  stageDeckCreatureIds: string[] | null;
}): Promise<SessionStageCatalog> {
  const supabase = await createClient();
  const {
    campaignId,
    worldId,
    viewAsGM,
    liveState,
    stageDeckNpcIds,
    stageDeckFactionIds,
    stageDeckSceneMediaIds,
    stageDeckCreatureIds,
  } = opts;

  const visibleNpcIds = asIdList(liveState?.visible_npc_ids);
  const visibleFactionIds = asIdList(liveState?.visible_faction_ids);
  const visibleCreatureIds = asIdList(liveState?.visible_creature_ids);
  const activeMerchant =
    liveState?.active_merchant_npc_id != null
      ? String(liveState.active_merchant_npc_id)
      : null;
  const activeScene =
    liveState?.active_scene_media_id != null
      ? String(liveState.active_scene_media_id)
      : null;

  const npcNeed = resolveNeededIds(
    stageDeckNpcIds,
    [...visibleNpcIds, ...(activeMerchant ? [activeMerchant] : [])],
  );
  const factionNeed = resolveNeededIds(stageDeckFactionIds, visibleFactionIds);
  const sceneNeed = resolveNeededIds(
    stageDeckSceneMediaIds,
    activeScene ? [activeScene] : [],
  );
  const creatureNeed = resolveNeededIds(stageDeckCreatureIds, visibleCreatureIds);

  const emptyCatalog: SessionStageCatalog = {
    allCampaignNpcs: [],
    allCampaignFactions: [],
    allCampaignCreatures: [],
    allSceneMedia: [],
    initialCreatureStates: {},
    loreLocationOptions: [],
    campaignShops: [],
  };

  if (!worldId) {
    const [creatureStates, loreLocationOptions, shops] = await Promise.all([
      getCampaignCreatureStates(campaignId),
      viewAsGM ? getLoreLocationOptions(campaignId) : Promise.resolve([]),
      viewAsGM
        ? getCampaignShops(campaignId).then(({ shops }) =>
            shops.map((shop) => ({
              id: shop.id,
              name: shop.name,
              shop_mode: shop.shop_mode,
              archetype_key: shop.archetype_key,
            })),
          )
        : Promise.resolve([] as LiveCampaignShopOption[]),
    ]);
    return {
      ...emptyCatalog,
      initialCreatureStates: creatureStates,
      loreLocationOptions,
      campaignShops: shops,
    };
  }

  const [npcVis, factionVis, creatureVis] = await Promise.all([
    getVisibilityForCampaign(campaignId, "npc"),
    getVisibilityForCampaign(campaignId, "faction"),
    viewAsGM
      ? getVisibilityForCampaign(campaignId, "bestarium")
      : Promise.resolve({} as Record<string, boolean>),
  ]);

  // --- NPCs ---
  let npcRows: any[] = [];
  if (npcNeed.mode === "subset") {
    if (npcNeed.ids.length > 0) {
      const { data } = await (supabase.from("npcs") as any)
        .select(NPC_SESSION_STAGE_SELECT)
        .eq("world_id", worldId)
        .in("id", npcNeed.ids);
      npcRows = (data as any[]) || [];
    }
  } else {
    const { data } = await (supabase.from("npcs") as any)
      .select(NPC_SESSION_STAGE_SELECT)
      .eq("world_id", worldId)
      .order("name", { ascending: true });
    npcRows = (data as any[]) || [];
  }

  let allCampaignNpcs = npcRows.map((npc) => ({
    id: String(npc.id),
    name: String(npc.name ?? ""),
    title: npc.title != null ? String(npc.title) : null,
    description: npc.description != null ? String(npc.description) : null,
    image_url: npc.image_url != null ? String(npc.image_url) : null,
    is_revealed: npcVis[npc.id] ?? false,
    is_merchant: !!npc.is_merchant,
    shop_id: npc.shop_id != null ? String(npc.shop_id) : null,
    faction_id: npc.faction_id != null ? String(npc.faction_id) : null,
    current_location_id:
      npc.current_location_id != null ? String(npc.current_location_id) : null,
    home_location_id:
      npc.home_location_id != null ? String(npc.home_location_id) : null,
  }));
  if (!viewAsGM) {
    allCampaignNpcs = allCampaignNpcs.filter((n) => n.is_revealed);
  }

  // --- Factions ---
  let factionRows: any[] = [];
  if (factionNeed.mode === "subset") {
    if (factionNeed.ids.length > 0) {
      const { data } = await (supabase.from("factions") as any)
        .select(FACTION_LIST_SELECT)
        .eq("world_id", worldId)
        .in("id", factionNeed.ids);
      factionRows = (data as any[]) || [];
    }
  } else {
    const { data } = await (supabase.from("factions") as any)
      .select(FACTION_LIST_SELECT)
      .eq("world_id", worldId)
      .order("name", { ascending: true });
    factionRows = (data as any[]) || [];
  }

  let allCampaignFactions = factionRows.map((f) => ({
    id: String(f.id),
    name: String(f.name ?? "Fraktion"),
    image_url: f.image_url ?? null,
    image_display: f.image_display ?? null,
    banner_url: f.banner_url ?? null,
    banner_display: f.banner_display ?? null,
    type: f.type != null ? String(f.type) : null,
    description: f.description != null ? String(f.description) : null,
    current_status: f.current_status != null ? String(f.current_status) : null,
    is_revealed: factionVis[f.id] ?? false,
  }));
  if (!viewAsGM) {
    allCampaignFactions = allCampaignFactions.filter((f) => f.is_revealed);
  }

  // --- Scene media ---
  let sceneRows: any[] = [];
  if (sceneNeed.mode === "subset") {
    if (sceneNeed.ids.length > 0) {
      const { data } = await (supabase as any)
        .from("campaign_scene_media")
        .select(SCENE_MEDIA_SESSION_SELECT)
        .eq("campaign_id", campaignId)
        .in("id", sceneNeed.ids);
      sceneRows = (data as any[]) || [];
    }
  } else {
    const { data } = await (supabase as any)
      .from("campaign_scene_media")
      .select(SCENE_MEDIA_SESSION_SELECT)
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true });
    sceneRows = (data as any[]) || [];
  }

  const allSceneMedia = sceneRows.map((s) => ({
    id: String(s.id),
    title: String(s.title ?? ""),
    image_url: String(s.image_url ?? ""),
    category: String(s.category ?? "Sonstiges"),
    player_notes: s.player_notes != null ? String(s.player_notes) : null,
    image_is_ai_generated: s.image_is_ai_generated === true,
  }));

  // --- Bestarium (nur GM-Hand / Stage) ---
  let allCampaignCreatures: SessionStageCatalog["allCampaignCreatures"] = [];
  if (viewAsGM) {
    let creatureRows: any[] = [];
    if (creatureNeed.mode === "subset") {
      if (creatureNeed.ids.length > 0) {
        const { data } = await (supabase.from("bestarium_creatures") as any)
          .select(BESTARIUM_SESSION_SELECT)
          .eq("world_id", worldId)
          .in("id", creatureNeed.ids);
        creatureRows = (data as any[]) || [];
      }
    } else {
      const { data } = await (supabase.from("bestarium_creatures") as any)
        .select(BESTARIUM_SESSION_SELECT)
        .eq("world_id", worldId)
        .order("name", { ascending: true });
      creatureRows = (data as any[]) || [];
    }
    allCampaignCreatures = creatureRows.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      creature_type: c.creature_type != null ? String(c.creature_type) : null,
      image_url:
        c.image_url != null ? resolveBestariumImageUrl(String(c.image_url)) : null,
      physical_description:
        c.physical_description != null ? String(c.physical_description) : null,
      challenge_rating:
        typeof c.challenge_rating === "number" ? c.challenge_rating : null,
      known_loot: c.known_loot != null ? String(c.known_loot) : null,
      is_revealed: creatureVis[c.id] ?? false,
    }));
  }

  const [creatureStates, loreLocationOptions, shops] = await Promise.all([
    getCampaignCreatureStates(campaignId),
    viewAsGM ? getLoreLocationOptions(campaignId) : Promise.resolve([]),
    viewAsGM
      ? getCampaignShops(campaignId).then(({ shops }) =>
          shops.map((shop) => ({
            id: shop.id,
            name: shop.name,
            shop_mode: shop.shop_mode,
            archetype_key: shop.archetype_key,
          })),
        )
      : Promise.resolve([] as LiveCampaignShopOption[]),
  ]);

  // Creature-States auf geladene Kreaturen beschränken (kleiner Payload ans Client)
  const loadedCreatureIds = new Set(allCampaignCreatures.map((c) => c.id));
  const initialCreatureStates =
    loadedCreatureIds.size === 0
      ? {}
      : Object.fromEntries(
          Object.entries(creatureStates).filter(([id]) => loadedCreatureIds.has(id)),
        );

  return {
    allCampaignNpcs,
    allCampaignFactions,
    allCampaignCreatures,
    allSceneMedia,
    initialCreatureStates,
    loreLocationOptions,
    campaignShops: shops,
  };
}
