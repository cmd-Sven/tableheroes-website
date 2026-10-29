"use client";

import { createClient } from "@/src/lib/supabase/client";

export type PlacementMarker = {
  name?: string | null;
  districtId?: string | null;
  buildingType?: string | null;
  streetId?: string | null;
};

export type CityMapPlacement = {
  buildingKey: string;
  locationId: string;
  u: number | null;
  v: number | null;
  scale: number | null;
  rotation: number | null;
  markerName: string | null;
  districtId: string | null;
  buildingType: string | null;
  streetId: string | null;
};

export type CityMapLoad<T> = {
  data: T;
  error: string | null;
  /** True, wenn der Stand aus der Datenbank kommt. */
  saved: boolean;
};

export type LocationRef = {
  id: string;
  name: string;
  type: string | null;
  districtId: string | null;
  streetId: string | null;
};

export type LocationIndex = {
  byId: Map<string, LocationRef>;
  byCatalog: Map<string, LocationRef>;
};

export function browserDb() {
  return createClient();
}

export function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Privates Fenster: der Schlüssel ist dann schon weg oder gesperrt.
  }
}

export function dbMessage(error: { message?: string } | null): string | null {
  if (!error) return null;
  const message = error.message?.trim();
  return message || "Die Datenbank hat die Stadtkarte abgelehnt.";
}

function quotedIn(ids: string[]): string {
  return `(${ids
    .map((id) => {
      if (/[",()]/.test(id)) {
        throw new Error("Ungültige Kennung in der Stadtkarte.");
      }
      return `"${id}"`;
    })
    .join(",")})`;
}

export async function deleteMissing(
  table:
    | "city_map_walls"
    | "city_map_streets"
    | "city_map_district_polygons"
    | "city_map_district_sectors",
  idColumn: "wall_id" | "street_id" | "district_id",
  worldId: string,
  ids: string[],
): Promise<string | null> {
  const query = browserDb().from(table).delete().eq("world_id", worldId);
  const { error } =
    ids.length === 0 ? await query : await query.not(idColumn, "in", quotedIn(ids));
  return dbMessage(error);
}

export function rememberOnce(keys: string[]) {
  for (const key of keys) removeLocal(key);
}

export function share<T>(bucket: Map<string, Promise<T>>, key: string, run: () => Promise<T>): Promise<T> {
  const existing = bucket.get(key);
  if (existing) return existing;
  const promise = run().finally(() => {
    if (bucket.get(key) === promise) bucket.delete(key);
  });
  bucket.set(key, promise);
  return promise;
}
