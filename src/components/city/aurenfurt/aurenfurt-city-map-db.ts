"use client";

import { createClient } from "@/src/lib/supabase/client";
import type { Json } from "@/src/lib/database.types";
import {
  BUILDING_POSITIONS_STORAGE_KEY,
  parseStoredBuildingPositions,
  type BuildingPositions,
} from "./aurenfurt-building-positions";
import {
  DISTRICT_POLYGONS_LEGACY_STORAGE_KEY,
  DISTRICT_POLYGONS_STORAGE_KEY,
  mergeDistrictPolygonsWithDefaults,
  parseStoredDistrictPolygons,
  type DistrictPolygons,
} from "./aurenfurt-district-polygons";
import { CITY_BUILDINGS, type CityDistrictId } from "./aurenfurt-districts";
import {
  LANDMARK_ROTATIONS_STORAGE_KEY,
  parseStoredLandmarkRotations,
  type LandmarkRotations,
} from "./aurenfurt-landmark-rotations";
import {
  LANDMARK_SCALES_STORAGE_KEY,
  parseStoredLandmarkScales,
  type LandmarkScales,
} from "./aurenfurt-landmark-scales";
import { mapEditorRowToCityBuilding, type EditorCityBuilding } from "./aurenfurt-map-buildings";
import {
  DISTRICT_SECTORS_STORAGE_KEY,
  parseStoredDistrictSectors,
  type DistrictSectorsByDistrict,
} from "./aurenfurt-sectors";
import {
  STREETS_STORAGE_KEY,
  STREETS_VISIBLE_GM_KEY,
  STREETS_VISIBLE_PLAYER_KEY,
  parseStoredStreets,
  type AurenfurtStreet,
} from "./aurenfurt-streets";
import { WALLS_STORAGE_KEY, parseStoredWalls, type AurenfurtWall } from "./aurenfurt-walls";
import {
  WEATHER_FX_STORAGE_KEY,
  defaultWeatherFxPreference,
  parseStoredWeatherFx,
  type WeatherFxPreference,
} from "./aurenfurt-weather-fx";
import type { UvPoint } from "./aurenfurt-district-polygons";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type LocationRef = {
  id: string;
  name: string;
  type: string | null;
  districtId: string | null;
  streetId: string | null;
};

type LocationIndex = {
  byId: Map<string, LocationRef>;
  byCatalog: Map<string, LocationRef>;
};

function browserDb() {
  return createClient();
}

