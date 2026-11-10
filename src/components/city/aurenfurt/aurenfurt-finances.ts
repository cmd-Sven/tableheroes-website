/**
 * Tägliche Viertel-/Stadtkasse in GP — Derived fürs Dashboard.
 * Basis aus Bevölkerung × Wirtschaft + historische Kassen-Ereignisse.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import { districtMetricsOn } from "./aurenfurt-history";
import { populationSeriesForRange } from "./aurenfurt-population";
import type { PopulationLayers } from "./aurenfurt-population-types";
import { parseDay } from "./aurenfurt-time";
import { kaiserTreasuryIncomeOn } from "./aurenfurt-kaiser-plays";
import { treasuryDeltaOn } from "./aurenfurt-treasury-events";

export type DistrictFinance = {
  income: number;
  expenses: number;
  net: number;
};

/**
 * Berechnet Basis-Einnahmen/Ausgaben für ein Viertel.
 * Ausgaben: Garde (Sold + Ausbildung) steigt mit Crime/Garde-Meter.
 */
export function calculateDistrictFinances(
  population: Pick<PopulationLayers, "pop_nobles" | "pop_citizens" | "pop_guards" | "pop_lowerclass">,
  economyMeter: number,
  extras?: { crime?: number; guardMeter?: number },
): DistrictFinance {
  const economy = Math.max(0, Math.min(100, economyMeter)) / 100;
  const crime = Math.max(0, Math.min(100, extras?.crime ?? 40)) / 100;
  const guardMeter = Math.max(0, Math.min(100, extras?.guardMeter ?? 50)) / 100;

  const income =
    (population.pop_citizens * 0.1 + population.pop_nobles * 0.5) * economy +
    population.pop_citizens * 0.015 * Math.max(0, economy - 0.45);

  // Sold + Ausbildungszuschlag bei hoher Kriminalität / Garde-Präsenz
  const guardPay = population.pop_guards * (0.85 + guardMeter * 0.45 + crime * 0.35);
  const welfare = population.pop_lowerclass * (0.02 + crime * 0.015);
  const upkeep = population.pop_citizens * 0.008 + population.pop_nobles * 0.04;
  const expenses = guardPay + welfare + upkeep;

  return {
    income: roundGp(income),
    expenses: roundGp(expenses),
    net: roundGp(income - expenses),
  };
}

export function sumFinances(rows: DistrictFinance[]): DistrictFinance {
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const expenses = rows.reduce((sum, row) => sum + row.expenses, 0);
  return {
    income: roundGp(income),
    expenses: roundGp(expenses),
    net: roundGp(income - expenses),
  };
}

export function formatGp(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("de-DE")} GP`;
}

function roundGp(value: number) {
  return Math.round(value * 10) / 10;
}

export type FinancePoint = DistrictFinance & { day: string; notes: string[] };

function withTreasury(
  base: DistrictFinance,
  day: string,
  scopeId: CityDistrictId | null,
): FinancePoint {
  const delta = treasuryDeltaOn(day, scopeId);
  /** Anleihen wirken stadtweit — nicht in der Viertel-Bilanz doppelt zählen. */
  const kaiserLoan = scopeId ? { income: 0, titles: [] as string[] } : kaiserTreasuryIncomeOn(day);
  const income = roundGp(base.income + delta.income + kaiserLoan.income);
  const expenses = roundGp(base.expenses + delta.expenses);
  return {
    day,
    income,
    expenses,
    net: roundGp(income - expenses),
    notes: [...delta.titles, ...kaiserLoan.titles],
  };
}

/** Tagesreihe Einnahmen/Ausgaben/Netto für Stadt oder ein Viertel. */
export function buildFinanceSeries(
  fromIso: string,
  toIso: string,
  scopeId: CityDistrictId | null,
): FinancePoint[] {
  return populationSeriesForRange(fromIso, toIso).map((pop) => {
    const dayMs = parseDay(pop.day);
    if (scopeId) {
      const layers = pop.districts[scopeId];
      const meters = districtMetricsOn(scopeId, dayMs);
      const base = calculateDistrictFinances(layers, meters.economy, {
        crime: meters.crime,
        guardMeter: meters.guard,
      });
      return withTreasury(base, pop.day, scopeId);
    }
    const rows = Object.values(pop.districts).map((layers) => {
      const meters = districtMetricsOn(layers.districtId, dayMs);
      return calculateDistrictFinances(layers, meters.economy, {
        crime: meters.crime,
        guardMeter: meters.guard,
      });
    });
    return withTreasury(sumFinances(rows), pop.day, null);
  });
}
