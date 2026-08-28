import { proficiencyBonus } from "../formulas";
import { abilityModifier } from "../formulas";
import type { Dnd5eSheetData } from "../types";
import { levelGrantsAsi } from "./asi";
import { getClassProgression, getRaceProgression, getSpells } from "./catalog";
import {
  matchSubclassOption,
  resolveClassId,
  resolveRaceId,
  resolveSubclassHint,
} from "./class-ids";
import {
  cantripsKnownForClass,
  cantripsKnownForThirdCaster,
  casterTypeForClass,
  isThirdCasterSubclass,
  slotsForClassLevel,
  spellsKnownForClass,
  spellsKnownForThirdCaster,
} from "./spell-slots";
import type {
  ClassId,
  LevelUpPlan,
  ProgressionFeature,
  RaceId,
  SlotKey,
} from "./types";

function countCantrips(sheet: Dnd5eSheetData): number {
  return (sheet.spells ?? []).filter((s) => s.level <= 0).length;
}

function countLeveledSpells(sheet: Dnd5eSheetData): number {
  return (sheet.spells ?? []).filter((s) => s.level >= 1).length;
}

/** Cantrips granted by this level's features that are not already on the sheet. */
function newlyGrantedCantripCount(
  features: ProgressionFeature[],
  sheet: Dnd5eSheetData,
): number {
  const existing = new Set(
    (sheet.spells ?? [])
      .filter((s) => s.level <= 0)
      .map((s) => s.id.toLowerCase()),
  );
  const catalog = getSpells();
  let n = 0;
  for (const f of features) {
    for (const id of f.grantedSpellIds ?? []) {
      const key = id.toLowerCase();
      if (existing.has(key)) continue;
      const def = catalog.find((s) => s.id === id || s.id.toLowerCase() === key);
      if (def && def.level === 0) {
        n += 1;
        existing.add(key);
      }
    }
  }
  return n;
}

function maxSpellSlotLevel(slots: Partial<Record<SlotKey, number>>): number {
  let max = 0;
  for (const [k, v] of Object.entries(slots)) {
    if (k === "pact") continue;
    if ((v ?? 0) > 0) max = Math.max(max, Number(k));
  }
  return max;
}

function resolveSubclassId(
  classId: ClassId | null,
  hint: string | null,
): string | null {
  if (!classId || !hint) return null;
  const prog = getClassProgression(classId);
  if (!prog?.subclasses?.length) return null;
  const matched = matchSubclassOption(hint, prog.subclasses);
  return matched?.id ?? null;
}

/** Features for a class level, including subclass features when known. */
export function featuresForLevel(
  classId: ClassId,
  level: number,
  subclassIdOrHint: string | null,
): ProgressionFeature[] {
  const prog = getClassProgression(classId);
  if (!prog) return [];

  const subclassId =
    resolveSubclassId(classId, subclassIdOrHint) ?? subclassIdOrHint;

  const row = prog.levels.find((l) => l.level === level);
  const out: ProgressionFeature[] = [];

  if (row) {
    for (const id of row.featureIds) {
      const f = prog.features.find((x) => x.id === id);
      if (!f) continue;
      // Skip ASI placeholder features — handled by ASI step
      // Note: do not match bare "asi" (false positive on "evasion").
      if (
        /ability-score-improvement|(^|-)asi($|-)/i.test(f.id) ||
        /ability score improvement/i.test(f.nameEn)
      ) {
        continue;
      }
      if (f.subclass) {
        if (!subclassId) continue;
        const featureSub = matchSubclassOption(f.subclass, prog.subclasses ?? []);
        const chosen = matchSubclassOption(subclassId, prog.subclasses ?? []);
        const same =
          (featureSub && chosen && featureSub.id === chosen.id) ||
          f.subclass === subclassId;
        if (!same) continue;
      }
      out.push(f);
    }
  }

  if (subclassId && prog.subclasses) {
    const sub = matchSubclassOption(subclassId, prog.subclasses);
    if (sub) {
      for (const f of sub.features) {
        if (f.level === level && !out.some((x) => x.id === f.id)) out.push(f);
      }
    }
  }

  return out;
}

/**
 * All subclass features with level ≤ maxLevel (for catch-up when picking late).
 */
