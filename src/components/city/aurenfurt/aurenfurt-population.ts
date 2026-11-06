/**
 * Tägliche Bevölkerungsserie inkl. Front und Kriegs-Overrides.
 * Einsatz: Dashboard-Charts; liest Meter via districtMetricsOn (kein Speichern in Supabase).
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { citySimVersion } from "./aurenfurt-city-sim";
import { HISTORY_START, districtMetricsOn } from "./aurenfurt-history";
import { withPopulationBuilding } from "./aurenfurt-meter-build-guards";
import { seedAllDistrictPopulations } from "./aurenfurt-population-seed";
import {
  roundLayers,
  sumLayers,
  type CityPopulationSnapshot,
  type DistrictPopulation,
  type PopulationLayers,
} from "./aurenfurt-population-types";
import {
  MOBILIZATION_GUARD_DRAFT,
  PEAK_GUARD_DRAFT,
  RETURN_FIT_FRACTION,
  RETURN_FRACTION,
  WAR_MOBILIZATION_MS,
  WAR_PEAK_MS,
  warPhaseOn,
} from "./aurenfurt-war-events";
import { formatDay, parseDay, utcToday } from "./aurenfurt-time";
import type { SimProfile } from "./aurenfurt-sim";

const DAY_MS = 86_400_000;

/** Lokale Spannungsnäherung — vermeidet Importzyklus über aurenfurt-analytics. */
function tensionApprox(profile: SimProfile) {
  const dissatisfaction =
    profile.crime * 0.26 +
    profile.unemployment * 0.2 +
    profile.malanthir * 0.14 +
    profile.refugees * 0.1 +
    (100 - profile.economy) * 0.12 +
    Math.max(0, profile.guard - 55) * 0.14;
  const satisfaction =
    Math.max(0, profile.economy - 45) * 0.1 +
    Math.max(0, profile.vattrak - 40) * 0.12 +
    Math.max(0, profile.elysia - 45) * 0.04;
  return Math.max(0, Math.min(100, dissatisfaction - satisfaction + (profile.tensionBias ?? 0)));
}

type LiveState = {
  districts: Record<CityDistrictId, PopulationLayers>;
  soldiers_at_front: number;
  front_casualties: number;
  /** Summe aller jemals an die Front geschickten Köpfe (für Rückkehrquote). */
  drafted_total: number;
  returned_total: number;
  mobilizationApplied: boolean;
  peakApplied: boolean;
};

function cloneLayers(layers: PopulationLayers): PopulationLayers {
  return { ...layers };
}

function emptyLive(): LiveState {
  const seeded = seedAllDistrictPopulations();
  const districts = {} as Record<CityDistrictId, PopulationLayers>;
  for (const district of AURENFURT_DISTRICTS) {
    const row = seeded[district.id];
    districts[district.id] = {
      pop_nobles: row.pop_nobles,
      pop_citizens: row.pop_citizens,
      pop_guards: row.pop_guards,
      pop_lowerclass: row.pop_lowerclass,
    };
  }
  return {
    districts,
    soldiers_at_front: 0,
    front_casualties: 0,
    drafted_total: 0,
    returned_total: 0,
    mobilizationApplied: false,
    peakApplied: false,
  };
}

function draftGuards(state: LiveState, fraction: number) {
  let moved = 0;
  for (const district of AURENFURT_DISTRICTS) {
    const layers = state.districts[district.id];
    const take = Math.floor(layers.pop_guards * fraction);
    if (take <= 0) continue;
    layers.pop_guards -= take;
    moved += take;
  }
  state.soldiers_at_front += moved;
  state.drafted_total += moved;
  return moved;
}

/** Leichte Vorkriegs-Rekrutierung: Bürger → Garde, keine Flüchtlinge. */
function applyPrewarLightDay(layers: PopulationLayers, profile: SimProfile) {
  const recruit = profile.guard > 55 ? 0.08 : 0.03;
  const fromCitizens = Math.min(layers.pop_citizens * 0.00015, recruit);
  layers.pop_citizens -= fromCitizens;
  layers.pop_guards += fromCitizens;
}

