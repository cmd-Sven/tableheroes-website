"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import { citySimVersion, subscribeCitySim } from "../aurenfurt-city-sim";
import { factionsInDistrict, type FactionStanding } from "../aurenfurt-factions";
import { parseDay } from "../aurenfurt-history";

export type DistrictFactions = {
  factions: FactionStanding[];
};

export function useDistrictFactions(
  districtId: CityDistrictId | null,
  dayIso: string,
): DistrictFactions {
  const viewDay = useMemo(() => parseDay(dayIso), [dayIso]);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);

  return useMemo(() => {
    if (!districtId) return { factions: [] };
    return { factions: factionsInDistrict(districtId, viewDay) };
  }, [districtId, viewDay, simVersion]);
}
