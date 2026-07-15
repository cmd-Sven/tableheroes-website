"use client";

import { AlertTriangle } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import { MAX_BELT_SLOTS } from "@/src/lib/characters/dnd5e/equipment-types";
import { placeItemOnBelt } from "@/src/lib/characters/dnd5e/equipment";
import {
  DRAG_MIME,
  hasWaistBeltEquipped,
  validateItemForBelt,
} from "@/src/lib/characters/dnd5e/slot-validation";
import { getDragItemId, setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
import { resolveCharacterItemStats } from "@/src/lib/characters/dnd5e/item-resolve";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  equipment: Dnd5eEquipmentState;
  itemNames: Record<string, string>;
  itemMap: Map<string, CharacterItem>;
  readOnly: boolean;
  onEquipmentChange: (equipment: Dnd5eEquipmentState) => void;
  compact?: boolean;
};

export function BeltSlotsStrip({
  equipment,
  itemNames,
  itemMap,
  readOnly,
  onEquipmentChange,
  compact = true,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const beltEquipped = hasWaistBeltEquipped(equipment.slots);

  function handleDragOver(e: React.DragEvent, index: number) {
    if (readOnly || !beltEquipped) return;
    e.preventDefault();
    const itemId = getDragItemId();
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    validateItemForBelt(item);
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, index: number) {
    if (readOnly || !beltEquipped) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setDragItemId(null);
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    onEquipmentChange(placeItemOnBelt(equipment, index, itemId));
  }

  return (
    <div className={compact ? "mt-3 border-t border-hero-dark/80 pt-3" : "space-y-2"}>
      <div className="flex items-center justify-between gap-1">
        <p className="font-barlow text-[9px] font-bold uppercase text-gray-500">
          {t("equipment.beltQuickAccess", { max: MAX_BELT_SLOTS })}
        </p>
        {!beltEquipped ? (
          <span
            title={t("equipment.beltRequiresWaist")}
            className="flex items-center gap-0.5 text-amber-500"
          >
            <AlertTriangle className="h-3 w-3" />
          </span>
        ) : null}
      </div>

      {!beltEquipped ? (
        <p className="font-libre text-[9px] text-amber-500/90 leading-snug">
          {t("equipment.beltRequiresWaist")}
        </p>
      ) : (
        <p className="font-libre text-[8px] text-gray-600 leading-snug">
          {t("equipment.beltPreparedHint")}
        </p>
      )}

      <div className={`grid gap-1 ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6"}`}>
        {equipment.belt.map((itemId, index) => {
          const item = itemId ? itemMap.get(itemId) : undefined;
          const magical = item ? resolveCharacterItemStats(item).isMagical : false;
          const disabled = !beltEquipped;

          return (
            <div
              key={index}
              className="space-y-0.5"
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span className="font-barlow text-[8px] uppercase text-gray-600">
                {index + 1}
              </span>
              <div
                className={`flex h-7 min-h-7 items-center justify-center rounded border px-0.5 text-center transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-hero-border/20 bg-hero-dark/10 opacity-50"
                    : itemId
                      ? magical
                        ? "border-accent-gold/70 bg-accent-gold/10 shadow-[0_0_6px_rgba(202,185,38,0.25)]"
                        : "border-hero-vibrant/40 bg-hero-vibrant/10"
                      : "border-dashed border-hero-border/30 bg-hero-dark/15"
                }`}
                title={
                  disabled
                    ? t("equipment.beltRequiresWaist")
                    : itemId
                      ? `${itemNames[itemId]} · ${t("equipment.beltPrepared")}`
                      : t("equipment.empty")
                }
              >
                {itemId && !readOnly ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEquipmentChange(placeItemOnBelt(equipment, index, null))}
                    className="max-w-full truncate font-libre text-[8px] text-white hover:text-red-300"
                  >
                    {itemNames[itemId]?.slice(0, 6) ?? "·"}
                  </button>
                ) : itemId ? (
                  <span className="truncate font-libre text-[8px] text-white">
                    {itemNames[itemId]?.slice(0, 6)}
                  </span>
                ) : (
                  <span className="text-gray-600">·</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
