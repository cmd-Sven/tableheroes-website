"use client";

import type { Dnd5eEquipmentSlot } from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type SlotLayout = {
  key: Dnd5eEquipmentSlot;
  cx: number;
  cy: number;
};

/** Slot-Positionen auf der Silhouette (viewBox 0 0 200 360) */
const SLOT_LAYOUT: SlotLayout[] = [
  { key: "head", cx: 100, cy: 42 },
  { key: "eyes", cx: 100, cy: 58 },
  { key: "neck", cx: 100, cy: 78 },
  { key: "shoulders", cx: 100, cy: 98 },
  { key: "chest", cx: 100, cy: 130 },
  { key: "hands", cx: 38, cy: 145 },
  { key: "mainHand", cx: 28, cy: 175 },
  { key: "offHand", cx: 172, cy: 175 },
  { key: "waist", cx: 100, cy: 175 },
  { key: "back", cx: 158, cy: 120 },
  { key: "legs", cx: 100, cy: 230 },
  { key: "feet", cx: 100, cy: 310 },
];

type Props = {
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  itemNames: Record<string, string>;
  activeSlot: Dnd5eEquipmentSlot | null;
  readOnly: boolean;
  onSelectSlot: (slot: Dnd5eEquipmentSlot) => void;
};

export function EquipmentSilhouette({
  slots,
  itemNames,
  activeSlot,
  readOnly,
  onSelectSlot,
}: Props) {
  const { t, equipmentSlotLabel } = useCharacterSheetLocale();
  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg
        viewBox="0 0 200 360"
        className="w-full h-auto text-hero-border"
        aria-label={t("silhouette.aria")}
      >
        {/* Silhouette */}
        <ellipse cx="100" cy="38" rx="28" ry="32" fill="currentColor" className="text-hero-dark/80" />
        <path
          d="M 72 68 Q 100 82 128 68 L 140 105 Q 155 120 162 145 L 168 200 L 155 205 L 148 280 L 130 340 L 115 340 L 110 280 L 100 200 L 90 280 L 85 340 L 70 340 L 52 280 L 45 205 L 32 200 L 38 145 Q 45 120 60 105 Z"
          fill="currentColor"
          className="text-hero-dark/60"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Arme */}
        <path
          d="M 60 105 Q 35 115 22 150 L 18 190 Q 25 195 32 175 Q 40 140 72 120"
          fill="currentColor"
          className="text-hero-dark/50"
        />
        <path
          d="M 140 105 Q 165 115 178 150 L 182 190 Q 175 195 168 175 Q 160 140 128 120"
          fill="currentColor"
          className="text-hero-dark/50"
        />

        {SLOT_LAYOUT.map(({ key, cx, cy }) => {
          const itemId = slots[key];
          const filled = Boolean(itemId);
          const isActive = activeSlot === key;
          const label = equipmentSlotLabel(key);
          const itemLabel = itemId ? itemNames[itemId] : null;

          return (
            <g key={key}>
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 14 : 12}
                className={`transition-all ${
                  filled
                    ? "fill-accent-gold/30 stroke-accent-gold"
                    : "fill-hero-dark/40 stroke-hero-border"
                } ${isActive ? "stroke-hero-vibrant stroke-[2.5]" : "stroke-[1.5]"} ${
                  readOnly ? "cursor-default" : "cursor-pointer hover:fill-hero-vibrant/20"
                }`}
                onClick={() => !readOnly && onSelectSlot(key)}
                role="button"
                aria-label={`${label}${itemLabel ? `: ${itemLabel}` : ""}`}
              />
              {filled ? (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  className="fill-accent-gold text-[8px] font-bold pointer-events-none"
                  style={{ fontSize: 8 }}
                >
                  ●
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-barlow uppercase text-gray-500">
        {SLOT_LAYOUT.filter((s) => slots[s.key]).map(({ key }) => (
          <div key={key} className="truncate">
            <span className="text-gray-600">{equipmentSlotLabel(key)}:</span>{" "}
            <span className="text-gray-300">{itemNames[slots[key]!] ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
