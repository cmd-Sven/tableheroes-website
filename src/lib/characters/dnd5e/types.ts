import type { Dnd5eEquipmentState } from "./equipment-types";
import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import type { CharacterTuvState } from "./character-tuv";

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

export const ABILITY_LABELS_EN: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
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

export type SkillProficiency = "none" | "half" | "proficient" | "expertise";

export type Dnd5eSkillEntry = {
  proficient: SkillProficiency;
  /** Manueller Gesamtbonus-Override (z. B. durch Feat) */
  bonusOverride?: number | null;
  /** Flat-Bonus (z. B. Lore-Rassenboni) — addiert zum berechneten Modifikator */
  flatBonus?: number;
  /** Vom Spieler gesetzter Zusatzbonus (Charakterblatt, Bearbeitungsmodus) */
  manualBonus?: number;
};

export type Dnd5eSavingThrowEntry = {
  proficient: boolean;
  /** Vom Spieler gesetzter Zusatzbonus (Charakterblatt, Bearbeitungsmodus) */
  manualBonus?: number;
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
  /** Optional: deutsch / englisch aus Foundry (Babele o. ä.) */
  nameDe?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionDe?: string | null;
  descriptionEn?: string | null;
  source?: string | null;
};

/** Foundry-Vorbereitungsmodus (dnd5e). */
export type Dnd5eSpellPreparationMode =
  | "prepared"
  | "always"
  | "innate"
  | "pact"
  | "atwill"
  | "known";

export type Dnd5eSpellEntry = {
  id: string;
  /** Primärer Name aus Foundry (Welt-Sprache) */
  name: string;
  nameDe?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionDe?: string | null;
  descriptionEn?: string | null;
  /** 0 = Zaubertrick */
  level: number;
  school?: string | null;
  preparationMode?: Dnd5eSpellPreparationMode | null;
  /** true = für den Tag vorbereitet (nur relevant bei prepared-Klassen) */
  prepared?: boolean;
  ritual?: boolean;
  concentration?: boolean;
  castingTime?: string | null;
  range?: string | null;
  duration?: string | null;
  target?: string | null;
  /** z. B. „V, S, M (…)" — wird aus Komponenten-Flags gebaut */
  components?: string | null;
  componentVocal?: boolean;
  componentSomatic?: boolean;
  componentMaterial?: boolean;
  materials?: string | null;
  damage?: string | null;
  damageType?: string | null;
  /** Attribut für Rettungswurf, falls der Zauber einen verlangt */
  saveAbility?: AbilityKey | null;
  attackType?: "none" | "melee" | "ranged" | null;
  higherLevels?: string | null;
  source?: string | null;
};

export type Dnd5eSpellSlots = Record<string, { max: number; used: number }>;

/** Klassenspezifische Ressourcen (Ki, Raserei, Channel Divinity …). */
export type Dnd5eClassResource = {
  id: string;
  label: string;
  max: number;
  current: number;
  /** true = erholt sich bei kurzer Rast */
  shortRest?: boolean;
};

export type Dnd5eCharacterAchievement = {
  id: string;
  name: string;
  imageUrl?: string | null;
  awardedAt?: string | null;
  pointsAwarded?: number;
};

export type Dnd5eSheetData = {
  version: 1;
  abilities: Record<AbilityKey, { score: number }>;
  savingThrows: Record<AbilityKey, Dnd5eSavingThrowEntry>;
  skills: Record<Dnd5eSkillKey, Dnd5eSkillEntry>;
  combat: {
    hpMax: number;
    hpCurrent: number;
    hpTemp: number;
    speed: number;
    hitDice: string;
    /** Verbleibende Trefferwürfel (null = volle Anzahl aus hitDice) */
    hitDiceRemaining?: number | null;
    /** Berechneter/manueller AC — acOverride hat Vorrang wenn gesetzt */
    ac: number;
    acOverride?: number | null;
    /** Zusatz auf Initiative (neben DEX) */
    initiativeBonus: number;
    /** Manueller Initiative-Gesamtwert — ignoriert DEX, Bonus, Erschöpfung, Makel */
    initiativeOverride?: number | null;
    /** Manueller Bewegungswert — ignoriert Erschöpfung, Makel */
    speedOverride?: number | null;
    deathSaveSuccesses?: number;
    deathSaveFailures?: number;
    /**
     * 2024 exhaustion (0–10). Each level: −1 on d20 tests, −5 ft speed.
     * Level 10 is death. A Long Rest reduces the level by 1.
     */
    exhaustionLevel?: number;
  };
  proficiencies: {
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
  };
  features: Dnd5eFeatureEntry[];
  /** Zauber aus Foundry (type: spell) */
  spells?: Dnd5eSpellEntry[];
  attacks: Dnd5eAttackEntry[];
  /** Ausrüstung, Gepäck, Gürtel, Einstimmung */
  equipment?: Dnd5eEquipmentState;
  spellcasting?: {
    ability: AbilityKey;
    spellSaveDcOverride?: number | null;
    spellAttackBonusOverride?: number | null;
    slots?: Dnd5eSpellSlots;
  };
  /** Klassenspezifische Ressourcen — werden bei Rast zurückgesetzt */
  classResources?: Dnd5eClassResource[];
  notes?: string | null;
  /** KI-Charakter-TÜV: Findings, Rückfragen, Antworten */
  characterInspection?: CharacterTuvState | null;
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
  /** Effective walking speed after exhaustion (and before flaw display overlay). */
  speed: number;
  exhaustionLevel: number;
  /** Negative modifier applied to d20 tests from exhaustion. */
  exhaustionPenalty: number;
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
  sheetLocale: CharacterSheetLocale;
  /** Vom Spieler errungene Achievements (Konto des Charakterbesitzers) */
  achievements?: Dnd5eCharacterAchievement[];
  /** Makel für Anzeige-/Wurf-Modifikatoren (optional, wenn geladen). */
  characterFlaws?: Array<{ flawId: string; story: string; grantedNote?: string }>;
};
