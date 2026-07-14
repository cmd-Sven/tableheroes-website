"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { saveCharacterSheetLocale } from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";
import {
  createCharacterSheetT,
  getAbilityLabel,
  getAlignmentDisplayLabel,
  getAlignmentShortText,
  getConditionDisplayLabel,
  getContainerKindLabel,
  getEquipmentSlotLabel,
  getLocaleDateTimeString,
  getSkillLabel,
  normalizeCharacterSheetLocale,
  type CharacterSheetLocale,
  type CharacterSheetMessageKey,
  type CharacterSheetT,
} from "./index";
import type { AbilityKey, Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import type { Dnd5eContainerKind, Dnd5eEquipmentSlot } from "@/src/lib/characters/dnd5e/equipment-types";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";

type CharacterSheetLocaleContextValue = {
  locale: CharacterSheetLocale;
  setLocale: (next: CharacterSheetLocale) => void;
  hydrateLocale: (next: CharacterSheetLocale) => void;
  isLocalePending: boolean;
  t: CharacterSheetT;
  abilityLabel: (key: AbilityKey) => string;
  skillLabel: (key: Dnd5eSkillKey) => string;
  equipmentSlotLabel: (slot: Dnd5eEquipmentSlot) => string;
  containerKindLabel: (kind: Dnd5eContainerKind) => string;
  alignmentLabel: (value: string | null | undefined) => string;
  alignmentShort: (value: string | null | undefined) => string | null;
  conditionLabel: (key: CharacterConditionKey) => string;
  formatDateTime: (iso: string) => string;
};

const CharacterSheetLocaleContext = createContext<CharacterSheetLocaleContextValue | null>(null);

type ProviderProps = {
  campaignId: string;
  characterId: string;
  initialLocale: CharacterSheetLocale | string | null | undefined;
  children: ReactNode;
};

export function CharacterSheetLocaleProvider({
  campaignId,
  characterId,
  initialLocale,
  children,
}: ProviderProps) {
  const [locale, setLocaleState] = useState<CharacterSheetLocale>(
    normalizeCharacterSheetLocale(initialLocale),
  );
  const [isLocalePending, startTransition] = useTransition();

  const hydrateLocale = useCallback((next: CharacterSheetLocale) => {
    setLocaleState(normalizeCharacterSheetLocale(next));
  }, []);

  const setLocale = useCallback(
    (next: CharacterSheetLocale) => {
      if (next === locale) return;
      setLocaleState(next);
      startTransition(async () => {
        const result = await saveCharacterSheetLocale(campaignId, characterId, next);
        if (!result.success) {
          setLocaleState(locale);
        }
      });
    },
    [campaignId, characterId, locale],
  );

  const value = useMemo<CharacterSheetLocaleContextValue>(() => {
    const t = createCharacterSheetT(locale);
    return {
      locale,
      setLocale,
      hydrateLocale,
      isLocalePending,
      t,
      abilityLabel: (key) => getAbilityLabel(locale, key),
      skillLabel: (key) => getSkillLabel(locale, key),
      equipmentSlotLabel: (slot) => getEquipmentSlotLabel(locale, slot),
      containerKindLabel: (kind) => getContainerKindLabel(locale, kind),
      alignmentLabel: (value) => getAlignmentDisplayLabel(locale, value),
      alignmentShort: (value) => getAlignmentShortText(locale, value),
      conditionLabel: (key) => getConditionDisplayLabel(locale, key),
      formatDateTime: (iso) => getLocaleDateTimeString(locale, iso),
    };
  }, [locale, setLocale, hydrateLocale, isLocalePending]);

  return (
    <CharacterSheetLocaleContext.Provider value={value}>
      {children}
    </CharacterSheetLocaleContext.Provider>
  );
}

export function useCharacterSheetLocale(): CharacterSheetLocaleContextValue {
  const ctx = useContext(CharacterSheetLocaleContext);
  if (!ctx) {
    throw new Error("useCharacterSheetLocale must be used within CharacterSheetLocaleProvider");
  }
  return ctx;
}

export type { CharacterSheetMessageKey };
