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
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { EquippedSlotTile } from "./EquippedSlotTile";

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
              <EquippedSlotTile
                item={item}
                readOnly={readOnly}
                disabled={disabled}
                isDragOver={isDragOver}
                isInvalid={isInvalid}
                emptyLabel="+"
                title={
                  disabled
                    ? t("equipment.beltRequiresWaist")
                    : isInvalid
                      ? t("equipment.beltForbidden")
                      : itemId
                        ? `${itemNames[itemId]} · ${t("equipment.beltPrepared")}`
                        : t("equipment.empty")
                }
                onClick={
                  itemId && !readOnly && !disabled
                    ? () => onEquipmentChange(placeItemOnBelt(equipment, index, null))
                    : undefined
                }
              />
              {itemId ? (
                <span className="min-w-0 flex-1 truncate font-libre text-[9px] text-gray-400">
                  {itemNames[itemId]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
