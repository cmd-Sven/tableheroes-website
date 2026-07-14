import type { AbilityKey, Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import {
  ABILITY_LABELS_DE,
  ABILITY_LABELS_EN,
} from "@/src/lib/characters/dnd5e/types";
import { DND5E_SKILL_BY_KEY } from "@/src/lib/characters/dnd5e/skills";
import {
  CONTAINER_KIND_LABELS_DE,
  CONTAINER_KIND_LABELS_EN,
  EQUIPMENT_SLOT_LABELS_DE,
  EQUIPMENT_SLOT_LABELS_EN,
  type Dnd5eContainerKind,
  type Dnd5eEquipmentSlot,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  findAlignmentOption,
  getAlignmentLabel,
  getAlignmentShortDescription,
} from "@/src/lib/characters/dnd5e-alignments";
import { getConditionLabel } from "@/src/lib/characters/condition-tokens";
import { characterSheetMessagesDe, type CharacterSheetMessageKey } from "./de";
import { characterSheetMessagesEn } from "./en";
import type { CharacterSheetLocale } from "./types";

export type { CharacterSheetLocale, CharacterSheetMessageKey };
export { DEFAULT_CHARACTER_SHEET_LOCALE, normalizeCharacterSheetLocale } from "./types";

type InterpolationValues = Record<string, string | number>;

const MESSAGES: Record<CharacterSheetLocale, Record<CharacterSheetMessageKey, string>> = {
  de: characterSheetMessagesDe,
  en: characterSheetMessagesEn,
};

export function createCharacterSheetT(locale: CharacterSheetLocale) {
  return function t(key: CharacterSheetMessageKey, values?: InterpolationValues): string {
    let text = MESSAGES[locale][key] ?? MESSAGES.de[key] ?? key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

export type CharacterSheetT = ReturnType<typeof createCharacterSheetT>;

export function getAbilityLabel(locale: CharacterSheetLocale, key: AbilityKey): string {
  return locale === "en" ? ABILITY_LABELS_EN[key] : ABILITY_LABELS_DE[key];
}

export function getSkillLabel(locale: CharacterSheetLocale, key: Dnd5eSkillKey): string {
  const def = DND5E_SKILL_BY_KEY[key];
  return locale === "en" ? def.labelEn : def.labelDe;
}

export function getEquipmentSlotLabel(
  locale: CharacterSheetLocale,
  slot: Dnd5eEquipmentSlot,
): string {
  return locale === "en" ? EQUIPMENT_SLOT_LABELS_EN[slot] : EQUIPMENT_SLOT_LABELS_DE[slot];
}

export function getContainerKindLabel(
  locale: CharacterSheetLocale,
  kind: Dnd5eContainerKind,
): string {
  return locale === "en" ? CONTAINER_KIND_LABELS_EN[kind] : CONTAINER_KIND_LABELS_DE[kind];
}

export function getAlignmentDisplayLabel(
  locale: CharacterSheetLocale,
  value: string | null | undefined,
): string {
  return getAlignmentLabel(locale, value);
}

export function getAlignmentShortText(
  locale: CharacterSheetLocale,
  value: string | null | undefined,
): string | null {
  const opt = findAlignmentOption(value);
  if (!opt) return null;
  return getAlignmentShortDescription(locale, opt.value);
}

export function getConditionDisplayLabel(
  locale: CharacterSheetLocale,
  key: Parameters<typeof getConditionLabel>[1],
): string {
  return getConditionLabel(locale, key);
}

export function getLocaleDateTimeString(
  locale: CharacterSheetLocale,
  iso: string,
): string {
  const tag = locale === "en" ? "en-US" : "de-DE";
  return new Date(iso).toLocaleString(tag);
}
