/**
 * live-session-normalize — Parses and validates session_live_states rows for React state.
 */
import { normalizeHandRaises } from "@/src/lib/session/hand-raises";
import { parseFapAllocations } from "@/src/lib/downtime-fap-types";
import type { FateCoin } from "@/src/components/session/FateCoinsPool";
import type { LiveState, StageVisibilityPatch } from "./live-session-types";

export function normalizePhysicallyPresentUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter((id) => id.length > 0);
}

export function normalizeLiveRow(row: unknown): LiveState {
  const r = row as Record<string, unknown>;
  const npcRaw = r.visible_npc_ids;
  const facRaw = r.visible_faction_ids;
  const creatureRaw = r.visible_creature_ids;
  const logsRaw = r.system_logs;
  const fateCoinsRaw = r.fate_coins;
  return {
    ...(r as unknown as LiveState),
    visible_npc_ids: Array.isArray(npcRaw) ? npcRaw.map(String) : [],
    visible_faction_ids: Array.isArray(facRaw) ? facRaw.map(String) : [],
    visible_creature_ids: Array.isArray(creatureRaw) ? creatureRaw.map(String) : [],
    active_scene_media_id:
      r.active_scene_media_id != null ? String(r.active_scene_media_id) : null,
    active_battlemap_id:
      r.active_battlemap_id != null ? String(r.active_battlemap_id) : null,
    active_world_map_id:
      r.active_world_map_id != null ? String(r.active_world_map_id) : null,
    battlemap_movement_paused: r.battlemap_movement_paused === true,
    system_logs: Array.isArray(logsRaw)
      ? logsRaw
          .filter((entry): entry is Record<string, unknown> =>
            entry != null && typeof entry === "object",
          )
          .map((entry) => ({
            id: String(entry.id ?? `${entry.at ?? ""}-${entry.text ?? ""}`),
            at: String(entry.at ?? ""),
            text: String(entry.text ?? ""),
            type: entry.type != null ? String(entry.type) : undefined,
            author_name: entry.author_name != null ? String(entry.author_name) : undefined,
            author_user_id:
              entry.author_user_id != null ? String(entry.author_user_id) : undefined,
            character_id: entry.character_id != null ? String(entry.character_id) : undefined,
            meta:
              entry.meta != null && typeof entry.meta === "object"
                ? (entry.meta as Record<string, unknown>)
                : undefined,
          }))
          .filter((entry) => entry.text.trim().length > 0)
      : [],
    fate_coins: Array.isArray(fateCoinsRaw)
      ? fateCoinsRaw
          .map((coin): FateCoin | null => {
            if (!coin || typeof coin !== "object") return null;
            const row = coin as Record<string, unknown>;
            const id = String(row.id ?? "").trim();
            if (!id) return null;
            return { id, side: row.side === "black" ? "black" : "white" };
          })
          .filter((coin): coin is FateCoin => coin != null)
      : [],
    destroyed_fate_coins: Number(r.destroyed_fate_coins ?? 0),
    downtime_active: Boolean(r.downtime_active),
    downtime_type:
      r.downtime_type != null && String(r.downtime_type).trim() !== ""
        ? String(r.downtime_type)
        : "travel",
    downtime_current_day: Math.max(1, Number(r.downtime_current_day ?? 1)),
    downtime_total_days: Math.max(1, Number(r.downtime_total_days ?? 1)),
    fap_allocations: parseFapAllocations(r.fap_allocations as import("@/src/lib/database.types").Json),
    current_loot_id:
      r.current_loot_id != null && String(r.current_loot_id).trim() !== ""
        ? String(r.current_loot_id)
        : null,
    physically_present_user_ids: normalizePhysicallyPresentUserIds(
      r.physically_present_user_ids,
    ),
    hand_raises: normalizeHandRaises(r.hand_raises),
    dummy_player_count: Math.min(
      3,
      Math.max(0, Math.round(Number(r.dummy_player_count ?? 0)) || 0),
    ),
    loot_hide_npcs: Boolean(r.loot_hide_npcs ?? false),
    combat_round: Math.max(1, Number(r.combat_round ?? 1) || 1),
  };
}

export function normalizeStageVisibilityPatch(value: unknown): Partial<StageVisibilityPatch> {
  if (!value || typeof value !== "object") return {};

  const payload = value as Record<string, unknown>;
  const patch: Partial<StageVisibilityPatch> = {};

  if (Object.prototype.hasOwnProperty.call(payload, "visible_npc_ids")) {
    patch.visible_npc_ids = Array.isArray(payload.visible_npc_ids)
      ? payload.visible_npc_ids.map(String)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, "visible_faction_ids")) {
    patch.visible_faction_ids = Array.isArray(payload.visible_faction_ids)
      ? payload.visible_faction_ids.map(String)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, "visible_creature_ids")) {
    patch.visible_creature_ids = Array.isArray(payload.visible_creature_ids)
      ? payload.visible_creature_ids.map(String)
      : [];
  }

  return patch;
}

/** Without matching session_id, React state is useless — do not count as loaded. */
export function isViableLiveState(row: unknown, expectedSessionId: string): boolean {
  if (row == null || typeof row !== "object") return false;
  const sid = String((row as Record<string, unknown>).session_id ?? "").trim();
  const exp = String(expectedSessionId ?? "").trim();
  if (!sid || !exp) return false;
  return sid.toLowerCase() === exp.toLowerCase();
}
