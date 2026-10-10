"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Church, Crown, DoorOpen, GraduationCap, Hammer, Landmark, Undo2, Warehouse } from "lucide-react";
import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
  type HoloSelection,
  type SimSubject,
} from "./aurenfurt-districts";
import { SIM_METERS, type SimProfile } from "./aurenfurt-sim";
import { CityHudChrome } from "./CityHudFrame";

const DISTRICT_ICON: Record<CityDistrictId, LucideIcon> = {
  adelsviertel: Crown,
  tempelbezirk: Church,
  akademieviertel: GraduationCap,
  handwerkerviertel: Hammer,
  suedtor: DoorOpen,
  unterstadt: Warehouse,
  palast: Landmark,
};

type Props = {
  selection: HoloSelection | null;
  subject: SimSubject | null;
  sim: SimProfile;
  scopeLabel: string;
  onSelect: (selection: HoloSelection) => void;
  onLeave: () => void;
};

export function HoloCityRail({ selection, subject, sim, scopeLabel, onSelect, onLeave }: Props) {
  const kpiTitle = scopeLabel;

  return (
    <nav
      className="pointer-events-auto relative z-[81] flex h-full w-11 shrink-0 flex-col overflow-hidden bg-background-dark/95 shadow-2xl backdrop-blur-md"
      aria-label="Aurenfurt steuern"
    >
      <CityHudChrome density="rail" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {AURENFURT_DISTRICTS.map((district) => {
          const Icon = DISTRICT_ICON[district.id];
          const active =
            (selection?.type === "district" && selection.id === district.id) ||
            (selection?.type === "building" && subject?.districtId === district.id) ||
            (selection?.type === "poi" && subject?.districtId === district.id);
          return (
            <RailButton
              key={district.id}
              label={district.name}
              active={active}
              onClick={() => onSelect({ type: "district", id: district.id })}
            >
              <Icon className="h-5 w-5" style={active ? undefined : { color: district.tint }} />
            </RailButton>
          );
        })}
      </div>

      <div className="relative z-10 shrink-0 border-t border-hero-dark/50 py-1" title={kpiTitle}>
        <p className="px-0.5 text-center font-barlow text-[8px] font-bold uppercase leading-none tracking-wide text-cyan-200/80">
          KPI
        </p>
        {SIM_METERS.map((meter) => (
          <div key={meter.key} title={`${meter.label}: ${sim[meter.key]}`} className="flex flex-col items-center py-0.5">
            <span className={`h-0.5 w-4 rounded-full ${meter.tone}`} />
            <span className="font-barlow text-[9px] font-bold tabular-nums text-gray-100">{sim[meter.key]}</span>
          </div>
        ))}
      </div>

      <RailButton label="Zurück zur Lore" active={false} onClick={onLeave}>
        <Undo2 className="h-5 w-5" />
      </RailButton>
    </nav>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`group relative z-10 grid h-11 w-11 shrink-0 place-items-center transition-colors ${
        active
          ? "bg-hero-vibrant/20 text-hero-vibrant"
          : "bg-transparent text-gray-300 hover:bg-emerald-950 hover:text-hero-vibrant"
      }`}
    >
      <span className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
      {children}
    </button>
  );
}