export function subclassFeaturesUpToLevel(
  classId: ClassId,
  subclassIdOrHint: string,
  maxLevel: number,
): ProgressionFeature[] {
  const prog = getClassProgression(classId);
  if (!prog?.subclasses?.length) return [];
  const sub = matchSubclassOption(subclassIdOrHint, prog.subclasses);
  if (!sub) return [];

  const byId = new Map<string, ProgressionFeature>();
  for (const f of sub.features) {
    if (f.level <= maxLevel) byId.set(f.id, f);
  }
  for (const f of prog.features) {
    if (!f.subclass || f.level > maxLevel) continue;
    if (/ability-score|asi/i.test(f.id)) continue;
    const featureSub = matchSubclassOption(f.subclass, prog.subclasses);
    if (featureSub?.id === sub.id) byId.set(f.id, f);
  }
  return [...byId.values()].sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  );
}

function featureAlreadyOnSheet(
  sheet: Dnd5eSheetData,
  f: ProgressionFeature,
): boolean {
  return (sheet.features ?? []).some(
    (x) =>
      x.id === f.id ||
      (x.nameEn && x.nameEn === f.nameEn) ||
      (x.nameDe && x.nameDe === f.nameDe) ||
      x.name === f.nameDe ||
      x.name === f.nameEn,
  );
}

function raceFeaturesForLevel(raceId: RaceId, level: number): ProgressionFeature[] {
  const race = getRaceProgression(raceId);
  if (!race) return [];
  return race.features.filter((f) => f.level === level);
}

/** Prefer catalog row spellSlots; third-casters always use table; Warlock stays on pact. */
function slotsFromCatalogOrTable(
  classId: ClassId | null,
  level: number,
  subclassHint: string | null,
): Partial<Record<SlotKey, number>> {
  if (classId === "warlock") {
    return slotsForClassLevel(classId, level, subclassHint);
  }
  // EK / AT: never read empty class rows — always third-caster table
  if (
    (classId === "fighter" || classId === "rogue") &&
    isThirdCasterSubclass(subclassHint)
  ) {
    return slotsForClassLevel(classId, level, subclassHint);
  }
  const prog = getClassProgression(classId);
  const row = prog?.levels.find((l) => l.level === level);
  if (row?.spellSlots && Object.keys(row.spellSlots).length > 0) {
    return { ...row.spellSlots };
  }
  return slotsForClassLevel(classId, level, subclassHint);
}

export type PlanLevelUpInput = {
  className: string | null;
  subclass: string | null;
  raceName: string | null;
  fromLevel: number;
  sheet: Dnd5eSheetData;
  /** Override resolved class */
  classIdOverride?: ClassId | null;
  raceIdOverride?: RaceId | null;
  /** Subclass chosen in wizard (id or name) — merges features for toLevel */
  subclassOverride?: string | null;
};

