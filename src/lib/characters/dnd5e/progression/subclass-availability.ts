import type { ClassId } from "./types";

/** Bekannte / gängige Unterklassen für den Charakter-Wizard (Info, nicht Auswahlfilter). */
export type SubclassAvailabilityEntry = {
  id: string;
  nameDe: string;
  nameEn: string;
  /** true = im Progression-Katalog wählbar */
  inSystem: boolean;
};

export type ClassSubclassAvailability = {
  /** z. B. „Unterklasse typischerweise ab Stufe 3.“ */
  unlockNoteDe: string;
  unlockNoteEn: string;
  entries: SubclassAvailabilityEntry[];
};

/**
 * Wartbare Liste: PHB-/gängige Optionen vs. was TableHeroes bereits im Katalog hat.
 * Auswahl im Wizard bleibt am echten Katalog (`prog.subclasses`) hängen.
 */
export const SUBCLASS_AVAILABILITY: Partial<
  Record<ClassId, ClassSubclassAvailability>
> = {
  rogue: {
    unlockNoteDe: "Unterklasse typischerweise ab Stufe 3.",
    unlockNoteEn: "Subclass typically from level 3.",
    entries: [
      { id: "thief", nameDe: "Dieb", nameEn: "Thief", inSystem: true },
      { id: "assassin", nameDe: "Assassine", nameEn: "Assassin", inSystem: false },
      {
        id: "arcane-trickster",
        nameDe: "Arkaner Trickster",
        nameEn: "Arcane Trickster",
        inSystem: true,
      },
      {
        id: "swashbuckler",
        nameDe: "Säbelrassler",
        nameEn: "Swashbuckler",
        inSystem: false,
      },
    ],
  },
  cleric: {
    unlockNoteDe:
      "Göttliche Domäne ab Stufe 3 (2024). Legacy-Domänen wie Grab erhalten beim Wählen alle Merkmale der Stufe 3 oder niedriger.",
    unlockNoteEn:
      "Divine Domain from level 3 (2024). Legacy domains such as Grave gain all of that domain's features of 3rd level or lower when you choose it.",
    entries: [
      { id: "life", nameDe: "Leben", nameEn: "Life", inSystem: true },
      { id: "light", nameDe: "Licht", nameEn: "Light", inSystem: false },
      { id: "nature", nameDe: "Natur", nameEn: "Nature", inSystem: false },
      { id: "knowledge", nameDe: "Wissen", nameEn: "Knowledge", inSystem: false },
      { id: "tempest", nameDe: "Sturm", nameEn: "Tempest", inSystem: false },
      { id: "trickery", nameDe: "Täuschung", nameEn: "Trickery", inSystem: false },
      { id: "war", nameDe: "Krieg", nameEn: "War", inSystem: false },
      { id: "grave", nameDe: "Grab", nameEn: "Grave", inSystem: true },
    ],
  },
  wizard: {
    unlockNoteDe: "Arkane Tradition / Unterklasse ab Stufe 3 (2024).",
    unlockNoteEn: "Arcane tradition / subclass from level 3 (2024).",
    entries: [
      { id: "evocation", nameDe: "Hervorrufung", nameEn: "Evocation", inSystem: true },
      { id: "abjuration", nameDe: "Bannmagie", nameEn: "Abjuration", inSystem: false },
      { id: "conjuration", nameDe: "Beschwörung", nameEn: "Conjuration", inSystem: false },
      { id: "divination", nameDe: "Erkenntnismagie", nameEn: "Divination", inSystem: false },
      { id: "enchantment", nameDe: "Verzauberung", nameEn: "Enchantment", inSystem: false },
      { id: "illusion", nameDe: "Illusion", nameEn: "Illusion", inSystem: false },
      { id: "necromancy", nameDe: "Nekromantie", nameEn: "Necromancy", inSystem: false },
      { id: "transmutation", nameDe: "Verwandlung", nameEn: "Transmutation", inSystem: false },
    ],
  },
  barbarian: {
    unlockNoteDe: "Barbaren-Unterklasse ab Stufe 3 (2024).",
    unlockNoteEn: "Barbarian subclass from level 3 (2024).",
    entries: [
      { id: "berserker", nameDe: "Berserker", nameEn: "Berserker", inSystem: true },
      {
        id: "wild-heart",
        nameDe: "Wildes Herz",
        nameEn: "Wild Heart",
        inSystem: false,
      },
      {
        id: "world-tree",
        nameDe: "Weltenbaum",
        nameEn: "World Tree",
        inSystem: false,
      },
      { id: "zealot", nameDe: "Eiferer", nameEn: "Zealot", inSystem: false },
    ],
  },
};

export function getSubclassAvailability(
  classId: ClassId | null | undefined,
): ClassSubclassAvailability | null {
  if (!classId) return null;
  return SUBCLASS_AVAILABILITY[classId] ?? null;
}
