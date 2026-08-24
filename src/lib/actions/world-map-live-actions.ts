/**
 * world-map-live-actions — Session-scoped FoW / effect templates / effect markers on world maps.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  BATTLEMAP_MARKER_KINDS,
  type BattlemapEffectShapeKind,
  type BattlemapFogShapeKind,
  type BattlemapMarkerKind,
  type SessionBattlemapEffectTemplate,
  type SessionBattlemapFogShape,
  type SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";

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
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    throw new Error("Nur der Spielleiter darf Weltkarten-Overlays bearbeiten.");
  }
  return { supabase, user, campaignId };
}

function normalizeFog(row: Record<string, unknown>): SessionBattlemapFogShape {
  return {
    id: String(row.id),
    battlemap_id: String(row.world_map_id ?? row.battlemap_id ?? ""),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    shape: (row.shape === "circle" ? "circle" : "rect") as BattlemapFogShapeKind,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    grid_w: Number(row.grid_w ?? 1),
    grid_h: Number(row.grid_h ?? 1),
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

function normalizeEffect(row: Record<string, unknown>): SessionBattlemapEffectTemplate {
  const shapeRaw = String(row.shape ?? "rect");
  const shape: BattlemapEffectShapeKind =
    shapeRaw === "circle" || shapeRaw === "cone" ? shapeRaw : "rect";
  return {
    id: String(row.id),
    battlemap_id: String(row.world_map_id ?? row.battlemap_id ?? ""),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    shape,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    grid_w: Number(row.grid_w ?? 1),
    grid_h: Number(row.grid_h ?? 1),
    direction_deg: Number(row.direction_deg ?? 0),
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

function normalizeMarker(row: Record<string, unknown>): SessionBattlemapMarker {
  const kindRaw = String(row.kind ?? "danger");
  const kind = (BATTLEMAP_MARKER_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as BattlemapMarkerKind)
    : "danger";
  return {
    id: String(row.id),
    battlemap_id: String(row.world_map_id ?? row.battlemap_id ?? ""),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    kind,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    is_visible_to_players: row.is_visible_to_players !== false,
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

// --- Fog ---

export async function listWorldMapFogShapes(
  worldMapId: string,
  sessionId: string,
): Promise<SessionBattlemapFogShape[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_world_map_fog_shapes")
    .select("*")
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeFog);
}

export async function createWorldMapFogShape(input: {
  sessionId: string;
  worldMapId: string;
  shape: BattlemapFogShapeKind;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}): Promise<SessionBattlemapFogShape> {
  const { supabase, campaignId } = await assertSessionGm(input.sessionId);
  const shape = input.shape === "circle" ? "circle" : "rect";
  const gridW = Math.max(1, Math.min(200, Math.round(input.gridW)));
  const gridH = shape === "circle" ? gridW : Math.max(1, Math.min(200, Math.round(input.gridH)));

  const { data, error } = await (supabase as any)
    .from("session_world_map_fog_shapes")
    .insert({
      world_map_id: input.worldMapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      shape,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      grid_w: gridW,
      grid_h: gridH,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeFog(data as Record<string, unknown>);
}

export async function removeWorldMapFogShape(
  shapeId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_fog_shapes")
    .delete()
    .eq("id", shapeId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearWorldMapFogShapes(
  worldMapId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_fog_shapes")
    .delete()
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

// --- Effect templates ---

export async function listWorldMapEffectTemplates(
  worldMapId: string,
  sessionId: string,
): Promise<SessionBattlemapEffectTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_world_map_effect_templates")
    .select("*")
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeEffect);
}

export async function createWorldMapEffectTemplate(input: {
  sessionId: string;
  worldMapId: string;
  shape: BattlemapEffectShapeKind;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  directionDeg?: number;
}): Promise<SessionBattlemapEffectTemplate> {
  const { supabase, campaignId } = await assertSessionGm(input.sessionId);
  const shape: BattlemapEffectShapeKind =
    input.shape === "circle" || input.shape === "cone" ? input.shape : "rect";
  const gridW = Math.max(1, Math.min(200, Math.round(input.gridW)));
  const gridH =
    shape === "circle" || shape === "cone"
      ? gridW
      : Math.max(1, Math.min(200, Math.round(input.gridH)));

  const { data, error } = await (supabase as any)
    .from("session_world_map_effect_templates")
    .insert({
      world_map_id: input.worldMapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      shape,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      grid_w: gridW,
      grid_h: gridH,
      direction_deg: Math.round(input.directionDeg ?? 0) % 360,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeEffect(data as Record<string, unknown>);
}

export async function removeWorldMapEffectTemplate(
  templateId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_effect_templates")
    .delete()
    .eq("id", templateId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearWorldMapEffectTemplates(
  worldMapId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_effect_templates")
    .delete()
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

// --- Effect markers ---

export async function listWorldMapEffectMarkers(
  worldMapId: string,
  sessionId: string,
): Promise<SessionBattlemapMarker[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_world_map_effect_markers")
    .select("*")
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMarker);
}

export async function createWorldMapEffectMarker(input: {
  sessionId: string;
  worldMapId: string;
  kind: BattlemapMarkerKind;
  gridX: number;
  gridY: number;
}): Promise<SessionBattlemapMarker> {
  const { supabase, campaignId } = await assertSessionGm(input.sessionId);
  const kind = (BATTLEMAP_MARKER_KINDS as readonly string[]).includes(input.kind)
    ? input.kind
    : "danger";

  const { data, error } = await (supabase as any)
    .from("session_world_map_effect_markers")
    .insert({
      world_map_id: input.worldMapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      kind,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      is_visible_to_players: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeMarker(data as Record<string, unknown>);
}

export async function removeWorldMapEffectMarker(
  markerId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_effect_markers")
    .delete()
    .eq("id", markerId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearWorldMapEffectMarkers(
  worldMapId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_world_map_effect_markers")
    .delete()
    .eq("world_map_id", worldMapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}
