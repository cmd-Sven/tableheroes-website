/**
 * Startbevölkerung am 26.09.2023 (HISTORY_START): 32.122 Köpfe,
 * nach Lore auf Viertel und Schichten aufgeteilt.
 * Einsatz: aurenfurt-population.ts als Tag-0-Zustand.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import {
  sumLayers,
  type DistrictPopulation,
  type PopulationLayers,
} from "./aurenfurt-population-types";

/** Feste Viertel-Totals (Summe = 32.122). */
export const POPULATION_START_TOTALS: Record<CityDistrictId, number> = {
  palast: 803,
  adelsviertel: 2409,
  akademieviertel: 2811,
  tempelbezirk: 3614,
  suedtor: 4818,
  handwerkerviertel: 6424,
  unterstadt: 11243,
};

/**
 * Schicht-Splits je Viertel (Köpfe). Adelige vor allem Palast/Adel;
 * Garde ~3 % Stadtweit (historisch glaubwürdige stehende Wache), Schwerpunkt Südtor/Tempel/Palast.
 * Freigewordene Köpfe → Bürger.
 */
const LAYER_SEED: Record<CityDistrictId, PopulationLayers> = {
  palast: { pop_nobles: 280, pop_citizens: 380, pop_guards: 100, pop_lowerclass: 43 },
  adelsviertel: { pop_nobles: 720, pop_citizens: 1320, pop_guards: 120, pop_lowerclass: 249 },
  akademieviertel: { pop_nobles: 140, pop_citizens: 2290, pop_guards: 90, pop_lowerclass: 291 },
  tempelbezirk: { pop_nobles: 180, pop_citizens: 2560, pop_guards: 150, pop_lowerclass: 724 },
  suedtor: { pop_nobles: 50, pop_citizens: 2630, pop_guards: 250, pop_lowerclass: 1888 },
  handwerkerviertel: { pop_nobles: 60, pop_citizens: 4170, pop_guards: 130, pop_lowerclass: 2064 },
  unterstadt: { pop_nobles: 20, pop_citizens: 2410, pop_guards: 110, pop_lowerclass: 8703 },
};

function assertSeedIntegrity() {
  let city = 0;
  for (const id of Object.keys(LAYER_SEED) as CityDistrictId[]) {
    const layers = LAYER_SEED[id];
    const total = sumLayers(layers);
    if (total !== POPULATION_START_TOTALS[id]) {
      throw new Error(`Population seed mismatch ${id}: ${total} ≠ ${POPULATION_START_TOTALS[id]}`);
    }
    city += total;
  }
  if (city !== 32122) throw new Error(`City seed sum ${city} ≠ 32122`);
}

assertSeedIntegrity();

export function seedDistrictPopulation(districtId: CityDistrictId): DistrictPopulation {
  const layers = LAYER_SEED[districtId];
  return {
    districtId,
    ...layers,
    population_total: sumLayers(layers),
  };
}

export function seedAllDistrictPopulations(): Record<CityDistrictId, DistrictPopulation> {
  const out = {} as Record<CityDistrictId, DistrictPopulation>;
  for (const id of Object.keys(LAYER_SEED) as CityDistrictId[]) {
    out[id] = seedDistrictPopulation(id);
  }
  return out;
}
