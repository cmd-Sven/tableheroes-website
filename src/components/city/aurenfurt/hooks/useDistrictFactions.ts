"use client";

import { useMemo } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
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

  return useMemo(() => {
    if (!districtId) return { factions: [] };
    return { factions: factionsInDistrict(districtId, viewDay) };
  }, [districtId, viewDay]);
}
