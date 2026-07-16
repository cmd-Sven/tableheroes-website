"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type {
  Dnd5eEquipmentSlot,
  Dnd5eGeneralEquipmentSlot,
} from "@/src/lib/characters/dnd5e/equipment-types";
import { DND5E_GENERAL_EQUIPMENT_SLOTS } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  DRAG_MIME,
  validateItemForGeneralSlot,
  validateItemForSlot,
} from "@/src/lib/characters/dnd5e/slot-validation";
import { getDragItemId, setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { EquippedSlotTile } from "@/src/components/characters/inventory/EquippedSlotTile";

/** Körper-Slots — Positionen ohne Überlappung um die Silhouette */
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
  anchor: "left" | "center" | "right";
}[] = [
  { key: "head", labelKey: "equipment.uiHead", top: "1%", left: "50%", width: "46%", anchor: "center" },
  { key: "neck", labelKey: "equipment.uiNeck", top: "9%", left: "50%", width: "46%", anchor: "center" },
  { key: "shoulders", labelKey: "equipment.uiBack1", top: "16%", left: "50%", width: "46%", anchor: "center" },
  { key: "chest", labelKey: "equipment.uiTorso", top: "24%", left: "50%", width: "48%", anchor: "center" },
  { key: "back", labelKey: "equipment.uiBack2", top: "32%", left: "92%", width: "38%", anchor: "right" },
  { key: "mainHand", labelKey: "equipment.uiHandRight", top: "36%", left: "-4%", width: "38%", anchor: "left" },
  { key: "ring2", labelKey: "equipment.uiRingRight", top: "48%", left: "-4%", width: "38%", anchor: "left" },
  { key: "offHand", labelKey: "equipment.uiHandLeft", top: "36%", left: "104%", width: "38%", anchor: "right" },
  { key: "ring1", labelKey: "equipment.uiRingLeft", top: "48%", left: "104%", width: "38%", anchor: "right" },
  { key: "waist", labelKey: "equipment.uiWaist", top: "57%", left: "50%", width: "48%", anchor: "center" },
  { key: "feet", labelKey: "equipment.uiFeet", top: "73%", left: "50%", width: "48%", anchor: "center" },
];

const GENERAL_SLOT_LABEL_KEYS: Record<
  Dnd5eGeneralEquipmentSlot,
  "equipment.uiClothing" | "equipment.uiAccessories" | "equipment.uiMisc"
> = {
  clothing: "equipment.uiClothing",
  accessories: "equipment.uiAccessories",
  misc: "equipment.uiMisc",
};

const BG_SRC = "/images/characters/equipment-silhouette-bg.png";

type Props = {
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  generalSlots?: Partial<Record<Dnd5eGeneralEquipmentSlot, string | null>>;
  itemNames: Record<string, string>;
  selectableItems: CharacterItem[];
  itemMap: Map<string, CharacterItem>;
  readOnly: boolean;
  onEquip: (slot: Dnd5eEquipmentSlot, itemId: string | null) => void;
  onEquipGeneral?: (slot: Dnd5eGeneralEquipmentSlot, itemId: string | null) => void;
};

function slotTransform(anchor: "left" | "center" | "right"): string | undefined {
  if (anchor === "center") return "translateX(-50%)";
  if (anchor === "right") return "translateX(-100%)";
  return undefined;
}

