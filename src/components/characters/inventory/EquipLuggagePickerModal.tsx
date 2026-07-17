"use client";

import { Backpack, X } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  candidates: CharacterItem[];
  onSelect: (item: CharacterItem) => void;
  onClose: () => void;
};

export function EquipLuggagePickerModal({ candidates, onSelect, onClose }: Props) {
  const { t } = useCharacterSheetLocale();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
            {t("inventory.equipLuggageTitle")}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 font-libre text-xs text-gray-400">{t("inventory.equipLuggageHint")}</p>

        {candidates.length === 0 ? (
          <p className="font-libre text-sm text-gray-500 italic">{t("inventory.equipLuggageNone")}</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {candidates.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center gap-2 rounded border border-hero-border/40 px-3 py-2 text-left font-libre text-sm text-gray-200 hover:border-hero-vibrant hover:bg-hero-dark/40"
                >
                  <Backpack className="h-4 w-4 shrink-0 text-hero-vibrant" />
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
          >
            {t("inventory.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
