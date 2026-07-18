"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, Plus, Sparkles, Tag, X } from "lucide-react";
import type { InventoryCustomCategory } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  isStandardCategory,
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

function resolveActiveLabel(
  activeCategory: string | null,
  customCategories: InventoryCustomCategory[],
  t: (key: Parameters<ReturnType<typeof useCharacterSheetLocale>["t"]>[0]) => string,
): string {
  if (activeCategory === null) return t("inventory.allCategories");
  if (activeCategory === MAGICAL_FILTER_ID) return t("inventory.cat.magical");
  if (isStandardCategory(activeCategory)) {
    return t(`inventory.cat.${activeCategory}` as Parameters<typeof t>[0]);
  }
  return customCategories.find((c) => c.id === activeCategory)?.label ?? activeCategory;
}

function resolveActiveIcon(activeCategory: string | null) {
  if (activeCategory === null) return Filter;
  if (activeCategory === MAGICAL_FILTER_ID) return Sparkles;
  if (isStandardCategory(activeCategory)) return CATEGORY_ICONS[activeCategory];
  return Tag;
}

export function InventoryCategoryBar({
  activeCategory,
  customCategories,
  readOnly,
  onSelect,
  onAddCustomCategory,
  onAssignUnknown,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const ActiveIcon = resolveActiveIcon(activeCategory);
  const activeLabel = resolveActiveLabel(activeCategory, customCategories, t);
  const activeColorClass =
    activeCategory && isStandardCategory(activeCategory)
      ? CATEGORY_COLORS[activeCategory]
      : activeCategory === MAGICAL_FILTER_ID
        ? "text-accent-gold"
        : activeCategory && customCategories.some((c) => c.id === activeCategory)
          ? "text-accent-gold"
          : "text-gray-400";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function submitCustom() {
    const label = newLabel.trim();
    if (!label || !onAddCustomCategory) return;
    onAddCustomCategory(label);
    setNewLabel("");
    setShowAdd(false);
  }

  function pickCategory(cat: string | null) {
    onSelect(cat);
    setOpen(false);
  }

  function handleUnknownClick() {
    if (onAssignUnknown) onAssignUnknown();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="flex w-full items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 font-barlow text-[10px] font-bold uppercase transition-colors ${
            activeCategory
              ? "border-hero-vibrant/70 bg-hero-vibrant/10 text-hero-vibrant"
              : "border-hero-border/40 bg-hero-dark/40 text-gray-400 hover:border-hero-border hover:text-gray-200"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border border-hero-border/30 bg-hero-dark/50 ${activeColorClass}`}
          >
            <ActiveIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{activeLabel}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {!readOnly && onAddCustomCategory ? (
          showAdd ? (
            <div className="flex items-center gap-1">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder={t("inventory.customCategoryPlaceholder")}
                className="w-20 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-hero-border/40 text-gray-500 hover:border-hero-vibrant hover:text-hero-vibrant"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-hero-border bg-background-card py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={activeCategory === null}
            onClick={() => pickCategory(null)}
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-hero-dark/50 ${
              activeCategory === null ? "bg-hero-vibrant/10 text-hero-vibrant" : "text-gray-300"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded border border-hero-border/30 bg-hero-dark/50 text-gray-400">
              <Filter className="h-3.5 w-3.5" />
            </span>
            <span className="font-barlow text-[10px] font-bold uppercase">
              {t("inventory.allCategories")}
            </span>
          </button>

          <button
            type="button"
            role="option"
            aria-selected={activeCategory === MAGICAL_FILTER_ID}
            onClick={() =>
              pickCategory(activeCategory === MAGICAL_FILTER_ID ? null : MAGICAL_FILTER_ID)
            }
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-hero-dark/50 ${
              activeCategory === MAGICAL_FILTER_ID
                ? "bg-accent-gold/10 text-accent-gold"
                : "text-gray-300"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="font-barlow text-[10px] font-bold uppercase">
              {t("inventory.cat.magical")}
            </span>
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
                role="option"
                aria-selected={active}
                onClick={() => {
                  if (isUnknown && onAssignUnknown) handleUnknownClick();
                  else pickCategory(active ? null : cat);
                }}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-hero-dark/50 ${
                  active ? "bg-hero-vibrant/10" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded border ${colorClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-300">
                  {t(`inventory.cat.${cat}` as Parameters<typeof t>[0])}
                </span>
              </button>
            );
          })}

          {customCategories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pickCategory(active ? null : cat.id)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-hero-dark/50 ${
                  active ? "bg-accent-gold/10 text-accent-gold" : "text-gray-300"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold">
                  <Tag className="h-3.5 w-3.5" />
                </span>
                <span className="font-barlow text-[10px] font-bold uppercase">{cat.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
