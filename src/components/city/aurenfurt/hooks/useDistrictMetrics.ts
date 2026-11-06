"use client";

import { startTransition, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  const [seriesReady, setSeriesReady] = useState(false);

  useEffect(() => {
    setSeriesReady(false);
    if (!districtId) return;
    const id = requestAnimationFrame(() => {
      startTransition(() => setSeriesReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [districtId, viewDay, simVersion]);

  const sim = useMemo(() => {
    if (!districtId) return cityMetricsOn(viewDay);
    return districtMetricsOn(districtId, viewDay);
  }, [districtId, viewDay, simVersion]);

  const influences = useMemo(
    () => influencesOn(districtId, viewDay),
    [districtId, viewDay, simVersion],
  );

  const series = useMemo(() => {
    if (!districtId || !seriesReady) return null;
    return districtSeries(districtId, undefined, seriesEnd);
  }, [districtId, seriesEnd, seriesReady, simVersion]);

  return { sim, series, influences };
}
