/** D&D-5e-Kampfmarkierungen für die Live-Initiative-Leiste. */

export type CombatParticipantSide = "friend" | "nemesis";

export type CombatConditionId =
  | "concentration"
  | "blinded"
  | "deafened"
  | "silenced"
  | "stunned"
  | "prone"
  | "dead"
  | "frightened"
  | "poisoned"
  | "grappled"
  | "restrained"
  | "paralyzed"
  | "unconscious"
  | "invisible"
  | "charmed"
  | "incapacitated"
  | "petrified"
  | "sick"
  | "cursed";

export type CombatConditionDef = {
  id: CombatConditionId;
  /** Kurzlabel auf dem Token */
  short: string;
  /** Deutsche Bezeichnung (PHB / SL) */
  label: string;
  /** Standard-5e-Zustand laut PHB */
  isStandard5e: boolean;
  /** Nur sinnvoll für Monster/NSC */
  monsterOnly?: boolean;
};

/** Alle relevanten D&D-5e-Zustände + SL-Hilfsmarkierungen. */
export const DND5E_COMBAT_CONDITIONS: CombatConditionDef[] = [
  { id: "concentration", short: "K", label: "Konzentration", isStandard5e: false },
  { id: "blinded", short: "Bl", label: "Blind", isStandard5e: true },
  { id: "deafened", short: "T", label: "Taub", isStandard5e: true },
  { id: "silenced", short: "St", label: "Verstummt", isStandard5e: false },
  { id: "stunned", short: "Bt", label: "Betäubt", isStandard5e: true },
  { id: "prone", short: "Lg", label: "Liegend", isStandard5e: true },
  { id: "frightened", short: "An", label: "Angst", isStandard5e: true },
  { id: "sick", short: "Kr", label: "Krank", isStandard5e: false },
  { id: "cursed", short: "Vf", label: "Verflucht", isStandard5e: false },
  { id: "poisoned", short: "Vg", label: "Vergiftet", isStandard5e: true },
  { id: "grappled", short: "Gr", label: "Gegriffen", isStandard5e: true },
  { id: "restrained", short: "Gh", label: "Gehemmt", isStandard5e: true },
  { id: "paralyzed", short: "Pa", label: "Paralysiert", isStandard5e: true },
  { id: "unconscious", short: "Bw", label: "Bewusstlos", isStandard5e: true },
  { id: "invisible", short: "Un", label: "Unsichtbar", isStandard5e: true },
  { id: "charmed", short: "Bz", label: "Bezaubert", isStandard5e: true },
  { id: "incapacitated", short: "Hu", label: "Handlungsunfähig", isStandard5e: true },
  { id: "petrified", short: "Vs", label: "Versteinert", isStandard5e: true },
  { id: "dead", short: "†", label: "Tot", isStandard5e: false, monsterOnly: true },
];

const CONDITION_BY_ID = new Map(DND5E_COMBAT_CONDITIONS.map((c) => [c.id, c]));

export function getCombatConditionDef(id: string): CombatConditionDef | undefined {
  return CONDITION_BY_ID.get(id as CombatConditionId);
}

export type ParsedInitiative = {
  base: number;
  /** Kleinere Zahl = früher bei gleicher Basis (17-1 vor 17-2). Ohne Suffix: 9999. */
  tiebreak: number;
  display: string;
};

const INITIATIVE_PATTERN = /^(\d+)(?:-(\d+))?$/;

/** Parst SL-Eingaben wie „17“, „17-1“, „17-2“. */
export function parseInitiativeLabel(raw: string): ParsedInitiative {
  const trimmed = raw.trim().replace(",", ".");
  const match = trimmed.match(INITIATIVE_PATTERN);
  if (match) {
    const base = Number(match[1]);
    const tiebreak = match[2] != null ? Number(match[2]) : 9999;
    return {
      base: Number.isFinite(base) ? base : 0,
      tiebreak: Number.isFinite(tiebreak) ? tiebreak : 9999,
      display: match[2] != null ? `${base}-${match[2]}` : String(base),
    };
  }
  const asNum = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(asNum)) {
    return { base: Math.round(asNum), tiebreak: 9999, display: String(Math.round(asNum)) };
  }
  return { base: 0, tiebreak: 9999, display: trimmed || "0" };
}

export function formatInitiativeDisplay(
  initiativeLabel: string | null | undefined,
  initiativeValue: number,
): string {
  const label = initiativeLabel?.trim();
  if (label) return label;
  return String(initiativeValue ?? 0);
}

