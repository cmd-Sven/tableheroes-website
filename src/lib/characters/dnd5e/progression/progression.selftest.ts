/**
 * Lightweight self-checks for level-up + level-1 creation (no test runner required).
 * Run: npx tsx src/lib/characters/dnd5e/progression/progression.selftest.ts
 */
import assert from "node:assert/strict";
import { levelGrantsAsi, asiLevelsForClass } from "./asi";
import { slotsForClassLevel, cantripsKnownForClass, spellsKnownForClass, isThirdCasterSubclass, spellsKnownForThirdCaster, cantripsKnownForThirdCaster, spellListClassIdForSubclass } from "./spell-slots";
import { planLevelUp, featuresForLevel, subclassFeaturesUpToLevel } from "./engine";
import { applyLevelUpDraft } from "./apply";
import { matchSubclassOption, normalizeSubclassKey } from "./class-ids";
import { getAllClassProgressions, getClassProgression, getSpells, getSpellsForClass } from "./catalog";
import { buildLevel1Sheet, planLevel1Creation, STANDARD_ARRAY } from "./character-create";
import { getSubclassAvailability } from "./subclass-availability";
import { createEmptyDnd5eSheet } from "../defaults";
import type { AbilityKeyShort, ClassId, LevelUpDraft } from "./types";
import {
  setCharacterBackground,
  BACKGROUND_SOURCE,
} from "./apply-background";
import { applySubclassChange } from "./apply-subclass-change";
import { applyClassChange } from "./apply-class-change";
import { getBackgrounds } from "./catalog";
import {
  canLearnSpellFromCatalog,
  catalogSpellsForPicker,
  effectiveSlotMaxForLevel,
  maxSlotLevelFromClass,
  spellDefinitionToSheetEntry,
} from "./catalog-bridge";
import {
  localizedFeatureDescription,
  localizedFeatureName,
} from "../spellcasting";
import type { Dnd5eFeatureEntry } from "../types";
import type { ProgressionFeature } from "./types";

