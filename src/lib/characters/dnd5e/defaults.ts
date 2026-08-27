import type { AbilityKey, Dnd5eSheetData, Dnd5eSkillKey } from "./types";
import { ABILITY_KEYS } from "./types";
import { DND5E_SKILLS } from "./skills";
import { createEmptyEquipmentState } from "./equipment-types";
import { normalizeEquipmentState } from "./equipment";

function defaultSkills(): Dnd5eSheetData["skills"] {
  const skills = {} as Dnd5eSheetData["skills"];
  for (const def of DND5E_SKILLS) {
    skills[def.key as Dnd5eSkillKey] = { proficient: "none" };
  }
  return skills;
}

function defaultAbilities(): Dnd5eSheetData["abilities"] {
  const abilities = {} as Dnd5eSheetData["abilities"];
  for (const key of ABILITY_KEYS) {
    abilities[key as AbilityKey] = { score: 10 };
  }
  return abilities;
}

function defaultSaves(): Dnd5eSheetData["savingThrows"] {
  const saves = {} as Dnd5eSheetData["savingThrows"];
  for (const key of ABILITY_KEYS) {
    saves[key as AbilityKey] = { proficient: false };
  }
  return saves;
}

export function createEmptyDnd5eSheet(level = 1): Dnd5eSheetData {
  const hitDie = 8;
  return {
    version: 1,
    abilities: defaultAbilities(),
    savingThrows: defaultSaves(),
    skills: defaultSkills(),
    combat: {
      hpMax: hitDie + 0,
      hpCurrent: hitDie,
      hpTemp: 0,
      speed: 30,
      hitDice: `${level}d${hitDie}`,
      ac: 10,
      initiativeBonus: 0,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    },
    proficiencies: {
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
    },
    features: [],
    spells: [],
    attacks: [],
    equipment: createEmptyEquipmentState(),
    classResources: [],
    notes: null,
  };
}

export function parseSheetData(raw: unknown): Dnd5eSheetData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { version?: number };
  if (obj.version !== 1) return null;
  return raw as Dnd5eSheetData;
}

export function mergeSheetWithDefaults(partial: Partial<Dnd5eSheetData>): Dnd5eSheetData {
  const base = createEmptyDnd5eSheet();
  return {
    ...base,
    ...partial,
    version: 1,
    abilities: { ...base.abilities, ...(partial.abilities ?? {}) },
    savingThrows: { ...base.savingThrows, ...(partial.savingThrows ?? {}) },
    skills: { ...base.skills, ...(partial.skills ?? {}) },
    combat: { ...base.combat, ...(partial.combat ?? {}) },
    proficiencies: { ...base.proficiencies, ...(partial.proficiencies ?? {}) },
    features: partial.features ?? base.features,
    spells: partial.spells ?? base.spells,
    attacks: partial.attacks ?? base.attacks,
    equipment: normalizeEquipmentState(partial.equipment ?? base.equipment),
    spellcasting: partial.spellcasting
      ? {
          ...partial.spellcasting,
          slots: partial.spellcasting.slots
            ? { ...(partial.spellcasting.slots ?? {}) }
            : undefined,
        }
      : base.spellcasting,
    classResources: partial.classResources ?? base.classResources,
    notes: partial.notes ?? base.notes,
    characterInspection:
      partial.characterInspection !== undefined
        ? partial.characterInspection
        : base.characterInspection ?? null,
  };
}
