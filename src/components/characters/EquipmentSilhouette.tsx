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
import { parseDnd5eMetaFromDescription } from "@/src/lib/characters/dnd5e/item-meta";
import { resolveCharacterItemStats } from "@/src/lib/characters/dnd5e/item-resolve";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import type { CharacterSheetT } from "@/src/lib/i18n/character-sheet";

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

function itemsForSlot(
  currentId: string | null | undefined,
  selectableItems: CharacterItem[],
): CharacterItem[] {
  if (!currentId) return selectableItems;
  if (selectableItems.some((i) => i.id === currentId)) return selectableItems;
  return selectableItems;
}

function slotTransform(anchor: "left" | "center" | "right"): string | undefined {
  if (anchor === "center") return "translateX(-50%)";
  if (anchor === "right") return "translateX(-100%)";
  return undefined;
}

function SlotSelect({
  currentId,
  itemNames,
  selectableItems,
  equippedMagical,
  readOnly,
  isDragOver,
  isInvalid,
  onChange,
  t,
}: {
  currentId: string;
  itemNames: Record<string, string>;
  selectableItems: CharacterItem[];
  equippedMagical: boolean;
  readOnly: boolean;
  isDragOver: boolean;
  isInvalid: boolean;
  onChange: (itemId: string | null) => void;
  t: CharacterSheetT;
}) {
  if (readOnly) {
    return (
      <p
        className={`truncate rounded border bg-background-card/90 px-2.5 py-1.5 font-libre text-xs text-gray-200 backdrop-blur-sm ${
          equippedMagical
            ? "border-accent-gold/70 ring-1 ring-accent-gold/60 shadow-[0_0_6px_rgba(202,185,38,0.3)]"
            : "border-hero-border/60"
        }`}
      >
        {currentId ? itemNames[currentId] ?? "—" : "—"}
      </p>
    );
  }

  return (
    <select
      value={currentId}
      onChange={(e) => onChange(e.target.value || null)}
      className={`w-full rounded border bg-background-card/95 px-2.5 py-1.5 font-libre text-xs text-white shadow-md backdrop-blur-sm focus:border-hero-vibrant outline-none transition-colors ${
        equippedMagical
          ? "border-accent-gold/70 ring-1 ring-accent-gold/60 shadow-[0_0_6px_rgba(202,185,38,0.3)]"
          : isDragOver && isInvalid
            ? "border-yellow-500 ring-1 ring-yellow-500/50"
            : isDragOver
              ? "border-hero-vibrant ring-1 ring-hero-vibrant/50"
              : "border-hero-border/80"
      }`}
      title={
        isInvalid
          ? t("inventory.equipConflict")
          : currentId
            ? `${itemNames[currentId]}${equippedMagical ? ` · ${t("inventory.magical")}` : ""}`
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
  );
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

  const generalSelectable = selectableItems.filter((item) => validateItemForGeneralSlot(item).valid);

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
            const equippedMagical = equippedItem
              ? resolveCharacterItemStats(equippedItem).isMagical ||
                Boolean(parseDnd5eMetaFromDescription(equippedItem.description)?.isMagical)
              : false;
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
                <SlotSelect
                  currentId={currentId}
                  itemNames={itemNames}
                  selectableItems={selectableItems}
                  equippedMagical={equippedMagical}
                  readOnly={readOnly}
                  isDragOver={isDragOver}
                  isInvalid={isInvalid}
                  onChange={(itemId) => onEquip(key, itemId)}
                  t={t}
                />
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
              const equippedMagical = equippedItem
                ? resolveCharacterItemStats(equippedItem).isMagical ||
                  Boolean(parseDnd5eMetaFromDescription(equippedItem.description)?.isMagical)
                : false;

              return (
                <div key={key}>
                  <label className="mb-0.5 block font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    {t(GENERAL_SLOT_LABEL_KEYS[key])}
                  </label>
                  <SlotSelect
                    currentId={currentId}
                    itemNames={itemNames}
                    selectableItems={generalSelectable}
                    equippedMagical={equippedMagical}
                    readOnly={readOnly}
                    isDragOver={false}
                    isInvalid={false}
                    onChange={(itemId) => onEquipGeneral(key, itemId)}
                    t={t}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
