"use client";

import { Box, LayoutDashboard, ScrollText, type LucideIcon } from "lucide-react";

export type CitySurface = "map" | "dashboard" | "verwaltung";

/** Referenzgröße für die Tageskarten in der HUD (kompakt, eine Leiste). */
export const CITY_VIEW_CARD_SIZE = 78;

const SWITCH_SIZE = 52;
const GAP = 6;
const GOLD = "#cab926";
const DARK_GREEN = "#0a1f10";

const OPTIONS: {
  id: CitySurface;
  label: string;
  hint: string;
  Icon: LucideIcon;
  gmOnly?: boolean;
  /** Dashboard ist in Live-Spieleransicht ausgeblendet. */
  dashboard?: boolean;
}[] = [
  { id: "map", label: "Stadtansicht", hint: "3D-Stadtansicht", Icon: Box },
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Stadt-Dashboard",
    Icon: LayoutDashboard,
    dashboard: true,
  },
  {
    id: "verwaltung",
    label: "Verwaltung",
    hint: "Kaiser-Verwaltung (nur SL)",
    Icon: ScrollText,
    gmOnly: true,
  },
];

type Props = {
  mode: CitySurface;
  onChange: (mode: CitySurface) => void;
  /** Zeigt den Tab Verwaltung (SL/Admin). */
  showVerwaltung?: boolean;
  /** Zeigt den Tab Dashboard (Standard: an; Live-Spieler: aus). */
  showDashboard?: boolean;
};

export function CityViewSwitch({
  mode,
  onChange,
  showVerwaltung = false,
  showDashboard = true,
}: Props) {
  const options = OPTIONS.filter((option) => {
    if (option.gmOnly && !showVerwaltung) return false;
    if (option.dashboard && !showDashboard) return false;
    return true;
  });

  return (
    <div
      role="tablist"
      aria-label="Darstellung der Stadt"
      className="pointer-events-auto flex items-end"
      style={{ gap: GAP }}
    >
      {options.map(({ id, label, hint, Icon }) => {
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
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2.1} style={{ color: GOLD }} aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