export function compareCombatInitiative(
  a: { initiative_label?: string | null; initiative_value: number; sort_order: number; name: string },
  b: { initiative_label?: string | null; initiative_value: number; sort_order: number; name: string },
): number {
  const pa = parseInitiativeLabel(formatInitiativeDisplay(a.initiative_label, a.initiative_value));
  const pb = parseInitiativeLabel(formatInitiativeDisplay(b.initiative_label, b.initiative_value));
  if (pb.base !== pa.base) return pb.base - pa.base;
  if (pa.tiebreak !== pb.tiebreak) return pa.tiebreak - pb.tiebreak;
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name, "de");
}

export function normalizeCombatConditions(raw: unknown): CombatConditionId[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(DND5E_COMBAT_CONDITIONS.map((c) => c.id));
  return raw
    .map((v) => String(v))
    .filter((id): id is CombatConditionId => allowed.has(id as CombatConditionId));
}

export function normalizeCombatParticipantSide(raw: unknown): CombatParticipantSide | null {
  if (raw === "friend" || raw === "nemesis") return raw;
  return null;
}

/** Ziel für „Am Zug“-Markierung über Bühne, Avatare und Battlemap. */
export type ActiveCombatTurnHighlight = {
  participantId: string;
  participantName: string;
  characterId: string | null;
  npcId: string | null;
  tokenId: string | null;
  matchLabel: string;
};

type TurnParticipantLike = {
  id: string;
  name: string;
  type: "player" | "monster" | "npc";
  npc_id?: string | null;
};

type PartyCharacterLike = {
  id: string;
  name: string;
  isSessionDummy?: boolean;
};

type BattlemapTokenLike = {
  id: string;
  character_id: string | null;
  npc_id: string | null;
  label: string | null;
};

export function resolveActiveCombatTurnHighlight(
  participant: TurnParticipantLike | null | undefined,
  partyCharacters: PartyCharacterLike[],
  battlemapTokens: BattlemapTokenLike[] = [],
): ActiveCombatTurnHighlight | null {
  if (!participant) return null;

  const characterId =
    participant.type === "player"
      ? (partyCharacters.find((c) => !c.isSessionDummy && c.name === participant.name)?.id ??
        null)
      : null;
  const npcId =
    participant.type === "npc" && participant.npc_id ? String(participant.npc_id) : null;

  const token =
    battlemapTokens.find(
      (t) =>
        (characterId && t.character_id === characterId) ||
        (npcId && t.npc_id === npcId) ||
        (t.label && t.label === participant.name),
    ) ?? null;

  return {
    participantId: participant.id,
    participantName: participant.name,
    characterId,
    npcId,
    tokenId: token?.id ?? null,
    matchLabel: participant.name,
  };
}

export function isNpcActiveCombatTurn(
  npcId: string,
  highlight: ActiveCombatTurnHighlight | null | undefined,
): boolean {
  return Boolean(highlight?.npcId && highlight.npcId === npcId);
}

export function isCreatureActiveCombatTurn(
  creatureName: string,
  highlight: ActiveCombatTurnHighlight | null | undefined,
): boolean {
  if (!highlight) return false;
  return highlight.matchLabel === creatureName;
}

export function isCharacterActiveCombatTurn(
  characterId: string,
  highlight: ActiveCombatTurnHighlight | null | undefined,
): boolean {
  return Boolean(highlight?.characterId && highlight.characterId === characterId);
}

/** Initiative gilt als gewürfelt, wenn ein Label gesetzt ist. */
export function hasRolledCombatInitiative(participant: {
  initiative_label?: string | null;
}): boolean {
  return (
    participant.initiative_label != null &&
    String(participant.initiative_label).trim() !== ""
  );
}

/**
 * HUD-Sortierung: gewürfelte nach Initiative, Ungewürfelte ans Ende (Sort-Order).
 */
export function compareCombatHudOrder(
  a: {
    initiative_label?: string | null;
    initiative_value: number;
    sort_order: number;
    name: string;
  },
  b: {
    initiative_label?: string | null;
    initiative_value: number;
    sort_order: number;
    name: string;
  },
): number {
  const aRolled = hasRolledCombatInitiative(a);
  const bRolled = hasRolledCombatInitiative(b);
  if (aRolled !== bRolled) return aRolled ? -1 : 1;
  if (!aRolled) return a.sort_order - b.sort_order || a.name.localeCompare(b.name, "de");
  return compareCombatInitiative(a, b);
}
