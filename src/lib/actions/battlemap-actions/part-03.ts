/**
 * battlemap-actions — part 3: updateBattlemapEffectTemplate, removeBattlemapEffectTemplate, clearBattlemapEffectTemplates, listBattlemapMarkers, createBattlemapMarker, updateBattlemapMarker, removeBattlemapMarker, clearBattlemapMarkers.
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
  assertSessionGm,
  normalizeEffectTemplate,
  normalizeMarker
} from "./_shared";


export async function updateBattlemapEffectTemplate(input: {
  sessionId: string;
  templateId: string;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
  directionDeg?: number;
}): Promise<SessionBattlemapEffectTemplate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: existingRaw } = await (supabase as any)
    .from("session_battlemap_effect_templates")
    .select("*")
    .eq("id", input.templateId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!existingRaw) throw new Error("Effekt-Schablone nicht gefunden.");
  const existing = normalizeEffectTemplate(existingRaw as Record<string, unknown>);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.gridX != null) patch.grid_x = Math.round(input.gridX);
  if (input.gridY != null) patch.grid_y = Math.round(input.gridY);
  if (input.gridW != null) {
    const w = Math.max(1, Math.min(200, Math.round(input.gridW)));
    patch.grid_w = w;
    if (existing.shape !== "rect") patch.grid_h = w;
  }
  if (input.gridH != null && existing.shape === "rect") {
    patch.grid_h = Math.max(1, Math.min(200, Math.round(input.gridH)));
  }
  if (input.directionDeg != null && existing.shape === "cone") {
    patch.direction_deg = Math.round(input.directionDeg) % 360;
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_effect_templates")
    .update(patch)
    .eq("id", input.templateId)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeEffectTemplate(data as Record<string, unknown>);
}


export async function removeBattlemapEffectTemplate(
  templateId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_effect_templates")
    .delete()
    .eq("id", templateId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}


/** Alle Effekt-Schablonen der aktiven Battlemap löschen. */
export async function clearBattlemapEffectTemplates(
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
    .from("session_battlemap_effect_templates")
    .delete()
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}


export async function listBattlemapMarkers(
  battlemapId: string,
  sessionId: string,
): Promise<SessionBattlemapMarker[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase as any)
    .from("session_battlemap_markers")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMarker);
}


export async function createBattlemapMarker(input: {
  sessionId: string;
  battlemapId: string;
  kind: BattlemapMarkerKind;
  gridX: number;
  gridY: number;
  isVisibleToPlayers?: boolean;
}): Promise<SessionBattlemapMarker> {
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

  const kind = (
    BATTLEMAP_MARKER_KINDS as readonly string[]
  ).includes(input.kind)
    ? input.kind
    : "fire";

  const { data, error } = await (supabase as any)
    .from("session_battlemap_markers")
    .insert({
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      kind,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      is_visible_to_players: input.isVisibleToPlayers !== false,
      z_index: Date.now() % 100000,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Marker konnte nicht erstellt werden.");
  return normalizeMarker(data as Record<string, unknown>);
}


export async function updateBattlemapMarker(input: {
  sessionId: string;
  markerId: string;
  gridX?: number;
  gridY?: number;
  isVisibleToPlayers?: boolean;
}): Promise<SessionBattlemapMarker> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: existingRaw } = await (supabase as any)
    .from("session_battlemap_markers")
    .select("id")
    .eq("id", input.markerId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!existingRaw) throw new Error("Marker nicht gefunden.");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.gridX != null) patch.grid_x = Math.round(input.gridX);
  if (input.gridY != null) patch.grid_y = Math.round(input.gridY);
  if (input.isVisibleToPlayers != null) {
    patch.is_visible_to_players = input.isVisibleToPlayers;
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_markers")
    .update(patch)
    .eq("id", input.markerId)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeMarker(data as Record<string, unknown>);
}


export async function removeBattlemapMarker(
  markerId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_markers")
    .delete()
    .eq("id", markerId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}


/** Alle Spezialeffekt-Marker der aktiven Battlemap löschen. */
export async function clearBattlemapMarkers(
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
    .from("session_battlemap_markers")
    .delete()
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}
