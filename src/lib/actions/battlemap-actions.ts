"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import {
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapGridConfig,
  type SessionBattlemap,
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
