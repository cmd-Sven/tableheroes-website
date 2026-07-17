"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type { InventoryCustomCategory } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  getItemDisplayCategory,
  STANDARD_INVENTORY_CATEGORIES,
  type InventoryDisplayCategory,
} from "@/src/lib/characters/dnd5e/inventory-categories";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  item: CharacterItem | null;
  customCategories: InventoryCustomCategory[];
  onAssign: (category: InventoryDisplayCategory | string) => void;
  onClose: () => void;
};

export function CategoryAssignModal({
  item,
  customCategories,
  onAssign,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [selected, setSelected] = useState<string>("gear");

  useEffect(() => {
    if (!item) return;
    const current = getItemDisplayCategory(item, customCategories);
    setSelected(current === "unknown" ? "gear" : current);
  }, [item, customCategories]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
              {t("inventory.assignCategory")}
            </h3>
            <p className="font-libre text-xs text-gray-400">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white mb-4"
        >
          {STANDARD_INVENTORY_CATEGORIES.filter((c) => c !== "unknown").map((cat) => (
            <option key={cat} value={cat}>
              {t(`inventory.cat.${cat}` as Parameters<typeof t>[0])}
            </option>
          ))}
          {customCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
          >
            {t("inventory.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onAssign(selected)}
            className="rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-xs font-bold uppercase text-black"
          >
            {t("inventory.assign")}
          </button>
        </div>
      </div>
    </div>
  );
}
