import type { AbilityKey, Dnd5eSkillKey } from "./types";

export type Dnd5eSkillDefinition = {
  key: Dnd5eSkillKey;
  labelDe: string;
  ability: AbilityKey;
};

/** Alle Standard-Fertigkeiten D&D 5e (PHB) — Keys wie Foundry dnd5e. */
export const DND5E_SKILLS: Dnd5eSkillDefinition[] = [
  { key: "acr", labelDe: "Akrobatik", ability: "dex" },
  { key: "ani", labelDe: "Mit Tieren umgehen", ability: "wis" },
  { key: "arc", labelDe: "Arkane Kunde", ability: "int" },
  { key: "ath", labelDe: "Athletik", ability: "str" },
  { key: "dec", labelDe: "Täuschen", ability: "cha" },
  { key: "his", labelDe: "Geschichte", ability: "int" },
  { key: "ins", labelDe: "Motiv erkennen", ability: "wis" },
  { key: "itm", labelDe: "Einschüchtern", ability: "cha" },
  { key: "inv", labelDe: "Nachforschungen", ability: "int" },
  { key: "med", labelDe: "Heilkunde", ability: "wis" },
  { key: "nat", labelDe: "Naturkunde", ability: "int" },
  { key: "prc", labelDe: "Wahrnehmung", ability: "wis" },
  { key: "prf", labelDe: "Auftreten", ability: "cha" },
  { key: "per", labelDe: "Überzeugen", ability: "cha" },
  { key: "rel", labelDe: "Religion", ability: "int" },
  { key: "slt", labelDe: "Fingerfertigkeit", ability: "dex" },
  { key: "ste", labelDe: "Heimlichkeit", ability: "dex" },
  { key: "surv", labelDe: "Überleben", ability: "wis" },
];

export const DND5E_SKILL_BY_KEY = Object.fromEntries(
  DND5E_SKILLS.map((s) => [s.key, s]),
) as Record<Dnd5eSkillKey, Dnd5eSkillDefinition>;
