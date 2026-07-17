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
import { getAllClassProgressions, getClassProgression, getSpellsForClass } from "./catalog";
import { buildLevel1Sheet, planLevel1Creation, STANDARD_ARRAY } from "./character-create";
import { getSubclassAvailability } from "./subclass-availability";
import { createEmptyDnd5eSheet } from "../defaults";
import type { AbilityKeyShort, ClassId, LevelUpDraft } from "./types";

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

  // --- subclassLevel catch-up (Cleric/Sorcerer/Warlock = 1) ---
  const clericPlan = planLevelUp({
    className: "Kleriker",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 1,
    sheet: createEmptyDnd5eSheet(1),
  });
  assert.equal(clericPlan.toLevel, 2);
  assert.equal(clericPlan.needsSubclass, true, "Cleric without domain must pick subclass on level-up");

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

  // Wizard tradition at 2
  const wizTo2 = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 1,
    sheet: createEmptyDnd5eSheet(1),
  });
  assert.equal(wizTo2.needsSubclass, true);
  assert.equal(wizTo2.toLevel, 2);

  // Subclass override merges features (Evocation at 2)
  const wizWithSub = planLevelUp({
    className: "Magier",
    subclass: null,
    raceName: "Mensch",
    fromLevel: 1,
    sheet: createEmptyDnd5eSheet(1),
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
  const draftSheet = createEmptyDnd5eSheet(1);
  const applied = applyLevelUpDraft(
    draftSheet,
    {
      plan: wizTo2,
      hpGain: wizTo2.hpAverage,
      selectedFeatureIds: wizTo2.features.map((f) => f.id),
      selectedRaceFeatureIds: [],
      subclassId: "evocation",
      asi: null,
      newSpellIds: [],
      customSpells: [],
      setXpToThreshold: false,
    },
    0,
  );
  assert.equal(applied.meta.level, 2);
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

  // --- Level 1 creation ---
  const l1Cleric = planLevel1Creation({ classId: "cleric" });
  assert.equal(l1Cleric.needsSubclass, true);
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
  const built = buildLevel1Sheet({
    classId: "cleric" as ClassId,
    subclassId: "life",
    raceName: "Mensch",
    raceId: "human",
    baseAbilities: base,
    applyRacialBonuses: true,
    spellIds: [],
    skillKeys: [],
  });
  assert.equal(built.meta.level, 1);
  assert.equal(built.meta.className, "Kleriker");
  assert.ok(built.meta.subclass);
  assert.equal(built.sheet.abilities.str.score, 16); // 15+1 human
  assert.ok(built.sheet.combat.hpMax >= 8);
  assert.ok(built.sheet.features.length > 0);
  assert.ok(
    (built.sheet.spells ?? []).some((s) => s.id.includes("bless") || /segen/i.test(s.name)),
    "Life domain grants Bless as always-prepared",
  );

  const builtGrave = buildLevel1Sheet({
    classId: "cleric",
    subclassId: "grave",
    raceName: "Mensch",
    raceId: "human",
    baseAbilities: base,
    applyRacialBonuses: true,
    spellIds: [],
    skillKeys: [],
  });
  assert.ok(/grab/i.test(builtGrave.meta.subclass ?? ""));
  assert.ok(
    builtGrave.sheet.features.some((f) => f.id === "circle-of-mortality"),
    "Grave: Circle of Mortality",
  );
  assert.ok(
    builtGrave.sheet.features.some((f) => f.id === "eyes-of-the-grave"),
    "Grave: Eyes of the Grave",
  );
  const graveSpells = builtGrave.sheet.spells ?? [];
  assert.ok(
    graveSpells.some((s) => s.id.includes("bane")),
    "Grave domain grants Bane",
  );
  assert.ok(
    graveSpells.some((s) => s.id.includes("false-life")),
    "Grave domain grants False Life",
  );
  assert.ok(
    graveSpells.some((s) => s.id.includes("spare-the-dying")),
    "Grave Circle of Mortality grants Spare the Dying",
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

  console.log("progression.selftest: OK");
}

run();
