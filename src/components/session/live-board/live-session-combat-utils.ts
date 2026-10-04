/**
 * live-session-combat-utils — Combat participant normalization and initiative token helpers.
 */
import {
  normalizeCombatConditions,
  normalizeCombatParticipantSide,
  parseInitiativeLabel,
} from "@/src/lib/combat-initiative";
import type {
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
  PartyCharacter,
} from "./live-session-types";

const EXPLICIT_INITIATIVE = /^\d+(?:-\d+)?$/;

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

/**
 * Initiative auf der Bühne wird händisch eingetragen (z. B. 14 oder 17-1).
 * Leere oder freie Texte zählen nicht.
 */
export function explicitInitiativeDisplay(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parseInitiativeLabel(trimmed);
  if (!EXPLICIT_INITIATIVE.test(parsed.display)) return null;
  return parsed.display;
}

/**
 * Anwesend in der Live-Session: online dabei, physisch am Tisch markiert,
 * oder ein vom SL gesetzter Platzhalter-Sitz. Keine Battlemap-Tokens.
 */
export function isStagePresentPlayer(
  pc: Pick<PartyCharacter, "isSessionDummy" | "playerUserId">,
  presentUserIds: ReadonlySet<string>,
  physicallyPresentIds: ReadonlySet<string>,
): boolean {
  if (pc.isSessionDummy) return true;
  const pid = pc.playerUserId ? String(pc.playerUserId) : "";
  if (!pid) return false;
  return presentUserIds.has(pid) || physicallyPresentIds.has(pid);
}

export function presentStagePlayerTokens(
  party: PartyCharacter[],
  presentUserIds: ReadonlySet<string>,
  physicallyPresentIds: ReadonlySet<string>,
): CombatTokenPayload[] {
  const out: CombatTokenPayload[] = [];
  const seen = new Set<string>();
  for (const pc of party) {
    if (!isStagePresentPlayer(pc, presentUserIds, physicallyPresentIds)) continue;
    const name = pc.name.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      type: "player",
      name,
      image_url: pc.avatar_url,
    });
  }
  return out;
}

/** Stellvertreter ohne Karte, z. B. „Goblin“ + 2 → „Goblin 2“. */
export function formatMonsterMarkerName(name: string, markerNumber: number): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const n = Math.floor(Number(markerNumber));
  if (!trimmed || !Number.isFinite(n) || n < 1 || n > 999) return "";
  return `${trimmed} ${n}`;
}
