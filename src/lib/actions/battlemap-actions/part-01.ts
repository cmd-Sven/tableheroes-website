/**
 * battlemap-actions — part 1: getSessionBattlemaps, ensureEmptyParchmentBattlemap, createSessionBattlemap, updateSessionBattlemapGrid, deleteSessionBattlemap, setActiveBattlemap, getBattlemapTokens, CharacterMovementRange, getCharacterMovementRange, placeBattlemapCharacterToken, placeBattlemapGmToken, updateBattlemapTokenSettings, removeBattlemapToken, toggleBattlemapTokenVisibility, setBattlemapMovementPaused, getBattlemapProps.
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
  EMPTY_BATTLEMAP_GRID,
  EMPTY_BATTLEMAP_IMAGE_URL,
  EMPTY_BATTLEMAP_SORT_ORDER,
  EMPTY_BATTLEMAP_STORAGE_PATH,
  EMPTY_BATTLEMAP_TITLE,
  isEmptyParchmentBattlemap,
} from "@/src/lib/session/empty-battlemap";
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
  normalizeBattlemap,
  normalizeToken,
  normalizeProp,
  assertSessionGm
} from "./_shared";

function sortBattlemaps(maps: SessionBattlemap[]): SessionBattlemap[] {
  return [...maps].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    const aAt = a.created_at ?? "";
    const bAt = b.created_at ?? "";
    return aAt.localeCompare(bAt);
  });
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

  let maps = (data ?? []).map((row: Record<string, unknown>) =>
    normalizeBattlemap(row),
  );

  if (!maps.some(isEmptyParchmentBattlemap)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        await assertSessionGm(sessionId, user.id);
        const { data: sessionRaw } = await (supabase.from("sessions") as any)
          .select("campaign_id")
          .eq("id", sessionId)
          .maybeSingle();
        const campaignId =
          sessionRaw != null
            ? String((sessionRaw as { campaign_id: string }).campaign_id)
            : "";
        if (campaignId) {
          const ensured = await ensureEmptyParchmentBattlemap({
            sessionId,
            campaignId,
          });
          if (ensured && !maps.some((m: SessionBattlemap) => m.id === ensured.id)) {
            maps = sortBattlemaps([...maps, ensured]);
          }
        }
      } catch {
        /* Players / guests: empty map appears once a GM has opened the session. */
      }
    }
  }

  return sortBattlemaps(maps);
}


/**
 * Ensures the system empty parchment map exists for this session (idempotent).
 * Safe to call from stage prep, live session, or session creation.
 */
export async function ensureEmptyParchmentBattlemap(input: {
  sessionId: string;
  campaignId: string;
}): Promise<SessionBattlemap | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    await assertSessionGm(input.sessionId, user.id);
  } catch {
    return null;
  }

  const { data: allRows, error: listError } = await (supabase as any)
    .from("session_battlemaps")
    .select("*")
    .eq("session_id", input.sessionId);
  if (listError) throw new Error(listError.message);

  const existing = (allRows ?? []).find((row: Record<string, unknown>) =>
    isEmptyParchmentBattlemap({
      image_url: row.image_url != null ? String(row.image_url) : null,
      image_storage_path:
        row.image_storage_path != null ? String(row.image_storage_path) : null,
    }),
  ) as Record<string, unknown> | undefined;
  if (existing) {
    return normalizeBattlemap(existing);
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemaps")
    .insert({
      session_id: input.sessionId,
      campaign_id: input.campaignId,
      title: EMPTY_BATTLEMAP_TITLE,
      image_url: EMPTY_BATTLEMAP_IMAGE_URL,
      image_storage_path: EMPTY_BATTLEMAP_STORAGE_PATH,
      sort_order: EMPTY_BATTLEMAP_SORT_ORDER,
      grid_config: EMPTY_BATTLEMAP_GRID,
    })
    .select("*")
    .single();
  if (error) {
    // Concurrent ensure / unique index race — re-read.
    const { data: retryRows } = await (supabase as any)
      .from("session_battlemaps")
      .select("*")
      .eq("session_id", input.sessionId)
      .eq("image_storage_path", EMPTY_BATTLEMAP_STORAGE_PATH)
      .limit(1);
    const retry = (retryRows ?? [])[0] as Record<string, unknown> | undefined;
    if (retry) return normalizeBattlemap(retry);
    throw new Error(error.message);
  }
  return normalizeBattlemap(data as Record<string, unknown>);
}


