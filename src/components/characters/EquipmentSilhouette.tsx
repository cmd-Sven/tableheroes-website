"use client";

import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentSlot } from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type SlotLayout = {
  key: Dnd5eEquipmentSlot;
  /** Ankerpunkt auf der Silhouette */
  ax: number;
  ay: number;
  /** Label-Box */
  lx: number;
  ly: number;
  align: "left" | "right";
};

/** Layout wie Referenz: Labels um die Figur, Linien zum Körper (viewBox 0 0 420 520) */
const SLOT_LAYOUT: SlotLayout[] = [
  { key: "head", ax: 210, ay: 52, lx: 24, ly: 28, align: "left" },
  { key: "eyes", ax: 210, ay: 72, lx: 24, ly: 58, align: "left" },
  { key: "neck", ax: 210, ay: 92, lx: 24, ly: 88, align: "left" },
  { key: "shoulders", ax: 248, ay: 118, lx: 268, ly: 98, align: "right" },
  { key: "back", ax: 172, ay: 130, lx: 268, ly: 128, align: "right" },
  { key: "chest", ax: 210, ay: 155, lx: 24, ly: 138, align: "left" },
  { key: "waist", ax: 210, ay: 210, lx: 24, ly: 188, align: "left" },
  { key: "wrists", ax: 72, ay: 195, lx: 24, ly: 228, align: "left" },
  { key: "hands", ax: 348, ay: 195, lx: 268, ly: 168, align: "right" },
  { key: "mainHand", ax: 58, ay: 248, lx: 24, ly: 268, align: "left" },
  { key: "offHand", ax: 362, ay: 248, lx: 268, ly: 248, align: "right" },
  { key: "ring1", ax: 330, ay: 285, lx: 268, ly: 288, align: "right" },
  { key: "ring2", ax: 90, ay: 285, lx: 24, ly: 308, align: "left" },
  { key: "legs", ax: 210, ay: 340, lx: 24, ly: 348, align: "left" },
  { key: "feet", ax: 210, ay: 430, lx: 268, ly: 408, align: "right" },
];

type Props = {
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  itemNames: Record<string, string>;
  selectableItems: CharacterItem[];
  readOnly: boolean;
  onEquip: (slot: Dnd5eEquipmentSlot, itemId: string | null) => void;
};

function itemsForSlot(
  slot: Dnd5eEquipmentSlot,
  currentId: string | null | undefined,
  selectableItems: CharacterItem[],
): CharacterItem[] {
  const base = [...selectableItems];
  if (currentId && !base.some((i) => i.id === currentId)) {
    const cur = selectableItems.find((i) => i.id === currentId);
    if (cur) base.unshift(cur);
  }
  return base;
}

export function EquipmentSilhouette({
  slots,
  itemNames,
  selectableItems,
  readOnly,
  onEquip,
}: Props) {
  const { t, equipmentSlotLabel } = useCharacterSheetLocale();

  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <svg
        viewBox="0 0 420 520"
        className="w-full h-auto"
        aria-label={t("silhouette.aria")}
      >
        {/* Pergament-Hintergrund */}
        <rect
          x="8"
          y="8"
          width="404"
          height="504"
          rx="6"
          className="fill-[#2a2418]/40 stroke-hero-border/40"
          strokeWidth="1"
        />

        {/* Anatomische Silhouette (Umriss) */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400/90"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Kopf */}
          <ellipse cx="210" cy="48" rx="26" ry="30" />
          {/* Hals */}
          <path d="M 198 76 L 198 92 M 222 76 L 222 92" />
          {/* Torso */}
          <path d="M 168 98 Q 210 108 252 98 L 268 155 Q 275 210 260 280 L 248 360 Q 210 368 172 360 L 160 280 Q 145 210 152 155 Z" />
          {/* Arme */}
          <path d="M 168 108 Q 118 120 78 175 L 58 248 Q 52 268 68 278" />
          <path d="M 252 108 Q 302 120 342 175 L 362 248 Q 368 268 352 278" />
          {/* Beine */}
          <path d="M 188 360 L 178 430 L 168 468" />
          <path d="M 232 360 L 242 430 L 252 468" />
        </g>

        {SLOT_LAYOUT.map(({ key, ax, ay, lx, ly, align }) => {
          const itemId = slots[key] ?? null;
          const filled = Boolean(itemId);
          const label = equipmentSlotLabel(key);
          const boxW = align === "left" ? 118 : 118;
          const boxH = 36;
          const boxX = align === "left" ? lx : lx - boxW;
          const lineEndX = align === "left" ? boxX + boxW : boxX;

          return (
            <g key={key}>
              <line
                x1={lineEndX}
                y1={ly + boxH / 2}
                x2={ax}
                y2={ay}
                className="stroke-hero-border/70"
                strokeWidth="1"
              />
              <rect
                x={boxX}
                y={ly}
                width={boxW}
                height={boxH}
                rx="3"
                className={`fill-background-card stroke-[1.5] ${
                  filled ? "stroke-accent-gold/70" : "stroke-hero-border/80"
                }`}
              />
              <text
                x={boxX + 6}
                y={ly + 12}
                className="fill-accent-gold font-barlow text-[8px] font-bold uppercase"
                style={{ fontSize: 8 }}
              >
                {label}
              </text>
              <text
                x={boxX + 6}
                y={ly + 26}
                className={`font-libre text-[7px] ${filled ? "fill-gray-200" : "fill-gray-500"}`}
                style={{ fontSize: 7 }}
              >
                {itemId ? (itemNames[itemId] ?? "—").slice(0, 16) : "—"}
              </text>
              {filled ? (
                <circle cx={boxX + boxW - 8} cy={ly + 8} r="3" className="fill-accent-gold" />
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Auswahl unter der Silhouette — je Slot eine Zeile */}
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
        {SLOT_LAYOUT.map(({ key }) => {
          const currentId = slots[key] ?? "";
          const options = itemsForSlot(key, currentId || null, selectableItems);
          return (
            <div key={key} className="grid grid-cols-[88px_1fr] items-center gap-2">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-500 truncate">
                {equipmentSlotLabel(key)}
              </span>
              {readOnly ? (
                <span className="font-libre text-xs text-gray-300 truncate">
                  {currentId ? itemNames[currentId] ?? "—" : "—"}
                </span>
              ) : (
                <select
                  value={currentId}
                  onChange={(e) => onEquip(key, e.target.value || null)}
                  className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-xs text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">{t("equipment.nothingEquipped")}</option>
                  {options.map((item) => (
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
