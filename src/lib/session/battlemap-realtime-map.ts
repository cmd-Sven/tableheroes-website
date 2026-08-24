import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTrapStatusEffect } from "@/src/lib/characters/condition-tokens";
import type {
  BattlemapTrapDifficulty,
  BattlemapTrapEffectShape,
  SessionBattlemapProp,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";

/** In-flight drag/move — protects optimistic grid position from stale realtime rows. */
const pendingTokenMoves = new Map<
  string,
  { gridX: number; gridY: number; since: number }
>();

export function registerPendingBattlemapTokenMove(
  tokenId: string,
  gridX: number,
  gridY: number,
): void {
  pendingTokenMoves.set(tokenId, { gridX, gridY, since: Date.now() });
}

export function clearPendingBattlemapTokenMove(tokenId: string): void {
  pendingTokenMoves.delete(tokenId);
}

function tokenUpdatedAtMs(token: SessionBattlemapToken): number | null {
  if (!token.updated_at) return null;
  const ms = Date.parse(token.updated_at);
  return Number.isFinite(ms) ? ms : null;
}

function isStaleTokenUpdate(
  current: SessionBattlemapToken,
  incoming: SessionBattlemapToken,
): boolean {
  const curMs = tokenUpdatedAtMs(current);
  const incMs = tokenUpdatedAtMs(incoming);
  if (curMs != null && incMs != null && incMs < curMs) return true;
  // Optimistic local grid without updated_at — reject older server rows reverting position.
  if (
    curMs == null &&
    incMs != null &&
    !pendingTokenMoves.has(incoming.id) &&
    (current.grid_x !== incoming.grid_x || current.grid_y !== incoming.grid_y)
  ) {
    return true;
  }
  return false;
}

function shouldRejectPendingRevert(
  tokenId: string,
  current: SessionBattlemapToken,
  incoming: SessionBattlemapToken,
): boolean {
  const pending = pendingTokenMoves.get(tokenId);
  if (!pending) return false;

  const currentAtPending =
    current.grid_x === pending.gridX && current.grid_y === pending.gridY;
  const incomingAtPending =
    incoming.grid_x === pending.gridX && incoming.grid_y === pending.gridY;

  if (incomingAtPending) {
    pendingTokenMoves.delete(tokenId);
    return false;
  }

  return currentAtPending;
}

/** Pure row → token mapping for realtime / optimistic sync (client-safe). */
export function mapBattlemapTokenRow(
  row: Record<string, unknown>,
): SessionBattlemapToken {
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
    show_hp_bar: row.show_hp_bar === true,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export function battlemapTokensEqual(
  a: SessionBattlemapToken,
  b: SessionBattlemapToken,
): boolean {
  return (
    a.id === b.id &&
    a.battlemap_id === b.battlemap_id &&
    a.session_id === b.session_id &&
    a.character_id === b.character_id &&
    a.npc_id === b.npc_id &&
    a.creature_id === b.creature_id &&
    a.grid_x === b.grid_x &&
    a.grid_y === b.grid_y &&
    a.label === b.label &&
    a.image_url === b.image_url &&
    a.size_cells === b.size_cells &&
    a.is_visible_to_players === b.is_visible_to_players &&
    a.token_side === b.token_side &&
    Boolean(a.show_hp_bar) === Boolean(b.show_hp_bar)
  );
}

/** Upsert without allocating a new array when the token is unchanged. */
export function upsertBattlemapToken(
  prev: SessionBattlemapToken[],
  token: SessionBattlemapToken,
): SessionBattlemapToken[] {
  return applyBattlemapTokenUpdate(prev, token);
}

/** Apply one remote/local token row — ignores stale or pending-reverting updates. */
export function applyBattlemapTokenUpdate(
  prev: SessionBattlemapToken[],
  incoming: SessionBattlemapToken,
): SessionBattlemapToken[] {
  const idx = prev.findIndex((t) => t.id === incoming.id);
  if (idx < 0) return [...prev, incoming];

  const current = prev[idx]!;
  if (shouldRejectPendingRevert(incoming.id, current, incoming)) return prev;
  if (isStaleTokenUpdate(current, incoming)) return prev;
  if (battlemapTokensEqual(current, incoming)) {
    if (incoming.updated_at && incoming.updated_at !== current.updated_at) {
      const next = [...prev];
      next[idx] = { ...current, updated_at: incoming.updated_at };
      return next;
    }
    return prev;
  }

  const next = [...prev];
  next[idx] = incoming;
  return next;
}

/** Apply authoritative server row after a confirmed move/placement (bypasses equal-grid skip). */
export function applyConfirmedBattlemapTokenUpdate(
  prev: SessionBattlemapToken[],
  incoming: SessionBattlemapToken,
): SessionBattlemapToken[] {
  clearPendingBattlemapTokenMove(incoming.id);
  const idx = prev.findIndex((t) => t.id === incoming.id);
  if (idx < 0) return [...prev, incoming];
  const next = [...prev];
  next[idx] = incoming;
  return next;
}

/** Player token move via browser Supabase session (same auth context as Realtime). */
export async function placeBattlemapCharacterTokenClient(
  supabase: SupabaseClient,
  input: {
    sessionId: string;
    battlemapId: string;
    characterId: string;
    gridX: number;
    gridY: number;
    useDash?: boolean;
  },
): Promise<SessionBattlemapToken> {
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
  return mapBattlemapTokenRow(row as Record<string, unknown>);
}

/** Merge a full server list without clobbering newer in-flight local moves. */
export function mergeBattlemapTokenLists(
  prev: SessionBattlemapToken[],
  remote: SessionBattlemapToken[],
): SessionBattlemapToken[] {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  const merged: SessionBattlemapToken[] = [];
  const seen = new Set<string>();

  for (const remoteToken of remote) {
    seen.add(remoteToken.id);
    const current = prevById.get(remoteToken.id);
    if (!current) {
      merged.push(remoteToken);
      continue;
    }
    merged.push(...applyBattlemapTokenUpdate([current], remoteToken));
  }

  for (const token of prev) {
    if (!seen.has(token.id)) merged.push(token);
  }

  return merged;
}

export function mapBattlemapPropRow(
  row: Record<string, unknown>,
): SessionBattlemapProp {
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
  };
}

export function upsertBattlemapProp(
  prev: SessionBattlemapProp[],
  prop: SessionBattlemapProp,
): SessionBattlemapProp[] {
  const idx = prev.findIndex((p) => p.id === prop.id);
  if (idx < 0) return [...prev, prop];
  const cur = prev[idx]!;
  if (
    cur.pos_x === prop.pos_x &&
    cur.pos_y === prop.pos_y &&
    cur.width === prop.width &&
    cur.height === prop.height &&
    cur.rotation === prop.rotation &&
    cur.z_index === prop.z_index &&
    cur.is_visible_to_players === prop.is_visible_to_players &&
    cur.image_url === prop.image_url &&
    cur.kind === prop.kind &&
    cur.npc_id === prop.npc_id &&
    cur.scene_media_id === prop.scene_media_id
  ) {
    return prev;
  }
  const next = [...prev];
  next[idx] = prop;
  return next;
}

export function mapBattlemapTrapRow(
  row: Record<string, unknown>,
): SessionBattlemapTrap {
  const difficultyRaw = String(row.difficulty ?? "medium");
  const difficulty: BattlemapTrapDifficulty =
    difficultyRaw === "easy" ||
    difficultyRaw === "hard" ||
    difficultyRaw === "deadly"
      ? difficultyRaw
      : "medium";
  const shapeRaw = String(row.effect_shape ?? "circle");
  const effect_shape: BattlemapTrapEffectShape =
    shapeRaw === "rect" ? "rect" : "circle";
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    name: String(row.name ?? "Falle"),
    description: String(row.description ?? ""),
    trap_type: String(row.trap_type ?? "mechanical"),
    difficulty,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    detection_dc: Math.max(1, Math.min(40, Math.round(Number(row.detection_dc ?? 15)))),
    is_area_effect: row.is_area_effect === true,
    effect_shape,
    effect_radius: Math.max(1, Math.min(20, Math.round(Number(row.effect_radius ?? 1)))),
    damage: String(row.damage ?? "2d6"),
    damage_type: String(row.damage_type ?? "piercing"),
    save_ability: row.save_ability != null ? String(row.save_ability) : null,
    save_dc:
      row.save_dc != null && row.save_dc !== ""
        ? Math.round(Number(row.save_dc))
        : null,
    status_effect: parseTrapStatusEffect(row.status_effect),
    is_armed: row.is_armed !== false,
    is_detected: row.is_detected === true,
    is_triggered: row.is_triggered === true,
    is_visible_to_players: row.is_visible_to_players === true,
    triggered_by_character_id:
      row.triggered_by_character_id != null
        ? String(row.triggered_by_character_id)
        : null,
    triggered_at: row.triggered_at != null ? String(row.triggered_at) : null,
    lore_context: row.lore_context != null ? String(row.lore_context) : null,
    ai_payload:
      row.ai_payload && typeof row.ai_payload === "object"
        ? (row.ai_payload as Record<string, unknown>)
        : {},
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export function upsertBattlemapTrap(
  prev: SessionBattlemapTrap[],
  trap: SessionBattlemapTrap,
): SessionBattlemapTrap[] {
  const idx = prev.findIndex((t) => t.id === trap.id);
  if (idx < 0) return [...prev, trap];
  const cur = prev[idx]!;
  if (
    cur.grid_x === trap.grid_x &&
    cur.grid_y === trap.grid_y &&
    cur.is_armed === trap.is_armed &&
    cur.is_detected === trap.is_detected &&
    cur.is_triggered === trap.is_triggered &&
    cur.is_visible_to_players === trap.is_visible_to_players &&
    cur.name === trap.name &&
    cur.detection_dc === trap.detection_dc &&
    cur.effect_radius === trap.effect_radius &&
    cur.triggered_by_character_id === trap.triggered_by_character_id
  ) {
    return prev;
  }
  const next = [...prev];
  next[idx] = trap;
  return next;
}
