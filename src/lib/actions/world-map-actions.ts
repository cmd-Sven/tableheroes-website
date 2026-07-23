"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";
import {
  DEFAULT_WORLD_MAP_GRID,
  isWorldMapIconKey,
  type WorldMap,
  type WorldMapIconKey,
  type WorldMapMarker,
  type WorldMapMarkerNote,
  type SessionWorldMap,
} from "@/src/lib/world-maps/types";
import {
  normalizeWorldMap,
  normalizeWorldMapMarker,
  normalizeWorldMapMarkerNote,
} from "@/src/lib/world-maps/normalize";

async function assertWorldGm(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .maybeSingle();

  if (!world || String((world as { gm_id?: string }).gm_id ?? "") !== String(user.id)) {
    throw new Error("Nur der Welt-GM kann Weltkarten verwalten.");
  }
  return { supabase, user };
}

async function assertSessionGm(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, world_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    throw new Error("Nur der Spielleiter darf Session-Weltkarten verwalten.");
  }

  return {
    supabase,
    user,
    campaignId,
    worldId: (campaignRaw as { world_id?: string | null })?.world_id
      ? String((campaignRaw as { world_id: string }).world_id)
      : null,
  };
}

function revalidateWorldMaps(worldId: string, campaignId?: string | null) {
  revalidatePath(`/dashboard/worlds/${worldId}/maps`);
  revalidatePath(`/dashboard/worlds/${worldId}`);
  if (campaignId) {
    revalidatePath(`/dashboard/campaigns/${campaignId}/maps`);
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
  }
}

// ---------------------------------------------------------------------------
// World maps CRUD
// ---------------------------------------------------------------------------

export async function getWorldMaps(worldId: string): Promise<WorldMap[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("world_maps")
    .select("*")
    .eq("world_id", worldId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => normalizeWorldMap(row));
}

export async function getWorldMap(mapId: string): Promise<WorldMap | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("world_maps")
    .select("*")
    .eq("id", mapId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeWorldMap(data as Record<string, unknown>);
}

export async function createWorldMap(input: {
  worldId: string;
  title: string;
  imageUrl: string;
  imageStoragePath?: string | null;
  gridConfig?: BattlemapGridConfig;
  sortOrder?: number;
}): Promise<WorldMap> {
  const { supabase } = await assertWorldGm(input.worldId);
  const title = input.title.trim();
  if (!title) throw new Error("Titel fehlt.");
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) throw new Error("Bild-URL fehlt.");

  const { data, error } = await (supabase as any)
    .from("world_maps")
    .insert({
      world_id: input.worldId,
      title,
      image_url: imageUrl,
      image_storage_path: input.imageStoragePath ?? null,
      grid_config: input.gridConfig ?? DEFAULT_WORLD_MAP_GRID,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidateWorldMaps(input.worldId);
  return normalizeWorldMap(data as Record<string, unknown>);
}

export async function updateWorldMap(
  mapId: string,
  worldId: string,
  updates: {
    title?: string;
    imageUrl?: string;
    imageStoragePath?: string | null;
    gridConfig?: BattlemapGridConfig;
    sortOrder?: number;
    groupTokenGridX?: number | null;
    groupTokenGridY?: number | null;
    groupTokenVisible?: boolean;
  },
): Promise<WorldMap> {
  const { supabase } = await assertWorldGm(worldId);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title != null) patch.title = updates.title.trim();
  if (updates.imageUrl != null) patch.image_url = updates.imageUrl.trim();
  if (updates.imageStoragePath !== undefined) {
    patch.image_storage_path = updates.imageStoragePath;
  }
  if (updates.gridConfig) patch.grid_config = updates.gridConfig;
  if (updates.sortOrder != null) patch.sort_order = updates.sortOrder;
  if (updates.groupTokenGridX !== undefined) {
    patch.group_token_grid_x = updates.groupTokenGridX;
  }
  if (updates.groupTokenGridY !== undefined) {
    patch.group_token_grid_y = updates.groupTokenGridY;
  }
  if (updates.groupTokenVisible !== undefined) {
    patch.group_token_visible = updates.groupTokenVisible;
  }

  const { data, error } = await (supabase as any)
    .from("world_maps")
    .update(patch)
    .eq("id", mapId)
    .eq("world_id", worldId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidateWorldMaps(worldId);
  return normalizeWorldMap(data as Record<string, unknown>);
}

export async function deleteWorldMap(mapId: string, worldId: string): Promise<void> {
  const { supabase } = await assertWorldGm(worldId);
  const { error } = await (supabase as any)
    .from("world_maps")
    .delete()
    .eq("id", mapId)
    .eq("world_id", worldId);
  if (error) throw new Error(error.message);
  revalidateWorldMaps(worldId);
}

export async function setWorldMapGroupToken(input: {
  mapId: string;
  worldId: string;
  gridX: number | null;
  gridY: number | null;
  visible?: boolean;
}): Promise<WorldMap> {
  return updateWorldMap(input.mapId, input.worldId, {
    groupTokenGridX: input.gridX,
    groupTokenGridY: input.gridY,
    groupTokenVisible: input.visible,
  });
}

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

export async function getWorldMapMarkers(mapId: string): Promise<WorldMapMarker[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("world_map_markers")
    .select("*")
    .eq("world_map_id", mapId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) =>
    normalizeWorldMapMarker(row),
  );
}

