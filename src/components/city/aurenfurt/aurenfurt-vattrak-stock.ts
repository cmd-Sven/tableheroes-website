/**
 * Stadtweites Vattrak-Erz-Lager mit Zufluss, Nachfrage und Rationierung.
 * Einsatz: Dashboard (Lagerstand), Markt-Knappheit, dosierte Meter-Overlays.
 * Kein districtMetricsOn hier — sonst Zyklus mit profileOn / Bevölkerung.
 */

import { citySimVersion } from "./aurenfurt-city-sim";
import { HISTORY_START } from "./aurenfurt-history";
import { isVattrakStockBuilding, withVattrakStockBuilding } from "./aurenfurt-meter-build-guards";
import { buildPopulationSeries } from "./aurenfurt-population";
import type { CityPopulationSnapshot } from "./aurenfurt-population-types";
import { warPhaseOn } from "./aurenfurt-war-events";
import { formatDay, parseDay, utcToday } from "./aurenfurt-time";

const DAY_MS = 86_400_000;

/** Einheiten Erz (abstrakt), Startreserve am HISTORY_START. */
export const VATTRAK_STOCK_START = 420;
export const VATTRAK_STOCK_CAP = 600;
/** Basis-Zufluss/Tag aus Nord/Berglinie bei ruhiger Lage. */
export const VATTRAK_BASE_SUPPLY = 4.2;

export type VattrakRationLevel = "calm" | "rationed" | "critical";

export type VattrakDemandBuckets = {
  front: number;
  temple: number;
  craft: number;
  nobles: number;
};

export type VattrakStockSnapshot = {
  day: string;
  stock: number;
  supply: number;
  demand: number;
  /** stock / Mehrwochenbedarf. */
  coverage: number;
  level: VattrakRationLevel;
  /** 0–1, wie stark die Front den Bedarf treibt. */
  frontShare: number;
  /** Anteil Handwerk+Adel, der heute leer ausging (0–1). */
  unmetLuxuryRatio: number;
  /** Kurztext: wer gekürzt wurde. */
  cutHint: string;
};

const PRIORITY = ["front", "temple", "craft", "nobles"] as const;

function levelOf(coverage: number): VattrakRationLevel {
  if (coverage > 0.6) return "calm";
  if (coverage > 0.3) return "rationed";
  return "critical";
}

/** Saisonale Winterlast ohne Meter-Lookup (kein Zyklus). */
function winterishOn(dayMs: number): number {
  const month = new Date(dayMs).getUTCMonth();
  if (month === 11 || month === 0 || month === 1) return 0.55;
  if (month === 2 || month === 10) return 0.32;
  return 0.12;
}

function supplyForPhase(phase: ReturnType<typeof warPhaseOn>, winterish: number): number {
  let supply = VATTRAK_BASE_SUPPLY * (1 - winterish * 0.35);
  if (phase === "prewar_light") supply *= 0.95;
  if (phase === "mobilization") supply *= 0.72;
  if (phase === "peak") supply *= 0.48;
  if (phase === "aftermath") supply *= 0.8;
  return Math.max(0.4, supply);
}

function demandBuckets(
  pop: CityPopulationSnapshot,
  phase: ReturnType<typeof warPhaseOn>,
): VattrakDemandBuckets {
  const temple = (pop.districts.tempelbezirk?.population_total ?? 0) * 0.00035;
  const nobles = pop.pop_nobles * 0.00025;
  const craft = (pop.districts.handwerkerviertel?.pop_citizens ?? 0) * 0.00012;
  const front = pop.soldiers_at_front * 0.0011;
  let scale = 1;
  if (phase === "mobilization") scale = 1.35;
  if (phase === "peak") scale = 1.7;
  if (phase === "aftermath") scale = 1.15;
  const base = 1.8 / 4;
  return {
    front: (front + base) * scale,
    temple: (temple + base) * scale,
    craft: (craft + base) * scale,
    nobles: (nobles + base) * scale,
  };
}

function allocate(
  available: number,
  buckets: VattrakDemandBuckets,
): { served: VattrakDemandBuckets; unmetLuxuryRatio: number; cutHint: string; consumed: number } {
  let remain = Math.max(0, available);
  const served: VattrakDemandBuckets = { front: 0, temple: 0, craft: 0, nobles: 0 };
  for (const key of PRIORITY) {
    const take = Math.min(buckets[key], remain);
    served[key] = take;
    remain -= take;
  }
  const luxuryDemand = buckets.craft + buckets.nobles;
  const luxuryUnmet = Math.max(0, buckets.craft - served.craft) + Math.max(0, buckets.nobles - served.nobles);
  const unmetLuxuryRatio = luxuryDemand <= 0 ? 0 : Math.min(1, luxuryUnmet / luxuryDemand);

  let cutHint = "Alle Kontingente bedient";
  if (served.nobles < buckets.nobles * 0.99) cutHint = "Adelskontingent gekürzt";
  if (served.craft < buckets.craft * 0.99) cutHint = "Handwerk & Adel rationiert";
  if (served.temple < buckets.temple * 0.99) cutHint = "Tempel rationiert — Front zuerst";
  if (served.front < buckets.front * 0.99) cutHint = "Kritisch: selbst Front unterversorgt";

  const consumed = available - remain;
  return { served, unmetLuxuryRatio, cutHint, consumed };
}

