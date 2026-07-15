"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentSlot } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  DRAG_MIME,
  validateItemForSlot,
} from "@/src/lib/characters/dnd5e/slot-validation";
import { getDragItemId, setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

/** 11 D&D-relevante Ausrüstungs-Slots (interne Keys → Position auf dem Hintergrundbild). */
const EQUIPMENT_UI_SLOTS: {
  key: Dnd5eEquipmentSlot;
  labelKey:
    | "equipment.uiHead"
    | "equipment.uiNeck"
    | "equipment.uiBack1"
    | "equipment.uiTorso"
    | "equipment.uiBack2"
    | "equipment.uiHandLeft"
    | "equipment.uiRingLeft"
    | "equipment.uiHandRight"
    | "equipment.uiRingRight"
    | "equipment.uiWaist"
    | "equipment.uiFeet";
  top: string;
  left: string;
  width: string;
}[] = [
  { key: "head", labelKey: "equipment.uiHead", top: "4%", left: "50%", width: "42%" },
  { key: "neck", labelKey: "equipment.uiNeck", top: "14%", left: "50%", width: "42%" },
  { key: "shoulders", labelKey: "equipment.uiBack1", top: "20%", left: "50%", width: "42%" },
  { key: "chest", labelKey: "equipment.uiTorso", top: "28%", left: "50%", width: "44%" },
  { key: "back", labelKey: "equipment.uiBack2", top: "34%", left: "14%", width: "34%" },
  { key: "mainHand", labelKey: "equipment.uiHandRight", top: "40%", left: "8%", width: "38%" },
  { key: "ring2", labelKey: "equipment.uiRingRight", top: "50%", left: "8%", width: "38%" },
  { key: "offHand", labelKey: "equipment.uiHandLeft", top: "40%", left: "92%", width: "38%" },
  { key: "ring1", labelKey: "equipment.uiRingLeft", top: "50%", left: "92%", width: "38%" },
  { key: "waist", labelKey: "equipment.uiWaist", top: "62%", left: "50%", width: "44%" },
  { key: "feet", labelKey: "equipment.uiFeet", top: "78%", left: "50%", width: "44%" },
];

const BG_SRC = "/images/characters/equipment-silhouette-bg.png";

type Props = {
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  itemNames: Record<string, string>;
  selectableItems: CharacterItem[];
  itemMap: Map<string, CharacterItem>;
  readOnly: boolean;
  onEquip: (slot: Dnd5eEquipmentSlot, itemId: string | null) => void;
};

function itemsForSlot(
  currentId: string | null | undefined,
  selectableItems: CharacterItem[],
): CharacterItem[] {
  if (!currentId) return selectableItems;
  if (selectableItems.some((i) => i.id === currentId)) return selectableItems;
  return selectableItems;
}

export function EquipmentSilhouette({
  slots,
  itemNames,
  selectableItems,
  itemMap,
  readOnly,
  onEquip,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [dragOverSlot, setDragOverSlot] = useState<Dnd5eEquipmentSlot | null>(null);
  const [invalidSlot, setInvalidSlot] = useState<Dnd5eEquipmentSlot | null>(null);

  function handleDragOver(e: React.DragEvent, slot: Dnd5eEquipmentSlot) {
    if (readOnly) return;
    e.preventDefault();
    const itemId = getDragItemId();
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    const validation = validateItemForSlot(item, slot);
    setDragOverSlot(slot);
    setInvalidSlot(validation.valid ? null : slot);
    e.dataTransfer.dropEffect = validation.valid ? "move" : "none";
  }

  function handleDrop(e: React.DragEvent, slot: Dnd5eEquipmentSlot) {
    if (readOnly) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setDragOverSlot(null);
    setInvalidSlot(null);
    setDragItemId(null);
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    const validation = validateItemForSlot(item, slot);
    if (!validation.valid) return;
    onEquip(slot, itemId);
  }

  function handleDragLeave() {
    setDragOverSlot(null);
    setInvalidSlot(null);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-md border border-hero-dark shadow-lg"
      aria-label={t("silhouette.aria")}
    >
      <div className="relative aspect-[3/4] w-full bg-black">
        <Image
          src={BG_SRC}
          alt=""
          fill
          className="object-contain object-center pointer-events-none select-none"
          sizes="(max-width: 360px) 100vw, 360px"
          priority
        />

        {EQUIPMENT_UI_SLOTS.map(({ key, labelKey, top, left, width }) => {
          const currentId = slots[key] ?? "";
          const anchorRight = left === "92%";
          const anchorCenter = left === "50%";
          const isDragOver = dragOverSlot === key;
          const isInvalid = invalidSlot === key;

          return (
            <div
              key={key}
              className="absolute z-10"
              style={{
                top,
                left,
                width,
                transform: anchorCenter
                  ? "translateX(-50%)"
                  : anchorRight
                    ? "translateX(-100%)"
                    : undefined,
              }}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, key)}
            >
              <label className="mb-0.5 flex items-center gap-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {t(labelKey)}
                {isInvalid ? (
                  <span title={t("inventory.equipConflict")} className="text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                ) : null}
              </label>
              {readOnly ? (
                <p className="truncate rounded border border-hero-border/60 bg-background-card/90 px-2 py-1 font-libre text-[10px] text-gray-200 backdrop-blur-sm">
                  {currentId ? itemNames[currentId] ?? "—" : "—"}
                </p>
              ) : (
                <select
                  value={currentId}
                  onChange={(e) => onEquip(key, e.target.value || null)}
                  className={`w-full rounded border bg-background-card/95 px-2 py-1 font-libre text-[10px] text-white shadow-md backdrop-blur-sm focus:border-hero-vibrant outline-none transition-colors ${
                    isDragOver && isInvalid
                      ? "border-yellow-500 ring-1 ring-yellow-500/50"
                      : isDragOver
                        ? "border-hero-vibrant ring-1 ring-hero-vibrant/50"
                        : "border-hero-border/80"
                  }`}
                  title={
                    isInvalid
                      ? t("inventory.equipConflict")
                      : currentId
                        ? itemNames[currentId]
                        : t("equipment.nothingEquipped")
                  }
                >
                  <option value="">{t("equipment.nothingEquipped")}</option>
                  {itemsForSlot(currentId || null, selectableItems).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