export function planLevelUp(input: PlanLevelUpInput): LevelUpPlan {
  const fromLevel = Math.min(19, Math.max(1, Math.floor(input.fromLevel)));
  const toLevel = fromLevel + 1;

  const classId =
    input.classIdOverride !== undefined
      ? input.classIdOverride
      : resolveClassId(input.className);
  const raceId: RaceId =
    input.raceIdOverride != null
      ? input.raceIdOverride
      : resolveRaceId(input.raceName);

  const metaSubclassHint = resolveSubclassHint(input.className, input.subclass);
  const matchedFromMeta = resolveSubclassId(classId, metaSubclassHint);
  const subclassHint =
    input.subclassOverride?.trim() || metaSubclassHint;
  const resolvedSubclassId = resolveSubclassId(classId, subclassHint);
  const effectiveSubclassId = resolvedSubclassId ?? null;
  const prog = getClassProgression(classId);
  const hitDie = prog?.hitDie ?? 8;
  const conMod = abilityModifier(input.sheet.abilities.con?.score ?? 10);
  const hpAverage = Math.floor(hitDie / 2) + 1 + conMod;

  const needsAsi = levelGrantsAsi(classId, toLevel);
  const isEpicBoonLevel = needsAsi && toLevel === 19;
  const subclassLevel = prog?.subclassLevel ?? 3;
  const hasSubclassOptions = (prog?.subclasses?.length ?? 0) > 0;
  // Nachholen: Stufe erreicht/überschritten und keine gematchte Katalog-Subklasse
  // (leerer Meta-String ODER Foundry-Text ohne Match). Override löscht den Step nicht.
  const needsSubclass = Boolean(
    classId &&
      toLevel >= subclassLevel &&
      !matchedFromMeta &&
      hasSubclassOptions,
  );

  let features: ProgressionFeature[] = classId
    ? featuresForLevel(classId, toLevel, effectiveSubclassId ?? subclassHint)
    : [];

  // Subklasse neu gewählt / nachgeholt → Features ab subclassLevel bis toLevel
  if (classId && effectiveSubclassId && !matchedFromMeta && toLevel >= subclassLevel) {
    const catchUp = subclassFeaturesUpToLevel(
      classId,
      effectiveSubclassId,
      toLevel,
    );
    for (const f of catchUp) {
      if (!features.some((x) => x.id === f.id)) features.push(f);
    }
  }

  // Nur Merkmale anzeigen, die noch nicht auf dem Blatt stehen
  features = features.filter((f) => !featureAlreadyOnSheet(input.sheet, f));

  const raceFeatures = raceFeaturesForLevel(raceId, toLevel).filter(
    (f) => !featureAlreadyOnSheet(input.sheet, f),
  );

  let caster = prog?.caster ?? casterTypeForClass(classId);
  if (
    caster === "none" &&
    (classId === "fighter" || classId === "rogue") &&
    isThirdCasterSubclass(effectiveSubclassId ?? subclassHint)
  ) {
    caster = "third";
  }

  let spellcasting: LevelUpPlan["spellcasting"] = null;
  if (caster !== "none") {
    const slotHint = effectiveSubclassId ?? subclassHint;
    const slotsMax = slotsFromCatalogOrTable(classId, toLevel, slotHint);
    const cantripsKnown =
      prog?.levels.find((l) => l.level === toLevel)?.cantripsKnown ??
      (caster === "third"
        ? cantripsKnownForThirdCaster(toLevel)
        : cantripsKnownForClass(classId, toLevel));
    const spellsKnown =
      prog?.levels.find((l) => l.level === toLevel)?.spellsKnown ??
      (caster === "third"
        ? spellsKnownForThirdCaster(toLevel)
        : spellsKnownForClass(classId, toLevel));

    const prevCantrips =
      prog?.levels.find((l) => l.level === fromLevel)?.cantripsKnown ??
      (caster === "third"
        ? cantripsKnownForThirdCaster(fromLevel)
        : cantripsKnownForClass(classId, fromLevel)) ??
      0;
    const prevSpells =
      prog?.levels.find((l) => l.level === fromLevel)?.spellsKnown ??
      (caster === "third"
        ? spellsKnownForThirdCaster(fromLevel)
        : spellsKnownForClass(classId, fromLevel)) ??
      0;

    const currentCantrips = countCantrips(input.sheet);
    const currentSpells = countLeveledSpells(input.sheet);

    let cantripsToLearn = Math.max(0, (cantripsKnown ?? 0) - currentCantrips);
    let spellsToLearn = Math.max(0, (spellsKnown ?? 0) - currentSpells);

    if (classId === "wizard") {
      spellsToLearn = Math.max(spellsToLearn, 2);
      cantripsToLearn = Math.max(0, (cantripsKnown ?? 0) - currentCantrips);
    } else if (classId === "cleric" || classId === "druid" || classId === "paladin") {
      spellsToLearn = 0;
    } else if (caster === "third") {
      // Catch-up / first AT pick: sheet vs target (not only table delta)
      const autoCantrips = newlyGrantedCantripCount(features, input.sheet);
      cantripsToLearn = Math.max(
        0,
        (cantripsKnown ?? 0) - currentCantrips - autoCantrips,
      );
      spellsToLearn = Math.max(0, (spellsKnown ?? 0) - currentSpells);
    } else {
      if (cantripsKnown != null) {
        if (cantripsKnown > prevCantrips) {
          cantripsToLearn = cantripsKnown - prevCantrips;
        } else {
          cantripsToLearn = 0;
        }
      }
      if (spellsKnown != null) {
        if (spellsKnown > prevSpells) spellsToLearn = spellsKnown - prevSpells;
        else spellsToLearn = 0;
      }
    }

    spellcasting = {
      caster,
      slotsMax,
      cantripsKnown: cantripsKnown ?? null,
      spellsKnown: spellsKnown ?? null,
      cantripsToLearn,
      spellsToLearn,
      preparedHint:
        ["full", "half"].includes(caster) &&
        classId !== "sorcerer" &&
        classId !== "bard",
    };
  }

  return {
    fromLevel,
    toLevel,
    classId,
    raceId,
    hitDie,
    proficiencyBonus: {
      from: proficiencyBonus(fromLevel),
      to: proficiencyBonus(toLevel),
    },
    features,
    raceFeatures,
    needsAsi,
    isEpicBoonLevel,
    needsSubclass,
    subclassOptions: (prog?.subclasses ?? []).map((s) => ({
      id: s.id,
      nameEn: s.nameEn,
      nameDe: s.nameDe,
    })),
    spellcasting,
    hpAverage: Math.max(1, hpAverage),
  };
}

export function highestAvailableSpellLevel(plan: LevelUpPlan): number {
  if (!plan.spellcasting) return 0;
  return maxSpellSlotLevel(plan.spellcasting.slotsMax);
}
