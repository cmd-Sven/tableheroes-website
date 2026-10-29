"use client";

import type { Json } from "@/src/lib/database.types";
import {
  STREETS_STORAGE_KEY,
  parseStoredStreets,
  type AurenfurtStreet,
} from "./aurenfurt-streets";
import {
  browserDb,
  dbMessage,
  deleteMissing,
  readLocal,
  rememberOnce,
  share,
  type CityMapLoad,
} from "./aurenfurt-city-map-db-shared";

const streetLoads = new Map<string, Promise<CityMapLoad<AurenfurtStreet[]>>>();

function streetRow(worldId: string, street: AurenfurtStreet) {
  return {
    world_id: worldId,
    street_id: street.id,
    name: street.name,
    description: street.description,
    points: street.points as unknown as Json,
    district_ids: street.districtIds as unknown as Json,
    category: street.category,
    width: street.width,
    connects_to: street.connectsTo as unknown as Json,
    works: street.works as unknown as Json,
    security: street.security,
    crime: street.crime,
    condition: street.condition,
    traffic: street.traffic,
  };
}

function streetsFromRows(
  rows: Array<{
    street_id: string;
    name: string;
    description: string;
    points: Json;
    district_ids: Json;
    category: string;
    width: number;
    connects_to: Json;
    works: Json;
    security: number;
    crime: number;
    condition: number;
    traffic: number;
  }>,
): AurenfurtStreet[] {
  const parsed = parseStoredStreets(
    JSON.stringify({
      version: 1,
      streets: rows.map((row) => ({
        id: row.street_id,
        name: row.name,
        description: row.description,
        points: row.points,
        districtIds: row.district_ids,
        category: row.category,
        width: row.width,
        connectsTo: row.connects_to,
        works: row.works,
        security: row.security,
        crime: row.crime,
        condition: row.condition,
        traffic: row.traffic,
      })),
    }),
  );
  return parsed ?? [];
}

export function loadCityMapStreets(worldId: string, isGm: boolean) {
  return share(streetLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const { data, error } = await browserDb()
      .from("city_map_streets")
      .select(
        "street_id, name, description, points, district_ids, category, width, connects_to, works, security, crime, condition, traffic",
      )
      .eq("world_id", worldId);
    if (error) return { data: [] as AurenfurtStreet[], error: dbMessage(error), saved: false };
    const streets = streetsFromRows(data ?? []);
    if (streets.length > 0) {
      rememberOnce([STREETS_STORAGE_KEY]);
      return { data: streets, error: null, saved: true };
    }
    if (!isGm) return { data: [], error: null, saved: false };
    const stored = parseStoredStreets(readLocal(STREETS_STORAGE_KEY));
    if (!stored || stored.length === 0) {
      rememberOnce([STREETS_STORAGE_KEY]);
      return { data: [], error: null, saved: false };
    }
    const saveError = await saveCityMapStreets(worldId, stored);
    if (saveError) {
      return {
        data: stored,
        error: `Straßen konnten nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce([STREETS_STORAGE_KEY]);
    return { data: stored, error: null, saved: true };
  });
}

export async function saveCityMapStreets(worldId: string, streets: AurenfurtStreet[]): Promise<string | null> {
  if (streets.length === 0) return deleteMissing("city_map_streets", "street_id", worldId, []);
  const { error } = await browserDb().from("city_map_streets").upsert(
    streets.map((street) => streetRow(worldId, street)),
    { onConflict: "world_id,street_id" },
  );
  if (error) return dbMessage(error);
  return deleteMissing(
    "city_map_streets",
    "street_id",
    worldId,
    streets.map((street) => street.id),
  );
}
