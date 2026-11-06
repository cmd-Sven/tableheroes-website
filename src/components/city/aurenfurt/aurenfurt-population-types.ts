/**
 * Typen für Bevölkerungsschichten, Frontkräfte und Tages-Snapshots.
 * Einsatz: Seed, Populations-Serie, Dashboard-Charts und Finanzen (read-only).
 */

import type { CityDistrictId } from "./aurenfurt-districts";

/** Vier Schichten; Summe = population_total. */
export type PopulationLayers = {
  pop_nobles: number;
  pop_citizens: number;
  pop_guards: number;
  pop_lowerclass: number;
};

export type DistrictPopulation = PopulationLayers & {
  districtId: CityDistrictId;
  population_total: number;
};

export type CityPopulationSnapshot = {
  day: string;
  /** ISO-Tag der Snapshot-Berechnung. */
  districts: Record<CityDistrictId, DistrictPopulation>;
  /** Abgeordnete / an der Front stehende Soldaten (stadtweit). */
  soldiers_at_front: number;
  /** Kumulative Frontverluste (gefallen/vermisst), Anzeige. */
  front_casualties: number;
  population_total: number;
  pop_nobles: number;
  pop_citizens: number;
  pop_guards: number;
  pop_lowerclass: number;
};

export type WarPhase = "prewar_light" | "mobilization" | "peak" | "aftermath";

export const POP_LAYER_KEYS = [
  "pop_nobles",
  "pop_citizens",
  "pop_guards",
  "pop_lowerclass",
] as const satisfies ReadonlyArray<keyof PopulationLayers>;

export const POP_LAYER_LABELS: Record<keyof PopulationLayers, string> = {
  pop_nobles: "Adelige",
  pop_citizens: "Bürger",
  pop_guards: "Garde / Stadtwachen",
  pop_lowerclass: "Prekariat / Flüchtlinge",
};

export function sumLayers(layers: PopulationLayers): number {
  return (
    layers.pop_nobles + layers.pop_citizens + layers.pop_guards + layers.pop_lowerclass
  );
}

export function roundLayers(layers: PopulationLayers): PopulationLayers {
  return {
    pop_nobles: Math.max(0, Math.round(layers.pop_nobles)),
    pop_citizens: Math.max(0, Math.round(layers.pop_citizens)),
    pop_guards: Math.max(0, Math.round(layers.pop_guards)),
    pop_lowerclass: Math.max(0, Math.round(layers.pop_lowerclass)),
  };
}
