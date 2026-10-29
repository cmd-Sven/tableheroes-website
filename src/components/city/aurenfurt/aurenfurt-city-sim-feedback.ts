import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import type { UndergroundCell } from "./aurenfurt-sim";
import { clampScore } from "./aurenfurt-city-sim-meters";
import type { HistoryShift, RawMeters } from "./aurenfurt-city-sim-types";

/** Wie viel Raum Zellen noch haben. Dichte Garde und reichliches Vattrak drücken, löschen aber nicht. */
export function undergroundRoom(guard: number, vattrak: number) {
  const guardPressure = Math.max(0, guard - 42) / 190;
  const ritePressure = Math.max(0, vattrak - 55) / 320;
  return Math.max(0.5, 1 - guardPressure - ritePressure);
}

const FEEDBACK_CAP = 14;

function capDelta(delta: number) {
  return Math.max(-FEEDBACK_CAP, Math.min(FEEDBACK_CAP, delta));
}

/**
 * Verschiebt die strukturellen Tagesziele mit dem Stand von gestern.
 * Hohe Wirtschaft dämpft Notverbrechen, hohe Kriminalität vertreibt Händler.
 * Malanthir treibt Kriminalität und Habgier, Vattrak beruhigt und dämpft die Kopplung.
 * Hohe Kriminalität ruft die Garde; die Garde selbst engt die Zellen erst über undergroundRoom ein.
 */
export function applyDistrictFeedback(base: RawMeters, prior: RawMeters | null): RawMeters {
  if (!prior) return base;
  const calm = 1 - Math.min(100, Math.max(0, prior.vattrak)) / 280;

  const necessityCrime = Math.max(0, 42 - prior.economy) * 0.32;
  const prosperityCalm = Math.max(0, prior.economy - 48) * 0.18;
  const malanthirCrime = prior.malanthir * 0.1;
  const vattrakCalm = prior.vattrak * 0.05;
  const guardOrder = Math.max(0, prior.guard - 55) * 0.1;
  const crimeDelta = (necessityCrime - prosperityCalm + malanthirCrime - vattrakCalm - guardOrder) * calm;

  const merchantFlight = Math.max(0, prior.crime - 32) * 0.16;
  const vattrakTrade = Math.max(0, prior.vattrak - 50) * 0.04;
  const economyDelta = (-merchantFlight + vattrakTrade) * calm;

  const calledGuard = Math.max(0, prior.crime - 28) * 0.2;
  const vattrakOrder = prior.vattrak * 0.03;
  const malanthirRot = Math.max(0, prior.malanthir - 20) * 0.06;
  const guardDelta = (calledGuard + vattrakOrder - malanthirRot) * calm;

  const greedFromDisorder = Math.max(0, prior.crime - 45) * 0.1;
  const greedFromWealth = Math.max(0, prior.economy - 72) * (prior.malanthir / 100) * 0.08;
  const vattrakPurge = Math.max(0, prior.vattrak - 50) * 0.08;
  const malanthirDelta = (greedFromDisorder + greedFromWealth - vattrakPurge) * calm;

  const malanthirSiphon = Math.max(0, prior.malanthir - 25) * 0.05;
  const vattrakDelta = -malanthirSiphon * calm;

  const joblessness = Math.max(0, 40 - prior.economy) * 0.2 + prior.malanthir * 0.05;
  const hiring = Math.max(0, prior.economy - 60) * 0.08;
  const unemploymentDelta = (joblessness - hiring) * calm;

  return {
    crime: clampScore(base.crime + capDelta(crimeDelta)),
    economy: clampScore(base.economy + capDelta(economyDelta)),
    guard: clampScore(base.guard + capDelta(guardDelta)),
    malanthir: clampScore(base.malanthir + capDelta(malanthirDelta)),
    vattrak: clampScore(base.vattrak + capDelta(vattrakDelta)),
    unemployment: clampScore(base.unemployment + capDelta(unemploymentDelta)),
    refugees: base.refugees,
    elysia: base.elysia,
    chromus: base.chromus,
  };
}

export function cellsFor(districtId: CityDistrictId, malanthir: number, guard: number, vattrak: number, shift: HistoryShift): UndergroundCell[] {
  const district = AURENFURT_DISTRICTS.find((entry) => entry.id === districtId);
  if (!district) return [];
  const factor = 0.35 + malanthir / 120;
  const brand = malanthir > 40 ? (malanthir - 40) * 0.45 : 0;
  const room = undergroundRoom(guard, vattrak);
  return district.sim.underground.flatMap((cell) => {
    const hist = shift.cells.find((entry) => entry.name === cell.name)?.delta ?? 0;
    const strength = clampScore((cell.strength * factor + hist + brand) * room);
    if (strength < 1) return [];
    return [{ name: cell.name, strength }];
  });
}
