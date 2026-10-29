import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import type { SimProfile } from "./aurenfurt-sim";
import { activeBuildings, currentCitySimLive } from "./aurenfurt-city-sim-store";
import { allocate, demandTotals, mountainSupply, smuggleFactor } from "./aurenfurt-city-sim-magic";
import { targetsFor } from "./aurenfurt-city-sim-meters";
import { applyDistrictFeedback, cellsFor } from "./aurenfurt-city-sim-feedback";
import { ALPHA, type CitySimContext, type RawMeters } from "./aurenfurt-city-sim-types";

function approach(prev: number | null, target: number, alpha: number) {
  if (prev == null) return target;
  return prev + alpha * (target - prev);
}

export function simulateCityRange(context: CitySimContext) {
  const live = currentCitySimLive();
  const buildings = activeBuildings();
  const demand = demandTotals(buildings);
  const series = new Map<number, Record<CityDistrictId, SimProfile>>();
  let previous: Record<CityDistrictId, RawMeters> | null = null;
  const anchorSmuggle = smuggleFactor(
    context.eventWeight("winter", context.anchor),
    context.eventWeight("hunger", context.anchor),
    context.eventWeight("aufstand", context.anchor),
    context.eventWeight("zoelle", context.anchor),
  );

  for (let day = context.from; day <= context.to; day += context.dayMs) {
    const kind =
      live.liveWeatherKind && day === context.today ? live.liveWeatherKind : context.weatherKind(day);
    const winter = context.eventWeight("winter", day);
    const hunger = context.eventWeight("hunger", day);
    const supply = mountainSupply(kind, winter, hunger);
    const sat = allocate(supply, demand);
    const smuggle =
      smuggleFactor(winter, hunger, context.eventWeight("aufstand", day), context.eventWeight("zoelle", day)) /
        anchorSmuggle -
      1;
    const target = targetsFor(buildings, sat, smuggle, (districtId) => context.historyShift(districtId, day));
    const shown = {} as Record<CityDistrictId, RawMeters>;
    const profiles = {} as Record<CityDistrictId, SimProfile>;

    for (const district of AURENFURT_DISTRICTS) {
      const prior = previous?.[district.id] ?? null;
      const aimed = applyDistrictFeedback(target[district.id], prior);
      const next: RawMeters = {
        crime: approach(prior?.crime ?? null, aimed.crime, ALPHA.crime),
        vattrak: approach(prior?.vattrak ?? null, aimed.vattrak, ALPHA.vattrak),
        malanthir: approach(prior?.malanthir ?? null, aimed.malanthir, ALPHA.malanthir),
        guard: approach(prior?.guard ?? null, aimed.guard, ALPHA.guard),
        refugees: approach(prior?.refugees ?? null, aimed.refugees, ALPHA.refugees),
        economy: approach(prior?.economy ?? null, aimed.economy, ALPHA.economy),
        unemployment: approach(prior?.unemployment ?? null, aimed.unemployment, ALPHA.unemployment),
        elysia: approach(prior?.elysia ?? null, aimed.elysia, ALPHA.elysia),
        chromus: approach(prior?.chromus ?? null, aimed.chromus, ALPHA.chromus),
      };
      shown[district.id] = next;
      const shift = context.historyShift(district.id, day);
      profiles[district.id] = {
        crime: next.crime,
        vattrak: next.vattrak,
        malanthir: next.malanthir,
        guard: next.guard,
        refugees: next.refugees,
        economy: next.economy,
        unemployment: next.unemployment,
        elysia: next.elysia,
        chromus: next.chromus,
        underground: cellsFor(district.id, next.malanthir, next.guard, next.vattrak, shift),
      };
    }
    series.set(day, profiles);
    previous = shown;
  }

  return series;
}
