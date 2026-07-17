/**
 * Lightweight self-checks for level-up + level-1 creation (no test runner required).
 * Run: npx tsx src/lib/characters/dnd5e/progression/progression.selftest.ts
 */
import assert from "node:assert/strict";
import { levelGrantsAsi, asiLevelsForClass } from "./asi";
import { slotsForClassLevel, cantripsKnownForClass, spellsKnownForClass } from "./spell-slots";
import { planLevelUp, featuresForLevel } from "./engine";
import { applyLevelUpDraft } from "./apply";
import { matchSubclassOption, normalizeSubclassKey } from "./class-ids";
import { getAllClassProgressions, getClassProgression } from "./catalog";
import { buildLevel1Sheet, planLevel1Creation, STANDARD_ARRAY } from "./character-create";
import { createEmptyDnd5eSheet } from "../defaults";
import type { AbilityKeyShort, ClassId } from "./types";

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

  console.log("progression.selftest: OK");
}

run();