export function EquipmentSilhouette({
  slots,
  generalSlots = {},
  itemNames,
  selectableItems,
  itemMap,
  readOnly,
  onEquip,
  onEquipGeneral,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [dragOverSlot, setDragOverSlot] = useState<Dnd5eEquipmentSlot | null>(null);
  const [invalidSlot, setInvalidSlot] = useState<Dnd5eEquipmentSlot | null>(null);
  const [dragOverGeneral, setDragOverGeneral] = useState<Dnd5eGeneralEquipmentSlot | null>(null);
  const [invalidGeneral, setInvalidGeneral] = useState<Dnd5eGeneralEquipmentSlot | null>(null);

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
    if (!validateItemForSlot(item, slot).valid) return;
    onEquip(slot, itemId);
  }

  function handleDragLeave() {
    setDragOverSlot(null);
    setInvalidSlot(null);
  }

  function handleGeneralDragOver(e: React.DragEvent, slot: Dnd5eGeneralEquipmentSlot) {
    if (readOnly || !onEquipGeneral) return;
    e.preventDefault();
    const itemId = getDragItemId();
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    const validation = validateItemForGeneralSlot(item);
    setDragOverGeneral(slot);
    setInvalidGeneral(validation.valid ? null : slot);
    e.dataTransfer.dropEffect = validation.valid ? "move" : "none";
  }

  function handleGeneralDrop(e: React.DragEvent, slot: Dnd5eGeneralEquipmentSlot) {
    if (readOnly || !onEquipGeneral) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setDragOverGeneral(null);
    setInvalidGeneral(null);
    setDragItemId(null);
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    if (!validateItemForGeneralSlot(item).valid) return;
    onEquipGeneral(slot, itemId);
  }

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto w-full max-w-[560px] overflow-visible rounded-md border border-hero-dark shadow-lg px-6 sm:px-10"
        aria-label={t("silhouette.aria")}
      >
        <div className="relative aspect-[2/3] w-full min-h-[480px] overflow-visible bg-black/70">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
            <div className="absolute -inset-[18%] opacity-40">
              <Image
                src={BG_SRC}
                alt=""
                fill
                className="object-contain object-center select-none"
                sizes="(max-width: 560px) 100vw, 560px"
                priority
              />
            </div>
          </div>

          {EQUIPMENT_UI_SLOTS.map(({ key, labelKey, top, left, width, anchor }) => {
            const currentId = slots[key] ?? "";
            const equippedItem = currentId ? itemMap.get(currentId) : undefined;
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
                  transform: slotTransform(anchor),
                }}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
              >
                <label className="mb-1 flex items-center gap-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {t(labelKey)}
                  {isInvalid ? (
                    <span title={t("inventory.equipConflict")} className="text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                  ) : null}
                </label>
                <div className="flex items-start gap-1.5">
                  <EquippedSlotTile
                    item={equippedItem}
                    readOnly={readOnly}
                    isDragOver={isDragOver}
                    isInvalid={isInvalid}
                    emptyLabel="+"
                    title={
                      isInvalid
                        ? t("inventory.equipConflict")
                        : equippedItem
                          ? itemNames[equippedItem.id]
                          : t("equipment.nothingEquipped")
                    }
                    onClick={
                      !readOnly && equippedItem
                        ? () => onEquip(key, null)
                        : undefined
                    }
                  />
                  {!readOnly ? (
                    <select
                      value={currentId}
                      onChange={(e) => onEquip(key, e.target.value || null)}
                      className="min-w-0 flex-1 rounded border border-hero-border/50 bg-background-card/90 px-1.5 py-1 font-libre text-[10px] text-white outline-none focus:border-hero-vibrant"
                      title={t("equipment.nothingEquipped")}
                      aria-label={t(labelKey)}
                    >
                      <option value="">{t("equipment.nothingEquipped")}</option>
                      {selectableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  ) : equippedItem ? (
                    <p className="min-w-0 flex-1 truncate font-libre text-[10px] text-gray-300">
                      {itemNames[equippedItem.id]}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onEquipGeneral ? (
        <div className="rounded-md border border-hero-dark/60 bg-hero-dark/10 p-3 space-y-2">
          <h4 className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
            {t("equipment.generalSlotsTitle")}
          </h4>
          <div className="grid gap-2 sm:grid-cols-3">
            {DND5E_GENERAL_EQUIPMENT_SLOTS.map((key) => {
              const currentId = generalSlots[key] ?? "";
              const equippedItem = currentId ? itemMap.get(currentId) : undefined;
              const isDragOver = dragOverGeneral === key;
              const isInvalid = invalidGeneral === key;
              const generalSelectable = selectableItems.filter(
                (item) => validateItemForGeneralSlot(item).valid,
              );

              return (
                <div
                  key={key}
                  onDragOver={(e) => handleGeneralDragOver(e, key)}
                  onDragLeave={() => {
                    setDragOverGeneral(null);
                    setInvalidGeneral(null);
                  }}
                  onDrop={(e) => handleGeneralDrop(e, key)}
                >
                  <label className="mb-0.5 block font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    {t(GENERAL_SLOT_LABEL_KEYS[key])}
                  </label>
                  <div className="flex items-start gap-1.5">
                    <EquippedSlotTile
                      item={equippedItem}
                      readOnly={readOnly}
                      isDragOver={isDragOver}
                      isInvalid={isInvalid}
                      emptyLabel="+"
                      onClick={
                        !readOnly && equippedItem
                          ? () => onEquipGeneral(key, null)
                          : undefined
                      }
                    />
                    {!readOnly ? (
                      <select
                        value={currentId}
                        onChange={(e) => onEquipGeneral(key, e.target.value || null)}
                        className="min-w-0 flex-1 rounded border border-hero-border/50 bg-background-card/90 px-1.5 py-1 font-libre text-[10px] text-white outline-none focus:border-hero-vibrant"
                      >
                        <option value="">{t("equipment.nothingEquipped")}</option>
                        {generalSelectable.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
