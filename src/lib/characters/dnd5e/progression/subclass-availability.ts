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
    entries: [
      { id: "thief", nameDe: "Dieb", nameEn: "Thief", inSystem: true },
      { id: "assassin", nameDe: "Assassine", nameEn: "Assassin", inSystem: false },
      {
        id: "arcane-trickster",
        nameDe: "Arkaner Trickser",
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
    unlockNoteDe: "Göttliche Domäne ab Stufe 1.",
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
};

export function getSubclassAvailability(
  classId: ClassId | null | undefined,
): ClassSubclassAvailability | null {
  if (!classId) return null;
  return SUBCLASS_AVAILABILITY[classId] ?? null;
}
