import { proficiencyBonus } from "../formulas";
import { abilityModifier } from "../formulas";
import type { Dnd5eSheetData } from "../types";
import { levelGrantsAsi } from "./asi";
import { getClassProgression, getRaceProgression } from "./catalog";
import {
  matchSubclassOption,
  resolveClassId,
  resolveRaceId,
  resolveSubclassHint,
} from "./class-ids";
import {
  cantripsKnownForClass,
  casterTypeForClass,
  isThirdCasterSubclass,
  slotsForClassLevel,
  spellsKnownForClass,
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
      if (/ability-score|asi/i.test(f.id) || /ability score improvement/i.test(f.nameEn)) {
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

function raceFeaturesForLevel(raceId: RaceId, level: number): ProgressionFeature[] {
  const race = getRaceProgression(raceId);
  if (!race) return [];
  return race.features.filter((f) => f.level === level);
}

/** Prefer catalog row spellSlots; Warlock stays on pact table. */
function slotsFromCatalogOrTable(
  classId: ClassId | null,
  level: number,
  subclassHint: string | null,
): Partial<Record<SlotKey, number>> {
  if (classId === "warlock") {
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
  const subclassHint =
    input.subclassOverride?.trim() || metaSubclassHint;
  const resolvedSubclassId = resolveSubclassId(classId, subclassHint);
  const prog = getClassProgression(classId);
  const hitDie = prog?.hitDie ?? 8;
  const conMod = abilityModifier(input.sheet.abilities.con?.score ?? 10);
  const hpAverage = Math.floor(hitDie / 2) + 1 + conMod;

  const features = classId
    ? featuresForLevel(classId, toLevel, resolvedSubclassId ?? subclassHint)
    : [];
  const raceFeatures = raceFeaturesForLevel(raceId, toLevel);

  const needsAsi = levelGrantsAsi(classId, toLevel);
  const subclassLevel = prog?.subclassLevel ?? 3;
  const hasSubclassOptions = (prog?.subclasses?.length ?? 0) > 0;
  // Step stays visible while picking in wizard (override does not clear needsSubclass)
  const needsSubclass = Boolean(
    classId &&
      toLevel >= subclassLevel &&
      !metaSubclassHint &&
      hasSubclassOptions,
  );

  let caster = prog?.caster ?? casterTypeForClass(classId);
  if (
    caster === "none" &&
    (classId === "fighter" || classId === "rogue") &&
    isThirdCasterSubclass(subclassHint)
  ) {
    caster = "third";
  }

  let spellcasting: LevelUpPlan["spellcasting"] = null;
  if (caster !== "none") {
    const slotsMax = slotsFromCatalogOrTable(classId, toLevel, subclassHint);
    const cantripsKnown =
      prog?.levels.find((l) => l.level === toLevel)?.cantripsKnown ??
      cantripsKnownForClass(classId, toLevel);
    const spellsKnown =
      prog?.levels.find((l) => l.level === toLevel)?.spellsKnown ??
      spellsKnownForClass(classId, toLevel);

    const prevCantrips =
      prog?.levels.find((l) => l.level === fromLevel)?.cantripsKnown ??
      cantripsKnownForClass(classId, fromLevel) ??
      0;
    const prevSpells =
      prog?.levels.find((l) => l.level === fromLevel)?.spellsKnown ??
      spellsKnownForClass(classId, fromLevel) ??
      0;

    const currentCantrips = countCantrips(input.sheet);
    const currentSpells = countLeveledSpells(input.sheet);

    const targetCantrips = cantripsKnown ?? prevCantrips;
    const targetSpells = spellsKnown ?? prevSpells;

    let cantripsToLearn = Math.max(0, (targetCantrips ?? 0) - currentCantrips);
    let spellsToLearn = Math.max(0, (targetSpells ?? 0) - currentSpells);
    if (classId === "wizard") {
      spellsToLearn = Math.max(spellsToLearn, 2);
      cantripsToLearn = Math.max(0, (cantripsKnown ?? 0) - currentCantrips);
    } else if (classId === "cleric" || classId === "druid" || classId === "paladin") {
      spellsToLearn = 0;
    }

    if (cantripsKnown != null) {
      if (cantripsKnown > prevCantrips) {
        cantripsToLearn = cantripsKnown - prevCantrips;
      } else {
        cantripsToLearn = 0;
      }
    }
    if (spellsKnown != null && classId !== "wizard") {
      if (spellsKnown > prevSpells) spellsToLearn = spellsKnown - prevSpells;
      else spellsToLearn = 0;
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
