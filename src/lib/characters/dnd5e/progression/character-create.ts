/**
 * Level-1 character creation — catalog-driven sheet bootstrap.
 */
import { abilityModifier } from "../formulas";
import { createEmptyDnd5eSheet } from "../defaults";
import { progressionFeatureToEntry } from "../feature-entry";
import { defaultSpellAbilityForClass } from "../spellcasting";
import type { AbilityKey, Dnd5eSheetData, Dnd5eSkillKey } from "../types";
import { applyClassBasicsFromCatalog, spellDefinitionToSheetEntry, appendGrantedSpellsFromFeatures } from "./catalog-bridge";
import { getClassProgression, getRaceProgression, getSpells } from "./catalog";
import { featuresForLevel } from "./engine";
import { matchSubclassOption, resolveRaceId } from "./class-ids";
import {
  cantripsKnownForClass,
  casterTypeForClass,
  spellsKnownForClass,
} from "./spell-slots";
import type {
  AbilityKeyShort,
  ClassId,
  ProgressionFeature,
  RaceId,
  SlotKey,
} from "./types";
import {
  applyLoreRaceBonusesToSheet,
  loreRaceFeaturesToSheetEntries,
  resolveLoreRaceBonuses,
} from "@/src/lib/lore-race-bonuses";

export const STANDARD_ARRAY: number[] = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_BUDGET = 27;

/** PHB class saving throw proficiencies */
export const CLASS_SAVE_PROFICIENCIES: Record<ClassId, AbilityKey[]> = {
  barbarian: ["str", "con"],
  bard: ["dex", "cha"],
  cleric: ["wis", "cha"],
  druid: ["int", "wis"],
  fighter: ["str", "con"],
  monk: ["str", "dex"],
  paladin: ["wis", "cha"],
  ranger: ["str", "dex"],
  rogue: ["dex", "int"],
  sorcerer: ["con", "cha"],
  warlock: ["wis", "cha"],
  wizard: ["int", "wis"],
};

/**
 * 2024-Rule: Species/Race geben keine festen Ability Score Increases mehr.
 * (Die ASI kommen stattdessen aus dem Background/Origin Feat.)
 */
export const RACE_ABILITY_BONUSES: Partial<
  Record<RaceId, Partial<Record<AbilityKeyShort, number>>>
> = {};

export type Level1CreationPlan = {
  classId: ClassId;
  raceId: RaceId;
  hitDie: number;
  subclassLevel: number;
  needsSubclass: boolean;
  subclassOptions: Array<{ id: string; nameEn: string; nameDe: string }>;
  classFeatures: ProgressionFeature[];
  raceFeatures: ProgressionFeature[];
  spellcasting: {
    caster: ReturnType<typeof casterTypeForClass>;
    slotsMax: Partial<Record<SlotKey, number>>;
    cantripsToLearn: number;
    spellsToLearn: number;
    preparedHint: boolean;
  } | null;
  saveProficiencies: AbilityKey[];
};

export type Level1CreationDraft = {
  classId: ClassId;
  subclassId: string | null;
  /** Display race name (lore or SRD) */
  raceName: string;
  /** SRD race for mechanical bonuses; falls back to resolveRaceId(raceName) */
  raceId: RaceId;
  /** Base scores before background bonuses (e.g. standard array assignment) */
  baseAbilities: Record<AbilityKeyShort, number>;
  /** @deprecated Ignored in D&D 2024 — species grant no ASI */
  applyRacialBonuses?: boolean;
  spellIds: string[];
  skillKeys: Dnd5eSkillKey[];
  /** Kampagnen-Lore Rassenmerkmale (Features, Proficiencies — keine ASI) */
  loreRaceTraitsRaw?: string | null;
  loreRaceLoreId?: string | null;
};

export function planLevel1Creation(input: {
  classId: ClassId;
  subclassId?: string | null;
  raceId?: RaceId | null;
  raceName?: string | null;
}): Level1CreationPlan {
  const classId = input.classId;
  const prog = getClassProgression(classId);
  if (!prog) {
    throw new Error(`Unbekannte Klasse: ${classId}`);
  }

  const raceId =
    input.raceId && input.raceId !== "unknown"
      ? input.raceId
      : resolveRaceId(input.raceName);
  const subclassLevel = prog.subclassLevel ?? 3;
  const subclassOptions = (prog.subclasses ?? []).map((s) => ({
    id: s.id,
    nameEn: s.nameEn,
    nameDe: s.nameDe,
  }));
  const needsSubclass = subclassLevel <= 1 && subclassOptions.length > 0;

  const subclassId = input.subclassId
    ? matchSubclassOption(input.subclassId, prog.subclasses ?? [])?.id ??
      input.subclassId
    : null;

  const classFeatures = featuresForLevel(classId, 1, subclassId);
  const raceProg = getRaceProgression(raceId);
  const raceFeatures = (raceProg?.features ?? []).filter((f) => f.level === 1);

  const caster = prog.caster ?? casterTypeForClass(classId);
  let spellcasting: Level1CreationPlan["spellcasting"] = null;
  if (caster !== "none") {
    const row = prog.levels.find((l) => l.level === 1);
    let slotsMax: Partial<Record<SlotKey, number>> = {};
    if (classId === "warlock") {
      slotsMax = { pact: 1 };
    } else if (row?.spellSlots) {
      slotsMax = { ...row.spellSlots };
    }

    const cantrips =
      row?.cantripsKnown ?? cantripsKnownForClass(classId, 1) ?? 0;
    let spellsToLearn = row?.spellsKnown ?? spellsKnownForClass(classId, 1) ?? 0;
    if (classId === "wizard") {
      // SRD: 6 spells in spellbook at 1st level
      spellsToLearn = 6;
    } else if (
      classId === "cleric" ||
      classId === "druid" ||
      classId === "paladin"
    ) {
      spellsToLearn = 0;
    }

    spellcasting = {
      caster,
      slotsMax,
      cantripsToLearn: cantrips,
      spellsToLearn,
      preparedHint:
        ["full", "half"].includes(caster) &&
        classId !== "sorcerer" &&
        classId !== "bard",
    };
  }

  return {
    classId,
    raceId,
    hitDie: prog.hitDie,
    subclassLevel,
    needsSubclass,
    subclassOptions,
    classFeatures,
    raceFeatures,
    spellcasting,
    saveProficiencies: CLASS_SAVE_PROFICIENCIES[classId] ?? [],
  };
}

