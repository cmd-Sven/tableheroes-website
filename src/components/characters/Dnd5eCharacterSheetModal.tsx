"use client";

import { X } from "lucide-react";
import { Dnd5eCharacterSheetPanel } from "@/src/components/characters/Dnd5eCharacterSheetPanel";

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

export function Dnd5eCharacterSheetModal({ campaignId, character, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Charakterblatt von ${character.name}`}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-amber-800/60 bg-background-card shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hero-dark px-5 py-4">
          <div>
            <h2 className="font-barlow text-lg font-bold uppercase text-white">
              {character.name}
            </h2>
            <p className="font-libre text-xs text-gray-400">
              {character.class || "Unbekannt"} · Level {character.level ?? 1}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hero-border p-2 text-gray-400 transition-colors hover:border-accent-gold hover:text-accent-gold"
            aria-label="Charakterblatt schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Dnd5eCharacterSheetPanel
            campaignId={campaignId}
            characterId={character.id}
            compact
          />
        </div>
      </div>
    </div>
  );
}
