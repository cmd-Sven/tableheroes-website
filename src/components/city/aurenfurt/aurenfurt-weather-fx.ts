import type { WeatherPresetId, WeatherIntensity } from "@/src/lib/session-weather";
import type { WeatherKind } from "./aurenfurt-weather";

/** Sichtbare Wettereffekte auf der Karte. */
export type WeatherFxId = "regen" | "schnee" | "nebel" | "sonnenschein" | "bewoelkt";

/** auto folgt dem Tag. Sonst erzwingt die Ansicht genau diesen Effekt. */
export type WeatherFxMode = "auto" | WeatherFxId;

export type WeatherFxPreference = {
  enabled: boolean;
  mode: WeatherFxMode;
};

export type ResolvedWeatherFx = {
  effect: WeatherFxId | null;
  autoEffect: WeatherFxId;
  intensity: number;
};

export const WEATHER_FX_STORAGE_KEY = "aurenfurt-weather-fx-v1";

export const WEATHER_FX_OPTIONS: { id: WeatherFxId; label: string }[] = [
  { id: "regen", label: "Regen" },
  { id: "schnee", label: "Schnee" },
  { id: "nebel", label: "Nebel" },
  { id: "sonnenschein", label: "Sonnenschein" },
  { id: "bewoelkt", label: "Bewölkt" },
];

const FX_IDS = new Set<string>(WEATHER_FX_OPTIONS.map((entry) => entry.id));

const SESSION_PRESET_TO_FX: Record<WeatherPresetId, WeatherFxId> = {
  blizzard: "schnee",
  storm: "regen",
  heavy_wind: "nebel",
  clouds: "bewoelkt",
  rain: "regen",
  snow: "schnee",
  sun: "sonnenschein",
  sun_clouds: "bewoelkt",
};

export function weatherFxLabel(id: WeatherFxId) {
  return WEATHER_FX_OPTIONS.find((entry) => entry.id === id)?.label ?? id;
}

/** Sturm fällt als Regen, Hitze als Sonne, Frost als Bewölkung. */
export function weatherFxForKind(kind: WeatherKind): WeatherFxId {
  if (kind === "rain" || kind === "storm") return "regen";
  if (kind === "snow") return "schnee";
  if (kind === "fog") return "nebel";
  if (kind === "cloudy" || kind === "frost") return "bewoelkt";
  return "sonnenschein";
}

/** Session-Atmosphäre → sichtbarer Stadt-Effekt (nur Optik). */
export function weatherFxFromSessionPreset(preset: WeatherPresetId): WeatherFxId {
  return SESSION_PRESET_TO_FX[preset];
}

export function weatherFxIntensityFromSession(intensity: WeatherIntensity | number | null | undefined): number {
  const level = intensity === 1 || intensity === 2 || intensity === 3 ? intensity : 2;
  if (level === 1) return 42;
  if (level === 3) return 94;
  return 72;
}

export function defaultWeatherFxPreference(): WeatherFxPreference {
  return { enabled: true, mode: "auto" };
}

export function parseStoredWeatherFx(raw: string | null): WeatherFxPreference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WeatherFxPreference>;
    const enabled = parsed.enabled !== false;
    const mode = parsed.mode === "auto" || (typeof parsed.mode === "string" && FX_IDS.has(parsed.mode))
      ? (parsed.mode as WeatherFxMode)
      : "auto";
    return { enabled, mode };
  } catch {
    return null;
  }
}

export function serializeWeatherFx(preference: WeatherFxPreference) {
  return JSON.stringify(preference);
}

export function resolveWeatherFx(
  preference: WeatherFxPreference,
  kind: WeatherKind,
  dayIntensity: number,
): ResolvedWeatherFx {
  const autoEffect = weatherFxForKind(kind);
  if (!preference.enabled) {
    return { effect: null, autoEffect, intensity: dayIntensity };
  }
  if (preference.mode === "auto") {
    return { effect: autoEffect, autoEffect, intensity: dayIntensity };
  }
  return { effect: preference.mode, autoEffect, intensity: 74 };
}

/**
 * Live-Session: Atmosphäre-Buttons steuern die Optik.
 * Statistik/Simulation bleibt beim Klima (`kind` / API).
 */
export function resolveCityWeatherFx(params: {
  preference: WeatherFxPreference;
  kind: WeatherKind;
  dayIntensity: number;
  opticalPreset?: WeatherPresetId | null;
  opticalIntensity?: WeatherIntensity | number | null;
}): ResolvedWeatherFx {
  const climate = resolveWeatherFx(params.preference, params.kind, params.dayIntensity);
  if (!params.preference.enabled) return climate;
  if (!params.opticalPreset) return climate;
  return {
    effect: weatherFxFromSessionPreset(params.opticalPreset),
    autoEffect: climate.autoEffect,
    intensity: weatherFxIntensityFromSession(params.opticalIntensity),
  };
}
