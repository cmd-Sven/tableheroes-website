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

/** Third-caster only when subclass is EK / AT */
export function isThirdCasterSubclass(subclass: string | null | undefined): boolean {
  const s = (subclass ?? "").toLowerCase();
  return (
    s.includes("eldritch") ||
    s.includes("mystischer") ||
    s.includes("arcane trickster") ||
    s.includes("arkaner") ||
    s.includes("trickster")
  );
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
