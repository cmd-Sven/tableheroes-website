"use client";

import type { LucideIcon } from "lucide-react";
import {
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Flame,
  HelpCircle,
  Snowflake,
  Sun,
  ThermometerSnowflake,
  ThermometerSun,
  Wind,
} from "lucide-react";
import type { TravelWeatherId } from "@/src/lib/travel-weather-rules";

type IconConfig = {
  Icon: LucideIcon;
  className: string;
};

const WEATHER_ICONS: Record<TravelWeatherId, IconConfig> = {
  clear: { Icon: Sun, className: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]" },
  warm: { Icon: ThermometerSun, className: "text-orange-400" },
  cold: { Icon: Snowflake, className: "text-sky-200" },
  light_fog: { Icon: CloudFog, className: "text-slate-300" },
  heavy_precipitation: { Icon: CloudRain, className: "text-blue-400" },
  strong_wind: { Icon: Wind, className: "text-teal-300" },
  heavy_fog: { Icon: CloudFog, className: "text-slate-400 opacity-90" },
  ice: { Icon: CloudSnow, className: "text-cyan-200" },
  extreme_heat: { Icon: Flame, className: "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" },
  extreme_cold: { Icon: ThermometerSnowflake, className: "text-blue-200" },
  severe_storm: {
    Icon: CloudLightning,
    className: "text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.55)]",
  },
};

type Props = {
  weatherId?: TravelWeatherId | null;
  size?: number;
  className?: string;
  pending?: boolean;
};

export function TravelWeatherIcon({ weatherId, size = 36, className = "", pending }: Props) {
  if (!weatherId) {
    return (
      <HelpCircle
        className={`${pending ? "animate-pulse text-accent-gold/70" : "text-gray-600"} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const cfg = WEATHER_ICONS[weatherId];
  const { Icon } = cfg;

  return (
    <Icon
      className={`${cfg.className} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function travelWeatherLabel(weatherId?: TravelWeatherId | null): string | null {
  if (!weatherId) return null;
  return WEATHER_ICONS[weatherId] ? weatherId : null;
}
