/**
 * live-session-weather — Weather icon lookup, temperature helpers, and rain particle config.
 */
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
} from "lucide-react";
import {
  WEATHER_PRESET_ORDER,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "@/src/lib/session-weather";
import type { LiveState, WeatherIconOption } from "./live-session-types";

export const TEMPERATURE_MIN = -40;
export const TEMPERATURE_DEFAULT = 15;
export const TEMPERATURE_MAX = 55;

export function normalizeTemperatureValue(value: unknown): number {
  const n = Number(value ?? TEMPERATURE_DEFAULT);
  if (!Number.isFinite(n)) return TEMPERATURE_DEFAULT;
  return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(n)));
}

export function getTemperatureFillPercent(value: number) {
  const tempPercentage =
    ((normalizeTemperatureValue(value) - TEMPERATURE_MIN) /
      (TEMPERATURE_MAX - TEMPERATURE_MIN)) *
    100;
  return Math.min(100, Math.max(0, tempPercentage));
}

export function getThermometerFillColor(value: number) {
  const v = normalizeTemperatureValue(value);
  if (v <= 0) return "linear-gradient(to top, #1e3a8a, #38bdf8)";
  if (v <= 15) return "linear-gradient(to top, #065f46, #34d399)";
  if (v <= 28) return "linear-gradient(to top, #854d0e, #facc15)";
  if (v <= 35) return "linear-gradient(to top, #c2410c, #fb923c)";
  return "linear-gradient(to top, #991b1b, #ef4444)";
}

export function getWeatherVisual(liveState: LiveState | null): WeatherIconOption {
  const raw = `${liveState?.weather_preset ?? ""} ${liveState?.weather ?? ""}`.toLowerCase();
  const preset = liveState?.weather_preset;
  if (preset && WEATHER_ICON_OPTIONS.some((o) => o.id === preset)) {
    return WEATHER_ICON_OPTIONS.find((o) => o.id === preset)!;
  }
  const byKeyword = WEATHER_ICON_OPTIONS.find((option) =>
    option.keywords.some((kw) => raw.includes(kw)),
  );
  if (byKeyword) return byKeyword;
  return WEATHER_ICON_OPTIONS[0];
}

export type WeatherCondition = "storm" | "rain" | "snow" | "sun" | "none";

export function getWeatherCondition(liveState: LiveState | null): WeatherCondition {
  const raw = `${liveState?.weather_preset ?? ""} ${liveState?.weather ?? ""}`.toLowerCase();
  if (raw.includes("storm") || raw.includes("sturm") || raw.includes("gewitter") || raw.includes("blitz")) {
    return "storm";
  }
  if (raw.includes("rain") || raw.includes("regen")) return "rain";
  if (raw.includes("snow") || raw.includes("schnee") || raw.includes("blizzard")) return "snow";
  if (raw.includes("sun") || raw.includes("sonne") || raw.includes("klar") || raw.includes("heiter")) {
    return "sun";
  }
  return "none";
}

export const RAIN_DROPS = Array.from({ length: 58 }, (_, index) => ({
  id: `rain-${index}`,
  left: `${(index * 23) % 100}%`,
  delay: (index % 14) * 0.24,
  duration: 4 + (index % 6) * 0.36,
  height: 14 + (index % 5) * 3,
  opacity: 0.34 + (index % 4) * 0.08,
  drift: -18 - (index % 5) * 4,
}));

const WEATHER_ICON_BASE_PATH = "/images/Session_ui/Wetter_icons";

export const WEATHER_ICON_OPTIONS: WeatherIconOption[] = WEATHER_PRESET_ORDER.map((id) => {
  const meta = WEATHER_PRESETS[id];
  const fallbackById: Record<WeatherPresetId, { Icon: typeof Sun; className: string; keywords: string[] }> = {
    blizzard: {
      Icon: Snowflake,
      className: "bg-cyan-950 text-cyan-200 border-cyan-400/70",
      keywords: ["blizzard", "whiteout", "schneesturm", "ice", "eis"],
    },
    storm: {
      Icon: CloudLightning,
      className: "bg-purple-950 text-purple-200 border-purple-500/70",
      keywords: ["gewitter", "storm", "thunder", "blitz", "unwetter"],
    },
    heavy_wind: {
      Icon: Cloud,
      className: "bg-teal-950 text-teal-200 border-teal-400/70",
      keywords: ["wind", "orkan", "brise", "böe"],
    },
    clouds: {
      Icon: Cloud,
      className: "bg-slate-800 text-slate-200 border-slate-500/70",
      keywords: ["wolke", "cloud", "cloudy", "bewölkt", "nebel", "fog", "dunst"],
    },
    rain: {
      Icon: CloudRain,
      className: "bg-blue-950 text-blue-200 border-blue-500/70",
      keywords: ["regen", "rain", "shower"],
    },
    snow: {
      Icon: Snowflake,
      className: "bg-cyan-950 text-cyan-200 border-cyan-400/70",
      keywords: ["schnee", "snow"],
    },
    sun: {
      Icon: Sun,
      className: "bg-yellow-900 text-yellow-200 border-yellow-400/70",
      keywords: ["sonne", "sun", "sunny", "klar", "clear", "heiter"],
    },
    sun_clouds: {
      Icon: Sun,
      className: "bg-amber-900 text-amber-200 border-amber-400/70",
      keywords: ["sonne wolken", "sun clouds", "wechselhaft"],
    },
  };
  const fallback = fallbackById[id];
  return {
    id,
    label: meta.label,
    src: `${WEATHER_ICON_BASE_PATH}/${meta.iconFilename}`,
    FallbackIcon: fallback.Icon,
    className: fallback.className,
    keywords: fallback.keywords,
  };
});
