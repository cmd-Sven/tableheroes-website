/**
 * Tägliche Viertel-/Stadtkasse in GP — reiner Derived Stat fürs Dashboard.
 * Einsatz: SocietyPanels Stichtag + Umsatz-Verlauf. Niemals in Meter oder Deltas speisen.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import { districtMetricsOn } from "./aurenfurt-history";
import { populationSeriesForRange } from "./aurenfurt-population";
import type { PopulationLayers } from "./aurenfurt-population-types";
import { parseDay } from "./aurenfurt-time";

export type DistrictFinance = {
  income: number;
  expenses: number;
  net: number;
};

/**
 * Berechnet Einnahmen, Ausgaben und Netto für ein Viertel an einem Tag.
 * @param population Schichtköpfe des Viertels
 * @param economyMeter economy 0–100
 */
export function calculateDistrictFinances(
  population: Pick<PopulationLayers, "pop_nobles" | "pop_citizens" | "pop_guards" | "pop_lowerclass">,
  economyMeter: number,
): DistrictFinance {
  const economy = Math.max(0, Math.min(100, economyMeter)) / 100;
  const income =
    (population.pop_citizens * 0.1 + population.pop_nobles * 0.5) * economy;
  const expenses = population.pop_guards * 1.0 + population.pop_lowerclass * 0.02;
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

export type FinancePoint = DistrictFinance & { day: string };

/** Tagesreihe Einnahmen/Ausgaben/Netto für Stadt oder ein Viertel (read-only). */
export function buildFinanceSeries(
  fromIso: string,
  toIso: string,
  scopeId: CityDistrictId | null,
): FinancePoint[] {
  return populationSeriesForRange(fromIso, toIso).map((pop) => {
    const dayMs = parseDay(pop.day);
    if (scopeId) {
      const layers = pop.districts[scopeId];
      const economy = districtMetricsOn(scopeId, dayMs).economy;
      return { day: pop.day, ...calculateDistrictFinances(layers, economy) };
    }
    const rows = Object.values(pop.districts).map((layers) =>
      calculateDistrictFinances(layers, districtMetricsOn(layers.districtId, dayMs).economy),
    );
    return { day: pop.day, ...sumFinances(rows) };
  });
}
