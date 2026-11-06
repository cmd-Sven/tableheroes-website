/**
 * Marktpreis-Indizes (100 = 26.09.2023) stadtweit und je Viertel.
 * Derived aus Tagesmetern, Kriegsphase und Vattrak-Knappheit — kein Sim-Feedback.
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { citySimVersion } from "./aurenfurt-city-sim";
import { HISTORY_START, cityMetricsOn, districtMetricsOn } from "./aurenfurt-history";
import type { MarketIndexPoint } from "./aurenfurt-market-types";
import type { SimProfile } from "./aurenfurt-sim";
import { buildVattrakStockSeries, vattrakStockOn, type VattrakRationLevel } from "./aurenfurt-vattrak-stock";
import { warPhaseOn } from "./aurenfurt-war-events";
import { formatDay, parseDay, utcToday } from "./aurenfurt-time";

const DAY_MS = 86_400_000;

function clampIndex(value: number) {
  return Math.round(Math.max(40, Math.min(280, value)));
}

function phaseBump(phase: ReturnType<typeof warPhaseOn>): {
  food: number;
  raw: number;
  luxury: number;
  arms: number;
  vattrak: number;
  malanthir: number;
} {
  if (phase === "prewar_light") return { food: 2, raw: 3, luxury: 1, arms: 6, vattrak: 4, malanthir: 2 };
  if (phase === "mobilization") return { food: 11, raw: 9, luxury: 14, arms: 18, vattrak: 22, malanthir: 12 };
  if (phase === "peak") return { food: 22, raw: 16, luxury: 28, arms: 32, vattrak: 40, malanthir: 28 };
  return { food: 10, raw: 8, luxury: 12, arms: 14, vattrak: 18, malanthir: 14 };
}

function scarcityBump(level: VattrakRationLevel) {
  if (level === "critical") return { vattrak: 35, malanthir: 22, luxury: 8 };
  if (level === "rationed") return { vattrak: 14, malanthir: 8, luxury: 3 };
  return { vattrak: 0, malanthir: 0, luxury: 0 };
}

function indexFromProfile(
  profile: SimProfile,
  phase: ReturnType<typeof warPhaseOn>,
  level: VattrakRationLevel,
): Omit<MarketIndexPoint, "day"> {
  const bump = phaseBump(phase);
  const scarce = scarcityBump(level);
  const food =
    100 +
    bump.food +
    Math.max(0, profile.refugees - 40) * 0.35 +
    Math.max(0, 55 - profile.economy) * 0.25;
  const raw =
    100 + bump.raw + Math.max(0, 50 - profile.economy) * 0.3 + (100 - profile.guard) * 0.05;
  const luxury =
    100 +
    bump.luxury +
    scarce.luxury +
    Math.max(0, 60 - profile.vattrak) * 0.2 +
    Math.max(0, 55 - profile.economy) * 0.15;
  const arms =
    100 + bump.arms + Math.max(0, profile.guard - 40) * 0.08 + (phase === "peak" ? 8 : 0);
  const vattrakOre =
    100 + bump.vattrak + scarce.vattrak + Math.max(0, 70 - profile.vattrak) * 0.45;
  const malanthir =
    100 +
    bump.malanthir +
    scarce.malanthir +
    profile.malanthir * 0.35 +
    profile.crime * 0.15;
  return {
    food: clampIndex(food),
    raw: clampIndex(raw),
    luxury: clampIndex(luxury),
    arms: clampIndex(arms),
    vattrak: clampIndex(vattrakOre),
    malanthir: clampIndex(malanthir),
  };
}

type MarketSeriesCache = { version: number; toMs: number; points: MarketIndexPoint[] };

let citySeriesCache: MarketSeriesCache | null = null;
const districtSeriesCache = new Map<CityDistrictId, MarketSeriesCache>();

function prefixMarket(points: MarketIndexPoint[], toMs: number): MarketIndexPoint[] {
  const from = parseDay(HISTORY_START);
  const count = Math.floor((toMs - from) / DAY_MS) + 1;
  if (count <= 0) return [];
  if (count >= points.length) return points;
  return points.slice(0, count);
}

function sliceMarketFrom(points: MarketIndexPoint[], fromMs: number, toMs: number): MarketIndexPoint[] {
  return points.filter((point) => {
    const ms = parseDay(point.day);
    return ms >= fromMs && ms <= toMs;
  });
}

export function buildCityMarketSeries(toIso = formatDay(utcToday())): MarketIndexPoint[] {
  const version = citySimVersion();
  const wantMs = parseDay(toIso);
  const buildToMs = Math.max(wantMs, utcToday());

  if (citySeriesCache && citySeriesCache.version === version && citySeriesCache.toMs >= wantMs) {
    return prefixMarket(citySeriesCache.points, wantMs);
  }

  const to = citySeriesCache && citySeriesCache.version === version
    ? Math.max(buildToMs, citySeriesCache.toMs)
    : buildToMs;
  const stock = buildVattrakStockSeries(formatDay(to));
  const stockByDay = new Map(stock.map((row) => [row.day, row]));
  const from = parseDay(HISTORY_START);
  const points: MarketIndexPoint[] = [];

  for (let dayMs = from; dayMs <= to; dayMs += DAY_MS) {
    const day = formatDay(dayMs);
    const profile = cityMetricsOn(dayMs);
    const level = stockByDay.get(day)?.level ?? "calm";
    points.push({ day, ...indexFromProfile(profile, warPhaseOn(dayMs), level) });
  }

  citySeriesCache = { version, toMs: to, points };
  return prefixMarket(points, wantMs);
}

export function buildDistrictMarketSeries(
  districtId: CityDistrictId,
  toIso = formatDay(utcToday()),
): MarketIndexPoint[] {
  const version = citySimVersion();
  const wantMs = parseDay(toIso);
  const buildToMs = Math.max(wantMs, utcToday());
  const hit = districtSeriesCache.get(districtId);

  if (hit && hit.version === version && hit.toMs >= wantMs) {
    return prefixMarket(hit.points, wantMs);
  }

  const to = hit && hit.version === version ? Math.max(buildToMs, hit.toMs) : buildToMs;
  const stock = buildVattrakStockSeries(formatDay(to));
  const stockByDay = new Map(stock.map((row) => [row.day, row]));
  const from = parseDay(HISTORY_START);
  const points: MarketIndexPoint[] = [];

  for (let dayMs = from; dayMs <= to; dayMs += DAY_MS) {
    const day = formatDay(dayMs);
    const profile = districtMetricsOn(districtId, dayMs);
    const level = stockByDay.get(day)?.level ?? "calm";
    points.push({ day, ...indexFromProfile(profile, warPhaseOn(dayMs), level) });
  }

  if (districtSeriesCache.size > 12) districtSeriesCache.clear();
  districtSeriesCache.set(districtId, { version, toMs: to, points });
  return prefixMarket(points, wantMs);
}

/** Chart-Fenster ohne Full-History-Filter in der UI. */
export function cityMarketSeriesForRange(fromIso: string, toIso: string): MarketIndexPoint[] {
  return sliceMarketFrom(buildCityMarketSeries(toIso), parseDay(fromIso), parseDay(toIso));
}

export function districtMarketSeriesForRange(
  districtId: CityDistrictId,
  fromIso: string,
  toIso: string,
): MarketIndexPoint[] {
  return sliceMarketFrom(buildDistrictMarketSeries(districtId, toIso), parseDay(fromIso), parseDay(toIso));
}

/** Stichtag — kein Full-Series-Build. */
export function marketOn(
  dayIso: string,
  scopeId: CityDistrictId | null,
): MarketIndexPoint {
  const dayMs = parseDay(dayIso);
  const level = vattrakStockOn(dayIso).level;
  const profile = scopeId ? districtMetricsOn(scopeId, dayMs) : cityMetricsOn(dayMs);
  return { day: dayIso, ...indexFromProfile(profile, warPhaseOn(dayMs), level) };
}

/** Alle Viertel-Indizes am Stichtag (für Tabellen). */
export function marketByDistrictOn(dayIso: string) {
  return AURENFURT_DISTRICTS.map((district) => ({
    districtId: district.id,
    name: district.name,
    ...marketOn(dayIso, district.id),
  }));
}
