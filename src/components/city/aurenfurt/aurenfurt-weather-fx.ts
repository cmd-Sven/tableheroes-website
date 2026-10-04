import type { WeatherKind } from "./aurenfurt-weather";

/** Sichtbare Wettereffekte auf der Karte. */
export type WeatherFxId = "regen" | "schnee" | "nebel" | "sonnenschein" | "bewoelkt";

/** auto folgt dem Tag. Sonst erzwingt die Ansicht genau diesen Effekt. */
export type WeatherFxMode = "auto" | WeatherFxId;

export type WeatherFxPreference = {
  enabled: boolean;
  mode: WeatherFxMode;
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

export function resolveWeatherFx(preference: WeatherFxPreference, kind: WeatherKind, dayIntensity: number) {
  const autoEffect = weatherFxForKind(kind);
  if (!preference.enabled) {
    return { effect: null as WeatherFxId | null, autoEffect, intensity: dayIntensity };
  }
  if (preference.mode === "auto") {
    return { effect: autoEffect, autoEffect, intensity: dayIntensity };
  }
  return { effect: preference.mode, autoEffect, intensity: 74 };
}
