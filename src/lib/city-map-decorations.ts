"use client";

import { createClient } from "@/src/lib/supabase/client";
import {
  clampDecoPoint,
  clampDecoRotation,
  clampDecoScale,
  type CityMapDecoration,
} from "@/src/components/city/aurenfurt/aurenfurt-deco-catalog";

function dbMessage(error: { message?: string } | null, fallback: string): string {
  const message = error?.message?.trim();
  return message ? `${fallback} ${message}` : fallback;
}

export async function loadCityMapDecorations(
  worldId: string,
): Promise<{ data: CityMapDecoration[]; error: string | null }> {
  const { data, error } = await createClient()
    .from("city_map_decorations")
    .select("decoration_id, model_key, name, u, v, scale, rotation")
    .eq("world_id", worldId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      data: [],
      error: dbMessage(error, "Die Deko konnte nicht aus der Datenbank geladen werden."),
    };
  }

  const items: CityMapDecoration[] = [];
  for (const row of data ?? []) {
    if (!Number.isFinite(row.u) || !Number.isFinite(row.v)) continue;
    const point = clampDecoPoint({ u: row.u, v: row.v });
    items.push({
      id: row.decoration_id,
      modelKey: row.model_key,
      name: row.name,
      u: point.u,
      v: point.v,
      scale: clampDecoScale(row.scale),
      rotation: clampDecoRotation(row.rotation),
    });
  }
  return { data: items, error: null };
}

export async function insertCityMapDecoration(
  worldId: string,
  item: CityMapDecoration,
): Promise<string | null> {
  const point = clampDecoPoint({ u: item.u, v: item.v });
  const { error } = await createClient().from("city_map_decorations").insert({
    world_id: worldId,
    decoration_id: item.id,
    model_key: item.modelKey,
    name: item.name,
    u: point.u,
    v: point.v,
    scale: clampDecoScale(item.scale),
    rotation: clampDecoRotation(item.rotation),
  });
  if (error) return dbMessage(error, "Die Deko konnte nicht gespeichert werden.");
  return null;
}

export async function updateCityMapDecoration(
  worldId: string,
  item: CityMapDecoration,
): Promise<string | null> {
  const point = clampDecoPoint({ u: item.u, v: item.v });
  const { data, error } = await createClient()
    .from("city_map_decorations")
    .update({
      name: item.name,
      u: point.u,
      v: point.v,
      scale: clampDecoScale(item.scale),
      rotation: clampDecoRotation(item.rotation),
    })
    .eq("world_id", worldId)
    .eq("decoration_id", item.id)
    .select("decoration_id");
  if (error) return dbMessage(error, "Die Deko konnte nicht gespeichert werden.");
  if (!data || data.length === 0) {
    return "Die Deko konnte nicht gespeichert werden. Die Zeile fehlt oder der Schreibzugriff wurde abgelehnt.";
  }
  return null;
}

export async function deleteCityMapDecoration(worldId: string, decorationId: string): Promise<string | null> {
  const { data, error } = await createClient()
    .from("city_map_decorations")
    .delete()
    .eq("world_id", worldId)
    .eq("decoration_id", decorationId)
    .select("decoration_id");
  if (error) return dbMessage(error, "Die Deko konnte nicht gelöscht werden.");
  if (!data || data.length === 0) {
    return "Die Deko konnte nicht gelöscht werden. Die Zeile fehlt oder der Schreibzugriff wurde abgelehnt.";
  }
  return null;
}
