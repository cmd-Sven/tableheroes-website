export type { ClassId, RaceId, LevelUpPlan, LevelUpDraft, AsiChoice, AbilityKeyShort } from "./types";
export {
  resolveClassId,
  resolveRaceId,
  CLASS_IDS,
  matchSubclassOption,
  normalizeSubclassKey,
} from "./class-ids";
export { asiLevelsForClass, levelGrantsAsi } from "./asi";
export {
  slotsForClassLevel,
  casterTypeForClass,
  cantripsKnownForClass,
  cantripsKnownForThirdCaster,
  spellsKnownForClass,
  spellsKnownForThirdCaster,
  isThirdCasterSubclass,
  spellListClassIdForSubclass,
} from "./spell-slots";
export {
  planLevelUp,
  highestAvailableSpellLevel,
  featuresForLevel,
  subclassFeaturesUpToLevel,
} from "./engine";
export { applyLevelUpDraft } from "./apply";
export {
  planLevel1Creation,
  buildLevel1Sheet,
  STANDARD_ARRAY,
  POINT_BUY_BUDGET,
  CLASS_SAVE_PROFICIENCIES,
  type Level1CreationPlan,
  type Level1CreationDraft,
} from "./character-create";
export {
  getClassProgression,
  getAllClassProgressions,
  getFeats,
  getSpells,
  getSpellsForClass,
  getRaceProgression,
  getBackgrounds,
  getBackgroundById,
  findBackgroundByName,
  SRD_ATTRIBUTION,
} from "./catalog";
export {
  spellDefinitionToSheetEntry,
  featDefinitionToFeatureEntry,
  appendGrantedSpellsFromFeatures,
  applyClassBasicsFromCatalog,
  syncSpellSlotsFromClass,
  canLearnSpellFromCatalog,
  catalogSpellsForPicker,
  enrichItemDescriptionFromCatalog,
  matchSheetFeatureToFeat,
} from "./catalog-bridge";
export {
  setCharacterBackground,
  applyBackgroundGrants,
  removeBackgroundGrants,
  resolveAppliedBackgroundId,
  listBackgroundOptions,
  BACKGROUND_SOURCE,
} from "./apply-background";
export {
  applySubclassChange,
  listCatalogSubclassOptions,
  catalogSubclassLevel,
} from "./apply-subclass-change";
export type { BackgroundDefinition } from "./types";
export {
  getSubclassAvailability,
  SUBCLASS_AVAILABILITY,
  type SubclassAvailabilityEntry,
  type ClassSubclassAvailability,
} from "./subclass-availability";
export {
  PROFICIENCY_CATALOG,
  CLASS_PROFICIENCIES,
  getProficiencyById,
  getProficienciesByCategory,
  matchProficiencyEntry,
  resolveProficiencyLabel,
  normalizeProficiencyList,
  applyClassProficienciesFromCatalog,
  reconcileProficienciesWithCatalog,
  getClassProficiencyLabels,
  listHasProficiency,
  toggleProficiencyInList,
  customProficiencyEntries,
  proficiencyLabel,
  type ProficiencyCategory,
  type ProficiencyDefinition,
  type ClassProficiencyGrant,
} from "./proficiencies-catalog";
