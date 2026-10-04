import { formatDay, parseDay, utcToday } from "./aurenfurt-time";

let winterOf: (day: number) => number = () => 0;

/** Historie setzt das, sobald die Ereignisgewichte stehen. Vermeidet einen Importkreis. */
export function bindWeatherWinter(fn: (day: number) => number) {
  winterOf = fn;
}

export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "storm" | "snow" | "frost" | "heat";

export type DayWeather = {
  day: string;
  kind: WeatherKind;
  label: string;
  tempC: number;
  /** 0–100, wie hart der Tag vom Wetter geprägt ist. */
  intensity: number;
  source: "history" | "live";
};

const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: "Klar",
  cloudy: "Bedeckt",
  fog: "Nebel",
  rain: "Regen",
  storm: "Sturm",
  snow: "Schnee",
  frost: "Frost",
  heat: "Hitze",
};

/** Echtes Himmel über dem Vereinsort, bis Aurenfurt eine eigene Messstelle hat. */
export const AURENFURT_LIVE_COORDINATES = { latitude: 52.2799, longitude: 8.0472 };

export type LiveWeatherProvider = (signal?: AbortSignal) => Promise<DayWeather | null>;

const DAY_MS = 86_400_000;

function unit(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function wetThreshold(month: number) {
  const table = [0.42, 0.4, 0.38, 0.36, 0.34, 0.3, 0.28, 0.3, 0.36, 0.42, 0.46, 0.44];
  return table[month] ?? 0.36;
}

function kindFromClimate(temp: number, wet: number, noise: number, winter: number, month: number): WeatherKind {
  const line = winter > 0.4 ? 0.32 : wetThreshold(month);
  if (winter > 0.55 && temp < 3) return wet > 0.38 ? "snow" : "frost";
  if (temp >= 29) return "heat";
  if (temp <= -8) return wet > 0.22 ? "snow" : "frost";
  if (temp <= 0 && wet > line) return "snow";
  if (temp <= 1 && wet > 0.74) return "frost";
  if (wet > line + 0.3) return "storm";
  if (wet > line) return "rain";
  if (wet > line - 0.16) return "cloudy";
  if (noise > 0.93 && temp < 8) return "fog";
  return "clear";
}

function intensityFor(kind: WeatherKind, noise: number) {
  if (kind === "storm" || kind === "snow") return Math.min(100, 68 + Math.round(noise * 28));
  if (kind === "frost" || kind === "heat") return Math.min(100, 58 + Math.round(noise * 20));
  if (kind === "rain") return 48 + Math.round(noise * 20);
  return 22 + Math.round(noise * 24);
}

/** Simuliertes Tageswetter. Der harte Winter vor drei Jahren drückt die Reihe spürbar nach unten. */
export function weatherOn(day = utcToday()): DayWeather {
  const date = new Date(day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.round((day - yearStart) / DAY_MS);
  const noise = unit(`wx|${day}`);
  const wet = unit(`wet|${day}`);
  const angle = ((dayOfYear - 200) / 365) * Math.PI * 2;
  const winter = winterOf(day);
  const tempC = Math.round(10 + 11 * Math.cos(angle) + (noise - 0.5) * 7 - 12 * winter);
  const kind = kindFromClimate(tempC, wet, noise, winter, date.getUTCMonth());
  return {
    day: formatDay(day),
    kind,
    label: WEATHER_LABEL[kind],
    tempC,
    intensity: intensityFor(kind, noise),
    source: "history",
  };
}

export function weatherSeries(from = parseDay("2023-09-26"), to = utcToday()): DayWeather[] {
  const points: DayWeather[] = [];
  for (let day = from; day <= to; day += DAY_MS) {
    points.push(weatherOn(day));
  }
  return points;
}

function kindFromWmo(code: number, tempC: number): WeatherKind {
  if (code === 0) return tempC <= 0 ? "frost" : tempC >= 30 ? "heat" : "clear";
  if (code <= 3) return tempC <= -2 ? "frost" : "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if ((code >= 65 && code <= 67) || code === 82) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (tempC >= 30) return "heat";
  if (tempC <= -2) return "frost";
  return "cloudy";
}

/** Aktuelle Messung. Ab heute ersetzt sie den simulierten Tag. */
export const fetchLiveAurenfurtWeather: LiveWeatherProvider = async (signal) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(AURENFURT_LIVE_COORDINATES.latitude));
  url.searchParams.set("longitude", String(AURENFURT_LIVE_COORDINATES.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "Europe/Berlin");
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const temp = body.current?.temperature_2m;
  const code = body.current?.weather_code;
  if (typeof temp !== "number" || typeof code !== "number") return null;
  const tempC = Math.round(temp);
  const kind = kindFromWmo(code, tempC);
  return {
    day: formatDay(utcToday()),
    kind,
    label: WEATHER_LABEL[kind],
    tempC,
    intensity: intensityFor(kind, 0.5),
    source: "live",
  };
};
