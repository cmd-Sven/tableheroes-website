import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
} from "lucide-react";

export type WeatherPresetId =
  | "blizzard"
  | "storm"
  | "heavy_wind"
  | "clouds"
  | "rain"
  | "snow"
  | "sun"
  | "sun_clouds";

export type WeatherIntensity = 1 | 2 | 3;

export const WEATHER_PRESET_ORDER: WeatherPresetId[] = [
  "blizzard",
  "storm",
  "heavy_wind",
  "clouds",
  "rain",
  "snow",
  "sun",
  "sun_clouds",
];

type PresetMeta = {
  label: string;
  iconFilename: string;
  levels: [string, string, string];
  /** Kurze mechanische / atmosphärische Hinweise für Spieler:innen */
  effects: [string[], string[], string[]];
  icon: LucideIcon;
};

export const WEATHER_PRESETS: Record<WeatherPresetId, PresetMeta> = {
  blizzard: {
    label: "Blizzard",
    iconFilename: "Blizzard.webp",
    levels: [
      "Schneeböen",
      "Blizzard",
      "Whiteout",
    ],
    effects: [
      ["Sicht deutlich reduziert", "Kälte spürbar"],
      ["Schwieriges Gelände", "Orientierung erschwert"],
      ["Kaum Sicht", "Fortbewegung und Orientierung extrem riskant"],
    ],
    icon: CloudSnow,
  },
  storm: {
    label: "Gewitter",
    iconFilename: "Gewitter.webp",
    levels: ["Fernes Gewitter", "Unwetter zieht auf", "Schweres Gewitter"],
    effects: [
      ["Donner in der Ferne", "Leichte Unruhe bei Reittieren"],
      ["Blitzegefahr", "Starker Wind", "Sicht schwankend"],
      ["Extreme Gefahr im Freien", "Umsturz / Fallen riskant", "Sehr schlechte Sicht"],
    ],
    icon: CloudLightning,
  },
  heavy_wind: {
    label: "Heftiger Wind",
    iconFilename: "heftiger_wind.webp",
    levels: ["Starke Böen", "Sturmwind", "Orkanböen"],
    effects: [
      ["Geräusche werden verweht", "Lose Gegenstände bewegen sich"],
      ["Schwieriger Fernkampf möglich", "Staub / Laub erschwert Sicht"],
      ["Stehen / Balancieren schwer", "Flug / Klettern gefährlich"],
    ],
    icon: Wind,
  },
  clouds: {
    label: "Nur Wolken",
    iconFilename: "nur_wolken.webp",
    levels: ["Leicht bewölkt", "Stark bewölkt", "Düstere Wolkendecke"],
    effects: [
      ["Weiche Beleuchtung", "Normale Sicht"],
      ["Gedämpftes Licht", "Leicht größere Distanz schwer zu erkennen"],
      ["Düstere Stimmung", "Sicht in der Ferne eingeschränkt"],
    ],
    icon: Cloud,
  },
  rain: {
    label: "Regen",
    iconFilename: "Regen.webp",
    levels: ["Leichter Regen", "Starker Regen", "Extremer Starkregen"],
    effects: [
      ["Leichte Sichtbeeinträchtigung", "Boden wird glatt"],
      ["Sicht deutlich eingeschränkt", "Schwierigeres Gelände möglich"],
      ["Sehr geringe Sicht", "Schwieriges Gelände", "Orientierung erschwert"],
    ],
    icon: CloudRain,
  },
  snow: {
    label: "Schnee",
    iconFilename: "Schnee.webp",
    levels: ["Leichter Schneefall", "Starker Schneefall", "Blizzard / Schneesturm"],
    effects: [
      ["Leichte Sichtbeeinträchtigung", "Kälte spürbar"],
      ["Sichtbehinderung", "Tiefer Schnee erschwert Fortbewegung"],
      [
        "Extrem eingeschränkte Sicht",
        "Erschwertes Gelände",
        "Gefahr der Orientierungslosigkeit",
      ],
    ],
    icon: CloudSnow,
  },
  sun: {
    label: "Sonne",
    iconFilename: "sonne.webp",
    levels: ["Leicht sonnig", "Sonnig / warm", "Extreme Hitze / Glutsonne"],
    effects: [
      ["Angenehme Wärme"],
      ["Hitzeeinfluss auf Marsch möglich", "Längere Rast empfohlen"],
      ["Erschöpfung riskant", "Sonnenbrand / Hitzschlag möglich"],
    ],
    icon: Sun,
  },
  sun_clouds: {
    label: "Sonne & Wolken",
    iconFilename: "sonne_wolken.webp",
    levels: ["Aufgelockerte Wolken", "Wechselhaft", "Schnell ziehende Wolken"],
    effects: [
      ["Freundliche Bedingungen", "Normale Sicht"],
      ["Licht und Schatten wechseln", "Wetterumschwung möglich"],
      ["Unruhige Atmosphäre", "Ferne Ziele schwerer einzuschätzen"],
    ],
    icon: Sun,
  },
};

export function isWeatherPresetId(v: string | null | undefined): v is WeatherPresetId {
  return v != null && v in WEATHER_PRESETS;
}

export function normalizeIntensity(v: unknown): WeatherIntensity | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 3) return null;
  return n as WeatherIntensity;
}

export function formatWeatherSummary(
  preset: WeatherPresetId | null,
  intensity: WeatherIntensity | null,
  temperature: string | null,
  legacyWeather: string | null,
): string | null {
  if (preset && intensity) {
    const meta = WEATHER_PRESETS[preset];
    const levelLabel = meta.levels[intensity - 1];
    const temp = temperature?.trim();
    const tempPart = temp ? ` · ${temp}` : "";
    return `${meta.label}: ${levelLabel} (Stufe ${intensity})${tempPart}`;
  }
  const leg = legacyWeather?.trim();
  return leg || null;
}

export function getWeatherMechanicalLines(
  preset: WeatherPresetId | null,
  intensity: WeatherIntensity | null,
): string[] {
  if (!preset || !intensity) return [];
  return [...WEATHER_PRESETS[preset].effects[intensity - 1]];
}

export function weatherPresetIcon(preset: WeatherPresetId): LucideIcon {
  return WEATHER_PRESETS[preset].icon;
}
