/**
 * battlemap-actions — part 2: createBattlemapProp, updateBattlemapProp, removeBattlemapProp, listBattlemapFogShapes, createBattlemapFogShape, updateBattlemapFogShape, removeBattlemapFogShape, clearBattlemapFogShapes, saveBattlemapFogPreset, listBattlemapEffectTemplates, createBattlemapEffectTemplate.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import {
  feetToMovementCells,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { parseSheetData } from "@/src/lib/characters/dnd5e/defaults";
import {
  BATTLEMAP_MARKER_KINDS,
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapFogShapeKind,
  type BattlemapEffectShapeKind,
  type BattlemapGridConfig,
  type BattlemapMarkerKind,
  type BattlemapTokenSide,
  type SessionBattlemap,
  type SessionBattlemapEffectTemplate,
  type SessionBattlemapFogShape,
  type SessionBattlemapMarker,
  type SessionBattlemapProp,
  type SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";

import {
  normalizeProp,
  assertSessionGm,
  clampNorm,
  normalizeFogShape,
  persistFogPresetForBattlemap,
  seedFogFromPresetIfEmpty,
  normalizeEffectTemplate
} from "./_shared";


export async function createBattlemapProp(input: {
  sessionId: string;
  battlemapId: string;
  kind: SessionBattlemapProp["kind"];
  npcId?: string | null;
  sceneMediaId?: string | null;
  imageUrl?: string | null;
  posX: number;
  posY: number;
  width?: number;
  height?: number;
  rotation?: number;
  isVisibleToPlayers?: boolean;
  zIndex?: number;
}): Promise<SessionBattlemapProp> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data, error } = await (supabase as any)
    .from("session_battlemap_props")
    .insert({
      session_id: input.sessionId,
      battlemap_id: input.battlemapId,
      kind: input.kind,
      npc_id: input.npcId ?? null,
      scene_media_id: input.sceneMediaId ?? null,
      image_url: input.imageUrl ?? null,
      pos_x: clampNorm(input.posX),
      pos_y: clampNorm(input.posY),
      width: clampNorm(input.width ?? 0.15, 0.02, 1),
      height: clampNorm(input.height ?? 0.2, 0.02, 1),
      rotation: input.rotation ?? 0,
      is_visible_to_players: input.isVisibleToPlayers !== false,
      z_index: input.zIndex ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeProp(data as Record<string, unknown>);
}


export async function updateBattlemapProp(input: {
  propId: string;
  sessionId: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  rotation?: number;
  isVisibleToPlayers?: boolean;
  zIndex?: number;
}): Promise<SessionBattlemapProp> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.posX != null) patch.pos_x = clampNorm(input.posX);
  if (input.posY != null) patch.pos_y = clampNorm(input.posY);
  if (input.width != null) patch.width = clampNorm(input.width, 0.02, 1);
  if (input.height != null) patch.height = clampNorm(input.height, 0.02, 1);
  if (input.rotation != null) patch.rotation = input.rotation;
  if (input.isVisibleToPlayers != null) patch.is_visible_to_players = input.isVisibleToPlayers;
  if (input.zIndex != null) patch.z_index = input.zIndex;

  const { data, error } = await (supabase as any)
    .from("session_battlemap_props")
    .update(patch)
    .eq("id", input.propId)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeProp(data as Record<string, unknown>);
}


export async function removeBattlemapProp(
  propId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_props")
    .delete()
    .eq("id", propId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}


export async function listBattlemapFogShapes(
  battlemapId: string,
  sessionId: string,
): Promise<SessionBattlemapFogShape[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: mapRaw } = await (supabase as any)
    .from("session_battlemaps")
    .select("id, session_id, campaign_id, image_storage_path")
    .eq("id", battlemapId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!mapRaw) throw new Error("Battlemap nicht gefunden.");
  const map = mapRaw as {
    campaign_id: string;
    image_storage_path?: string | null;
  };

  const seeded = await seedFogFromPresetIfEmpty(supabase, {
    battlemapId,
    sessionId,
    campaignId: String(map.campaign_id),
    imageStoragePath: map.image_storage_path,
  });
  if (seeded.length > 0) return seeded;

  const { data, error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeFogShape);
}


export async function createBattlemapFogShape(input: {
  sessionId: string;
  battlemapId: string;
  shape: BattlemapFogShapeKind;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}): Promise<SessionBattlemapFogShape> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: mapRaw } = await (supabase as any)
    .from("session_battlemaps")
    .select("id, campaign_id")
    .eq("id", input.battlemapId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!mapRaw) throw new Error("Battlemap nicht gefunden.");
  const campaignId = String((mapRaw as { campaign_id: string }).campaign_id);

  const shape = input.shape === "circle" ? "circle" : "rect";
  const gridW = Math.max(1, Math.min(200, Math.round(input.gridW)));
  const gridH = shape === "circle" ? gridW : Math.max(1, Math.min(200, Math.round(input.gridH)));

  const { data, error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .insert({
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      shape,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      grid_w: gridW,
      grid_h: gridH,
      z_index: Date.now() % 100000,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Fog-Fläche konnte nicht erstellt werden.");
  const created = normalizeFogShape(data as Record<string, unknown>);
  void persistFogPresetForBattlemap(supabase, input.battlemapId);
  return created;
}


export async function updateBattlemapFogShape(input: {
  sessionId: string;
  shapeId: string;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
}): Promise<SessionBattlemapFogShape> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: existingRaw } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .select("*")
    .eq("id", input.shapeId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!existingRaw) throw new Error("Fog-Fläche nicht gefunden.");
  const existing = normalizeFogShape(existingRaw as Record<string, unknown>);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.gridX != null) patch.grid_x = Math.round(input.gridX);
  if (input.gridY != null) patch.grid_y = Math.round(input.gridY);
  if (input.gridW != null) {
    const w = Math.max(1, Math.min(200, Math.round(input.gridW)));
    patch.grid_w = w;
    if (existing.shape === "circle") patch.grid_h = w;
  }
  if (input.gridH != null && existing.shape === "rect") {
    patch.grid_h = Math.max(1, Math.min(200, Math.round(input.gridH)));
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .update(patch)
    .eq("id", input.shapeId)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = normalizeFogShape(data as Record<string, unknown>);
  void persistFogPresetForBattlemap(supabase, updated.battlemap_id);
  return updated;
}


export async function removeBattlemapFogShape(
  shapeId: string,
  sessionId: string,
): Promise<{ battlemapId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { data: existingRaw } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .select("battlemap_id")
    .eq("id", shapeId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!existingRaw) throw new Error("Fog-Fläche nicht gefunden.");
  const battlemapId = String((existingRaw as { battlemap_id: string }).battlemap_id);

  const { error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .delete()
    .eq("id", shapeId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  void persistFogPresetForBattlemap(supabase, battlemapId);
  return { battlemapId };
}


/** Alle Fog-Flächen der aktiven Battlemap löschen. */
export async function clearBattlemapFogShapes(
  battlemapId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .delete()
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  void persistFogPresetForBattlemap(supabase, battlemapId);
}


