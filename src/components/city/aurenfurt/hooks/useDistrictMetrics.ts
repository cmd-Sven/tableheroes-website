"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import { citySimVersion, subscribeCitySim } from "../aurenfurt-city-sim";
import {
  cityMetricsOn,
  districtMetricsOn,
  districtSeries,
  influencesOn,
  parseDay,
  utcToday,
  type ActiveInfluence,
  type DistrictDay,
} from "../aurenfurt-history";
import type { SimProfile } from "../aurenfurt-sim";

export type DistrictMetrics = {
  /** Kennzahlen des gewählten Tags, nur für das Viertel oder als Stadtmittel. */
  sim: SimProfile;
  /** Volle Tagesreihe der letzten drei Jahre. Nur für ein gewähltes Viertel. */
  series: DistrictDay[] | null;
  influences: ActiveInfluence[];
};

export function useDistrictMetrics(
  districtId: CityDistrictId | null,
  dayIso: string,
): DistrictMetrics {
  const viewDay = useMemo(() => parseDay(dayIso), [dayIso]);
  const seriesEnd = useMemo(() => utcToday(), []);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);

  return useMemo(() => {
    if (!districtId) {
      return {
        sim: cityMetricsOn(viewDay),
        series: null,
        influences: influencesOn(null, viewDay),
      };
    }
    return {
      sim: districtMetricsOn(districtId, viewDay),
      series: districtSeries(districtId, undefined, seriesEnd),
      influences: influencesOn(districtId, viewDay),
    };
  }, [districtId, viewDay, seriesEnd, simVersion]);
}
