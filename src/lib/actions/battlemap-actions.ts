"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import {
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapGridConfig,
  type BattlemapTokenSide,
  type SessionBattlemap,
  type SessionBattlemapProp,
  type SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";

function normalizeBattlemap(row: Record<string, unknown>): SessionBattlemap {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    title: String(row.title ?? "Battlemap"),
    image_url: String(row.image_url ?? ""),
    image_storage_path:
      row.image_storage_path != null ? String(row.image_storage_path) : null,
    sort_order: Number(row.sort_order ?? 0),
    grid_config: parseGridConfig(row.grid_config),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

function normalizeToken(row: Record<string, unknown>): SessionBattlemapToken {
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    character_id: row.character_id != null ? String(row.character_id) : null,
    npc_id: row.npc_id != null ? String(row.npc_id) : null,
    creature_id: row.creature_id != null ? String(row.creature_id) : null,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    label: row.label != null ? String(row.label) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    size_cells: Math.max(1, Number(row.size_cells ?? 1)),
    is_visible_to_players: row.is_visible_to_players !== false,
    token_side: (row.token_side as SessionBattlemapToken["token_side"]) ?? "party",
  };
}

function normalizeProp(row: Record<string, unknown>): SessionBattlemapProp {
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    kind: (row.kind as SessionBattlemapProp["kind"]) ?? "npc_card",
    npc_id: row.npc_id != null ? String(row.npc_id) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    scene_media_id: row.scene_media_id != null ? String(row.scene_media_id) : null,
    pos_x: Number(row.pos_x ?? 0),
    pos_y: Number(row.pos_y ?? 0),
    width: Number(row.width ?? 0.15),
    height: Number(row.height ?? 0.2),
    rotation: Number(row.rotation ?? 0),
    is_visible_to_players: row.is_visible_to_players !== false,
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

async function assertSessionGm(sessionId: string, userId: string) {
  const supabase = await createClient();
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
  if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, userId)) {
    throw new Error("Nur der Spielleiter darf Battlemaps verwalten.");
  }
  return { supabase, campaignId };
}

export async function getSessionBattlemaps(sessionId: string): Promise<SessionBattlemap[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_battlemaps")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => normalizeBattlemap(row));
}

export async function createSessionBattlemap(input: {
  sessionId: string;
  campaignId: string;
  title: string;
  imageUrl: string;
  imageStoragePath?: string | null;
  sortOrder?: number;
}): Promise<SessionBattlemap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data, error } = await (supabase as any)
    .from("session_battlemaps")
    .insert({
      session_id: input.sessionId,
      campaign_id: input.campaignId,
      title: input.title.trim() || "Battlemap",
      image_url: input.imageUrl,
      image_storage_path: input.imageStoragePath ?? null,
      sort_order: input.sortOrder ?? 0,
      grid_config: DEFAULT_BATTLEMAP_GRID,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${input.campaignId}/sessions/${input.sessionId}/stage-prep`);
  return normalizeBattlemap(data as Record<string, unknown>);
}

export async function updateSessionBattlemapGrid(
  battlemapId: string,
  sessionId: string,
  campaignId: string,
  gridConfig: BattlemapGridConfig,
): Promise<SessionBattlemap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { data, error } = await (supabase as any)
    .from("session_battlemaps")
    .update({
      grid_config: parseGridConfig(gridConfig),
      updated_at: new Date().toISOString(),
    })
    .eq("id", battlemapId)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`);
  return normalizeBattlemap(data as Record<string, unknown>);
}

export async function deleteSessionBattlemap(
  battlemapId: string,
  sessionId: string,
  campaignId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  await (supabase.from("session_live_states") as any)
    .update({ active_battlemap_id: null })
    .eq("session_id", sessionId)
    .eq("active_battlemap_id", battlemapId);

  const { error } = await (supabase as any)
    .from("session_battlemaps")
    .delete()
    .eq("id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`);
}

export async function setActiveBattlemap(
  sessionId: string,
  battlemapId: string | null,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  if (battlemapId) {
    const { data: mapRow } = await (supabase as any)
      .from("session_battlemaps")
      .select("id")
      .eq("id", battlemapId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!mapRow) throw new Error("Battlemap nicht gefunden.");
  }

  const { error } = await (supabase.from("session_live_states") as any)
    .update({ active_battlemap_id: battlemapId })
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function getBattlemapTokens(
  battlemapId: string,
): Promise<SessionBattlemapToken[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_battlemap_tokens")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => normalizeToken(row));
}

export async function placeBattlemapCharacterToken(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
}): Promise<SessionBattlemapToken> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase as any).rpc("place_battlemap_character_token", {
    p_session_id: input.sessionId,
    p_battlemap_id: input.battlemapId,
    p_character_id: input.characterId,
    p_grid_x: input.gridX,
    p_grid_y: input.gridY,
  });

  if (error) throw new Error(error.message || "Token konnte nicht gesetzt werden.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Token konnte nicht gesetzt werden.");
  return normalizeToken(row as Record<string, unknown>);
}

export async function placeBattlemapGmToken(input: {
  sessionId: string;
  battlemapId: string;
  gridX: number;
  gridY: number;
  tokenId?: string | null;
  npcId?: string | null;
  creatureId?: string | null;
  tokenSide?: BattlemapTokenSide;
  sizeCells?: number;
  isVisibleToPlayers?: boolean;
  label?: string | null;
  imageUrl?: string | null;
}): Promise<SessionBattlemapToken> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data, error } = await (supabase as any).rpc("place_battlemap_gm_token", {
    p_session_id: input.sessionId,
    p_battlemap_id: input.battlemapId,
    p_grid_x: input.gridX,
    p_grid_y: input.gridY,
    p_token_id: input.tokenId ?? null,
    p_npc_id: input.npcId ?? null,
    p_creature_id: input.creatureId ?? null,
    p_token_side: input.tokenSide ?? "hostile",
    p_size_cells: input.sizeCells ?? 1,
    p_is_visible_to_players: input.isVisibleToPlayers !== false,
    p_label: input.label ?? null,
    p_image_url: input.imageUrl ?? null,
  });

  if (error) throw new Error(error.message || "SL-Token konnte nicht gesetzt werden.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("SL-Token konnte nicht gesetzt werden.");
  return normalizeToken(row as Record<string, unknown>);
}

export async function removeBattlemapToken(
  tokenId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function toggleBattlemapTokenVisibility(
  tokenId: string,
  sessionId: string,
  isVisible: boolean,
): Promise<SessionBattlemapToken> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { data, error } = await (supabase as any)
    .from("session_battlemap_tokens")
    .update({
      is_visible_to_players: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenId)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeToken(data as Record<string, unknown>);
}

export async function setBattlemapMovementPaused(
  sessionId: string,
  paused: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase.from("session_live_states") as any)
    .update({ battlemap_movement_paused: paused })
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function getBattlemapProps(
  battlemapId: string,
): Promise<SessionBattlemapProp[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("session_battlemap_props")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => normalizeProp(row));
}

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

function clampNorm(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
