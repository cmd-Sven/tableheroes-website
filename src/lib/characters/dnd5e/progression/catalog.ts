import type {
  BackgroundDefinition,
  ClassProgression,
  FeatDefinition,
  RaceProgression,
  SpellDefinition,
} from "./types";
import type { ClassId, RaceId } from "./types";
import { isValidClassId } from "./labels-de";

import barbarian from "./data/classes/barbarian.json";
import bard from "./data/classes/bard.json";
import cleric from "./data/classes/cleric.json";
import druid from "./data/classes/druid.json";
import fighter from "./data/classes/fighter.json";
import monk from "./data/classes/monk.json";
import paladin from "./data/classes/paladin.json";
import ranger from "./data/classes/ranger.json";
import rogue from "./data/classes/rogue.json";
import sorcerer from "./data/classes/sorcerer.json";
import warlock from "./data/classes/warlock.json";
import wizard from "./data/classes/wizard.json";
import featsJson from "./data/feats.json";
import spellsJson from "./data/spells.json";
import backgroundsJson from "./data/backgrounds.json";

import dragonborn from "./data/races/dragonborn.json";
import dwarf from "./data/races/dwarf.json";
import elf from "./data/races/elf.json";
import gnome from "./data/races/gnome.json";
import halfElf from "./data/races/half-elf.json";
import halfOrc from "./data/races/half-orc.json";
import halfling from "./data/races/halfling.json";
import human from "./data/races/human.json";
import tiefling from "./data/races/tiefling.json";

const CLASSES: Record<ClassId, ClassProgression> = {
  barbarian: barbarian as ClassProgression,
  bard: bard as ClassProgression,
  cleric: cleric as ClassProgression,
  druid: druid as ClassProgression,
  fighter: fighter as ClassProgression,
  monk: monk as ClassProgression,
  paladin: paladin as ClassProgression,
  ranger: ranger as ClassProgression,
  rogue: rogue as ClassProgression,
  sorcerer: sorcerer as ClassProgression,
  warlock: warlock as ClassProgression,
  wizard: wizard as ClassProgression,
};

const RACES: Partial<Record<RaceId, RaceProgression>> = {
  dragonborn: dragonborn as RaceProgression,
  dwarf: dwarf as RaceProgression,
  elf: elf as RaceProgression,
  gnome: gnome as RaceProgression,
  "half-elf": halfElf as RaceProgression,
  "half-orc": halfOrc as RaceProgression,
  halfling: halfling as RaceProgression,
  human: human as RaceProgression,
  tiefling: tiefling as RaceProgression,
};

export function getClassProgression(classId: ClassId | null): ClassProgression | null {
  if (!classId || !isValidClassId(classId)) return null;
  return CLASSES[classId] ?? null;
}

export function getAllClassProgressions(): ClassProgression[] {
  return Object.values(CLASSES);
}

export function getRaceProgression(raceId: RaceId): RaceProgression | null {
  if (raceId === "unknown") return null;
  return RACES[raceId] ?? null;
}

export function getFeats(): FeatDefinition[] {
  return featsJson as FeatDefinition[];
}

export function getFeatById(id: string): FeatDefinition | null {
  return getFeats().find((f) => f.id === id) ?? null;
}

export function getSpells(): SpellDefinition[] {
  return spellsJson as SpellDefinition[];
}

export function getSpellsForClass(classId: ClassId, maxLevel?: number): SpellDefinition[] {
  return getSpells().filter((s) => {
    if (!s.classes.includes(classId)) return false;
    if (maxLevel != null && s.level > maxLevel) return false;
    return true;
  });
}

function normalizeBgMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function getBackgrounds(): BackgroundDefinition[] {
  return backgroundsJson as BackgroundDefinition[];
}

export function getBackgroundById(id: string): BackgroundDefinition | null {
  const bare = id.replace(/^bg[-_]/i, "").trim();
  return getBackgrounds().find((b) => b.id === bare || b.id === id) ?? null;
}

export function findBackgroundByName(name: string): BackgroundDefinition | null {
  const bare = normalizeBgMatch(name);
  if (!bare) return null;
  const list = getBackgrounds();
  for (const b of list) {
    if (
      normalizeBgMatch(b.id) === bare ||
      normalizeBgMatch(b.nameEn) === bare ||
      normalizeBgMatch(b.nameDe) === bare
    ) {
      return b;
    }
  }
  return null;
}

export const SRD_ATTRIBUTION =
  "This work includes material from the System Reference Document 5.1 (SRD 5.1) © Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License.";