export function pointBuyCost(score: number): number {
  if (score < 8 || score > 15) return Number.POSITIVE_INFINITY;
  if (score <= 13) return score - 8;
  if (score === 14) return 7;
  return 9; // 15
}

export function totalPointBuyCost(
  abilities: Record<AbilityKeyShort, number>,
): number {
  return (["str", "dex", "con", "int", "wis", "cha"] as AbilityKeyShort[]).reduce(
    (sum, k) => sum + pointBuyCost(abilities[k] ?? 8),
    0,
  );
}

export function buildLevel1Sheet(draft: Level1CreationDraft): {
  sheet: Dnd5eSheetData;
  meta: {
    className: string;
    subclass: string | null;
    race: string;
    level: number;
  };
} {
  const plan = planLevel1Creation({
    classId: draft.classId,
    subclassId: draft.subclassId,
    raceId: draft.raceId,
    raceName: draft.raceName,
  });
  const prog = getClassProgression(draft.classId)!;
  const subclassOpt = draft.subclassId
    ? matchSubclassOption(draft.subclassId, plan.subclassOptions)
    : null;

  const loreSpec = resolveLoreRaceBonuses({
    raceName: draft.raceName,
    raceTraitsRaw: draft.loreRaceTraitsRaw,
  });

  const scores: Record<AbilityKeyShort, number> = { ...draft.baseAbilities };

  let sheet = createEmptyDnd5eSheet(1);
  const keys: AbilityKeyShort[] = ["str", "dex", "con", "int", "wis", "cha"];
  for (const k of keys) {
    sheet.abilities[k] = { score: Math.min(20, Math.max(1, scores[k] ?? 10)) };
  }

  for (const save of plan.saveProficiencies) {
    sheet.savingThrows[save] = { proficient: true };
  }

  for (const skill of draft.skillKeys) {
    if (sheet.skills[skill]) {
      sheet.skills[skill] = { proficient: "proficient" };
    }
  }

  const conMod = abilityModifier(sheet.abilities.con.score);
  const hp = Math.max(1, plan.hitDie + conMod);
  sheet.combat.hpMax = hp;
  sheet.combat.hpCurrent = hp;
  sheet.combat.hitDice = `1d${plan.hitDie}`;
  sheet.combat.hitDiceRemaining = 1;
  sheet.combat.ac = 10 + abilityModifier(sheet.abilities.dex.score);

  const classLabel = prog.nameDe || prog.nameEn;
  sheet = applyClassBasicsFromCatalog(
    sheet,
    classLabel,
    1,
    subclassOpt?.nameDe || subclassOpt?.nameEn || draft.subclassId,
  );

  // Features: Klasse + SRD-Rasse (nur wenn keine Lore-Features)
  const loreFeatures = loreRaceFeaturesToSheetEntries(loreSpec);
  const raceFeatures =
    loreFeatures.length > 0 ? [] : plan.raceFeatures;
  const allFeatures = [...plan.classFeatures, ...raceFeatures];
  for (const f of allFeatures) {
    if (sheet.features.some((x) => x.id === f.id)) continue;
    sheet.features.push(progressionFeatureToEntry(f, "character-create"));
  }

  if (loreSpec) {
    sheet = applyLoreRaceBonusesToSheet(sheet, {
      raceName: draft.raceName,
      raceTraitsRaw: draft.loreRaceTraitsRaw,
      raceLoreId: draft.loreRaceLoreId,
      level: 1,
    });
  }

  // Spells
  if (plan.spellcasting && draft.spellIds.length > 0) {
    const catalog = getSpells();
    const byId = new Map(catalog.map((s) => [s.id, s]));
    sheet.spells = draft.spellIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((def) => spellDefinitionToSheetEntry(def!));
  }

  // Domain / subclass granted spells (always prepared)
  sheet = appendGrantedSpellsFromFeatures(sheet, allFeatures, "domain");

  // Ensure spell ability
  if (plan.spellcasting) {
    sheet.spellcasting = {
      ...(sheet.spellcasting ?? { ability: "int", slots: {} }),
      ability: defaultSpellAbilityForClass(classLabel),
    };
  }

  return {
    sheet,
    meta: {
      className: classLabel,
      subclass: subclassOpt?.nameDe || subclassOpt?.nameEn || null,
      race: draft.raceName || plan.raceId,
      level: 1,
    },
  };
}
