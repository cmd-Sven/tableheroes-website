import type { CasterProgression, ClassId, SlotKey } from "./types";

/** Full caster spell slots by class level (PHB). Index = level 1..20 */
const FULL_SLOTS: Array<Partial<Record<SlotKey, number>>> = [
  {},
  { "1": 2 },
  { "1": 3 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 1, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 2, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 2, "7": 2, "8": 1, "9": 1 },
];

const HALF_SLOTS: Array<Partial<Record<SlotKey, number>>> = [
  {},
  {},
  { "1": 2 },
  { "1": 3 },
  { "1": 3 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 },
];

/** Eldritch Knight / Arcane Trickster */
const THIRD_SLOTS: Array<Partial<Record<SlotKey, number>>> = [
  {},
  {},
  {},
  { "1": 2 },
  { "1": 3 },
  { "1": 3 },
  { "1": 3 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
];

/** Warlock pact slots: count + slot level encoded as pact count at that level */
const PACT: Array<{ count: number; slotLevel: number }> = [
  { count: 0, slotLevel: 1 },
  { count: 1, slotLevel: 1 },
  { count: 2, slotLevel: 1 },
  { count: 2, slotLevel: 2 },
  { count: 2, slotLevel: 2 },
  { count: 2, slotLevel: 3 },
  { count: 2, slotLevel: 3 },
  { count: 2, slotLevel: 4 },
  { count: 2, slotLevel: 4 },
  { count: 2, slotLevel: 5 },
  { count: 2, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 3, slotLevel: 5 },
  { count: 4, slotLevel: 5 },
  { count: 4, slotLevel: 5 },
  { count: 4, slotLevel: 5 },
  { count: 4, slotLevel: 5 },
];

export function casterTypeForClass(classId: ClassId | null): CasterProgression {
  if (!classId) return "none";
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(classId)) return "full";
  if (["paladin", "ranger"].includes(classId)) return "half";
  if (classId === "warlock") return "pact";
  return "none";
}

/**
 * Third-caster only when subclass is Eldritch Knight / Arcane Trickster
 * (EN + DE ids/names, hyphenated or spaced).
 */
export function isThirdCasterSubclass(subclass: string | null | undefined): boolean {
  const s = (subclass ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return false;
  // Compact key for id-style matches (arcane-trickster → arcanetrickster)
  const compact = s.replace(/\s+/g, "");
  return (
    s.includes("eldritch knight") ||
    compact.includes("eldritchknight") ||
    s.includes("mystischer ritter") ||
    compact.includes("mystischerritter") ||
    s.includes("arcane trickster") ||
    compact.includes("arcanetrickster") ||
    s.includes("arkaner trickser") ||
    s.includes("arkaner trickster") ||
    compact.includes("arkanertrickser") ||
    compact.includes("arkanertrickster")
  );
}

/** PHB Eldritch Knight / Arcane Trickster — spells known by class level (index = level). */
const THIRD_SPELLS_KNOWN: number[] = [
  0, // unused (level 0)
  0,
  0,
  3,
  4,
  4,
  4,
  5,
  6,
  6,
  7,
  8,
  8,
  9,
  10,
  10,
  11,
  11,
  11,
  12,
  13,
];

/** Cantrips known for third-casters (Mage Hand + 2 from level 3). */
export function cantripsKnownForThirdCaster(level: number): number | null {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  if (lvl < 3) return null;
  return 3;
}

/** Spells known for third-casters (EK / AT table). */
export function spellsKnownForThirdCaster(level: number): number | null {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  if (lvl < 3) return null;
  return THIRD_SPELLS_KNOWN[lvl] ?? null;
}

export function slotsForCasterLevel(
  caster: CasterProgression,
  level: number,
): Partial<Record<SlotKey, number>> {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  if (caster === "none") return {};
  if (caster === "full") return { ...(FULL_SLOTS[lvl] ?? {}) };
  if (caster === "half") return { ...(HALF_SLOTS[lvl] ?? {}) };
  if (caster === "third") return { ...(THIRD_SLOTS[lvl] ?? {}) };
  if (caster === "pact") {
    const row = PACT[lvl] ?? PACT[20];
    if (!row || row.count <= 0) return {};
    return { pact: row.count };
  }
  return {};
}

export function slotsForClassLevel(
  classId: ClassId | null,
  level: number,
  subclass?: string | null,
): Partial<Record<SlotKey, number>> {
  let caster = casterTypeForClass(classId);
  if (
    caster === "none" &&
    (classId === "fighter" || classId === "rogue") &&
    isThirdCasterSubclass(subclass)
  ) {
    caster = "third";
  }
  return slotsForCasterLevel(caster, level);
}

/**
 * Spell list for pickers: Eldritch Knight / Arcane Trickster learn from the wizard list.
 */
export function spellListClassIdForSubclass(
  classId: ClassId | null,
  subclass?: string | null,
): ClassId | null {
  if (!classId) return null;
  if (
    (classId === "fighter" || classId === "rogue") &&
    isThirdCasterSubclass(subclass)
  ) {
    return "wizard";
  }
  return classId;
}

/** Cantrips known by class level (PHD tables, approximate SRD) */
export function cantripsKnownForClass(classId: ClassId | null, level: number): number | null {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  const table: Partial<Record<ClassId, number[]>> = {
    bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    // half casters get cantrips only via features (ranger revised etc.) — SRD ranger: none
  };
  if (!classId || !table[classId]) return null;
  return table[classId]![lvl - 1] ?? null;
}

/** Spells known (bard/sorcerer/ranger/warlock). Wizard uses spellbook — returns null. */
export function spellsKnownForClass(classId: ClassId | null, level: number): number | null {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  const table: Partial<Record<ClassId, number[]>> = {
    bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
    warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  };
  if (!classId || !table[classId]) return null;
  return table[classId]![lvl - 1] ?? null;
}
