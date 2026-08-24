import type { ClassId } from "./types";
import { CLASS_IDS } from "./class-ids";

/** Deutsche Anzeigenamen für SRD-Klassen */
export const CLASS_NAME_DE: Record<ClassId, string> = {
  barbarian: "Barbar",
  bard: "Barde",
  cleric: "Kleriker",
  druid: "Druide",
  fighter: "Kämpfer",
  monk: "Mönch",
  paladin: "Paladin",
  ranger: "Waldläufer",
  rogue: "Schurke",
  sorcerer: "Zauberer",
  warlock: "Hexer",
  wizard: "Magier",
};

/** English display names for SRD classes */
export const CLASS_NAME_EN: Record<ClassId, string> = {
  barbarian: "Barbarian",
  bard: "Bard",
  cleric: "Cleric",
  druid: "Druid",
  fighter: "Fighter",
  monk: "Monk",
  paladin: "Paladin",
  ranger: "Ranger",
  rogue: "Rogue",
  sorcerer: "Sorcerer",
  warlock: "Warlock",
  wizard: "Wizard",
};

/** 2024: alle Klassen wählen die Unterklasse auf Stufe 3. */
export const CLASS_SUBCLASS_LEVEL: Record<ClassId, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 3,
  druid: 3,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 3,
  warlock: 3,
  wizard: 3,
};

export function isValidClassId(id: string): id is ClassId {
  return (CLASS_IDS as string[]).includes(id);
}
