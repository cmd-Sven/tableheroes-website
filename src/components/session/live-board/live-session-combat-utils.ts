/**
 * live-session-combat-utils — Combat participant normalization and initiative token helpers.
 */
import {
  normalizeCombatConditions,
  normalizeCombatParticipantSide,
} from "@/src/lib/combat-initiative";
import type {
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
} from "./live-session-types";

export function normalizeCombatParticipants(rows: unknown[]): CombatParticipant[] {
  return (rows || [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const type: CombatParticipant["type"] =
        r.type === "player" ? "player" : r.type === "npc" ? "npc" : "monster";
      return {
        id: String(r.id),
        session_id: String(r.session_id),
        name: String(r.name ?? ""),
        type,
        npc_id: r.npc_id != null ? String(r.npc_id) : null,
        side: normalizeCombatParticipantSide(r.side),
        initiative_value: Number(r.initiative_value ?? 0),
        initiative_label:
          r.initiative_label != null ? String(r.initiative_label) : null,
        sort_order: Number(r.sort_order ?? 0),
        image_url: r.image_url != null ? String(r.image_url) : null,
        is_active: r.is_active !== false,
        conditions: normalizeCombatConditions(r.conditions),
      };
    })
    .filter((row) => row.id && row.name);
}

export function buildNpcCombatToken(
  npc: Pick<CampaignNpc, "id" | "name" | "image_url">,
): CombatTokenPayload {
  return {
    type: "npc",
    name: npc.name,
    image_url: npc.image_url,
    npc_id: String(npc.id),
  };
}

export function isCombatTokenUsed(
  token: CombatTokenPayload,
  names: Set<string>,
  npcIds: Set<string>,
): boolean {
  if (token.type === "npc" && token.npc_id) return npcIds.has(token.npc_id);
  return names.has(token.name);
}
