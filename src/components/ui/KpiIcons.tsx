"use client";

import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Coins,
  HardHat,
  Moon,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  Thermometer,
  Users,
} from "lucide-react";
import type { SimMeterKey, SimProfile } from "@/src/components/city/aurenfurt/aurenfurt-sim";
import { SIM_METERS } from "@/src/components/city/aurenfurt/aurenfurt-sim";
import type { DayWeather, WeatherKind } from "@/src/components/city/aurenfurt/aurenfurt-weather";

/** KPI-Farben (Stroke-Werte aus aurenfurt-sim). */
export const KPI_COLORS: Record<SimMeterKey, string> = {
  crime: "#ef4444",
  vattrak: "#379806",
  malanthir: "#a78bfa",
  guard: "#38bdf8",
  refugees: "#f59e0b",
  economy: "#cab926",
  unemployment: "#d4a574",
};

const KPI_ICONS: Record<SimMeterKey, LucideIcon> = {
  crime: ShieldAlert,
  vattrak: Sparkles,
  malanthir: Moon,
  guard: Shield,
  refugees: Users,
  economy: Coins,
  unemployment: HardHat,
};

/** Kurze Bedeutung je Meter — Tooltip darf die Zahl zeigen. */
const KPI_MEANING: Partial<Record<SimMeterKey, string>> = {
  unemployment:
    "Anteil ohne freie Arbeit. Die Stadt weist Müßige zu Reparaturen, Verwaltung, Instandhaltung und Wache zu — in der Stadt und an der Front.",
};

const WEATHER_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
  frost: Thermometer,
  heat: Sun,
};

export function qualitativeLevel(value: number): string {
  if (value >= 75) return "sehr hoch";
  if (value >= 55) return "hoch";
  if (value >= 40) return "mittel";
  if (value >= 25) return "niedrig";
  return "sehr niedrig";
}

type KpiIconProps = {
  icon: LucideIcon;
  color: string;
  /** Kurzer Name der Kennzahl */
  label: string;
  /** Beschreibung in Worten (darf die Zahl enthalten) */
  tooltip: string;
  className?: string;
};

/**
 * Einzelnes KPI-Icon mit Hover-Tooltip (nur opacity/transform).
 * Global wiederverwendbar für andere Screens.
 */
export function KpiIcon({ icon: Icon, color, label, tooltip, className = "" }: KpiIconProps) {
  return (
    <span
      className={`group relative inline-flex items-center justify-center ${className}`}
      style={{ color }}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded border border-hero-border/40 bg-background-dark/95 px-2 py-1 font-libre text-[11px] leading-snug text-gray-200 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
      >
        <span className="font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <span className="mt-0.5 block">{tooltip}</span>
      </span>
    </span>
  );
}

export type SimKpiBarProps = {
  sim: SimProfile;
  weather?: DayWeather | null;
  /** Zusatzhinweis im Tooltip (z. B. „Kennzahlen des Viertels“) */
  scopeHint?: string;
  className?: string;
};

/** Kompakte Icon-Leiste der Aurenfurt-Sim-Kennzahlen. */
export function SimKpiBar({ sim, weather = null, scopeHint, className = "" }: SimKpiBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 ${className}`}
      role="group"
      aria-label={scopeHint ?? "Kennzahlen"}
    >
      {SIM_METERS.map((meter) => {
        const value = sim[meter.key];
        const level = qualitativeLevel(value);
        const meaning = KPI_MEANING[meter.key];
        const parts = [`${level} (${value})`];
        if (meaning) parts.push(meaning);
        if (scopeHint) parts.push(scopeHint);
        return (
          <KpiIcon
            key={meter.key}
            icon={KPI_ICONS[meter.key]}
            color={KPI_COLORS[meter.key]}
            label={meter.label}
            tooltip={parts.join(" · ")}
          />
        );
      })}
      {weather ? (
        <KpiIcon
          icon={WEATHER_ICONS[weather.kind]}
          color="#67e8f9"
          label="Wetter"
          tooltip={`${weather.label}${weather.source === "live" ? " · live" : ""} · ${weather.tempC} °C`}
        />
      ) : null}
    </div>
  );
}