export async function upsertWorldMapMarker(input: {
  worldId: string;
  mapId: string;
  markerId?: string;
  icon: WorldMapIconKey;
  name: string;
  description?: string | null;
  gridX: number;
  gridY: number;
  isVisibleToPlayers?: boolean;
  loreId?: string | null;
  npcId?: string | null;
  factionId?: string | null;
  creatureId?: string | null;
  questId?: string | null;
}): Promise<WorldMapMarker> {
  const { supabase } = await assertWorldGm(input.worldId);
  const name = input.name.trim();
  if (!name) throw new Error("Name fehlt.");
  const icon = isWorldMapIconKey(input.icon) ? input.icon : "marker";

  const payload = {
    world_map_id: input.mapId,
    icon,
    name,
    description: input.description?.trim() || null,
    grid_x: Math.round(input.gridX),
    grid_y: Math.round(input.gridY),
    is_visible_to_players: input.isVisibleToPlayers === true,
    lore_id: input.loreId || null,
    npc_id: input.npcId || null,
    faction_id: input.factionId || null,
    creature_id: input.creatureId || null,
    quest_id: input.questId || null,
    updated_at: new Date().toISOString(),
  };

  let data: Record<string, unknown>;
  if (input.markerId) {
    const res = await (supabase as any)
      .from("world_map_markers")
      .update(payload)
      .eq("id", input.markerId)
      .eq("world_map_id", input.mapId)
      .select("*")
      .single();
    if (res.error) throw new Error(res.error.message);
    data = res.data as Record<string, unknown>;
  } else {
    const res = await (supabase as any)
      .from("world_map_markers")
      .insert(payload)
      .select("*")
      .single();
    if (res.error) throw new Error(res.error.message);
    data = res.data as Record<string, unknown>;
  }

  revalidateWorldMaps(input.worldId);
  return normalizeWorldMapMarker(data);
}

