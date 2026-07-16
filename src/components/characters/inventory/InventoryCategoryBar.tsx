"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import type { InventoryCustomCategory } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  MAGICAL_FILTER_ID,
  STANDARD_INVENTORY_CATEGORIES,
} from "@/src/lib/characters/dnd5e/inventory-categories";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  activeCategory: string | null;
  customCategories: InventoryCustomCategory[];
  readOnly: boolean;
  onSelect: (category: string | null) => void;
  onAddCustomCategory?: (label: string) => void;
  onAssignUnknown?: () => void;
};

export function InventoryCategoryBar({
  activeCategory,
  customCategories,
  readOnly,
  onSelect,
  onAddCustomCategory,
  onAssignUnknown,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function submitCustom() {
    const label = newLabel.trim();
    if (!label || !onAddCustomCategory) return;
    onAddCustomCategory(label);
    setNewLabel("");
    setShowAdd(false);
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-md border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase transition-colors ${
            activeCategory === null
              ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
              : "border-hero-border/40 text-gray-500 hover:text-gray-300"
          }`}
        >
          {t("inventory.allCategories")}
        </button>

        <button
          type="button"
          onClick={() =>
            onSelect(activeCategory === MAGICAL_FILTER_ID ? null : MAGICAL_FILTER_ID)
          }
          title={t("inventory.cat.magical")}
          className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
            activeCategory === MAGICAL_FILTER_ID
              ? "border-accent-gold ring-1 ring-accent-gold/60 bg-accent-gold/15 text-accent-gold"
              : "border-transparent text-accent-gold/70 hover:border-accent-gold/40 hover:text-accent-gold"
          }`}
        >
          <Sparkles className="h-4 w-4" />
        </button>

        {STANDARD_INVENTORY_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const isUnknown = cat === "unknown";
          const active = activeCategory === cat;
          const colorClass = CATEGORY_COLORS[cat];

          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                if (isUnknown && onAssignUnknown) {
                  onAssignUnknown();
                } else {
                  onSelect(active ? null : cat);
                }
              }}
              title={t(`inventory.cat.${cat}` as Parameters<typeof t>[0])}
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                active
                  ? "border-hero-vibrant ring-1 ring-hero-vibrant/50"
                  : "border-transparent hover:border-hero-border/50"
              } ${colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        {customCategories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(active ? null : cat.id)}
              title={cat.label}
              className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-barlow text-[9px] font-bold uppercase transition-colors ${
                active
                  ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                  : "border-hero-border/40 bg-hero-dark/40 text-gray-400 hover:text-accent-gold"
              }`}
            >
              {cat.label.slice(0, 3)}
            </button>
          );
        })}

        {!readOnly && onAddCustomCategory ? (
          showAdd ? (
            <div className="flex items-center gap-1">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder={t("inventory.customCategoryPlaceholder")}
                className="w-24 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
              />
              <button
                type="button"
                onClick={submitCustom}
                className="rounded p-1 text-hero-vibrant hover:bg-hero-dark/50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded p-1 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              title={t("inventory.addCustomCategory")}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-hero-border/40 text-gray-500 hover:border-hero-vibrant hover:text-hero-vibrant"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}