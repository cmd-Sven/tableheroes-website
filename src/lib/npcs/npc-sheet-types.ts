/**
 * D&D 5e NPC-Statblock (vereinfacht für Battlemap / SL-Ansicht).
 * Spieler sehen diese Daten nicht — nur description/appearance/personality.
 */

import type { AbilityKey } from "@/src/lib/characters/dnd5e/types";
import { ABILITY_KEYS } from "@/src/lib/characters/dnd5e/types";

export type NpcTokenSizeCategory =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan";

/** Grid-Zellen pro Größenkategorie (DnD5e). */
export const NPC_SIZE_CELLS: Record<NpcTokenSizeCategory, number> = {
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
};

export const NPC_SIZE_LABELS_DE: Record<NpcTokenSizeCategory, string> = {
  tiny: "Winzig (¼)",
  small: "Klein",
  medium: "Mittelgroß",
  large: "Groß (2×2)",
  huge: "Riesig (3×3)",
  gargantuan: "Gigantisch (4×4)",
};

export type NpcTokenBorder = {
  thicknessPx: number;
  color: string;
};

export const DEFAULT_NPC_TOKEN_BORDER: NpcTokenBorder = {
  thicknessPx: 3,
  color: "#cab926",
};

export function parseNpcTokenBorder(raw: unknown): NpcTokenBorder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const thicknessPx = Number(o.thicknessPx ?? o.thickness);
  const color = typeof o.color === "string" ? o.color.trim() : "";
  if (!Number.isFinite(thicknessPx) || thicknessPx < 0 || !color) return null;
  return {
    thicknessPx: Math.min(24, Math.max(0, Math.round(thicknessPx))),
    color,
  };
}

export function parseNpcTokenSizeCategory(raw: unknown): NpcTokenSizeCategory {
  const s = String(raw ?? "medium").toLowerCase();
  if (s in NPC_SIZE_CELLS) return s as NpcTokenSizeCategory;
  return "medium";
}

export type NpcSheetAttack = {
  id: string;
  name: string;
  attackBonus: number;
  damage: string;
  notes?: string | null;
};

export type NpcSheetSpell = {
  id: string;
  name: string;
  level: number;
  school?: string | null;
  notes?: string | null;
};

export type NpcSheetData = {
  version: 1;
  /** z. B. Fighter, Wizard — für KI-Kontext */
  classHint?: string | null;
  /** CR oder Stufe-Äquivalent als Freitext / Zahl */
  challengeRating?: string | null;
  /** Wie stark: minion | standard | elite | boss */
  powerTier?: "minion" | "standard" | "elite" | "boss";
  sizeCategory?: NpcTokenSizeCategory;
  creatureType?: string | null;
  abilities: Record<AbilityKey, { score: number }>;
  combat: {
    ac: number;
    hpMax: number;
    hpCurrent: number;
    speed: number;
    proficiencyBonus?: number;
  };
  attacks: NpcSheetAttack[];
  spells: NpcSheetSpell[];
  features: Array<{ id: string; name: string; description?: string | null }>;
  notes?: string | null;
};

function defaultAbilities(): NpcSheetData["abilities"] {
  const abilities = {} as NpcSheetData["abilities"];
  for (const key of ABILITY_KEYS) {
    abilities[key] = { score: 10 };
  }
  return abilities;
}

export function createEmptyNpcSheet(): NpcSheetData {
  return {
    version: 1,
    classHint: null,
    challengeRating: "1",
    powerTier: "standard",
    sizeCategory: "medium",
    creatureType: "humanoid",
    abilities: defaultAbilities(),
    combat: {
      ac: 12,
      hpMax: 10,
      hpCurrent: 10,
      speed: 30,
      proficiencyBonus: 2,
    },
    attacks: [],
    spells: [],
    features: [],
    notes: null,
  };
}

export function parseNpcSheetData(raw: unknown): NpcSheetData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { version?: number };
  if (obj.version !== 1) return null;
  return raw as NpcSheetData;
}

export function mergeNpcSheetWithDefaults(
  partial: Partial<NpcSheetData> | null | undefined,
): NpcSheetData {
  const base = createEmptyNpcSheet();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    version: 1,
    abilities: { ...base.abilities, ...(partial.abilities ?? {}) },
    combat: { ...base.combat, ...(partial.combat ?? {}) },
    attacks: partial.attacks ?? base.attacks,
    spells: partial.spells ?? base.spells,
    features: partial.features ?? base.features,
  };
}

/** Modifier aus Attributswert. */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}
