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

export const CLASS_SUBCLASS_LEVEL: Record<ClassId, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

export function isValidClassId(id: string): id is ClassId {
  return (CLASS_IDS as string[]).includes(id);
}