function run() {
  assert.deepEqual(asiLevelsForClass("wizard"), [4, 8, 12, 16, 19]);
  assert.ok(asiLevelsForClass("fighter").includes(6));
  assert.ok(asiLevelsForClass("rogue").includes(10));
  // Catalog-driven ASI for fighter
  assert.deepEqual(asiLevelsForClass("fighter"), getClassProgression("fighter")!.asiLevels);
  assert.equal(levelGrantsAsi("wizard", 4), true);
  assert.equal(levelGrantsAsi("wizard", 5), false);

  const wiz5 = slotsForClassLevel("wizard", 5);
  assert.equal(wiz5["1"], 4);
  assert.equal(wiz5["2"], 3);
  assert.equal(wiz5["3"], 2);

  const warlock5 = slotsForClassLevel("warlock", 5);
  assert.equal(warlock5.pact, 2);

  assert.equal(cantripsKnownForClass("wizard", 4), 4);
  assert.equal(spellsKnownForClass("bard", 2), 5);

  const sheet = createEmptyDnd5eSheet(3);
  sheet.abilities.con.score = 14;

  const plan4 = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 3,
    sheet,
  });
  assert.equal(plan4.toLevel, 4);
  assert.equal(plan4.classId, "wizard");
  assert.equal(plan4.needsAsi, true);
  assert.ok(plan4.spellcasting);
  assert.equal(plan4.hpAverage, Math.floor(6 / 2) + 1 + 2); // d6 avg + CON(+2)

  const plan5 = planLevelUp({
    className: "Wizard",
    subclass: "Evocation",
    raceName: "Human",
    fromLevel: 4,
    sheet: createEmptyDnd5eSheet(4),
  });
  assert.equal(plan5.needsAsi, false);
  assert.ok((plan5.spellcasting?.slotsMax["3"] ?? 0) >= 2);

  // --- subclassLevel catch-up (2024: alle Klassen Stufe 3) ---
  const clericPlan = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 1,
    sheet: createEmptyDnd5eSheet(1),
  });
  assert.equal(clericPlan.toLevel, 2);
  assert.equal(clericPlan.needsSubclass, false, "Cleric domain is chosen at 3rd level (2024)");

  const clericTo3 = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
  });
  assert.equal(clericTo3.needsSubclass, true, "Cleric without domain must pick subclass at 3");

  const sorcererPlan = planLevelUp({
    className: "Zauberer",
    subclass: null,
    raceName: "Elf",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
  });
  assert.equal(sorcererPlan.needsSubclass, true);

  const warlockPlan = planLevelUp({
    className: "Hexer",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 4,
    sheet: createEmptyDnd5eSheet(4),
  });
  assert.equal(warlockPlan.needsSubclass, true);

  // Wizard tradition at 3 (2024)
  const wizTo2 = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 1,
    sheet: createEmptyDnd5eSheet(1),
  });
  assert.equal(wizTo2.needsSubclass, false);
  assert.equal(wizTo2.toLevel, 2);

  const wizTo3 = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
  });
  assert.equal(wizTo3.needsSubclass, true);
  assert.equal(wizTo3.toLevel, 3);

  // Subclass override merges features (Evocation at 3)
  const wizWithSub = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
    subclassOverride: "evocation",
  });
  assert.ok(
    wizWithSub.features.some((f) => /evocation|sculpt|savant/i.test(f.id + f.nameEn)),
    "Evocation features should appear when subclass picked in wizard",
  );
  // Step still required (meta has no subclass)
  assert.equal(wizWithSub.needsSubclass, true);

  // Open Hand matching
  assert.equal(normalizeSubclassKey("Open Hand"), "openhand");
  assert.equal(normalizeSubclassKey("open-hand"), "openhand");
  const monk = getClassProgression("monk")!;
  const matched = matchSubclassOption("Open Hand", monk.subclasses ?? []);
  assert.ok(matched);
  assert.equal(matched!.id, "open-hand");

  const monkFeatures = featuresForLevel("monk", 3, "Open Hand");
  assert.ok(monkFeatures.length > 0);

  // Apply merges subclass features
  const draftSheet = createEmptyDnd5eSheet(2);
  const applied = applyLevelUpDraft(
    draftSheet,
    {
      plan: wizTo3,
      hpGain: wizTo3.hpAverage,
      selectedFeatureIds: wizTo3.features.map((f) => f.id),
      selectedRaceFeatureIds: [],
      subclassId: "evocation",
      asi: null,
      newSpellIds: [],
      customSpells: [],
      setXpToThreshold: false,
    },
    0,
  );
  assert.equal(applied.meta.level, 3);
  assert.ok(applied.meta.subclass);
  assert.ok(
    applied.sheet.features.some((f) => /evocation|sculpt|savant/i.test(f.id + (f.nameEn ?? ""))),
    "Applied sheet should include Evocation subclass features",
  );

  // Catalog: all 12 classes have subclassLevel + levels 1–20
  const all = getAllClassProgressions();
  assert.equal(all.length, 12);
  for (const c of all) {
    assert.ok(c.subclassLevel >= 1 && c.subclassLevel <= 3, c.id);
    assert.ok(c.levels.length >= 20, c.id);
    assert.ok(c.asiLevels.length > 0, c.id);
  }

  const l1Rogue = planLevel1Creation({ classId: "rogue" });
  assert.equal(l1Rogue.needsSubclass, false, "Rogue subclass at 3 (2024)");
  assert.ok(l1Rogue.subclassOptions.some((s) => s.id === "arcane-trickster"));
  assert.ok(l1Rogue.classFeatures.some((f) => f.id === "rogue-weapon-mastery"));
  const l1Wiz = planLevel1Creation({ classId: "wizard" });
  assert.equal(l1Wiz.needsSubclass, false, "Wizard tradition at 3 (2024)");
  assert.ok(l1Wiz.subclassOptions.some((s) => s.id === "evocation"));
  assert.ok(l1Wiz.classFeatures.some((f) => f.id === "ritual-adept"));
  const l1Barb = planLevel1Creation({ classId: "barbarian" });
  assert.equal(l1Barb.needsSubclass, false, "Barbarian path at 3 (2024)");
  assert.ok(l1Barb.subclassOptions.some((s) => s.id === "berserker"));

  // --- Level 1 creation ---
  const l1Cleric = planLevel1Creation({ classId: "cleric" });
  assert.equal(l1Cleric.needsSubclass, false);
  assert.equal(l1Cleric.hitDie, 8);
  assert.ok(l1Cleric.spellcasting);
  assert.equal(l1Cleric.spellcasting!.cantripsToLearn, 3);
  assert.ok(
    l1Cleric.subclassOptions.some((s) => s.id === "life"),
    "Life domain available",
  );
  assert.ok(
    l1Cleric.subclassOptions.some((s) => s.id === "grave"),
    "Grave domain available",
  );

  const l1Fighter = planLevel1Creation({ classId: "fighter" });
  assert.equal(l1Fighter.needsSubclass, false);
  assert.equal(l1Fighter.hitDie, 10);

  const base: Record<AbilityKeyShort, number> = {
    str: STANDARD_ARRAY[0],
    dex: STANDARD_ARRAY[1],
    con: STANDARD_ARRAY[2],
    int: STANDARD_ARRAY[3],
    wis: STANDARD_ARRAY[4],
    cha: STANDARD_ARRAY[5],
  };
  const barbBuilt = buildLevel1Sheet({
    classId: "barbarian",
    subclassId: null,
    raceName: "Mensch",
    raceId: "human",
    baseAbilities: base,
    applyRacialBonuses: false,
    spellIds: [],
    skillKeys: [],
  });
  assert.equal(barbBuilt.meta.subclass, null);
  assert.ok(barbBuilt.sheet.features.some((f) => f.id === "barbarian-weapon-mastery"));
  assert.ok(barbBuilt.sheet.features.some((f) => f.id === "rage"));

  const built = buildLevel1Sheet({
    classId: "cleric" as ClassId,
    subclassId: null,
    raceName: "Mensch",
    raceId: "human",
    baseAbilities: base,
    applyRacialBonuses: true,
    spellIds: [],
    skillKeys: [],
  });
  assert.equal(built.meta.level, 1);
  assert.equal(built.meta.className, "Kleriker");
  assert.equal(built.sheet.abilities.str.score, 15); // 2024: species hat keine festen ASI mehr
  assert.ok(built.sheet.combat.hpMax >= 8);
  assert.ok(built.sheet.features.length > 0);
  assert.equal(
    (built.sheet.spells ?? []).some((s) => s.id.includes("bless") || /segen/i.test(s.name)),
    false,
    "Life domain Bless is not granted at level 1 (2024 domain at 3)",
  );

  const lifeAt3 = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
    subclassOverride: "life",
  });
  assert.ok(
    lifeAt3.features.some((f) => f.id === "life-domain-spells-1"),
    "Life domain 1st-level spells at subclass catch-up (level 3)",
  );
  assert.ok(
    lifeAt3.features.some((f) => f.id === "disciple-of-life"),
    "Disciple of Life at subclass catch-up",
  );

  const graveAt3 = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
    subclassOverride: "grave",
  });
  assert.ok(
    graveAt3.features.some((f) => f.id === "circle-of-mortality"),
    "Grave: Circle of Mortality at 3rd-level catch-up",
  );
  assert.ok(
    graveAt3.features.some((f) => f.id === "eyes-of-the-grave"),
    "Grave: Eyes of the Grave at 3rd-level catch-up",
  );

  // Toll the Dead on cleric spell list (picker)
  const clericCantrips = getSpellsForClass("cleric", 0).filter((s) => s.level === 0);
  assert.ok(
    clericCantrips.some((s) => s.id === "toll-the-dead"),
    "Toll the Dead must appear in cleric cantrip picker",
  );

  const graveAt6 = featuresForLevel("cleric", 6, "grave");
  assert.ok(graveAt6.some((f) => f.id === "sentinel-at-deaths-door"));

  // --- Arcane Trickster (third caster) ---
  assert.ok(isThirdCasterSubclass("arcane-trickster"));
  assert.ok(isThirdCasterSubclass("Arkaner Trickser"));
  assert.ok(isThirdCasterSubclass("Arcane Trickster"));
  assert.equal(isThirdCasterSubclass("thief"), false);

  const atSlots3 = slotsForClassLevel("rogue", 3, "arcane-trickster");
  assert.equal(atSlots3["1"], 2);
  assert.equal(spellsKnownForThirdCaster(3), 3);
  assert.equal(spellsKnownForThirdCaster(19), 12);
  assert.equal(cantripsKnownForThirdCaster(3), 3);
  assert.equal(cantripsKnownForThirdCaster(2), null);

  const rogueProg = getClassProgression("rogue")!;
  assert.ok(
    rogueProg.subclasses?.some((s) => s.id === "arcane-trickster"),
    "Arcane Trickster subclass in rogue catalog",
  );

  const atFeatures3 = featuresForLevel("rogue", 3, "arcane-trickster");
  assert.ok(atFeatures3.some((f) => f.id === "spellcasting-arcane-trickster"));
  assert.ok(atFeatures3.some((f) => f.id === "mage-hand-legerdemain"));
  const spellcastFeat = atFeatures3.find((f) => f.id === "spellcasting-arcane-trickster");
  assert.ok(spellcastFeat?.grantedSpellIds?.includes("mage-hand"));

  const atFeatures9 = featuresForLevel("rogue", 9, "arcane-trickster");
  assert.ok(atFeatures9.some((f) => f.id === "magical-ambusher"));
  const atFeatures13 = featuresForLevel("rogue", 13, "arcane-trickster");
  assert.ok(atFeatures13.some((f) => f.id === "versatile-trickster"));
  const atFeatures17 = featuresForLevel("rogue", 17, "arcane-trickster");
  assert.ok(atFeatures17.some((f) => f.id === "spell-thief"));

  // Rogue 2024 base progression
  const rogueL1 = featuresForLevel("rogue", 1, null);
  assert.ok(rogueL1.some((f) => f.id === "rogue-weapon-mastery"));
  assert.ok(rogueL1.some((f) => f.id === "thieves-cant"));
  const rogueL3Base = featuresForLevel("rogue", 3, null);
  assert.ok(rogueL3Base.some((f) => f.id === "steady-aim"));
  const rogueL5 = featuresForLevel("rogue", 5, null);
  assert.ok(rogueL5.some((f) => f.id === "cunning-strike"));
  assert.ok(rogueL5.some((f) => f.id === "uncanny-dodge"));
  const rogueL7 = featuresForLevel("rogue", 7, null);
  assert.ok(rogueL7.some((f) => f.id === "reliable-talent"));
  assert.ok(rogueL7.some((f) => f.id === "rogue-evasion"));
  const rogueL11 = featuresForLevel("rogue", 11, null);
  assert.ok(rogueL11.some((f) => f.id === "improved-cunning-strike"));
  assert.ok(!rogueL11.some((f) => f.id === "reliable-talent"));
  const rogueL14 = featuresForLevel("rogue", 14, null);
  assert.ok(rogueL14.some((f) => f.id === "devious-strikes"));
  assert.ok(!rogueL14.some((f) => f.id === "blindsense"));
  const rogueL19 = featuresForLevel("rogue", 19, null);
  assert.ok(rogueL19.some((f) => f.id === "rogue-epic-boon"));

  const rogueTo3 = planLevelUp({
    className: "Schurke",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
    subclassOverride: "arcane-trickster",
  });
  assert.equal(rogueTo3.needsSubclass, true);
  assert.ok(rogueTo3.spellcasting, "AT grants third-caster spellcasting at 3");
  assert.equal(rogueTo3.spellcasting!.caster, "third");
  assert.equal(rogueTo3.spellcasting!.slotsMax["1"], 2);
  assert.equal(rogueTo3.spellcasting!.spellsKnown, 3);
  assert.equal(rogueTo3.spellcasting!.cantripsKnown, 3);
  assert.equal(
    rogueTo3.spellcasting!.cantripsToLearn,
    2,
    "Mage Hand auto-granted → 2 cantrips to pick",
  );
  assert.equal(rogueTo3.spellcasting!.spellsToLearn, 3);
  assert.ok(
    rogueTo3.features.some((f) => f.id === "mage-hand-legerdemain"),
    "AT features on level-up to 3",
  );
  assert.equal(spellListClassIdForSubclass("rogue", "arcane-trickster"), "wizard");
  assert.equal(spellListClassIdForSubclass("rogue", "thief"), "rogue");

  // Subclass catch-up for existing characters (5→6, no subclass yet)
  const rogueCatchUp = planLevelUp({
    className: "Schurke",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 5,
    sheet: createEmptyDnd5eSheet(5),
  });
  assert.equal(rogueCatchUp.needsSubclass, true, "Rogue 5→6 without subclass must pick");

  const rogueCatchUpAt = planLevelUp({
    className: "Schurke",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 5,
    sheet: createEmptyDnd5eSheet(5),
    subclassOverride: "arcane-trickster",
  });
  assert.equal(rogueCatchUpAt.needsSubclass, true);
  assert.ok(
    rogueCatchUpAt.features.some((f) => f.id === "spellcasting-arcane-trickster"),
    "Catch-up includes AT spellcasting from level 3",
  );
  assert.ok(
    rogueCatchUpAt.features.some((f) => f.id === "mage-hand-legerdemain"),
    "Catch-up includes Mage Hand Legerdemain",
  );
  assert.ok(rogueCatchUpAt.spellcasting);
  assert.equal(rogueCatchUpAt.spellcasting!.caster, "third");
  assert.equal(rogueCatchUpAt.spellcasting!.slotsMax["1"], 3);
  assert.equal(
    rogueCatchUpAt.spellcasting!.spellsToLearn,
    4,
    "Catch-up: 4 spells known at level 6 with empty sheet",
  );
  assert.equal(rogueCatchUpAt.spellcasting!.cantripsToLearn, 2);

  // Unmatched Foundry subclass string → still needs pick
  const rogueBadMeta = planLevelUp({
    className: "Schurke",
    subclass: "Compendium.dnd5e.classfeatures.unknown",
    raceName: "Mensch",
    fromLevel: 4,
    sheet: createEmptyDnd5eSheet(4),
  });
  assert.equal(rogueBadMeta.needsSubclass, true, "Unmatched meta subclass still needs pick");

  // Matched DE name → no pick needed
  const rogueHasThief = planLevelUp({
    className: "Schurke",
    subclass: "Dieb",
    raceName: "Mensch",
    fromLevel: 5,
    sheet: createEmptyDnd5eSheet(5),
  });
  assert.equal(rogueHasThief.needsSubclass, false);
  assert.ok(rogueHasThief.features.some((f) => f.id === "rogue-expertise-2" || f.level === 6));

  // Cleric domain catch-up at 3→4 without domain
  const clericCatchUp = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 3,
    sheet: createEmptyDnd5eSheet(3),
    subclassOverride: "grave",
  });
  assert.equal(clericCatchUp.needsSubclass, true);
  assert.ok(
    clericCatchUp.features.some((f) => f.id === "circle-of-mortality"),
    "Grave catch-up from level 1",
  );
  assert.ok(
    clericCatchUp.features.some((f) => f.id === "channel-divinity-path-to-the-grave"),
    "Grave catch-up level 2 feature",
  );

  const catchUpList = subclassFeaturesUpToLevel("rogue", "arcane-trickster", 9);
  assert.ok(catchUpList.some((f) => f.id === "magical-ambusher"));
  assert.ok(catchUpList.every((f) => f.level <= 9));

  // Apply AT level-up: meta, features, mage hand, slots, known spells
  const atDraftSheet = createEmptyDnd5eSheet(2);
  const atApplied = applyLevelUpDraft(
    atDraftSheet,
    {
      plan: rogueTo3,
      hpGain: rogueTo3.hpAverage,
      selectedFeatureIds: rogueTo3.features.map((f) => f.id),
      selectedRaceFeatureIds: [],
      subclassId: "arcane-trickster",
      asi: null,
      newSpellIds: ["minor-illusion", "prestidigitation", "disguise-self", "silent-image", "charm-person"],
      customSpells: [],
      setXpToThreshold: false,
    } satisfies LevelUpDraft,
    0,
  );
  assert.equal(atApplied.meta.level, 3);
  assert.ok(/trickser|trickster/i.test(atApplied.meta.subclass ?? ""));
  assert.ok(atApplied.sheet.features.some((f) => f.id === "mage-hand-legerdemain"));
  assert.ok(
    (atApplied.sheet.spells ?? []).some((s) => s.id.includes("mage-hand")),
    "Mage Hand granted on apply",
  );
  assert.equal(atApplied.sheet.spellcasting?.slots?.["1"]?.max, 2);
  assert.equal(atApplied.sheet.spellcasting?.ability, "int");
  const learned = (atApplied.sheet.spells ?? []).find((s) => s.id === "charm-person");
  assert.ok(learned);
  assert.equal(learned!.preparationMode, "known");

  // Subclass availability helper (wizard info)
  const rogueAvail = getSubclassAvailability("rogue")!;
  assert.ok(rogueAvail.entries.some((e) => e.id === "thief" && e.inSystem));
  assert.ok(rogueAvail.entries.some((e) => e.id === "arcane-trickster" && e.inSystem));
  assert.ok(rogueAvail.entries.some((e) => e.id === "assassin" && !e.inSystem));
  const clericAvail = getSubclassAvailability("cleric")!;
  assert.ok(clericAvail.entries.some((e) => e.id === "life" && e.inSystem));
  assert.ok(clericAvail.entries.some((e) => e.id === "grave" && e.inSystem));
  assert.ok(clericAvail.entries.some((e) => e.id === "light" && !e.inSystem));
  const wizardAvail = getSubclassAvailability("wizard")!;
  assert.ok(wizardAvail.entries.some((e) => e.id === "evocation" && e.inSystem));
  assert.ok(wizardAvail.entries.some((e) => e.id === "illusion" && !e.inSystem));
  const barbAvail = getSubclassAvailability("barbarian")!;
  assert.ok(barbAvail.entries.some((e) => e.id === "berserker" && e.inSystem));
  assert.ok(barbAvail.entries.some((e) => e.id === "zealot" && !e.inSystem));

  // Wizard 2024 base + Evocation
  const wizL1 = featuresForLevel("wizard", 1, null);
  assert.ok(wizL1.some((f) => f.id === "ritual-adept"));
  assert.ok(wizL1.some((f) => f.id === "arcane-recovery"));
  const wizL2 = featuresForLevel("wizard", 2, null);
  assert.ok(wizL2.some((f) => f.id === "wizard-scholar"));
  const wizL5 = featuresForLevel("wizard", 5, null);
  assert.ok(wizL5.some((f) => f.id === "memorize-spell"));
  const wizEv3 = featuresForLevel("wizard", 3, "evocation");
  assert.ok(wizEv3.some((f) => f.id === "evocation-savant"));
  assert.ok(wizEv3.some((f) => f.id === "potent-cantrip"));
  const wizEv6 = featuresForLevel("wizard", 6, "evocation");
  assert.ok(wizEv6.some((f) => f.id === "sculpt-spells"));
  assert.ok(!featuresForLevel("wizard", 2, "evocation").some((f) => f.id === "sculpt-spells"));
  const wizL19 = featuresForLevel("wizard", 19, null);
  assert.ok(wizL19.some((f) => f.id === "wizard-epic-boon"));

  // Barbarian 2024 base + Berserker
  const barbL1 = featuresForLevel("barbarian", 1, null);
  assert.ok(barbL1.some((f) => f.id === "barbarian-weapon-mastery"));
  assert.ok(barbL1.some((f) => f.id === "rage"));
  const barbL3 = featuresForLevel("barbarian", 3, null);
  assert.ok(barbL3.some((f) => f.id === "primal-knowledge"));
  const barbL7 = featuresForLevel("barbarian", 7, null);
  assert.ok(barbL7.some((f) => f.id === "instinctive-pounce"));
  const barbL9 = featuresForLevel("barbarian", 9, null);
  assert.ok(barbL9.some((f) => f.id === "brutal-strike"));
  assert.ok(!barbL9.some((f) => /brutal-critical/i.test(f.id)));
  const berserk3 = featuresForLevel("barbarian", 3, "berserker");
  assert.ok(berserk3.some((f) => f.id === "frenzy"));
  const berserk10 = featuresForLevel("barbarian", 10, "berserker");
  assert.ok(berserk10.some((f) => f.id === "retaliation"));
  const berserk14 = featuresForLevel("barbarian", 14, "berserker");
  assert.ok(berserk14.some((f) => f.id === "intimidating-presence"));
  const barbTo3 = planLevelUp({
    className: "Barbar",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 2,
    sheet: createEmptyDnd5eSheet(2),
    subclassOverride: "berserker",
  });
  assert.equal(barbTo3.needsSubclass, true);
  assert.ok(barbTo3.features.some((f) => f.id === "frenzy"));

  // --- Background apply / remove / replace ---
  assert.ok(getBackgrounds().length >= 13, "PHB-style backgrounds catalog");
  assert.ok(getBackgrounds().some((b) => b.id === "acolyte"));

  let bgSheet = createEmptyDnd5eSheet(1);
  const acolyte = setCharacterBackground(bgSheet, "acolyte", { locale: "de" });
  assert.equal(acolyte.backgroundLabel, "Akolyth");
  assert.equal(acolyte.sheet.skills.ins.proficient, "proficient");
  assert.equal(acolyte.sheet.skills.rel.proficient, "proficient");
  assert.ok(
    acolyte.sheet.features.some(
      (f) => f.source === BACKGROUND_SOURCE && f.id === "bg-acolyte-feature",
    ),
  );

  // Expertise override should survive remove
  acolyte.sheet.skills.ins.proficient = "expertise";
  const criminal = setCharacterBackground(acolyte.sheet, "criminal", {
    previousBackgroundMeta: "Akolyth",
    locale: "de",
  });
  assert.equal(criminal.backgroundLabel, "Verbrecher");
  assert.equal(criminal.sheet.skills.ins.proficient, "expertise", "expertise preserved");
  assert.equal(criminal.sheet.skills.rel.proficient, "none", "old skill removed");
  assert.equal(criminal.sheet.skills.dec.proficient, "proficient");
  assert.equal(criminal.sheet.skills.ste.proficient, "proficient");
  assert.ok(
    !criminal.sheet.features.some((f) => f.id === "bg-acolyte-feature"),
    "old background feature removed",
  );
  assert.ok(criminal.sheet.features.some((f) => f.id === "bg-criminal-feature"));
  assert.ok(
    criminal.sheet.proficiencies.tools.some((t) => /diebes|thieves/i.test(t)),
  );

  const clearedBg = setCharacterBackground(criminal.sheet, null, {
    previousBackgroundMeta: "Verbrecher",
    locale: "de",
  });
  assert.equal(clearedBg.backgroundId, null);
  assert.ok(!clearedBg.sheet.features.some((f) => f.source === BACKGROUND_SOURCE));

  // --- Subclass change: Cleric Life → Grave (2024: domain at 3) ---
  const lifeBuilt = buildLevel1Sheet({
    classId: "cleric",
    subclassId: "life",
    raceName: "Mensch",
    raceId: "human",
    baseAbilities: {
      str: 10,
      dex: 10,
      con: 14,
      int: 10,
      wis: 15,
      cha: 8,
    },
    applyRacialBonuses: true,
    spellIds: [],
    skillKeys: [],
  });
  const lifeAt3Sheet = applySubclassChange(lifeBuilt.sheet, {
    className: lifeBuilt.meta.className,
    level: 3,
    previousSubclass: null,
    nextSubclassId: "life",
    locale: "de",
  }).sheet;
  assert.ok(lifeAt3Sheet.features.some((f) => f.id === "disciple-of-life"));
  const toGrave = applySubclassChange(lifeAt3Sheet, {
    className: lifeBuilt.meta.className,
    level: 3,
    previousSubclass: "Leben",
    nextSubclassId: "grave",
    locale: "de",
  });
  assert.ok(/grab/i.test(toGrave.subclassLabel ?? ""));
  assert.ok(toGrave.sheet.features.some((f) => f.id === "circle-of-mortality"));
  assert.ok(
    !toGrave.sheet.features.some((f) => /disciple-of-life|disciple of life/i.test(f.id + f.name)),
    "Life domain features removed",
  );

  // Rogue Thief → Arcane Trickster at level 3 (slots appear)
  const rogueBase = createEmptyDnd5eSheet(3);
  const toAt = applySubclassChange(rogueBase, {
    className: "Schurke",
    level: 3,
    previousSubclass: "Dieb",
    nextSubclassId: "arcane-trickster",
    locale: "de",
  });
  assert.ok(/trickser|trickster/i.test(toAt.subclassLabel ?? ""));
  assert.ok((toAt.sheet.spellcasting?.slots?.["1"]?.max ?? 0) >= 2);
  assert.ok(
    toAt.sheet.features.some((f) => f.id === "mage-hand-legerdemain" || /mage.?hand/i.test(f.id)),
  );

  const backToThief = applySubclassChange(toAt.sheet, {
    className: "Schurke",
    level: 3,
    previousSubclass: toAt.subclassLabel,
    nextSubclassId: "thief",
    locale: "de",
  });
  assert.ok(/dieb|thief/i.test(backToThief.subclassLabel ?? ""));
  assert.equal(
    Object.keys(backToThief.sheet.spellcasting?.slots ?? {}).length,
    0,
    "third-caster slots cleared when leaving AT",
  );

  // Class change: Wizard → Fighter clears subclass and swaps saves / hit die
  const wizBuilt = buildLevel1Sheet({
    classId: "wizard",
    raceId: "human",
    raceName: "Mensch",
    subclassId: null,
    applyRacialBonuses: false,
    baseAbilities: {
      str: 8,
      dex: 14,
      con: 13,
      int: 15,
      wis: 12,
      cha: 10,
    },
    skillKeys: ["arc", "his"],
    spellIds: [],
  });
  assert.equal(wizBuilt.sheet.savingThrows.int?.proficient, true);
  const toFighter = applyClassChange(wizBuilt.sheet, {
    previousClassName: wizBuilt.meta.className,
    nextClassName: "Kämpfer",
    level: 1,
    previousSubclass: wizBuilt.meta.subclass,
    locale: "de",
  });
  assert.ok(/kämpfer|fighter/i.test(toFighter.classLabel));
  assert.equal(toFighter.subclassLabel, null);
  assert.equal(toFighter.sheet.savingThrows.str?.proficient, true);
  assert.equal(toFighter.sheet.savingThrows.con?.proficient, true);
  assert.equal(toFighter.sheet.savingThrows.int?.proficient, false);
  assert.match(toFighter.sheet.combat.hitDice, /d10/i);

  // --- Localization: 2024 Rogue / Wizard / Barbarian bilingual catalog ---
  function assertLocalizedFeature(f: ProgressionFeature, ctx: string) {
    assert.ok(f.nameDe?.trim(), `${ctx} ${f.id}: missing nameDe`);
    assert.ok(f.nameEn?.trim(), `${ctx} ${f.id}: missing nameEn`);
    if (f.descriptionEn?.trim() || f.descriptionDe?.trim()) {
      assert.ok(f.descriptionDe?.trim(), `${ctx} ${f.id}: missing descriptionDe`);
      assert.notEqual(
        f.descriptionDe!.trim(),
        f.descriptionEn!.trim(),
        `${ctx} ${f.id}: descriptionDe must not be an English copy`,
      );
    }
  }

  function toSheetFeature(f: ProgressionFeature): Dnd5eFeatureEntry {
    return {
      id: f.id,
      name: f.nameDe || f.nameEn,
      nameDe: f.nameDe,
      nameEn: f.nameEn,
      description: f.descriptionDe || f.descriptionEn || null,
      descriptionDe: f.descriptionDe ?? null,
      descriptionEn: f.descriptionEn ?? null,
      source: "level-up",
    };
  }

  for (const classId of ["rogue", "wizard", "barbarian"] as const) {
    const prog = getClassProgression(classId)!;
    assert.ok(prog.nameDe && prog.nameDe !== prog.nameEn, `${classId} class nameDe`);
    for (const f of prog.features) assertLocalizedFeature(f, classId);
    for (const sub of prog.subclasses ?? []) {
      assert.ok(sub.nameDe?.trim(), `${classId}/${sub.id}: subclass nameDe`);
      for (const f of sub.features) assertLocalizedFeature(f, `${classId}/${sub.id}`);
    }
  }

  const mageHandFeat = toSheetFeature(
    featuresForLevel("rogue", 3, "arcane-trickster").find(
      (f) => f.id === "mage-hand-legerdemain",
    )!,
  );
  assert.equal(localizedFeatureName(mageHandFeat, "de"), "Trickreiche Magierhand");
  assert.equal(localizedFeatureName(mageHandFeat, "en"), "Mage Hand Legerdemain");
  assert.ok((localizedFeatureDescription(mageHandFeat, "de") ?? "").includes("Magierhand"));
  assert.ok(
    (localizedFeatureDescription(mageHandFeat, "en") ?? "").toLowerCase().includes("mage hand"),
  );

  const evocationSavant = toSheetFeature(
    featuresForLevel("wizard", 3, "evocation").find((f) => f.id === "evocation-savant")!,
  );
  assert.match(localizedFeatureName(evocationSavant, "de"), /Hervorrufung/i);
  assert.match(localizedFeatureName(evocationSavant, "en"), /Evocation/i);

  const frenzy = toSheetFeature(
    featuresForLevel("barbarian", 3, "berserker").find((f) => f.id === "frenzy")!,
  );
  assert.equal(localizedFeatureName(frenzy, "de"), "Raserei");
  assert.equal(localizedFeatureName(frenzy, "en"), "Frenzy");

  // Applied sheets keep bilingual fields for the locale switch
  assert.ok(atApplied.sheet.features.some((f) => f.id === "mage-hand-legerdemain" && f.nameDe && f.nameEn));
  assert.equal(
    localizedFeatureName(
      atApplied.sheet.features.find((f) => f.id === "mage-hand-legerdemain")!,
      "de",
    ),
    "Trickreiche Magierhand",
  );

  // --- Wizard / Cleric spell catalog browse (empty sheet slots still uses class level) ---
  const emptyCasterSheet = createEmptyDnd5eSheet();
  const wizCatalogL5 = catalogSpellsForPicker("wizard", emptyCasterSheet, null, 5);
  assert.ok(wizCatalogL5.some((s) => s.level === 0), "wizard catalog includes cantrips");
  assert.ok(wizCatalogL5.some((s) => s.level === 3), "wizard L5 sees 3rd-level spells");
  assert.ok(!wizCatalogL5.some((s) => s.level === 4), "wizard L5 has no 4th-level slots yet");
  assert.ok(
    wizCatalogL5.every((s) => s.classes.includes("wizard")),
    "wizard catalog only wizard-list spells",
  );
  assert.ok(
    wizCatalogL5.every((s) => (s.descriptionDe?.trim() || s.descriptionEn?.trim())),
    "wizard catalog spells have bilingual descriptions",
  );

  const clericCatalogL3 = catalogSpellsForPicker("cleric", emptyCasterSheet, "life", 3);
  assert.ok(clericCatalogL3.some((s) => s.level === 2), "cleric L3 sees 2nd-level spells");
  assert.ok(
    clericCatalogL3.every((s) => s.classes.includes("cleric")),
    "cleric catalog only cleric-list spells",
  );

  const fireball = getSpells().find((s) => s.id === "fireball");
  assert.ok(fireball);
  const learnFireball = canLearnSpellFromCatalog(
    emptyCasterSheet,
    fireball!,
    "wizard",
    5,
    null,
  );
  assert.equal(learnFireball.ok, true, "wizard can add fireball at L5 without sheet slots");

  // Prepared casters are not capped by slot count for spellbook size
  let book = emptyCasterSheet;
  for (let i = 0; i < 5; i++) {
    const pick = wizCatalogL5.find(
      (s) =>
        s.level === 1 &&
        canLearnSpellFromCatalog(book, s, "wizard", 5, null).ok,
    );
    assert.ok(pick, `wizard can keep adding 1st-level spells (${i})`);
    book = {
      ...book,
      spells: [...(book.spells ?? []), spellDefinitionToSheetEntry(pick!)],
    };
  }
  assert.ok((book.spells ?? []).filter((s) => s.level === 1).length >= 5);

  assert.equal(maxSlotLevelFromClass("wizard", 5, null), 3);
  assert.equal(maxSlotLevelFromClass("cleric", 9, null), 5);
  assert.equal(effectiveSlotMaxForLevel(emptyCasterSheet, "wizard", 5, 3, null), 2);

  console.log("progression.selftest: OK");
}

run();
