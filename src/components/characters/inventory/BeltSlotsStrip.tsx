"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [invalidIndex, setInvalidIndex] = useState<number | null>(null);

  function handleDragOver(e: React.DragEvent, index: number) {
    if (readOnly || !beltEquipped) return;
    e.preventDefault();
    const itemId = getDragItemId();
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    const validation = validateItemForBelt(item);
    setDragOverIndex(index);
    setInvalidIndex(validation.valid ? null : index);
    e.dataTransfer.dropEffect = validation.valid ? "move" : "none";
  }

  function handleDragLeave() {
    setDragOverIndex(null);
    setInvalidIndex(null);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    if (readOnly || !beltEquipped) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setDragItemId(null);
    setDragOverIndex(null);
    setInvalidIndex(null);
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    if (!validateItemForBelt(item).valid) {
      toast.error(t("equipment.beltForbidden"));
      return;
    }
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

      <div className={`flex flex-col gap-1.5 ${compact ? "" : "max-w-md"}`}>
        {equipment.belt.map((itemId, index) => {
          const item = itemId ? itemMap.get(itemId) : undefined;
          const magical = item ? resolveCharacterItemStats(item).isMagical : false;
          const disabled = !beltEquipped;
          const isDragOver = dragOverIndex === index;
          const isInvalid = invalidIndex === index;

          return (
            <div
              key={index}
              className="flex items-center gap-1.5"
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span className="w-3 shrink-0 font-barlow text-[8px] uppercase text-gray-600">
                {index + 1}
              </span>
              <div
                className={`flex min-h-7 flex-1 items-center justify-center rounded border px-1.5 text-center transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-hero-border/20 bg-hero-dark/10 opacity-50"
                    : isInvalid
                      ? "border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-950/20"
                      : isDragOver
                        ? "border-hero-vibrant ring-1 ring-hero-vibrant/50"
                        : itemId
                          ? magical
                            ? "border-accent-gold/70 bg-accent-gold/10 shadow-[0_0_6px_rgba(202,185,38,0.25)]"
                            : "border-hero-vibrant/40 bg-hero-vibrant/10"
                          : "border-dashed border-hero-border/30 bg-hero-dark/15"
                }`}
                title={
                  disabled
                    ? t("equipment.beltRequiresWaist")
                    : isInvalid
                      ? t("equipment.beltForbidden")
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
                    className="w-full truncate font-libre text-[9px] text-white hover:text-red-300"
                  >
                    {itemNames[itemId] ?? "·"}
                  </button>
                ) : itemId ? (
                  <span className="w-full truncate font-libre text-[9px] text-white">
                    {itemNames[itemId]}
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