/** Explizit Fog der aktiven Map für spätere Sessions sichern. */
export async function saveBattlemapFogPreset(
  battlemapId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);
  await persistFogPresetForBattlemap(supabase, battlemapId);
}


export async function listBattlemapEffectTemplates(
  battlemapId: string,
  sessionId: string,
): Promise<SessionBattlemapEffectTemplate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase as any)
    .from("session_battlemap_effect_templates")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeEffectTemplate);
}


export async function createBattlemapEffectTemplate(input: {
  sessionId: string;
  battlemapId: string;
  shape: BattlemapEffectShapeKind;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  directionDeg?: number;
}): Promise<SessionBattlemapEffectTemplate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: mapRaw } = await (supabase as any)
    .from("session_battlemaps")
    .select("id, campaign_id")
    .eq("id", input.battlemapId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!mapRaw) throw new Error("Battlemap nicht gefunden.");
  const campaignId = String((mapRaw as { campaign_id: string }).campaign_id);

  const shape = input.shape;
  const gridW = Math.max(1, Math.min(200, Math.round(input.gridW)));
  const gridH =
    shape === "rect" ? Math.max(1, Math.min(200, Math.round(input.gridH))) : gridW;
  const directionDeg =
    shape === "cone"
      ? Math.round(Number(input.directionDeg ?? 0)) % 360
      : 0;

  const { data, error } = await (supabase as any)
    .from("session_battlemap_effect_templates")
    .insert({
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      shape,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      grid_w: gridW,
      grid_h: gridH,
      direction_deg: directionDeg,
      z_index: Date.now() % 100000,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Effekt-Schablone konnte nicht erstellt werden.");
  return normalizeEffectTemplate(data as Record<string, unknown>);
}