function readLocal(key: string): string | null {
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

function dbMessage(error: { message?: string } | null): string | null {
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

async function deleteMissing(
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

function rememberOnce(keys: string[]) {
  for (const key of keys) removeLocal(key);
}

const wallsLoads = new Map<string, Promise<CityMapLoad<AurenfurtWall[]>>>();
const streetLoads = new Map<string, Promise<CityMapLoad<AurenfurtStreet[]>>>();
const polygonLoads = new Map<string, Promise<CityMapLoad<DistrictPolygons>>>();
const sectorLoads = new Map<string, Promise<CityMapLoad<DistrictSectorsByDistrict>>>();
const placementLoads = new Map<string, Promise<CityMapLoad<CityMapPlacement[]>>>();
const prefsLoads = new Map<string, Promise<CityMapLoad<ViewerPrefs>>>();
const locationIndexes = new Map<string, LocationIndex>();

function share<T>(bucket: Map<string, Promise<T>>, key: string, run: () => Promise<T>): Promise<T> {
  const existing = bucket.get(key);
  if (existing) return existing;
  const promise = run().finally(() => {
    if (bucket.get(key) === promise) bucket.delete(key);
  });
  bucket.set(key, promise);
  return promise;
}

function wallRow(worldId: string, wall: AurenfurtWall) {
  return {
    world_id: worldId,
    wall_id: wall.id,
    name: wall.name,
    points: wall.points as unknown as Json,
    curve: wall.curve,
    height: wall.height,
    thickness: wall.thickness,
    texture_scale: wall.textureScale,
    brightness: wall.brightness,
    merlon_count: wall.merlonCount,
    merlon_size: wall.merlonSize,
  };
}

function wallFromRow(row: {
  wall_id: string;
  name: string;
  points: Json;
  curve: number;
  height: number;
  thickness: number;
  texture_scale: number;
  brightness: number;
  merlon_count: number;
  merlon_size: number;
}): AurenfurtWall | null {
  const parsed = parseStoredWalls(
    JSON.stringify({
      version: 1,
      walls: [
        {
          id: row.wall_id,
          name: row.name,
          points: row.points,
          curve: row.curve,
          height: row.height,
          thickness: row.thickness,
          textureScale: row.texture_scale,
          brightness: row.brightness,
          merlonCount: row.merlon_count,
          merlonSize: row.merlon_size,
        },
      ],
    }),
  );
  return parsed?.[0] ?? null;
}

export function loadCityMapWalls(worldId: string, isGm: boolean) {
  return share(wallsLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const { data, error } = await browserDb()
      .from("city_map_walls")
      .select(
        "wall_id, name, points, curve, height, thickness, texture_scale, brightness, merlon_count, merlon_size",
      )
      .eq("world_id", worldId);
    if (error) {
      return { data: [] as AurenfurtWall[], error: dbMessage(error), saved: false };
    }
    const walls = (data ?? [])
      .map(wallFromRow)
      .filter((wall): wall is AurenfurtWall => wall !== null);
    if (walls.length > 0) {
      rememberOnce([WALLS_STORAGE_KEY]);
      return { data: walls, error: null, saved: true };
    }
    if (!isGm) {
      return { data: [], error: null, saved: false };
    }
    const stored = parseStoredWalls(readLocal(WALLS_STORAGE_KEY));
    if (!stored || stored.length === 0) {
      rememberOnce([WALLS_STORAGE_KEY]);
      return { data: [], error: null, saved: false };
    }
    const saveError = await saveCityMapWalls(worldId, stored);
    if (saveError) {
      return {
        data: stored,
        error: `Die Mauer konnte nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce([WALLS_STORAGE_KEY]);
    return { data: stored, error: null, saved: true };
  });
}

export async function saveCityMapWalls(worldId: string, walls: AurenfurtWall[]): Promise<string | null> {
  if (walls.length === 0) {
    return deleteMissing("city_map_walls", "wall_id", worldId, []);
  }
  const { error } = await browserDb().from("city_map_walls").upsert(
    walls.map((wall) => wallRow(worldId, wall)),
    { onConflict: "world_id,wall_id" },
  );
  if (error) return dbMessage(error);
  return deleteMissing(
    "city_map_walls",
    "wall_id",
    worldId,
    walls.map((wall) => wall.id),
  );
}

async function loadLocationIndex(worldId: string): Promise<LocationIndex | { error: string }> {
  const cached = locationIndexes.get(worldId);
  if (cached) return cached;
  const { data, error } = await browserDb()
    .from("locations")
    .select("id, map_building_id, name, type, map_district_id, aurenfurt_street_id")
    .eq("world_id", worldId);
  if (error) return { error: dbMessage(error) ?? "Orte konnten nicht gelesen werden." };
  const byId = new Map<string, LocationRef>();
  const byCatalog = new Map<string, LocationRef>();
  for (const row of data ?? []) {
    const ref: LocationRef = {
      id: row.id,
      name: row.name,
      type: row.type,
      districtId: row.map_district_id,
      streetId: row.aurenfurt_street_id,
    };
    byId.set(row.id, ref);
    if (row.map_building_id) byCatalog.set(row.map_building_id, ref);
  }
  const index = { byId, byCatalog };
  locationIndexes.set(worldId, index);
  return index;
}

function resolveLocation(buildingKey: string, index: LocationIndex, marker?: PlacementMarker): LocationRef | null {
  const known = index.byId.get(buildingKey) ?? index.byCatalog.get(buildingKey);
  if (known) {
    return {
      ...known,
      name: marker?.name?.trim() || known.name,
      type: marker?.buildingType ?? known.type,
      districtId: marker?.districtId ?? known.districtId,
      streetId: marker?.streetId ?? known.streetId,
    };
  }
  if (!UUID_RE.test(buildingKey)) return null;
  return {
    id: buildingKey,
    name: marker?.name?.trim() || "",
    type: marker?.buildingType ?? null,
    districtId: marker?.districtId ?? null,
    streetId: marker?.streetId ?? null,
  };
}

function placementFromRow(row: {
  building_key: string;
  location_id: string;
  u: number | null;
  v: number | null;
  scale: number | null;
  rotation: number | null;
  marker_name: string | null;
  district_id: string | null;
  building_type: string | null;
  street_id: string | null;
}): CityMapPlacement {
  return {
    buildingKey: row.building_key,
    locationId: row.location_id,
    u: row.u,
    v: row.v,
    scale: row.scale,
    rotation: row.rotation,
    markerName: row.marker_name,
    districtId: row.district_id,
    buildingType: row.building_type,
    streetId: row.street_id,
  };
}

const PLACEMENT_LOCAL_KEYS = [
  BUILDING_POSITIONS_STORAGE_KEY,
  LANDMARK_SCALES_STORAGE_KEY,
  LANDMARK_ROTATIONS_STORAGE_KEY,
];

export function placementsToPositions(rows: CityMapPlacement[]): BuildingPositions {
  const positions: BuildingPositions = {};
  for (const row of rows) {
    if (typeof row.u === "number" && typeof row.v === "number") {
      positions[row.buildingKey] = { u: row.u, v: row.v };
    }
  }
  return positions;
}

export function placementsToScales(rows: CityMapPlacement[]): LandmarkScales {
  const scales: LandmarkScales = {};
  for (const row of rows) {
    if (typeof row.scale === "number") scales[row.buildingKey] = row.scale;
  }
  return scales;
}

export function placementsToRotations(rows: CityMapPlacement[]): LandmarkRotations {
  const rotations: LandmarkRotations = {};
  for (const row of rows) {
    if (typeof row.rotation === "number") rotations[row.buildingKey] = row.rotation;
  }
  return rotations;
}

export function markerBuildingsFromPlacements(rows: CityMapPlacement[]): EditorCityBuilding[] {
  const buildings: EditorCityBuilding[] = [];
  for (const row of rows) {
    if (CITY_BUILDINGS.some((building) => building.id === row.buildingKey)) continue;
    if (!row.markerName || !row.districtId) continue;
    const building = mapEditorRowToCityBuilding({
      id: row.locationId,
      name: row.markerName,
      type: row.buildingType,
      description: null,
      map_u: row.u,
      map_v: row.v,
      map_district_id: row.districtId,
      aurenfurt_street_id: row.streetId,
      created_via_map_editor: true,
      parent_location_id: null,
    });
    if (building) buildings.push(building);
  }
  return buildings;
}

export function loadCityMapPlacements(worldId: string, isGm: boolean) {
  return share(placementLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const { data, error } = await browserDb()
      .from("city_map_placements")
      .select(
        "building_key, location_id, u, v, scale, rotation, marker_name, district_id, building_type, street_id",
      )
      .eq("world_id", worldId);
    if (error) {
      return { data: [] as CityMapPlacement[], error: dbMessage(error), saved: false };
    }
    const rows = (data ?? []).map(placementFromRow);
    if (rows.length > 0) {
      rememberOnce(PLACEMENT_LOCAL_KEYS);
      return { data: rows, error: null, saved: true };
    }
    if (!isGm) {
      return { data: [], error: null, saved: false };
    }
    const positions = parseStoredBuildingPositions(readLocal(BUILDING_POSITIONS_STORAGE_KEY)) ?? {};
    const scales = parseStoredLandmarkScales(readLocal(LANDMARK_SCALES_STORAGE_KEY)) ?? {};
    const rotations = parseStoredLandmarkRotations(readLocal(LANDMARK_ROTATIONS_STORAGE_KEY)) ?? {};
    const keys = new Set([...Object.keys(positions), ...Object.keys(scales), ...Object.keys(rotations)]);
    if (keys.size === 0) {
      rememberOnce(PLACEMENT_LOCAL_KEYS);
      return { data: [], error: null, saved: false };
    }
    const index = await loadLocationIndex(worldId);
    if ("error" in index) {
      return { data: [], error: index.error, saved: false };
    }
    const imported: CityMapPlacement[] = [];
    const skipped: string[] = [];
    for (const buildingKey of keys) {
      const location = resolveLocation(buildingKey, index);
      if (!location) {
        skipped.push(buildingKey);
        continue;
      }
      const point = positions[buildingKey];
      imported.push({
        buildingKey,
        locationId: location.id,
        u: point?.u ?? null,
        v: point?.v ?? null,
        scale: typeof scales[buildingKey] === "number" ? scales[buildingKey] : null,
        rotation: typeof rotations[buildingKey] === "number" ? rotations[buildingKey] : null,
        markerName: location.name || null,
        districtId: location.districtId,
        buildingType: location.type,
        streetId: location.streetId,
      });
    }
    if (imported.length === 0) {
      return {
        data: [],
        error: `Gebäudeplätze konnten keinem Ort zugeordnet werden: ${skipped.join(", ")}`,
        saved: false,
      };
    }
    const saveError = await writePlacements(worldId, imported, true);
    if (saveError) {
      return { data: [], error: saveError, saved: false };
    }
    rememberOnce(PLACEMENT_LOCAL_KEYS);
    return {
      data: imported,
      error: skipped.length > 0 ? `Nicht zugeordnet und deshalb nicht übernommen: ${skipped.join(", ")}` : null,
      saved: true,
    };
  });
}

async function writePlacements(worldId: string, rows: CityMapPlacement[], rollbackOnLocationError: boolean) {
  const payload = rows.map((row) => ({
    world_id: worldId,
    building_key: row.buildingKey,
    location_id: row.locationId,
    u: row.u,
    v: row.v,
    scale: row.scale,
    rotation: row.rotation,
    marker_name: row.markerName,
    district_id: row.districtId,
    building_type: row.buildingType,
    street_id: row.streetId,
  }));
  const { error } = await browserDb()
    .from("city_map_placements")
    .upsert(payload, { onConflict: "world_id,building_key" });
  if (error) return dbMessage(error);
  const located = rows.filter((row) => typeof row.u === "number" && typeof row.v === "number");
  const updates = await Promise.all(
    located.map((row) =>
      browserDb()
        .from("locations")
        .update({ map_u: row.u, map_v: row.v })
        .eq("id", row.locationId)
        .eq("world_id", worldId),
    ),
  );
  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    if (rollbackOnLocationError) {
      await browserDb().from("city_map_placements").delete().eq("world_id", worldId);
    }
    return dbMessage(failed.error);
  }
  return null;
}

export async function saveCityMapPosition(
  worldId: string,
  buildingKey: string,
  point: UvPoint,
  marker?: PlacementMarker,
): Promise<string | null> {
  return saveCityMapPositions(worldId, { [buildingKey]: point }, marker ? { [buildingKey]: marker } : undefined);
}

export async function saveCityMapPositions(
  worldId: string,
  positions: BuildingPositions,
  markers?: Record<string, PlacementMarker>,
): Promise<string | null> {
  const keys = Object.keys(positions);
  if (keys.length === 0) return null;
  const index = await loadLocationIndex(worldId);
  if ("error" in index) return index.error;
  const rows: CityMapPlacement[] = [];
  for (const buildingKey of keys) {
    const location = resolveLocation(buildingKey, index, markers?.[buildingKey]);
    if (!location) return `„${buildingKey}“ ist keinem Ort zugeordnet. Die Position bleibt ungesichert.`;
    const point = positions[buildingKey];
    rows.push({
      buildingKey,
      locationId: location.id,
      u: point.u,
      v: point.v,
      scale: null,
      rotation: null,
      markerName: location.name || null,
      districtId: location.districtId,
      buildingType: location.type,
      streetId: location.streetId,
    });
  }
  return mergePlacementPatch(worldId, rows, ["u", "v", "marker"]);
}

export async function saveCityMapScale(
  worldId: string,
  buildingKey: string,
  scale: number,
): Promise<string | null> {
  const index = await loadLocationIndex(worldId);
  if ("error" in index) return index.error;
  const location = resolveLocation(buildingKey, index);
  if (!location) return `„${buildingKey}“ ist keinem Ort zugeordnet. Der Maßstab bleibt ungesichert.`;
  return mergePlacementPatch(worldId, [
    {
      buildingKey,
      locationId: location.id,
      u: null,
      v: null,
      scale,
      rotation: null,
      markerName: location.name || null,
      districtId: location.districtId,
      buildingType: location.type,
      streetId: location.streetId,
    },
  ], ["scale", "marker"]);
}

export async function saveCityMapRotation(
  worldId: string,
  buildingKey: string,
  rotation: number,
): Promise<string | null> {
  const index = await loadLocationIndex(worldId);
  if ("error" in index) return index.error;
  const location = resolveLocation(buildingKey, index);
  if (!location) return `„${buildingKey}“ ist keinem Ort zugeordnet. Die Drehung bleibt ungesichert.`;
  return mergePlacementPatch(worldId, [
    {
      buildingKey,
      locationId: location.id,
      u: null,
      v: null,
      scale: null,
      rotation,
      markerName: location.name || null,
      districtId: location.districtId,
      buildingType: location.type,
      streetId: location.streetId,
    },
  ], ["rotation", "marker"]);
}

type PlacementPatch = "u" | "v" | "scale" | "rotation" | "marker";

async function mergePlacementPatch(worldId: string, rows: CityMapPlacement[], fields: PlacementPatch[]) {
  const { data, error } = await browserDb()
    .from("city_map_placements")
    .select("building_key, location_id, u, v, scale, rotation, marker_name, district_id, building_type, street_id")
    .eq("world_id", worldId)
    .in(
      "building_key",
      rows.map((row) => row.buildingKey),
    );
  if (error) return dbMessage(error);
  const existing = new Map((data ?? []).map((row) => [row.building_key, placementFromRow(row)]));
  const merged = rows.map((row) => {
    const previous = existing.get(row.buildingKey);
    return {
      buildingKey: row.buildingKey,
      locationId: row.locationId,
      u: fields.includes("u") ? row.u : (previous?.u ?? null),
      v: fields.includes("v") ? row.v : (previous?.v ?? null),
      scale: fields.includes("scale") ? row.scale : (previous?.scale ?? null),
      rotation: fields.includes("rotation") ? row.rotation : (previous?.rotation ?? null),
      markerName: fields.includes("marker") ? row.markerName || previous?.markerName || null : (previous?.markerName ?? row.markerName),
      districtId: fields.includes("marker") ? row.districtId ?? previous?.districtId ?? null : (previous?.districtId ?? null),
      buildingType: fields.includes("marker") ? row.buildingType ?? previous?.buildingType ?? null : (previous?.buildingType ?? null),
      streetId: fields.includes("marker") ? row.streetId ?? previous?.streetId ?? null : (previous?.streetId ?? null),
    };
  });
  const invalid = merged.find((row) => row.u == null && row.scale == null && row.rotation == null);
  if (invalid) {
    return `Für „${invalid.buildingKey}“ fehlt eine Position, ein Maßstab oder eine Drehung.`;
  }
  return writePlacements(worldId, merged, false);
}

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

export type ViewerPrefs = {
  streetsVisible: boolean;
  buildingsVisible: boolean;
  poisVisible: boolean;
  wallsVisible: boolean;
  weather: WeatherFxPreference;
};

function defaultViewerPrefs(): ViewerPrefs {
  return {
    streetsVisible: true,
    buildingsVisible: true,
    poisVisible: true,
    wallsVisible: true,
    weather: defaultWeatherFxPreference(),
  };
}

const VIEWER_LOCAL_KEYS = [STREETS_VISIBLE_GM_KEY, STREETS_VISIBLE_PLAYER_KEY, WEATHER_FX_STORAGE_KEY];

function readImportedVisibility(isGm: boolean): boolean | null {
  const preferred = readLocal(isGm ? STREETS_VISIBLE_GM_KEY : STREETS_VISIBLE_PLAYER_KEY);
  const fallback = readLocal(isGm ? STREETS_VISIBLE_PLAYER_KEY : STREETS_VISIBLE_GM_KEY);
  const raw = preferred ?? fallback;
  if (raw == null) return null;
  return raw !== "0" && raw !== "false";
}

async function currentUserId(): Promise<string | { error: string }> {
  const { data, error } = await browserDb().auth.getUser();
  if (error) return { error: dbMessage(error) ?? "Anmeldung konnte nicht gelesen werden." };
  if (!data.user) return { error: "Für die Stadtkarte ist eine Anmeldung nötig." };
  return data.user.id;
}

export function loadCityMapViewerPrefs(worldId: string, isGm: boolean) {
  return share(prefsLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const userId = await currentUserId();
    if (typeof userId !== "string") {
      return {
        data: defaultViewerPrefs(),
        error: userId.error,
        saved: false,
      };
    }
    const { data, error } = await browserDb()
      .from("city_map_viewer_prefs")
      .select(
        "streets_visible, buildings_visible, pois_visible, walls_visible, weather_enabled, weather_mode",
      )
      .eq("world_id", worldId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return {
        data: defaultViewerPrefs(),
        error: dbMessage(error),
        saved: false,
      };
    }
    if (data) {
      rememberOnce(VIEWER_LOCAL_KEYS);
      return {
        data: {
          streetsVisible: data.streets_visible,
          buildingsVisible: data.buildings_visible,
          poisVisible: data.pois_visible,
          wallsVisible: data.walls_visible,
          weather: {
            enabled: data.weather_enabled,
            mode: data.weather_mode as WeatherFxPreference["mode"],
          },
        },
        error: null,
        saved: true,
      };
    }
    const weather = parseStoredWeatherFx(readLocal(WEATHER_FX_STORAGE_KEY));
    const streetsVisible = readImportedVisibility(isGm);
    const hasLocal =
      readLocal(WEATHER_FX_STORAGE_KEY) != null ||
      readLocal(STREETS_VISIBLE_GM_KEY) != null ||
      readLocal(STREETS_VISIBLE_PLAYER_KEY) != null;
    const prefs: ViewerPrefs = {
      ...defaultViewerPrefs(),
      streetsVisible: streetsVisible ?? true,
      weather: weather ?? defaultWeatherFxPreference(),
    };
    if (!hasLocal) {
      return { data: prefs, error: null, saved: false };
    }
    const saveError = await writeViewerPrefs(worldId, userId, prefs);
    if (saveError) {
      return {
        data: prefs,
        error: `Die Kartenansicht konnte nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce(VIEWER_LOCAL_KEYS);
    return { data: prefs, error: null, saved: true };
  });
}

type ViewerFlagColumn = "streets_visible" | "buildings_visible" | "pois_visible" | "walls_visible";

async function upsertViewerPatch(
  worldId: string,
  patch: {
    streets_visible?: boolean;
    buildings_visible?: boolean;
    pois_visible?: boolean;
    walls_visible?: boolean;
    weather_enabled?: boolean;
    weather_mode?: string;
  },
): Promise<string | null> {
  const userId = await currentUserId();
  if (typeof userId !== "string") return userId.error;
  const { error } = await browserDb()
    .from("city_map_viewer_prefs")
    .upsert(
      {
        world_id: worldId,
        user_id: userId,
        ...patch,
      },
      { onConflict: "world_id,user_id" },
    );
  return dbMessage(error);
}

async function writeViewerPrefs(worldId: string, userId: string, prefs: ViewerPrefs): Promise<string | null> {
  const { error } = await browserDb().from("city_map_viewer_prefs").upsert(
    {
      world_id: worldId,
      user_id: userId,
      streets_visible: prefs.streetsVisible,
      buildings_visible: prefs.buildingsVisible,
      pois_visible: prefs.poisVisible,
      walls_visible: prefs.wallsVisible,
      weather_enabled: prefs.weather.enabled,
      weather_mode: prefs.weather.mode,
    },
    { onConflict: "world_id,user_id" },
  );
  return dbMessage(error);
}

export async function saveCityMapViewerFlag(
  worldId: string,
  column: ViewerFlagColumn,
  visible: boolean,
): Promise<string | null> {
  if (column === "streets_visible") return upsertViewerPatch(worldId, { streets_visible: visible });
  if (column === "buildings_visible") return upsertViewerPatch(worldId, { buildings_visible: visible });
  if (column === "pois_visible") return upsertViewerPatch(worldId, { pois_visible: visible });
  return upsertViewerPatch(worldId, { walls_visible: visible });
}

export async function saveCityMapStreetsVisible(worldId: string, streetsVisible: boolean): Promise<string | null> {
  return saveCityMapViewerFlag(worldId, "streets_visible", streetsVisible);
}

export async function saveCityMapWeather(worldId: string, weather: WeatherFxPreference): Promise<string | null> {
  return upsertViewerPatch(worldId, {
    weather_enabled: weather.enabled,
    weather_mode: weather.mode,
  });
}
