"use client";

import { AlertTriangle } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  getItemDisplayCategory,
  isStandardCategory,
} from "@/src/lib/characters/dnd5e/inventory-categories";
import { resolveCharacterItemStats } from "@/src/lib/characters/dnd5e/item-resolve";
import { parseDnd5eMetaFromDescription } from "@/src/lib/characters/dnd5e/item-meta";
import type { InventoryCustomCategory } from "@/src/lib/characters/dnd5e/equipment-types";
import { DRAG_MIME } from "@/src/lib/characters/dnd5e/slot-validation";
import { setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  item: CharacterItem;
  quantity: number;
  customCategories?: InventoryCustomCategory[];
  readOnly: boolean;
  invalidDrag?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

export function InventoryItemTile({
  item,
  quantity,
  customCategories,
  readOnly,
  invalidDrag,
  onClick,
  onContextMenu,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const stats = resolveCharacterItemStats(item);
  const meta = parseDnd5eMetaFromDescription(item.description);
  const cat = getItemDisplayCategory(item, customCategories);
  const Icon = isStandardCategory(cat) ? CATEGORY_ICONS[cat] : CATEGORY_ICONS.unknown;
  const colorClass = isStandardCategory(cat) ? CATEGORY_COLORS[cat] : CATEGORY_COLORS.unknown;

  function handleDragStart(e: React.DragEvent) {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    setDragItemId(item.id);
    e.dataTransfer.setData(DRAG_MIME, item.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragItemId(null);
  }

  return (
    <div className="group relative">
      <button
        type="button"
        draggable={!readOnly}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e);
        }}
        title={`${item.name}\n${stats.weightLb} lb${meta?.rarity ? ` · ${meta.rarity}` : ""}${meta?.valueGp ? ` · ${meta.valueGp} gp` : ""}`}
        className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-md border-2 p-1 transition-transform hover:scale-[1.03] ${colorClass} ${
          readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <Icon className="h-6 w-6 shrink-0 opacity-90" />
        <span className="mt-0.5 max-w-full truncate px-0.5 font-barlow text-[8px] font-bold uppercase leading-tight text-white/90">
          {item.name}
        </span>
        {quantity > 1 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-hero-vibrant bg-background-card px-1 font-barlow text-[10px] font-bold text-hero-vibrant">
            {quantity}
          </span>
        ) : null}
        {invalidDrag ? (
          <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-black">
            <AlertTriangle className="h-3 w-3" />
          </span>
        ) : null}
      </button>

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 group-hover:block">
        <div className="whitespace-nowrap rounded border border-hero-border bg-background-card px-2 py-1 shadow-lg">
          <p className="font-libre text-xs text-white">{item.name}</p>
          <p className="font-libre text-[10px] text-gray-400">
            {t("inventory.tooltipWeight", { weight: stats.weightLb })}
            {quantity > 1 ? ` · ×${quantity}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
