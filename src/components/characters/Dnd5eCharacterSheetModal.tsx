"use client";

import { X } from "lucide-react";
import { Dnd5eCharacterSheetPanel } from "@/src/components/characters/Dnd5eCharacterSheetPanel";
import {
  CharacterSheetLocaleProvider,
  useCharacterSheetLocale,
} from "@/src/lib/i18n/character-sheet/context";
import { CharacterSheetLanguageToggle } from "@/src/components/characters/CharacterSheetLanguageToggle";

type SheetCharacter = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
};

type Props = {
  campaignId: string;
  character: SheetCharacter;
  onClose: () => void;
};

function Dnd5eCharacterSheetModalHeader({
  character,
  onClose,
}: {
  character: SheetCharacter;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hero-dark px-5 py-4">
      <div>
        <h2 className="font-barlow text-lg font-bold uppercase text-white">
          {character.name}
        </h2>
        <p className="font-libre text-xs text-gray-400">
          {character.class || t("sheet.unknownClass")} · {t("sheet.level")}{" "}
          {character.level ?? 1}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <CharacterSheetLanguageToggle />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-hero-border p-2 text-gray-400 transition-colors hover:border-accent-gold hover:text-accent-gold"
          aria-label={t("sheet.closeAria")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export function Dnd5eCharacterSheetModal({ campaignId, character, onClose }: Props) {
  const { t } = useCharacterSheetLocale();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("sheet.modalAria", { name: character.name })}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-amber-800/60 bg-background-card shadow-2xl"
      >
        <Dnd5eCharacterSheetModalHeader character={character} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Dnd5eCharacterSheetPanel campaignId={campaignId} characterId={character.id} compact />
        </div>
      </div>
    </div>
  );
}

export function Dnd5eCharacterSheetModalWithLocale(props: Props) {
  return (
    <CharacterSheetLocaleProvider
      campaignId={props.campaignId}
      characterId={props.character.id}
      initialLocale="de"
    >
      <Dnd5eCharacterSheetModal {...props} />
    </CharacterSheetLocaleProvider>
  );
}
