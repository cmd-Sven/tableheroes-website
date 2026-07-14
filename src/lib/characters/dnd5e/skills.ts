import type { AbilityKey, Dnd5eSkillKey } from "./types";

export type Dnd5eSkillDefinition = {
  key: Dnd5eSkillKey;
  labelDe: string;
  labelEn: string;
  ability: AbilityKey;
};

/** Alle Standard-Fertigkeiten D&D 5e (PHB) — Keys wie Foundry dnd5e. */
export const DND5E_SKILLS: Dnd5eSkillDefinition[] = [
  { key: "acr", labelDe: "Akrobatik", labelEn: "Acrobatics", ability: "dex" },
  { key: "ani", labelDe: "Mit Tieren umgehen", labelEn: "Animal Handling", ability: "wis" },
  { key: "arc", labelDe: "Arkane Kunde", labelEn: "Arcana", ability: "int" },
  { key: "ath", labelDe: "Athletik", labelEn: "Athletics", ability: "str" },
  { key: "dec", labelDe: "Täuschen", labelEn: "Deception", ability: "cha" },
  { key: "his", labelDe: "Geschichte", labelEn: "History", ability: "int" },
  { key: "ins", labelDe: "Motiv erkennen", labelEn: "Insight", ability: "wis" },
  { key: "itm", labelDe: "Einschüchtern", labelEn: "Intimidation", ability: "cha" },
  { key: "inv", labelDe: "Nachforschungen", labelEn: "Investigation", ability: "int" },
  { key: "med", labelDe: "Heilkunde", labelEn: "Medicine", ability: "wis" },
  { key: "nat", labelDe: "Naturkunde", labelEn: "Nature", ability: "int" },
  { key: "prc", labelDe: "Wahrnehmung", labelEn: "Perception", ability: "wis" },
  { key: "prf", labelDe: "Auftreten", labelEn: "Performance", ability: "cha" },
  { key: "per", labelDe: "Überzeugen", labelEn: "Persuasion", ability: "cha" },
  { key: "rel", labelDe: "Religion", labelEn: "Religion", ability: "int" },
  { key: "slt", labelDe: "Fingerfertigkeit", labelEn: "Sleight of Hand", ability: "dex" },
  { key: "ste", labelDe: "Heimlichkeit", labelEn: "Stealth", ability: "dex" },
  { key: "surv", labelDe: "Überleben", labelEn: "Survival", ability: "wis" },
];

export const DND5E_SKILL_BY_KEY = Object.fromEntries(
  DND5E_SKILLS.map((s) => [s.key, s]),
) as Record<Dnd5eSkillKey, Dnd5eSkillDefinition>;
