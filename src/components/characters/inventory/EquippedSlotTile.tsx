"use client";

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
  item: CharacterItem | null | undefined;
  customCategories?: InventoryCustomCategory[];
  readOnly: boolean;
  disabled?: boolean;
  isDragOver?: boolean;
  isInvalid?: boolean;
  emptyLabel?: string;
  title?: string;
  onClick?: () => void;
  onDragStartItem?: (itemId: string) => void;
};

/** Gleiche Kachelform/Icon wie Inventar — für Ausrüstungs- und Gürtelplätze. */
export function EquippedSlotTile({
  item,
  customCategories,
  readOnly,
  disabled,
  isDragOver,
  isInvalid,
  emptyLabel = "·",
  title,
  onClick,
  onDragStartItem,
}: Props) {
  const { t } = useCharacterSheetLocale();

  if (!item) {
    return (
      <div
        className={`flex h-11 w-11 items-center justify-center rounded border transition-colors ${
          disabled
            ? "cursor-not-allowed border-hero-border/20 bg-hero-dark/10 opacity-50"
            : isInvalid
              ? "border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-950/20"
              : isDragOver
                ? "border-hero-vibrant ring-1 ring-hero-vibrant/50 bg-hero-vibrant/10"
                : "border-dashed border-hero-border/40 bg-hero-dark/20"
        }`}
        title={title}
      >
        <span className="font-barlow text-[10px] text-gray-600">{emptyLabel}</span>
      </div>
    );
  }

  const stats = resolveCharacterItemStats(item);
  const meta = parseDnd5eMetaFromDescription(item.description);
  const cat = getItemDisplayCategory(item, customCategories);
  const Icon = isStandardCategory(cat) ? CATEGORY_ICONS[cat] : CATEGORY_ICONS.unknown;
  const colorClass = isStandardCategory(cat) ? CATEGORY_COLORS[cat] : CATEGORY_COLORS.unknown;
  const isMagical = stats.isMagical || Boolean(meta?.isMagical);

  function handleDragStart(e: React.DragEvent) {
    if (readOnly || disabled) {
      e.preventDefault();
      return;
    }
    setDragItemId(item!.id);
    onDragStartItem?.(item!.id);
    e.dataTransfer.setData(DRAG_MIME, item!.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragItemId(null);
  }

  return (
    <div className="group relative flex h-11 w-11 items-center justify-center">
      <button
        type="button"
        draggable={!readOnly && !disabled}
        disabled={disabled}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        title={
          title ??
          `${item.name}\n${stats.weightLb} lb${isMagical ? ` · ${t("inventory.magical")}` : ""}`
        }
        className={`relative flex h-10 w-10 flex-col items-center justify-center rounded border transition-transform hover:scale-[1.06] ${colorClass} ${
          isInvalid
            ? "ring-2 ring-yellow-500/80"
            : isDragOver
              ? "ring-2 ring-hero-vibrant/80"
              : isMagical
                ? "ring-1 ring-accent-gold/80 shadow-[0_0_6px_rgba(202,185,38,0.3)]"
                : ""
        } ${readOnly || disabled ? "cursor-default" : "cursor-pointer active:cursor-grabbing"}`}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-95" />
      </button>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 group-hover:block">
        <div className="max-w-[10rem] whitespace-normal rounded border border-hero-border bg-background-card px-2 py-1 shadow-lg">
          <p className="font-libre text-xs text-white">{item.name}</p>
        </div>
      </div>
    </div>
  );
}
