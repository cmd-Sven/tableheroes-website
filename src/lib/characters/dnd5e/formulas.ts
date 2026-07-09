import type { AbilityKey, Dnd5eSkillEntry, SkillProficiency } from "./types";

/** Attributsmodifikator D&D 5e */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Übungsbonus aus Gesamtcharakterlevel (PHB) */
export function proficiencyBonus(totalLevel: number): number {
  const lvl = Math.max(1, Math.floor(totalLevel));
  return 2 + Math.floor((lvl - 1) / 4);
}

export function skillProficiencyBonus(
  proficiency: SkillProficiency,
  pb: number,
): number {
  if (proficiency === "expertise") return pb * 2;
  if (proficiency === "proficient") return pb;
  return 0;
}

export function skillTotalModifier(
  abilityMod: number,
  entry: Dnd5eSkillEntry,
  pb: number,
): number {
  if (entry.bonusOverride != null && !Number.isNaN(entry.bonusOverride)) {
    return Math.round(entry.bonusOverride);
  }
  return abilityMod + skillProficiencyBonus(entry.proficient, pb);
}

export function savingThrowTotal(
  abilityMod: number,
  proficient: boolean,
  pb: number,
): number {
  return abilityMod + (proficient ? pb : 0);
}

/** Initiative: DEX-Mod + Bonus; Override ersetzt Berechnung vollständig */
export function initiativeTotal(
  dexMod: number,
  bonus: number,
  override?: number | null,
): number {
  if (override != null && !Number.isNaN(override)) return Math.round(override);
  return dexMod + bonus;
}

/** Spell Save DC = 8 + PB + Casting Ability Mod */
export function spellSaveDc(
  pb: number,
  castingMod: number,
  override?: number | null,
): number {
  if (override != null && !Number.isNaN(override)) return Math.round(override);
  return 8 + pb + castingMod;
}

/** Spell Attack = PB + Casting Ability Mod */
export function spellAttackBonus(
  pb: number,
  castingMod: number,
  override?: number | null,
): number {
  if (override != null && !Number.isNaN(override)) return Math.round(override);
  return pb + castingMod;
}

/** AC — bei Override direkt; sonst gespeicherter Basiswert (aus Foundry/import) */
export function armorClassValue(
  storedAc: number,
  override?: number | null,
): number {
  if (override != null && !Number.isNaN(override)) return Math.round(override);
  return Math.max(0, Math.round(storedAc));
}

export function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

export function clampAbilityScore(score: number): number {
  return Math.min(30, Math.max(1, Math.round(score)));
}

export function isDnd5eCampaignSystem(system: string | null | undefined): boolean {
  const s = String(system ?? "").trim().toLowerCase();
  return s === "dnd5e" || s === "d&d 5e" || s === "dnd 5e" || s.includes("dnd5");
}
