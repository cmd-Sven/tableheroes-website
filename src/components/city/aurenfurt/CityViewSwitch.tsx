"use client";

import { Box, LayoutDashboard, type LucideIcon } from "lucide-react";

export type CitySurface = "map" | "dashboard";

/** Referenzgröße für die Tageskarten in der HUD. */
export const CITY_VIEW_CARD_SIZE = 112;

const SWITCH_SIZE = 72;
const GAP = 8;
const GOLD = "#cab926";
const DARK_GREEN = "#0a1f10";

const OPTIONS: {
  id: CitySurface;
  label: string;
  hint: string;
  Icon: LucideIcon;
}[] = [
  { id: "map", label: "Stadtansicht", hint: "3D-Stadtansicht", Icon: Box },
  { id: "dashboard", label: "Dashboard", hint: "Stadt-Dashboard", Icon: LayoutDashboard },
];

type Props = {
  mode: CitySurface;
  onChange: (mode: CitySurface) => void;
};

export function CityViewSwitch({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Darstellung der Stadt"
      className="pointer-events-auto flex items-end"
      style={{ gap: GAP }}
    >
      {OPTIONS.map(({ id, label, hint, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={hint}
            title={hint}
            onClick={() => onChange(id)}
            className={`grid shrink-0 place-items-center rounded-[10px] transition-opacity ${
              active ? "opacity-100" : "opacity-80 hover:opacity-100"
            }`}
            style={{
              width: SWITCH_SIZE,
              height: SWITCH_SIZE,
              backgroundColor: DARK_GREEN,
              border: active ? `2px solid ${GOLD}` : "1px solid rgba(202,185,38,0.35)",
              boxSizing: "border-box",
              color: GOLD,
            }}
          >
            <Icon className="h-7 w-7 shrink-0" strokeWidth={2.1} style={{ color: GOLD }} aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
