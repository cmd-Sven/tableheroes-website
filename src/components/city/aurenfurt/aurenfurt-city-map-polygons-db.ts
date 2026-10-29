"use client";

import type { Json } from "@/src/lib/database.types";
import {
  DISTRICT_POLYGONS_LEGACY_STORAGE_KEY,
  DISTRICT_POLYGONS_STORAGE_KEY,
  mergeDistrictPolygonsWithDefaults,
  parseStoredDistrictPolygons,
  type DistrictPolygons,
} from "./aurenfurt-district-polygons";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  browserDb,
  dbMessage,
  deleteMissing,
  readLocal,
  rememberOnce,
  share,
  type CityMapLoad,
} from "./aurenfurt-city-map-db-shared";

const polygonLoads = new Map<string, Promise<CityMapLoad<DistrictPolygons>>>();

export function loadCityMapPolygons(worldId: string, isGm: boolean) {
  return share(polygonLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const { data, error } = await browserDb()
      .from("city_map_district_polygons")
      .select("district_id, points, color, hover_opacity")
      .eq("world_id", worldId);
    if (error) {
      return { data: mergeDistrictPolygonsWithDefaults(null), error: dbMessage(error), saved: false };
    }
    if ((data ?? []).length > 0) {
      rememberOnce([DISTRICT_POLYGONS_STORAGE_KEY, DISTRICT_POLYGONS_LEGACY_STORAGE_KEY]);
      const stored = parseStoredDistrictPolygons(
        JSON.stringify({
          version: 2,
          districts: Object.fromEntries(
            (data ?? []).map((row) => [
              row.district_id,
              { points: row.points, color: row.color, hoverOpacity: row.hover_opacity },
            ]),
          ),
        }),
      );
      return { data: mergeDistrictPolygonsWithDefaults(stored), error: null, saved: true };
    }
    if (!isGm) {
      return { data: mergeDistrictPolygonsWithDefaults(null), error: null, saved: false };
    }
    const stored =
      parseStoredDistrictPolygons(readLocal(DISTRICT_POLYGONS_STORAGE_KEY)) ??
      parseStoredDistrictPolygons(readLocal(DISTRICT_POLYGONS_LEGACY_STORAGE_KEY));
    if (!stored) {
      rememberOnce([DISTRICT_POLYGONS_STORAGE_KEY, DISTRICT_POLYGONS_LEGACY_STORAGE_KEY]);
      return { data: mergeDistrictPolygonsWithDefaults(null), error: null, saved: false };
    }
    const merged = mergeDistrictPolygonsWithDefaults(stored);
    const saveError = await saveCityMapPolygons(worldId, merged);
    if (saveError) {
      return {
        data: merged,
        error: `Viertel-Polygone konnten nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce([DISTRICT_POLYGONS_STORAGE_KEY, DISTRICT_POLYGONS_LEGACY_STORAGE_KEY]);
    return { data: merged, error: null, saved: true };
  });
}

export async function saveCityMapPolygons(worldId: string, polygons: DistrictPolygons): Promise<string | null> {
  const rows = (Object.entries(polygons) as Array<[CityDistrictId, DistrictPolygons[CityDistrictId]]>).map(
    ([districtId, entry]) => ({
      world_id: worldId,
      district_id: districtId,
      points: entry.points as unknown as Json,
      color: entry.color,
      hover_opacity: entry.hoverOpacity,
    }),
  );
  const { error } = await browserDb()
    .from("city_map_district_polygons")
    .upsert(rows, { onConflict: "world_id,district_id" });
  if (error) return dbMessage(error);
  return deleteMissing(
    "city_map_district_polygons",
    "district_id",
    worldId,
    rows.map((row) => row.district_id),
  );
}
