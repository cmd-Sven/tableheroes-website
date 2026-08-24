/**
 * carry-over-table-state — Clone battlemap + world-map session overlays into next session.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resilientUpdateSessionLiveState } from "@/src/lib/session-live-state-resilient";

type AnyClient = SupabaseClient | { from: (table: string) => any };

const INSERT_CHUNK = 80;

async function deleteBySession(
  supabase: AnyClient,
  table: string,
  sessionId: string,
): Promise<string | null> {
  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .eq("session_id", sessionId);
  return error?.message ?? null;
}

async function insertChunked(
  supabase: AnyClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<string | null> {
  if (rows.length === 0) return null;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await (supabase as any).from(table).insert(chunk);
    if (error) return error.message ?? `Insert in ${table} fehlgeschlagen.`;
  }
  return null;
}

function remapBattlemapId(
  map: Map<string, string>,
  oldId: unknown,
): string | null {
  if (oldId == null) return null;
  return map.get(String(oldId)) ?? null;
}

/**
 * Clears target session table overlays, clones battlemaps + children + world overlays
 * from source, remaps FKs, and sets active map ids on target live state.
 */
export async function cloneSessionTableState(input: {
  supabase: AnyClient;
  sourceSessionId: string;
  targetSessionId: string;
  campaignId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, sourceSessionId, targetSessionId, campaignId } = input;

  // 1) Clear existing table state on target (prep maps / overlays replaced).
  const clearTables = [
    "session_map_draw_strokes",
    "session_world_map_fog_shapes",
    "session_world_map_effect_templates",
    "session_world_map_effect_markers",
    "session_battlemaps", // CASCADE: tokens, props, fog, effects, markers, traps
  ] as const;

  for (const table of clearTables) {
    const err = await deleteBySession(supabase, table, targetSessionId);
    if (err) {
      return { ok: false, error: `Ziel-Tisch konnte nicht geleert werden (${table}): ${err}` };
    }
  }

  // 2) Clone battlemaps → id map
  const { data: sourceMapsRaw, error: mapsErr } = await (supabase as any)
    .from("session_battlemaps")
    .select("*")
    .eq("session_id", sourceSessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (mapsErr) {
    return { ok: false, error: mapsErr.message ?? "Battlemaps konnten nicht geladen werden." };
  }

  const sourceMaps = (sourceMapsRaw ?? []) as Array<Record<string, unknown>>;
  const battlemapIdMap = new Map<string, string>();

  for (const bm of sourceMaps) {
    const oldId = String(bm.id);
    const { data: inserted, error: insertErr } = await (supabase as any)
      .from("session_battlemaps")
      .insert({
        session_id: targetSessionId,
        campaign_id: campaignId,
        title: bm.title,
        image_url: bm.image_url,
        image_storage_path: bm.image_storage_path ?? null,
        sort_order: bm.sort_order ?? 0,
        grid_config: bm.grid_config,
      })
      .select("id")
      .single();

    if (insertErr || !inserted?.id) {
      return {
        ok: false,
        error: insertErr?.message ?? "Battlemap konnte nicht geklont werden.",
      };
    }
    battlemapIdMap.set(oldId, String(inserted.id));
  }

  // 3) Battlemap children
  const childSpecs: Array<{
    table: string;
    build: (row: Record<string, unknown>, newBmId: string) => Record<string, unknown> | null;
  }> = [
    {
      table: "session_battlemap_tokens",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        character_id: row.character_id ?? null,
        npc_id: row.npc_id ?? null,
        creature_id: row.creature_id ?? null,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        label: row.label ?? null,
        image_url: row.image_url ?? null,
        size_cells: row.size_cells ?? 1,
        is_visible_to_players: row.is_visible_to_players ?? true,
        token_side: row.token_side ?? "party",
        show_hp_bar: row.show_hp_bar ?? false,
      }),
    },
    {
      table: "session_battlemap_props",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        kind: row.kind,
        npc_id: row.npc_id ?? null,
        image_url: row.image_url ?? null,
        scene_media_id: row.scene_media_id ?? null,
        pos_x: row.pos_x ?? 0,
        pos_y: row.pos_y ?? 0,
        width: row.width ?? 0.15,
        height: row.height ?? 0.2,
        rotation: row.rotation ?? 0,
        is_visible_to_players: row.is_visible_to_players ?? true,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_battlemap_fog_shapes",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        campaign_id: campaignId,
        shape: row.shape,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        grid_w: row.grid_w ?? 1,
        grid_h: row.grid_h ?? 1,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_battlemap_effect_templates",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        campaign_id: campaignId,
        shape: row.shape,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        grid_w: row.grid_w ?? 1,
        grid_h: row.grid_h ?? 1,
        direction_deg: row.direction_deg ?? 0,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_battlemap_markers",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        campaign_id: campaignId,
        kind: row.kind,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        is_visible_to_players: row.is_visible_to_players ?? true,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_battlemap_traps",
      build: (row, newBmId) => ({
        battlemap_id: newBmId,
        session_id: targetSessionId,
        campaign_id: campaignId,
        name: row.name ?? "Falle",
        description: row.description ?? "",
        trap_type: row.trap_type ?? "mechanical",
        difficulty: row.difficulty ?? "medium",
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        detection_dc: row.detection_dc ?? 15,
        is_area_effect: row.is_area_effect ?? false,
        effect_shape: row.effect_shape ?? "circle",
        effect_radius: row.effect_radius ?? 1,
        damage: row.damage ?? "2d6",
        damage_type: row.damage_type ?? "piercing",
        save_ability: row.save_ability ?? null,
        save_dc: row.save_dc ?? null,
        status_effect: row.status_effect ?? null,
        is_armed: row.is_armed ?? true,
        is_detected: row.is_detected ?? false,
        is_triggered: row.is_triggered ?? false,
        is_visible_to_players: row.is_visible_to_players ?? false,
        triggered_by_character_id: row.triggered_by_character_id ?? null,
        triggered_at: row.triggered_at ?? null,
        lore_context: row.lore_context ?? null,
        ai_payload: row.ai_payload ?? {},
      }),
    },
  ];

  for (const spec of childSpecs) {
    const { data: rowsRaw, error: loadErr } = await (supabase as any)
      .from(spec.table)
      .select("*")
      .eq("session_id", sourceSessionId);
    if (loadErr) {
      return { ok: false, error: loadErr.message ?? `${spec.table} laden fehlgeschlagen.` };
    }
    const inserts: Record<string, unknown>[] = [];
    for (const row of (rowsRaw ?? []) as Array<Record<string, unknown>>) {
      const newBmId = remapBattlemapId(battlemapIdMap, row.battlemap_id);
      if (!newBmId) continue;
      const built = spec.build(row, newBmId);
      if (built) inserts.push(built);
    }
    const insertErr = await insertChunked(supabase, spec.table, inserts);
    if (insertErr) return { ok: false, error: insertErr };
  }

  // 4) World-map session overlays (world_map_id stays; only session_id changes)
  const worldSpecs: Array<{
    table: string;
    build: (row: Record<string, unknown>) => Record<string, unknown>;
  }> = [
    {
      table: "session_world_map_fog_shapes",
      build: (row) => ({
        world_map_id: row.world_map_id,
        session_id: targetSessionId,
        campaign_id: campaignId,
        shape: row.shape,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        grid_w: row.grid_w ?? 1,
        grid_h: row.grid_h ?? 1,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_world_map_effect_templates",
      build: (row) => ({
        world_map_id: row.world_map_id,
        session_id: targetSessionId,
        campaign_id: campaignId,
        shape: row.shape,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        grid_w: row.grid_w ?? 1,
        grid_h: row.grid_h ?? 1,
        direction_deg: row.direction_deg ?? 0,
        z_index: row.z_index ?? 0,
      }),
    },
    {
      table: "session_world_map_effect_markers",
      build: (row) => ({
        world_map_id: row.world_map_id,
        session_id: targetSessionId,
        campaign_id: campaignId,
        kind: row.kind,
        grid_x: row.grid_x ?? 0,
        grid_y: row.grid_y ?? 0,
        is_visible_to_players: row.is_visible_to_players ?? true,
        z_index: row.z_index ?? 0,
      }),
    },
  ];

  for (const spec of worldSpecs) {
    const { data: rowsRaw, error: loadErr } = await (supabase as any)
      .from(spec.table)
      .select("*")
      .eq("session_id", sourceSessionId);
    if (loadErr) {
      return { ok: false, error: loadErr.message ?? `${spec.table} laden fehlgeschlagen.` };
    }
    const inserts = ((rowsRaw ?? []) as Array<Record<string, unknown>>).map(spec.build);
    const insertErr = await insertChunked(supabase, spec.table, inserts);
    if (insertErr) return { ok: false, error: insertErr };
  }

  // 5) Freehand drawings (battlemap remapped; world_map_id kept)
  const { data: strokesRaw, error: strokesLoadErr } = await (supabase as any)
    .from("session_map_draw_strokes")
    .select("*")
    .eq("session_id", sourceSessionId);
  if (strokesLoadErr) {
    return {
      ok: false,
      error: strokesLoadErr.message ?? "Zeichnungen konnten nicht geladen werden.",
    };
  }

  const strokeInserts: Record<string, unknown>[] = [];
  for (const row of (strokesRaw ?? []) as Array<Record<string, unknown>>) {
    const hasBattle = row.battlemap_id != null;
    const hasWorld = row.world_map_id != null;
    if (hasBattle === hasWorld) continue;

    if (hasBattle) {
      const newBmId = remapBattlemapId(battlemapIdMap, row.battlemap_id);
      if (!newBmId) continue;
      strokeInserts.push({
        session_id: targetSessionId,
        campaign_id: campaignId,
        battlemap_id: newBmId,
        world_map_id: null,
        color: row.color ?? "#cab926",
        stroke_width: row.stroke_width ?? 4,
        points: row.points ?? [],
        z_index: row.z_index ?? 0,
      });
    } else {
      strokeInserts.push({
        session_id: targetSessionId,
        campaign_id: campaignId,
        battlemap_id: null,
        world_map_id: row.world_map_id,
        color: row.color ?? "#cab926",
        stroke_width: row.stroke_width ?? 4,
        points: row.points ?? [],
        z_index: row.z_index ?? 0,
      });
    }
  }
  const strokeErr = await insertChunked(
    supabase,
    "session_map_draw_strokes",
    strokeInserts,
  );
  if (strokeErr) return { ok: false, error: strokeErr };

  // 6) Active map ids on target live state
  const { data: sourceLiveRaw } = await (supabase as any)
    .from("session_live_states")
    .select("active_battlemap_id, active_world_map_id")
    .eq("session_id", sourceSessionId)
    .maybeSingle();

  const sourceLive = (sourceLiveRaw ?? {}) as Record<string, unknown>;
  const sourceActiveBm =
    sourceLive.active_battlemap_id != null
      ? String(sourceLive.active_battlemap_id)
      : null;
  const mappedActiveBm = sourceActiveBm
    ? battlemapIdMap.get(sourceActiveBm) ?? null
    : null;
  const activeWorldMapId =
    sourceLive.active_world_map_id != null
      ? String(sourceLive.active_world_map_id)
      : null;

  const { error: liveErr } = await resilientUpdateSessionLiveState(
    supabase as any,
    targetSessionId,
    {
      active_battlemap_id: mappedActiveBm,
      active_world_map_id: activeWorldMapId,
    },
  );
  if (liveErr) {
    return {
      ok: false,
      error: liveErr.message ?? "Aktive Karte konnte nicht gesetzt werden.",
    };
  }

  return { ok: true };
}
