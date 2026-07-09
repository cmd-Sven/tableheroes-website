import type { Dnd5eEquipmentState } from "./equipment-types";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_LABELS_DE: Record<AbilityKey, string> = {
  str: "Stärke",
  dex: "Geschick",
  con: "Konstitution",
  int: "Intelligenz",
  wis: "Weisheit",
  cha: "Charisma",
};

/** Foundry-kompatible Skill-Keys (dnd5e). */
export type Dnd5eSkillKey =
  | "acr"
  | "ani"
  | "arc"
  | "ath"
  | "dec"
  | "his"
  | "ins"
  | "itm"
  | "inv"
  | "med"
  | "nat"
  | "prc"
  | "prf"
  | "per"
  | "rel"
  | "slt"
  | "ste"
  | "surv";

export type SkillProficiency = "none" | "proficient" | "expertise";

export type Dnd5eSkillEntry = {
  proficient: SkillProficiency;
  /** Manueller Gesamtbonus-Override (z. B. durch Feat) */
  bonusOverride?: number | null;
};

export type Dnd5eAttackEntry = {
  id: string;
  name: string;
  /** null = aus Attribut + PB berechnen */
  attackBonusOverride?: number | null;
  damage: string;
  notes?: string | null;
};

export type Dnd5eFeatureEntry = {
  id: string;
  name: string;
  description?: string | null;
  source?: string | null;
};

export type Dnd5eSpellSlots = Record<string, { max: number; used: number }>;

export type Dnd5eSheetData = {
  version: 1;
  abilities: Record<AbilityKey, { score: number }>;
  savingThrows: Record<AbilityKey, { proficient: boolean }>;
  skills: Record<Dnd5eSkillKey, Dnd5eSkillEntry>;
  combat: {
    hpMax: number;
    hpCurrent: number;
    hpTemp: number;
    speed: number;
    hitDice: string;
    /** Berechneter/manueller AC — acOverride hat Vorrang wenn gesetzt */
    ac: number;
    acOverride?: number | null;
    /** Zusatz auf Initiative (neben DEX) */
    initiativeBonus: number;
    initiativeOverride?: number | null;
    deathSaveSuccesses?: number;
    deathSaveFailures?: number;
  };
  proficiencies: {
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
  };
  features: Dnd5eFeatureEntry[];
  attacks: Dnd5eAttackEntry[];
  /** Ausrüstung, Gepäck, Gürtel, Einstimmung */
  equipment?: Dnd5eEquipmentState;
  spellcasting?: {
    ability: AbilityKey;
    spellSaveDcOverride?: number | null;
    spellAttackBonusOverride?: number | null;
    slots?: Dnd5eSpellSlots;
  };
  notes?: string | null;
};

export type Dnd5eSheetOverrides = Record<string, boolean | number | null>;

export type Dnd5eSheetSource = "foundry_import" | "manual" | "ai_scan";

export type Dnd5eDerivedSheet = {
  abilities: Record<AbilityKey, { score: number; modifier: number }>;
  savingThrows: Record<AbilityKey, { modifier: number; proficient: boolean; total: number }>;
  skills: Record<
    Dnd5eSkillKey,
    { modifier: number; proficient: SkillProficiency; total: number; ability: AbilityKey }
  >;
  proficiencyBonus: number;
  ac: number;
  initiative: number;
  spellSaveDc: number | null;
  spellAttackBonus: number | null;
};

export type CharacterSheetPayload = {
  characterId: string;
  campaignId: string;
  campaignSystem: string;
  name: string;
  class: string | null;
  subclass: string | null;
  race: string | null;
  background: string | null;
  alignment: string | null;
  level: number;
  experiencePoints: number;
  sheet: Dnd5eSheetData;
  overrides: Dnd5eSheetOverrides;
  derived: Dnd5eDerivedSheet;
  sheetSource: Dnd5eSheetSource | null;
  sheetSyncedAt: string | null;
  canEdit: boolean;
  progressionLocked: boolean;
  progressionLockMessage: string;
};
