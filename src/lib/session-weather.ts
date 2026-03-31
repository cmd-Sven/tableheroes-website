import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
} from "lucide-react";

export type WeatherPresetId =
  | "clear"
  | "sunny"
  | "cloudy"
  | "rain"
  | "snow"
  | "fog"
  | "storm"
  | "wind"
  | "hail";

export type WeatherIntensity = 1 | 2 | 3;

export const WEATHER_PRESET_ORDER: WeatherPresetId[] = [
  "clear",
  "sunny",
  "cloudy",
  "rain",
  "snow",
  "fog",
  "storm",
  "wind",
  "hail",
];

type PresetMeta = {
  label: string;
  levels: [string, string, string];
  /** Kurze mechanische / atmosphärische Hinweise für Spieler:innen */
  effects: [string[], string[], string[]];
  icon: LucideIcon;
};

export const WEATHER_PRESETS: Record<WeatherPresetId, PresetMeta> = {
  clear: {
    label: "Klar / heiter",
    levels: [
      "Heiter, kaum Wind",
      "Klarer Himmel",
      "Strahlend klar (Blendung möglich)",
    ],
    effects: [
      ["Unauffällige Bedingungen", "Normale Sicht"],
      ["Gute Sicht", "Ruhiges Wetter"],
      ["Sehr gute Sicht", "Intensive Sonne kann blenden"],
    ],
    icon: Sun,
  },
  sunny: {
    label: "Sonnig",
    levels: ["Leicht sonnig", "Sonnig / warm", "Extreme Hitze / Glutsonne"],
    effects: [
      ["Angenehme Wärme"],
      ["Hitzeeinfluss auf Marsch möglich", "Längere Rast empfohlen"],
      ["Erschöpfung riskant", "Sonnenbrand / Hitzschlag möglich"],
    ],
    icon: Sun,
  },
  cloudy: {
    label: "Bewölkt",
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
  fog: {
    label: "Nebel",
    levels: ["Leichter Dunst", "Dichter Nebel", "Undurchdringlicher Nebel"],
    effects: [
      ["Leichte Sichtreduktion auf Distanz"],
      ["Starke Sichtbehinderung", "Gruppe kann auseinandergeraten"],
      ["Kaum Sicht über wenige Meter", "Navigation extrem schwierig"],
    ],
    icon: CloudFog,
  },
  storm: {
    label: "Gewitter / Sturm",
    levels: ["Fernes Gewitter", "Unwetter zieht auf", "Schweres Unwetter"],
    effects: [
      ["Donner in der Ferne", "Leichte Unruhe bei Reittieren"],
      ["Blitzegefahr", "Starker Wind", "Sicht schwankend"],
      ["Extreme Gefahr im Freien", "Umsturz / Fallen riskant", "Sehr schlechte Sicht"],
    ],
    icon: CloudLightning,
  },
  wind: {
    label: "Wind",
    levels: ["Leichte Brise", "Starker Wind", "Orkanböen"],
    effects: [
      ["Unauffällig", "Geräusche leicht verstärkt"],
      ["Schwieriger Fernkampf möglich", "Staub / lose Gegenstände"],
      ["Stehen / Balancieren schwer", "Flug / Klettern gefährlich"],
    ],
    icon: Wind,
  },
  hail: {
    label: "Hagel",
    levels: ["Graupel / leichter Hagel", "Hagel", "Schwerer Hagelschlag"],
    effects: [
      ["Unbequem", "leichte Deckung sinnvoll"],
      ["Verletzungsgefahr ohne Deckung", "Tiere scheu"],
      ["Hohe Verletzungsgefahr", "Schäden an Ausrüstung / Zelten möglich"],
    ],
    icon: CloudHail,
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