export async function createSessionBattlemap(input: {
  sessionId: string;
  campaignId: string;
  title: string;
  imageUrl: string;
  imageStoragePath?: string | null;
  sortOrder?: number;
  gridConfig?: BattlemapGridConfig;
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
      grid_config: input.gridConfig
        ? parseGridConfig(input.gridConfig)
        : DEFAULT_BATTLEMAP_GRID,
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

  const { data: mapRow } = await (supabase as any)
    .from("session_battlemaps")
    .select("id, image_url, image_storage_path")
    .eq("id", battlemapId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (
    mapRow &&
    isEmptyParchmentBattlemap({
      image_url: mapRow.image_url != null ? String(mapRow.image_url) : null,
      image_storage_path:
        mapRow.image_storage_path != null
          ? String(mapRow.image_storage_path)
          : null,
    })
  ) {
    throw new Error(
      "Die leere Pergament-Karte ist die Standardkarte und kann nicht gelöscht werden.",
    );
  }

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


export type CharacterMovementRange = {
  speedFt: number;
  baseCells: number;
  maxCells: number;
  maxCellsWithDash: number;
};


export async function getCharacterMovementRange(
  characterId: string,
): Promise<CharacterMovementRange> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase.from("characters") as any)
    .select("sheet_data, user_id, campaign_id")
    .eq("id", characterId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Charakter nicht gefunden.");

  const row = data as { sheet_data?: unknown; user_id?: string | null };
  if (row.user_id !== user.id) {
    const { data: gmCheck } = await (supabase.from("characters") as any)
      .select("campaign_id")
      .eq("id", characterId)
      .maybeSingle();
    const campaignId = (gmCheck as { campaign_id?: string } | null)?.campaign_id;
    if (campaignId) {
      const { data: campaignRaw } = await (supabase.from("campaigns") as any)
        .select("gm_id, owner_id")
        .eq("id", campaignId)
        .maybeSingle();
      if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
        throw new Error("Keine Berechtigung für diesen Charakter.");
      }
    }
  }

  const sheet = parseSheetData(row.sheet_data);
  const speedFt = sheet?.combat.speed ?? 30;
  const baseCells = feetToMovementCells(speedFt);
  return {
    speedFt,
    baseCells,
    maxCells: movementCellsForBurst(baseCells, false),
    maxCellsWithDash: movementCellsForBurst(baseCells, true),
  };
}


export async function placeBattlemapCharacterToken(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
  useDash?: boolean;
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
    p_use_dash: input.useDash === true,
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
  showHpBar?: boolean;
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
    p_show_hp_bar: input.showHpBar === true,
  });

  if (error) throw new Error(error.message || "SL-Token konnte nicht gesetzt werden.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("SL-Token konnte nicht gesetzt werden.");
  return normalizeToken(row as Record<string, unknown>);
}


export async function updateBattlemapTokenSettings(input: {
  tokenId: string;
  sessionId: string;
  showHpBar?: boolean;
  sizeCells?: number;
}): Promise<SessionBattlemapToken> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: tokenRaw, error: loadErr } = await (supabase as any)
    .from("session_battlemap_tokens")
    .select("*")
    .eq("id", input.tokenId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (loadErr || !tokenRaw) throw new Error("Token nicht gefunden.");

  const token = normalizeToken(tokenRaw as Record<string, unknown>);
  let allowed = false;
  try {
    await assertSessionGm(input.sessionId, user.id);
    allowed = true;
  } catch {
    if (token.character_id) {
      const { data: ch } = await (supabase as any)
        .from("characters")
        .select("user_id")
        .eq("id", token.character_id)
        .maybeSingle();
      if (ch && String((ch as { user_id?: string }).user_id) === user.id) {
        allowed = true;
      }
    }
  }
  if (!allowed) throw new Error("Keine Berechtigung für diese Token-Einstellungen.");

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.showHpBar !== undefined) updates.show_hp_bar = input.showHpBar;
  if (input.sizeCells !== undefined) {
    updates.size_cells = Math.max(1, Math.min(4, Math.round(input.sizeCells)));
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_tokens")
    .update(updates)
    .eq("id", input.tokenId)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Einstellungen konnten nicht gespeichert werden.");
  return normalizeToken(data as Record<string, unknown>);
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