type StockCache = {
  version: number;
  toMs: number;
  points: VattrakStockSnapshot[];
  byDay: Map<string, VattrakStockSnapshot>;
};

let stockCache: StockCache | null = null;

export { isVattrakStockBuilding } from "./aurenfurt-meter-build-guards";

function calmStub(dayIso: string): VattrakStockSnapshot {
  return {
    day: dayIso,
    stock: VATTRAK_STOCK_START,
    supply: VATTRAK_BASE_SUPPLY,
    demand: 2,
    coverage: 1,
    level: "calm",
    frontShare: 0,
    unmetLuxuryRatio: 0,
    cutHint: "Alle Kontingente bedient",
  };
}

function prefixStock(points: VattrakStockSnapshot[], toMs: number): VattrakStockSnapshot[] {
  const from = parseDay(HISTORY_START);
  const count = Math.floor((toMs - from) / DAY_MS) + 1;
  if (count <= 0) return [];
  if (count >= points.length) return points;
  return points.slice(0, count);
}

export function buildVattrakStockSeries(toIso = formatDay(utcToday())): VattrakStockSnapshot[] {
  const version = citySimVersion();
  const wantMs = parseDay(toIso);
  const buildToMs = Math.max(wantMs, utcToday());

  if (stockCache && stockCache.version === version && stockCache.toMs >= wantMs) {
    return prefixStock(stockCache.points, wantMs);
  }

  // Reentrancy während Bevölkerung/Meter: kein zweiter Build (sonst Endlosschleife).
  if (isVattrakStockBuilding()) return [calmStub(toIso)];

  return withVattrakStockBuilding(() => {
    const to = stockCache && stockCache.version === version ? Math.max(buildToMs, stockCache.toMs) : buildToMs;
    const popSeries = buildPopulationSeries(formatDay(to));
    const popByDay = new Map(popSeries.map((row) => [row.day, row]));
    const from = parseDay(HISTORY_START);
    let stock = VATTRAK_STOCK_START;
    const points: VattrakStockSnapshot[] = [];
    const byDay = new Map<string, VattrakStockSnapshot>();

    for (let dayMs = from; dayMs <= to; dayMs += DAY_MS) {
      const day = formatDay(dayMs);
      const phase = warPhaseOn(dayMs);
      const supply = supplyForPhase(phase, winterishOn(dayMs));
      const pop = popByDay.get(day) ?? popSeries[popSeries.length - 1];
      const buckets = demandBuckets(pop, phase);
      const demand = buckets.front + buckets.temple + buckets.craft + buckets.nobles;
      const { unmetLuxuryRatio, cutHint, consumed } = allocate(stock + supply, buckets);
      stock = Math.max(0, Math.min(VATTRAK_STOCK_CAP, stock + supply - consumed));
      const coverage = demand <= 0 ? 1 : Math.min(2, stock / Math.max(demand * 14, 1));
      const frontShare = demand <= 0 ? 0 : Math.min(0.75, buckets.front / demand);
      const point: VattrakStockSnapshot = {
        day,
        stock: Math.round(stock * 10) / 10,
        supply: Math.round(supply * 100) / 100,
        demand: Math.round(demand * 100) / 100,
        coverage: Math.round(coverage * 100) / 100,
        level: levelOf(coverage),
        frontShare: Math.round(frontShare * 100) / 100,
        unmetLuxuryRatio: Math.round(unmetLuxuryRatio * 100) / 100,
        cutHint,
      };
      points.push(point);
      byDay.set(day, point);
    }

    stockCache = { version, toMs: to, points, byDay };
    return prefixStock(points, wantMs);
  });
}

export function vattrakStockOn(dayIso: string): VattrakStockSnapshot {
  const version = citySimVersion();
  const wantMs = parseDay(dayIso);
  if (!stockCache || stockCache.version !== version || stockCache.toMs < wantMs) {
    buildVattrakStockSeries(dayIso);
  }
  return stockCache?.byDay.get(dayIso) ?? calmStub(dayIso);
}

/**
 * Meter-Overlay bei Knappheit (klein halten).
 * unmetLuxuryRatio: wie stark Handwerk/Adel leer ausgehen → mehr Malanthir/Crime.
 */
export function vattrakScarcityMeterBias(
  level: VattrakRationLevel,
  unmetLuxuryRatio = 0,
): {
  vattrak: number;
  malanthir: number;
  crime: number;
} {
  const luxury = Math.max(0, Math.min(1, unmetLuxuryRatio));
  if (level === "critical") {
    return {
      vattrak: -8,
      malanthir: 10 + Math.round(luxury * 5),
      crime: 6 + Math.round(luxury * 3),
    };
  }
  if (level === "rationed") {
    return {
      vattrak: -3,
      malanthir: 4 + Math.round(luxury * 3),
      crime: 2 + Math.round(luxury * 2),
    };
  }
  return { vattrak: 0, malanthir: 0, crime: 0 };
}
