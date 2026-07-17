/** D&D 5e level-up progression — shared types */

export type ClassId =
  | "barbarian"
  | "bard"
  | "cleric"
  | "druid"
  | "fighter"
  | "monk"
  | "paladin"
  | "ranger"
  | "rogue"
  | "sorcerer"
  | "warlock"
  | "wizard";

export type RaceId =
  | "dragonborn"
  | "dwarf"
  | "elf"
  | "gnome"
  | "half-elf"
  | "half-orc"
  | "halfling"
  | "human"
  | "tiefling"
  | "unknown";

export type AbilityKeyShort = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type CasterProgression = "none" | "full" | "half" | "third" | "pact";

export type SlotKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "pact";

export type LocalizedText = {
  nameEn: string;
  nameDe: string;
  descriptionEn?: string;
  descriptionDe?: string;
};

export type ProgressionFeature = LocalizedText & {
  id: string;
  level: number;
  subclass?: string | null;
  /** Auto-added to sheet.spells as always prepared (domain/oath spells, etc.) */
  grantedSpellIds?: string[];
};

export type ClassLevelRow = {
  level: number;
  featureIds: string[];
  spellSlots?: Partial<Record<SlotKey, number>>;
  cantripsKnown?: number;
  spellsKnown?: number;
};

export type ClassProgression = {
  id: ClassId;
  nameEn: string;
  nameDe: string;
  hitDie: number;
  caster: CasterProgression;
  subclassLevel: number;
  asiLevels: number[];
  levels: ClassLevelRow[];
  features: ProgressionFeature[];
  subclasses?: Array<{
    id: string;
    nameEn: string;
    nameDe: string;
    features: ProgressionFeature[];
  }>;
};

export type RaceProgression = {
  id: RaceId;
  nameEn: string;
  nameDe: string;
  features: ProgressionFeature[];
};

export type FeatDefinition = LocalizedText & {
  id: string;
  abilityBonus?: Partial<Record<AbilityKeyShort, number>>;
  prerequisiteEn?: string;
  prerequisiteDe?: string;
};

export type SpellDefinition = LocalizedText & {
  id: string;
  level: number;
  school: string;
  classes: ClassId[];
  ritual?: boolean;
  concentration?: boolean;
};

export type AsiChoice =
  | {
      type: "asi";
      increases: Array<{ ability: AbilityKeyShort; delta: 1 | 2 }>;
    }
  | { type: "feat"; featId: string; customName?: string; customDescription?: string };

export type LevelUpPlan = {
  fromLevel: number;
  toLevel: number;
  classId: ClassId | null;
  raceId: RaceId;
  hitDie: number;
  proficiencyBonus: { from: number; to: number };
  features: ProgressionFeature[];
  raceFeatures: ProgressionFeature[];
  needsAsi: boolean;
  needsSubclass: boolean;
  subclassOptions: Array<{ id: string; nameEn: string; nameDe: string }>;
  spellcasting: {
    caster: CasterProgression;
    slotsMax: Partial<Record<SlotKey, number>>;
    cantripsKnown: number | null;
    spellsKnown: number | null;
    cantripsToLearn: number;
    spellsToLearn: number;
    preparedHint: boolean;
  } | null;
  hpAverage: number;
};

export type LevelUpDraft = {
  plan: LevelUpPlan;
  hpGain: number;
  selectedFeatureIds: string[];
  selectedRaceFeatureIds: string[];
  subclassId: string | null;
  asi: AsiChoice | null;
  newSpellIds: string[];
  customSpells: Array<{ name: string; level: number; description?: string }>;
  customFeature?: { name: string; description?: string } | null;
  setXpToThreshold: boolean;
};
