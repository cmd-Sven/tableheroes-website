"use client";

import Image from "next/image";
import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentSlot } from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

/** Nur die 8 D&D-relevanten Ausrüstungs-Slots (interne Keys → Position auf dem Hintergrundbild). */
const EQUIPMENT_UI_SLOTS: {
  key: Dnd5eEquipmentSlot;
  labelKey:
    | "equipment.uiHead"
    | "equipment.uiNeck"
    | "equipment.uiTorso"
    | "equipment.uiHandLeft"
    | "equipment.uiRingLeft"
    | "equipment.uiHandRight"
    | "equipment.uiRingRight"
    | "equipment.uiFeet";
  top: string;
  left: string;
  width: string;
}[] = [
  { key: "head", labelKey: "equipment.uiHead", top: "4%", left: "50%", width: "42%" },
  { key: "neck", labelKey: "equipment.uiNeck", top: "14%", left: "50%", width: "42%" },
  { key: "chest", labelKey: "equipment.uiTorso", top: "26%", left: "50%", width: "44%" },
  { key: "mainHand", labelKey: "equipment.uiHandRight", top: "38%", left: "8%", width: "38%" },
  { key: "ring2", labelKey: "equipment.uiRingRight", top: "48%", left: "8%", width: "38%" },
  { key: "offHand", labelKey: "equipment.uiHandLeft", top: "38%", left: "92%", width: "38%" },
  { key: "ring1", labelKey: "equipment.uiRingLeft", top: "48%", left: "92%", width: "38%" },
  { key: "feet", labelKey: "equipment.uiFeet", top: "78%", left: "50%", width: "44%" },
];

const BG_SRC = "/images/characters/equipment-silhouette-bg.png";

type Props = {
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  itemNames: Record<string, string>;
  selectableItems: CharacterItem[];
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
  readOnly,
  onEquip,
}: Props) {
  const { t } = useCharacterSheetLocale();

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
            >
              <label className="mb-0.5 block font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {t(labelKey)}
              </label>
              {readOnly ? (
                <p className="truncate rounded border border-hero-border/60 bg-background-card/90 px-2 py-1 font-libre text-[10px] text-gray-200 backdrop-blur-sm">
                  {currentId ? itemNames[currentId] ?? "—" : "—"}
                </p>
              ) : (
                <select
                  value={currentId}
                  onChange={(e) => onEquip(key, e.target.value || null)}
                  className="w-full rounded border border-hero-border/80 bg-background-card/95 px-2 py-1 font-libre text-[10px] text-white shadow-md backdrop-blur-sm focus:border-hero-vibrant outline-none"
                  title={currentId ? itemNames[currentId] : t("equipment.nothingEquipped")}
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
