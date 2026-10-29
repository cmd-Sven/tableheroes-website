"use client";

import type { Json } from "@/src/lib/database.types";
import { WALLS_STORAGE_KEY, parseStoredWalls, type AurenfurtWall } from "./aurenfurt-walls";
import {
  browserDb,
  dbMessage,
  deleteMissing,
  readLocal,
  rememberOnce,
  share,
  type CityMapLoad,
} from "./aurenfurt-city-map-db-shared";

const wallsLoads = new Map<string, Promise<CityMapLoad<AurenfurtWall[]>>>();

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