function applyDailyDelta(layers: PopulationLayers, profile: SimProfile, phase: ReturnType<typeof warPhaseOn>) {
  const tension = tensionApprox(profile);

  // Adelige: stabil; Abwanderung nur bei Extremen
  if (profile.crime > 80 || tension > 85) {
    const flee = layers.pop_nobles * 0.0004;
    layers.pop_nobles -= flee;
  } else {
    layers.pop_nobles += layers.pop_nobles * 0.00002;
  }

  // Bürger
  const citizenGrowth = ((profile.economy - profile.unemployment) / 100) * 0.05 * 0.02;
  layers.pop_citizens += Math.max(-layers.pop_citizens * 0.001, citizenGrowth * Math.max(20, layers.pop_citizens * 0.01));
  if (tension > 75 || profile.crime > 70) {
    layers.pop_citizens -= layers.pop_citizens * 0.00035;
  }

  // Garde folgt leicht dem Meter (Rekrutierung aus Bürgern/Lower), außer in Peak-Chaos
  if (phase !== "peak") {
    const guardGap = (profile.guard - 50) / 100;
    if (guardGap > 0.05) {
      const need = Math.min(layers.pop_citizens + layers.pop_lowerclass, guardGap * 0.4);
      const fromC = Math.min(layers.pop_citizens * 0.0002, need * 0.6);
      const fromL = Math.min(layers.pop_lowerclass * 0.00015, need * 0.4);
      layers.pop_citizens -= fromC;
      layers.pop_lowerclass -= fromL;
      layers.pop_guards += fromC + fromL;
    } else if (guardGap < -0.1 && layers.pop_guards > 10) {
      const demob = Math.min(layers.pop_guards * 0.0002, 0.5);
      layers.pop_guards -= demob;
      layers.pop_citizens += demob;
    }
  }

  // Lowerclass / Flüchtlinge — vor Mobilmachung kein Kriegszuzug
  if (phase === "prewar_light") {
    layers.pop_lowerclass += layers.pop_lowerclass * 0.00001;
  } else {
    const influx = Math.max(0, profile.refugees - 40) * 0.08;
    layers.pop_lowerclass += influx;
    const attrition =
      ((profile.crime + profile.malanthir + tension * 2) / 100) * 0.012 * Math.max(10, layers.pop_lowerclass * 0.01);
    layers.pop_lowerclass = Math.max(0, layers.pop_lowerclass - attrition);
  }

  const next = roundLayers(layers);
  Object.assign(layers, next);
}

function applyReturnees(state: LiveState, dayMs: number) {
  if (state.drafted_total <= 0) return;
  if (dayMs < WAR_MOBILIZATION_MS + 90 * DAY_MS) return;
  const targetReturns = state.drafted_total * RETURN_FRACTION;
  const remaining = targetReturns - state.returned_total;
  if (remaining <= 0.5) return;
  // Nach Peak etwas mehr Rückkehr
  const daily = Math.min(remaining, state.drafted_total * (dayMs >= WAR_PEAK_MS ? 0.00012 : 0.00005));
  if (daily < 0.05) return;

  const fit = daily * RETURN_FIT_FRACTION;
  const unfit = daily - fit;
  // Verteilung vor allem Südtor / Unterstadt / Handwerk
  const sinks: { id: CityDistrictId; w: number }[] = [
    { id: "suedtor", w: 0.35 },
    { id: "unterstadt", w: 0.3 },
    { id: "handwerkerviertel", w: 0.2 },
    { id: "tempelbezirk", w: 0.1 },
    { id: "akademieviertel", w: 0.05 },
  ];
  for (const sink of sinks) {
    const layers = state.districts[sink.id];
    layers.pop_guards += fit * sink.w;
    layers.pop_lowerclass += unfit * sink.w * 0.7;
    layers.pop_citizens += unfit * sink.w * 0.3;
  }
  state.soldiers_at_front = Math.max(0, state.soldiers_at_front - daily);
  state.returned_total += daily;
}

function applyFrontCasualties(state: LiveState, dayMs: number) {
  if (state.soldiers_at_front <= 0) return;
  const phase = warPhaseOn(dayMs);
  const rate = phase === "peak" ? 0.0012 : phase === "mobilization" ? 0.00035 : phase === "aftermath" ? 0.00015 : 0;
  if (rate <= 0) return;
  const lost = state.soldiers_at_front * rate;
  state.soldiers_at_front = Math.max(0, state.soldiers_at_front - lost);
  state.front_casualties += lost;
}

