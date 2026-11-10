/**
 * Tägliche Sterblichkeit und Kriegs-Abwanderung je Viertel × Bevölkerungsschicht.
 * Einsatz: nur von aurenfurt-population (applyDailyDelta) — kein eigener Store.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import type { PopulationLayers, WarPhase } from "./aurenfurt-population-types";
import type { SimProfile } from "./aurenfurt-sim";

/** Tagesanteil der Schicht, der unter Normalbedingungen stirbt (vor Meter-Modifikatoren). */
export type LayerMortality = Record<keyof PopulationLayers, number>;

/**
 * Basisraten: Unterstadt/Südtor härter, Palast/Adel weicher.
 * Größenordnung bewusst klein (Promille der Schicht / Tag).
 */
export const DISTRICT_BASE_MORTALITY: Record<CityDistrictId, LayerMortality> = {
  unterstadt: {
    pop_nobles: 0.00004,
    pop_citizens: 0.00014,
    pop_guards: 0.00022,
    pop_lowerclass: 0.00045,
  },
  suedtor: {
    pop_nobles: 0.00003,
    pop_citizens: 0.00011,
    pop_guards: 0.0002,
    pop_lowerclass: 0.00035,
  },
  handwerkerviertel: {
    pop_nobles: 0.000025,
    pop_citizens: 0.00009,
    pop_guards: 0.00016,
    pop_lowerclass: 0.00025,
  },
  tempelbezirk: {
    pop_nobles: 0.00002,
    pop_citizens: 0.00007,
    pop_guards: 0.00014,
    pop_lowerclass: 0.0002,
  },
  akademieviertel: {
    pop_nobles: 0.00002,
    pop_citizens: 0.00006,
    pop_guards: 0.00012,
    pop_lowerclass: 0.00018,
  },
  adelsviertel: {
    pop_nobles: 0.000015,
    pop_citizens: 0.00005,
    pop_guards: 0.0001,
    pop_lowerclass: 0.00016,
  },
  palast: {
    pop_nobles: 0.00001,
    pop_citizens: 0.00004,
    pop_guards: 0.00008,
    pop_lowerclass: 0.00012,
  },
};

const WAR_MORTALITY_MULT: Record<WarPhase, number> = {
  prewar_light: 1,
  mobilization: 1.25,
  peak: 1.55,
  aftermath: 1.15,
};

function hardshipMult(profile: SimProfile) {
  const crime = Math.max(0, profile.crime - 45) / 55;
  const plague = Math.max(0, profile.malanthir - 35) / 65;
  const hunger = Math.max(0, 50 - profile.economy) / 50;
  const crush = Math.max(0, profile.refugees - 55) / 45;
  return 1 + crime * 0.45 + plague * 0.55 + hunger * 0.35 + crush * 0.7;
}

/** Effektive Tagessterblichkeit je Schicht für dieses Viertel. */
export function effectiveMortalityRates(
  districtId: CityDistrictId,
  profile: SimProfile,
  phase: WarPhase,
): LayerMortality {
  const base = DISTRICT_BASE_MORTALITY[districtId];
  const mult = hardshipMult(profile) * WAR_MORTALITY_MULT[phase];
  return {
    pop_nobles: base.pop_nobles * Math.min(2.2, mult * 0.75),
    pop_citizens: base.pop_citizens * Math.min(2.6, mult),
    pop_guards: base.pop_guards * Math.min(2.8, mult * 1.05),
    pop_lowerclass: base.pop_lowerclass * Math.min(3.2, mult * 1.15),
  };
}

/**
 * Wendet Sterblichkeit an. Rückgabe = gestorbene Köpfe (Stadt, nicht Front).
 * Garde behält ein Soft-Floor, damit die Stadt nicht „entwaffnet“ wird.
 */
export function applyLayerMortality(
  layers: PopulationLayers,
  districtId: CityDistrictId,
  profile: SimProfile,
  phase: WarPhase,
): number {
  const rates = effectiveMortalityRates(districtId, profile, phase);
  let dead = 0;

  const killNobles = layers.pop_nobles * rates.pop_nobles;
  layers.pop_nobles = Math.max(0, layers.pop_nobles - killNobles);
  dead += killNobles;

  const killCitizens = layers.pop_citizens * rates.pop_citizens;
  layers.pop_citizens = Math.max(0, layers.pop_citizens - killCitizens);
  dead += killCitizens;

  const guardsBefore = layers.pop_guards;
  const killGuards = guardsBefore * rates.pop_guards;
  layers.pop_guards = Math.max(8, guardsBefore - killGuards);
  dead += guardsBefore - layers.pop_guards;

  const killLower = layers.pop_lowerclass * rates.pop_lowerclass;
  layers.pop_lowerclass = Math.max(0, layers.pop_lowerclass - killLower);
  dead += killLower;

  return dead;
}

/**
 * Mobilmachung / Peak: Flüchtlinge & Prekariat werden ausgehoben, ausgebildet oder wandern ab.
 * - Rekrutierung → Garde (Ausbildung in der Stadt)
 * - Abwanderung → verlassen die Stadt (kein Front-Zähler; ziviler Abfluss)
 * - zusätzliche Kriegssterblichkeit steckt in applyLayerMortality
 */
export function applyRefugeeWarDrain(
  layers: PopulationLayers,
  profile: SimProfile,
  phase: WarPhase,
  options?: { allowRecruit?: boolean },
) {
  if (phase === "prewar_light") return { recruited: 0, emigrated: 0 };
  if (layers.pop_lowerclass < 5) return { recruited: 0, emigrated: 0 };

  const pressure = Math.max(0, profile.refugees - 40) / 60;
  const war =
    phase === "peak" ? 1.35 : phase === "mobilization" ? 1 : phase === "aftermath" ? 0.45 : 0;
  if (war <= 0 || pressure <= 0) return { recruited: 0, emigrated: 0 };

  const allowRecruit = options?.allowRecruit !== false;
  const pool = layers.pop_lowerclass;
  const recruitRate = allowRecruit ? (0.00025 + pressure * 0.0007) * war : 0;
  const emigrateRate = (0.0004 + pressure * 0.0011) * war;

  const recruited = Math.min(pool * 0.002, pool * recruitRate);
  const emigrated = Math.min((pool - recruited) * 0.004, (pool - recruited) * emigrateRate);

  layers.pop_lowerclass = Math.max(0, layers.pop_lowerclass - recruited - emigrated);
  layers.pop_guards += recruited;

  return { recruited, emigrated };
}