export async function toggleWorldMapMarkerVisibility(
  markerId: string,
  mapId: string,
  worldId: string,
  visible: boolean,
): Promise<WorldMapMarker> {
  const { supabase } = await assertWorldGm(worldId);
  const { data, error } = await (supabase as any)
    .from("world_map_markers")
    .update({
      is_visible_to_players: visible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", markerId)
    .eq("world_map_id", mapId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidateWorldMaps(worldId);
  return normalizeWorldMapMarker(data as Record<string, unknown>);
}

export async function deleteWorldMapMarker(
  markerId: string,
  mapId: string,
  worldId: string,
): Promise<void> {
  const { supabase } = await assertWorldGm(worldId);
  const { error } = await (supabase as any)
    .from("world_map_markers")
    .delete()
    .eq("id", markerId)
    .eq("world_map_id", mapId);
  if (error) throw new Error(error.message);
  revalidateWorldMaps(worldId);
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getWorldMapMarkerNotes(
  markerId: string,
): Promise<WorldMapMarkerNote[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("world_map_marker_notes")
    .select("*")
    .eq("marker_id", markerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) =>
    normalizeWorldMapMarkerNote(row),
  );
}

export async function addWorldMapMarkerNote(input: {
  markerId: string;
  body: string;
  worldId: string;
}): Promise<WorldMapMarkerNote> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const body = input.body.trim();
  if (!body) throw new Error("Notiz ist leer.");

  let displayName: string | null = null;
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) {
    displayName =
      (profile as { display_name?: string | null }).display_name?.trim() ||
      (profile as { username?: string | null }).username?.trim() ||
      null;
  }

  const { data, error } = await (supabase as any)
    .from("world_map_marker_notes")
    .insert({
      marker_id: input.markerId,
      body,
      author_user_id: user.id,
      author_display_name: displayName,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidateWorldMaps(input.worldId);
  return normalizeWorldMapMarkerNote(data as Record<string, unknown>);
}

export async function deleteWorldMapMarkerNote(
  noteId: string,
  worldId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { error } = await (supabase as any)
    .from("world_map_marker_notes")
    .delete()
    .eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidateWorldMaps(worldId);
}

// ---------------------------------------------------------------------------
// Session attach + force view
// ---------------------------------------------------------------------------

export async function getSessionWorldMaps(
  sessionId: string,
): Promise<SessionWorldMap[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_world_maps")
    .select("*, world_maps(*)")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const wm = row.world_maps as Record<string, unknown> | null;
    return {
      id: String(row.id),
      session_id: String(row.session_id),
      world_map_id: String(row.world_map_id),
      sort_order: Number(row.sort_order ?? 0),
      world_map: wm ? normalizeWorldMap(wm) : undefined,
    };
  });
}

export async function attachWorldMapToSession(input: {
  sessionId: string;
  worldMapId: string;
  sortOrder?: number;
}): Promise<SessionWorldMap> {
  const { supabase, campaignId } = await assertSessionGm(input.sessionId);

  const { data, error } = await (supabase as any)
    .from("session_world_maps")
    .upsert(
      {
        session_id: input.sessionId,
        world_map_id: input.worldMapId,
        sort_order: input.sortOrder ?? 0,
      },
      { onConflict: "session_id,world_map_id" },
    )
    .select("*, world_maps(*)")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/session/${input.sessionId}`);

  const wm = (data as { world_maps?: Record<string, unknown> }).world_maps;
  return {
    id: String((data as { id: string }).id),
    session_id: input.sessionId,
    world_map_id: input.worldMapId,
    sort_order: Number((data as { sort_order?: number }).sort_order ?? 0),
    world_map: wm ? normalizeWorldMap(wm) : undefined,
  };
}

export async function detachWorldMapFromSession(
  sessionId: string,
  worldMapId: string,
): Promise<void> {
  const { supabase, campaignId } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_maps")
    .delete()
    .eq("session_id", sessionId)
    .eq("world_map_id", worldMapId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/session/${sessionId}`);
}

/** GM schiebt alle Spieler auf die Weltkarten-Ansicht (oder zurück). */
export async function setActiveWorldMap(
  sessionId: string,
  worldMapId: string | null,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);

  if (worldMapId) {
    // sicherstellen, dass die Karte der Session zugeordnet ist
    const { data: link } = await (supabase as any)
      .from("session_world_maps")
      .select("id")
      .eq("session_id", sessionId)
      .eq("world_map_id", worldMapId)
      .maybeSingle();
    if (!link) {
      await (supabase as any).from("session_world_maps").insert({
        session_id: sessionId,
        world_map_id: worldMapId,
        sort_order: 0,
      });
    }
  }

  const { error } = await (supabase as any)
    .from("session_live_states")
    .update({ active_world_map_id: worldMapId })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/session/${sessionId}`);
}

/** Link-Optionen für Marker-Formulare. */
export async function getWorldMapLinkOptions(worldId: string, campaignId?: string | null) {
  const supabase = await createClient();

  const [loreRes, npcRes, factionRes, creatureRes] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("npcs") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("factions") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("bestarium_creatures") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  let quests: Array<{ id: string; title: string }> = [];
  if (campaignId) {
    const questRes = await (supabase.from("quests") as any)
      .select("id, title")
      .eq("campaign_id", campaignId)
      .order("title", { ascending: true })
      .limit(500);
    quests = ((questRes.data ?? []) as Array<{ id: string; title: string }>).map((q) => ({
      id: String(q.id),
      title: String(q.title ?? "Quest"),
    }));
  }

  return {
    lore: ((loreRes.data ?? []) as Array<{ id: string; name: string; type?: string }>).map(
      (l) => ({
        id: String(l.id),
        name: String(l.name ?? "Lore"),
        type: l.type != null ? String(l.type) : null,
      }),
    ),
    npcs: ((npcRes.data ?? []) as Array<{ id: string; name: string }>).map((n) => ({
      id: String(n.id),
      name: String(n.name ?? "NPC"),
    })),
    factions: ((factionRes.data ?? []) as Array<{ id: string; name: string }>).map((f) => ({
      id: String(f.id),
      name: String(f.name ?? "Fraktion"),
    })),
    creatures: ((creatureRes.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({
      id: String(c.id),
      name: String(c.name ?? "Kreatur"),
    })),
    quests,
  };
}

export async function parseWorldMapGridConfig(raw: unknown): Promise<BattlemapGridConfig> {
  return parseGridConfig(raw);
}
