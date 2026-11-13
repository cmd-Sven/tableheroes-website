import type { WeatherKind, WeatherOrigin } from "@/src/components/city/aurenfurt/aurenfurt-weather";

export const CITY_ADVANCE_MAX = 16;

export const CITY_WEATHER_KINDS = [
  "clear",
  "cloudy",
  "fog",
  "rain",
  "storm",
  "snow",
  "frost",
  "heat",
] as const satisfies readonly WeatherKind[];

export type CityClockWeather = {
  day: string;
  kind: WeatherKind;
  tempC: number;
  origin: WeatherOrigin;
};

export type CityClock = {
  presentIso: string;
  weather: CityClockWeather[];
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWeatherKind(value: unknown): value is WeatherKind {
  return typeof value === "string" && (CITY_WEATHER_KINDS as readonly string[]).includes(value);
}

function isOrigin(value: unknown): value is WeatherOrigin {
  return value === "hand" || value === "forecast" || value === "model";
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value);
}

export function parseCityClock(blueprint: unknown): CityClock | null {
  if (!isRecord(blueprint) || !isRecord(blueprint.cityClock)) return null;
  const clock = blueprint.cityClock;
  if (!isIsoDay(clock.presentIso)) return null;
  const weather: CityClockWeather[] = [];
  if (Array.isArray(clock.weather)) {
    for (const entry of clock.weather) {
      if (!isRecord(entry) || !isIsoDay(entry.day) || !isWeatherKind(entry.kind) || !isOrigin(entry.origin)) {
        continue;
      }
      const tempC = typeof entry.tempC === "number" && Number.isFinite(entry.tempC) ? Math.round(entry.tempC) : 10;
      weather.push({ day: entry.day, kind: entry.kind, tempC, origin: entry.origin });
    }
  }
  return { presentIso: clock.presentIso, weather };
}
