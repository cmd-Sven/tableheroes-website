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

/** Körper-Slots — Paper-Doll ohne Rücken-Slot, ausgewogen um die Silhouette */
const EQUIPMENT_UI_SLOTS: {
  key: Dnd5eEquipmentSlot;
  labelKey:
    | "equipment.uiHead"
    | "equipment.uiNeck"
    | "equipment.uiShoulders"
    | "equipment.uiTorso"
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
  // Mitte: Kopf → Hals → Umhang → Torso → Gürtel → Füße (gleichmäßiger Abstand)
  { key: "head", labelKey: "equipment.uiHead", top: "2%", left: "50%", width: "42%", anchor: "center" },
  { key: "neck", labelKey: "equipment.uiNeck", top: "12%", left: "50%", width: "42%", anchor: "center" },
  { key: "shoulders", labelKey: "equipment.uiShoulders", top: "22%", left: "50%", width: "42%", anchor: "center" },
  { key: "chest", labelKey: "equipment.uiTorso", top: "33%", left: "50%", width: "44%", anchor: "center" },
  // Seiten: Hände auf Torso-Höhe, Ringe darunter — freier Raum durch weggefallenen Rücken-Slot
  { key: "mainHand", labelKey: "equipment.uiHandRight", top: "30%", left: "0%", width: "36%", anchor: "left" },
  { key: "offHand", labelKey: "equipment.uiHandLeft", top: "30%", left: "100%", width: "36%", anchor: "right" },
  { key: "ring2", labelKey: "equipment.uiRingRight", top: "44%", left: "0%", width: "36%", anchor: "left" },
  { key: "ring1", labelKey: "equipment.uiRingLeft", top: "44%", left: "100%", width: "36%", anchor: "right" },
  { key: "waist", labelKey: "equipment.uiWaist", top: "56%", left: "50%", width: "44%", anchor: "center" },
  { key: "feet", labelKey: "equipment.uiFeet", top: "70%", left: "50%", width: "44%", anchor: "center" },
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
  itemMap: Map<string, CharacterItem>;
  readOnly: boolean;
  onEquip: (slot: Dnd5eEquipmentSlot, itemId: string | null) => void;
  onEquipGeneral?: (slot: Dnd5eGeneralEquipmentSlot, itemId: string | null) => void;
  /** Klick auf belegten Slot → ablegen (zurück in offenen Rucksack) */
  onUnequip?: (slot: Dnd5eEquipmentSlot) => void;
  onUnequipGeneral?: (slot: Dnd5eGeneralEquipmentSlot) => void;
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
  itemMap,
  readOnly,
  onEquip,
  onEquipGeneral,
  onUnequip,
  onUnequipGeneral,
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
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <Image
              src={BG_SRC}
              alt=""
              fill
              className="object-cover object-center select-none opacity-40"
              sizes="(max-width: 560px) 100vw, 560px"
              priority
            />
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
                          ? `${itemNames[equippedItem.id]}\n${t("equipment.dragHint")}`
                          : t("equipment.dropToEquip")
                    }
                    onClick={
                      !readOnly && equippedItem
                        ? () => (onUnequip ? onUnequip(key) : onEquip(key, null))
                        : undefined
                    }
                  />
                  {equippedItem ? (
                    <p className="min-w-0 flex-1 truncate font-libre text-[10px] text-gray-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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
                      title={
                        equippedItem
                          ? `${itemNames[equippedItem.id]}\n${t("equipment.dragHint")}`
                          : t("equipment.dropToEquip")
                      }
                      onClick={
                        !readOnly && equippedItem
                          ? () =>
                              onUnequipGeneral
                                ? onUnequipGeneral(key)
                                : onEquipGeneral?.(key, null)
                          : undefined
                      }
                    />
                    {equippedItem ? (
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
      ) : null}
    </div>
  );
}
