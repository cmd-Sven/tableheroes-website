/**
 * Obergrenzen für Stadtwache — verhindert unrealistische Garde-Aufblähung.
 * Friedenszeit ~3 %, Krieg in der Stadt ~6 % der Viertelbevölkerung.
 */

import type { PopulationLayers, WarPhase } from "./aurenfurt-population-types";

/** Max. Anteil Garde an der Viertel-Bevölkerung. */
export const GUARD_SHARE_CAP: Record<WarPhase, number> = {
  prewar_light: 0.03,
  mobilization: 0.055,
  peak: 0.06,
  aftermath: 0.04,
};

export function districtHeadcount(layers: PopulationLayers) {
  return (
    layers.pop_nobles + layers.pop_citizens + layers.pop_guards + layers.pop_lowerclass
  );
}

export function guardShare(layers: PopulationLayers) {
  const total = districtHeadcount(layers);
  if (total <= 0) return 0;
  return layers.pop_guards / total;
}

export function guardCapHeads(layers: PopulationLayers, phase: WarPhase) {
  return Math.max(8, districtHeadcount(layers) * GUARD_SHARE_CAP[phase]);
}

/** true = Rekrutierung / Ausbildung erlaubt. */
export function canRecruitGuards(layers: PopulationLayers, phase: WarPhase) {
  return layers.pop_guards < guardCapHeads(layers, phase) - 0.5;
}

/**
 * Überschüssige Garde langsam zurück zu Bürgern.
 * Greift stärker, je weiter über dem Cap.
 */
export function applyGuardCapBrake(layers: PopulationLayers, phase: WarPhase) {
  const cap = guardCapHeads(layers, phase);
  const excess = layers.pop_guards - cap;
  if (excess <= 0.25) return 0;
  // ~8–15 % des Überschusses / Tag, mindestens 0.4 Köpfe wenn klar über Cap
  const demob = Math.min(excess, Math.max(0.4, excess * (phase === "peak" ? 0.08 : 0.12)));
  layers.pop_guards -= demob;
  layers.pop_citizens += demob;
  return demob;
}
