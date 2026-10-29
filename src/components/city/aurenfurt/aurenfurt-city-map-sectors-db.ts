"use client";

import type { Json } from "@/src/lib/database.types";
import {
  DISTRICT_SECTORS_STORAGE_KEY,
  parseStoredDistrictSectors,
  type DistrictSectorsByDistrict,
} from "./aurenfurt-sectors";
import {
  browserDb,
  dbMessage,
  deleteMissing,
  readLocal,
  rememberOnce,
  share,
  type CityMapLoad,
} from "./aurenfurt-city-map-db-shared";

const sectorLoads = new Map<string, Promise<CityMapLoad<DistrictSectorsByDistrict>>>();

export function loadCityMapSectors(worldId: string, isGm: boolean) {
  return share(sectorLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const { data, error } = await browserDb()
      .from("city_map_district_sectors")
      .select("district_id, sectors")
      .eq("world_id", worldId);
    if (error) return { data: {} as DistrictSectorsByDistrict, error: dbMessage(error), saved: false };
    if ((data ?? []).length > 0) {
      rememberOnce([DISTRICT_SECTORS_STORAGE_KEY]);
      const stored = parseStoredDistrictSectors(
        JSON.stringify({
          version: 2,
          districts: Object.fromEntries((data ?? []).map((row) => [row.district_id, row.sectors])),
        }),
      );
      return { data: stored ?? {}, error: null, saved: true };
    }
    if (!isGm) return { data: {}, error: null, saved: false };
    const stored = parseStoredDistrictSectors(readLocal(DISTRICT_SECTORS_STORAGE_KEY));
    if (!stored) {
      rememberOnce([DISTRICT_SECTORS_STORAGE_KEY]);
      return { data: {}, error: null, saved: false };
    }
    const saveError = await saveCityMapSectors(worldId, stored);
    if (saveError) {
      return {
        data: stored,
        error: `Sektoren konnten nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce([DISTRICT_SECTORS_STORAGE_KEY]);
    return { data: stored, error: null, saved: true };
  });
}

export async function saveCityMapSectors(
  worldId: string,
  sectors: DistrictSectorsByDistrict,
): Promise<string | null> {
  const rows = Object.entries(sectors)
    .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Array.isArray(entry[1]) && entry[1].length > 0)
    .map(([districtId, districtSectors]) => ({
      world_id: worldId,
      district_id: districtId,
      sectors: districtSectors as unknown as Json,
    }));
  if (rows.length === 0) return deleteMissing("city_map_district_sectors", "district_id", worldId, []);
  const { error } = await browserDb()
    .from("city_map_district_sectors")
    .upsert(rows, { onConflict: "world_id,district_id" });
  if (error) return dbMessage(error);
  return deleteMissing(
    "city_map_district_sectors",
    "district_id",
    worldId,
    rows.map((row) => row.district_id),
  );
}
