import type {
  AbilityKey,
  Dnd5eDerivedSheet,
  Dnd5eSheetData,
  Dnd5eSkillKey,
} from "./types";
import { ABILITY_KEYS } from "./types";
import { DND5E_SKILL_BY_KEY } from "./skills";
import {
  abilityModifier,
  armorClassValue,
  initiativeTotal,
  proficiencyBonus,
  savingThrowTotal,
  skillTotalModifier,
  spellAttackBonus,
  spellSaveDc,
} from "./formulas";

export function computeDerivedDnd5eSheet(
  sheet: Dnd5eSheetData,
  totalLevel: number,
): Dnd5eDerivedSheet {
  const pb = proficiencyBonus(totalLevel);

  const abilities = {} as Dnd5eDerivedSheet["abilities"];
  const abilityMods = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEYS) {
    const score = sheet.abilities[key]?.score ?? 10;
    const mod = abilityModifier(score);
    abilityMods[key] = mod;
    abilities[key] = { score, modifier: mod };
  }

  const savingThrows = {} as Dnd5eDerivedSheet["savingThrows"];
  for (const key of ABILITY_KEYS) {
    const proficient = sheet.savingThrows[key]?.proficient ?? false;
    const modifier = abilityMods[key];
    savingThrows[key] = {
      modifier,
      proficient,
      total: savingThrowTotal(modifier, proficient, pb),
    };
  }

  const skills = {} as Dnd5eDerivedSheet["skills"];
  for (const key of Object.keys(DND5E_SKILL_BY_KEY) as Dnd5eSkillKey[]) {
    const def = DND5E_SKILL_BY_KEY[key];
    const entry = sheet.skills[key] ?? { proficient: "none" };
    const ability = def.ability;
    const mod = abilityMods[ability];
    skills[key] = {
      ability,
      modifier: mod,
      proficient: entry.proficient,
      total: skillTotalModifier(mod, entry, pb),
    };
  }

  const ac = armorClassValue(sheet.combat.ac, sheet.combat.acOverride);
  const initiative = initiativeTotal(
    abilityMods.dex,
    sheet.combat.initiativeBonus ?? 0,
    sheet.combat.initiativeOverride,
  );

  let derivedSpellSaveDc: number | null = null;
  let derivedSpellAttackBonus: number | null = null;
  if (sheet.spellcasting) {
    const castAbility = sheet.spellcasting.ability ?? "int";
    const castMod = abilityMods[castAbility];
    derivedSpellSaveDc = spellSaveDc(
      pb,
      castMod,
      sheet.spellcasting.spellSaveDcOverride,
    );
    derivedSpellAttackBonus = spellAttackBonus(
      pb,
      castMod,
      sheet.spellcasting.spellAttackBonusOverride,
    );
  }

  return {
    abilities,
    savingThrows,
    skills,
    proficiencyBonus: pb,
    ac,
    initiative,
    spellSaveDc: derivedSpellSaveDc,
    spellAttackBonus: derivedSpellAttackBonus,
  };
}