function toSnapshot(dayIso: string, state: LiveState): CityPopulationSnapshot {
  const districts = {} as Record<CityDistrictId, DistrictPopulation>;
  let nobles = 0;
  let citizens = 0;
  let guards = 0;
  let lower = 0;
  for (const district of AURENFURT_DISTRICTS) {
    const layers = roundLayers(state.districts[district.id]);
    state.districts[district.id] = layers;
    const total = sumLayers(layers);
    districts[district.id] = { districtId: district.id, ...layers, population_total: total };
    nobles += layers.pop_nobles;
    citizens += layers.pop_citizens;
    guards += layers.pop_guards;
    lower += layers.pop_lowerclass;
  }
  return {
    day: dayIso,
    districts,
    soldiers_at_front: Math.round(state.soldiers_at_front),
    front_casualties: Math.round(state.front_casualties),
    population_total: nobles + citizens + guards + lower,
    pop_nobles: nobles,
    pop_citizens: citizens,
    pop_guards: guards,
    pop_lowerclass: lower,
  };
}

/** Ein langer Cache (Version + Endtag); Prefix-Lookups vermeiden O(n²)-Rebuilds. */
let seriesCache: { version: number; toMs: number; points: CityPopulationSnapshot[] } | null = null;

function prefixSeries(points: CityPopulationSnapshot[], toMs: number): CityPopulationSnapshot[] {
  const from = parseDay(HISTORY_START);
  const count = Math.floor((toMs - from) / DAY_MS) + 1;
  if (count <= 0) return [];
  if (count >= points.length) return points;
  return points.slice(0, count);
}

/**
 * Baut die Bevölkerungsserie von HISTORY_START bis `toIso` (inkl.).
 * Cache speichert immer bis mind. utcToday — Lookups früherer Tage sind Prefix-Slices.
 */
export function buildPopulationSeries(toIso = formatDay(utcToday())): CityPopulationSnapshot[] {
  const version = citySimVersion();
  const wantMs = parseDay(toIso);
  // Immer bis heute warmhalten: ein Miss baut die volle Historie einmal, nicht Tag für Tag.
  const buildToMs = Math.max(wantMs, utcToday());

  if (seriesCache && seriesCache.version === version && seriesCache.toMs >= wantMs) {
    return prefixSeries(seriesCache.points, wantMs);
  }

  return withPopulationBuilding(() => {
    const from = parseDay(HISTORY_START);
    const to = seriesCache && seriesCache.version === version ? Math.max(buildToMs, seriesCache.toMs) : buildToMs;
    const state = emptyLive();
    const points: CityPopulationSnapshot[] = [];

    for (let dayMs = from; dayMs <= to; dayMs += DAY_MS) {
      const phase = warPhaseOn(dayMs);

      if (!state.mobilizationApplied && dayMs >= WAR_MOBILIZATION_MS) {
        draftGuards(state, MOBILIZATION_GUARD_DRAFT);
        state.mobilizationApplied = true;
      }
      if (!state.peakApplied && dayMs >= WAR_PEAK_MS) {
        draftGuards(state, PEAK_GUARD_DRAFT);
        state.peakApplied = true;
      }

      for (const district of AURENFURT_DISTRICTS) {
        const profile = districtMetricsOn(district.id, dayMs);
        const layers = state.districts[district.id];
        if (phase === "prewar_light") applyPrewarLightDay(layers, profile);
        applyDailyDelta(layers, profile, phase);
      }

      applyReturnees(state, dayMs);
      applyFrontCasualties(state, dayMs);
      points.push(toSnapshot(formatDay(dayMs), state));
    }

    seriesCache = { version, toMs: to, points };
    return prefixSeries(points, wantMs);
  });
}

export function populationOn(dayIso: string): CityPopulationSnapshot {
  const series = buildPopulationSeries(dayIso);
  return series[series.length - 1] ?? toSnapshot(dayIso, emptyLive());
}

export function populationSeriesForRange(fromIso: string, toIso: string): CityPopulationSnapshot[] {
  const full = buildPopulationSeries(toIso);
  const fromMs = parseDay(fromIso);
  return full.filter((point) => parseDay(point.day) >= fromMs);
}

/** Hilfsclone für Tests / UI ohne Seiteneffekte auf den Cache-State. */
export function peekSeedPopulation(): Record<CityDistrictId, DistrictPopulation> {
  return seedAllDistrictPopulations();
}
