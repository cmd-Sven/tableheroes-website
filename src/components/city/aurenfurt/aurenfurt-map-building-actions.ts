"use server";

import { createClient } from "@/src/lib/supabase/server";
import { AURENFURT_LORE_ID } from "./aurenfurt-districts";
import type { CityDistrictId } from "./aurenfurt-districts";
import { BUILDING_CATEGORY_BY_ID, isBuildingCategory, type BuildingCategory } from "./aurenfurt-building-categories";
import {
  AURENFURT_DISTRICT_LORE_IDS,
  AURENFURT_WORLD_ID,
  LORE_PLACEHOLDER_IMAGE,
  loreIdFromDistrictId,
} from "./aurenfurt-district-lore-ids";
import {
  mapEditorRowToCityBuilding,
  type EditorCityBuilding,
  type MapEditorBuildingRow,
} from "./aurenfurt-map-buildings";
import { revalidatePath } from "next/cache";

async function assertWorldGm(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .maybeSingle();

  if (!world || (world as { gm_id: string }).gm_id !== user.id) {
    const { data: profile } = await (supabase.from("users") as any)
      .select("primary_role")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as { primary_role?: string } | null)?.primary_role !== "Admin") {
      throw new Error("Nur Spielleiter oder Admin dürfen Kartengebäude bearbeiten.");
    }
  }

  return { supabase, userId: user.id };
}

export async function loadAurenfurtMapEditorBuildings(): Promise<EditorCityBuilding[]> {
  const supabase = await createClient();
  const districtIds = Object.values(AURENFURT_DISTRICT_LORE_IDS);

  const { data, error } = await (supabase.from("locations") as any)
    .select(
      "id, name, type, description, map_u, map_v, map_district_id, aurenfurt_street_id, created_via_map_editor, parent_location_id, npc_hint_dismissed_at",
    )
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("created_via_map_editor", true)
    .is("map_poi_kind", null)
    .in("parent_location_id", districtIds);

  if (error || !data) return [];

  return (data as MapEditorBuildingRow[])
    .map(mapEditorRowToCityBuilding)
    .filter((row): row is EditorCityBuilding => row != null);
}

export type CreateAurenfurtMapBuildingInput = {
  worldId?: string;
  districtId: CityDistrictId;
  name: string;
  summary: string;
  category: BuildingCategory;
  u: number;
  v: number;
  streetId?: string | null;
};

export type CreateAurenfurtMapBuildingResult =
  | { ok: true; building: EditorCityBuilding }
  | { ok: false; error: string };

export async function createAurenfurtMapBuilding(
  input: CreateAurenfurtMapBuildingInput,
): Promise<CreateAurenfurtMapBuildingResult> {
  const worldId = input.worldId || AURENFURT_WORLD_ID;
  try {
    const { supabase } = await assertWorldGm(worldId);

    const name = input.name.trim();
    const summary = input.summary.trim();
    if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
    if (!summary) return { ok: false, error: "Bitte eine Kurzbeschreibung angeben." };
    if (!isBuildingCategory(input.category)) {
      return { ok: false, error: "Bitte eine gültige Kategorie wählen." };
    }
    if (!Number.isFinite(input.u) || !Number.isFinite(input.v)) {
      return { ok: false, error: "Ungültige Position auf der Karte." };
    }

    const parentId = loreIdFromDistrictId(input.districtId);

    const { data: parentLore } = await (supabase.from("world_lore") as any)
      .select("id, world_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (
      !parentLore ||
      parentLore.world_id !== worldId ||
      parentLore.parent_id !== AURENFURT_LORE_ID
    ) {
      return { ok: false, error: "Stadtteil-Lore für dieses Viertel nicht gefunden." };
    }

    const { data: parentLoc } = await (supabase.from("locations") as any)
      .select("id")
      .eq("id", parentId)
      .maybeSingle();

    if (!parentLoc) {
      return {
        ok: false,
        error: "Stadtteil-Ort fehlt in der Datenbank. Bitte zuerst den Stadtteil prüfen.",
      };
    }

    const streetId = input.streetId?.trim() || null;
    const imageUrl = LORE_PLACEHOLDER_IMAGE;

    const { data: loreEntry, error: loreError } = await (supabase.from("world_lore") as any)
      .insert({
        world_id: worldId,
        name,
        type: input.category,
        parent_id: parentId,
        description: summary,
        image_url: imageUrl,
        is_revealed: false,
      })
      .select("id")
      .single();

    if (loreError || !loreEntry) {
      return {
        ok: false,
        error: loreError?.message
          ? `Lore konnte nicht gespeichert werden: ${loreError.message}`
          : "Lore konnte nicht gespeichert werden.",
      };
    }

    const loreId = loreEntry.id as string;

    const { error: locError } = await (supabase.from("locations") as any).insert({
      id: loreId,
      world_id: worldId,
      name,
      type: input.category,
      description: summary,
      image_url: imageUrl,
      parent_location_id: parentId,
      aurenfurt_street_id: streetId,
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      created_via_map_editor: true,
    });

    if (locError) {
      await (supabase.from("world_lore") as any).delete().eq("id", loreId);
      return {
        ok: false,
        error: locError.message
          ? `Ort konnte nicht gespeichert werden: ${locError.message}`
          : "Ort konnte nicht gespeichert werden.",
      };
    }

    const building = mapEditorRowToCityBuilding({
      id: loreId,
      name,
      type: input.category,
      description: summary,
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      aurenfurt_street_id: streetId,
      created_via_map_editor: true,
      parent_location_id: parentId,
    });

    if (!building) {
      return { ok: false, error: "Gebäude konnte nach dem Speichern nicht geladen werden." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/worlds/${worldId}`);
    return { ok: true, building };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern.",
    };
  }
}

export type UpdateAurenfurtMapBuildingCategoryResult =
  | { ok: true; persisted: true }
  | { ok: true; persisted: false; note: string }
  | { ok: false; error: string };

/**
 * Kategorie (= Lore-/Location-`type`) eines Kartengebäudes aktualisieren.
 * Schreibt dieselben Felder wie `createAurenfurtMapBuilding`.
 * Ohne DB-Zeile: kein Fehler — Client aktualisiert den Pin lokal.
 */
export async function updateAurenfurtMapBuildingCategory(input: {
  locationId: string;
  category: BuildingCategory;
  worldId?: string;
}): Promise<UpdateAurenfurtMapBuildingCategoryResult> {
  const worldId = input.worldId || AURENFURT_WORLD_ID;
  try {
    const { supabase } = await assertWorldGm(worldId);

    if (!isBuildingCategory(input.category)) {
      return { ok: false, error: "Bitte eine gültige Kategorie wählen." };
    }

    const locationId = input.locationId.trim();
    if (!locationId) {
      return { ok: false, error: "Gebäude nicht gefunden." };
    }

    const { data: loc } = await (supabase.from("locations") as any)
      .select("id, world_id, type")
      .eq("id", locationId)
      .maybeSingle();

    const { data: lore } = await (supabase.from("world_lore") as any)
      .select("id, world_id, type")
      .eq("id", locationId)
      .maybeSingle();

    const locOk = Boolean(loc && loc.world_id === worldId);
    const loreOk = Boolean(lore && lore.world_id === worldId);

    if (!locOk && !loreOk) {
      return {
        ok: true,
        persisted: false,
        note: "Keine Lore-/Ort-Zeile vorhanden — Kategorie nur lokal am Pin aktualisiert.",
      };
    }

    const previousLoreType = loreOk ? ((lore as { type: string | null }).type ?? null) : null;

    if (loreOk) {
      const { error: loreError } = await (supabase.from("world_lore") as any)
        .update({ type: input.category })
        .eq("id", locationId)
        .eq("world_id", worldId);

      if (loreError) {
        return {
          ok: false,
          error: loreError.message
            ? `Kategorie konnte nicht gespeichert werden: ${loreError.message}`
            : "Kategorie konnte nicht in der Lore gespeichert werden.",
        };
      }
    }

    if (locOk) {
      const { error: locError } = await (supabase.from("locations") as any)
        .update({ type: input.category })
        .eq("id", locationId)
        .eq("world_id", worldId);

      if (locError) {
        if (loreOk) {
          await (supabase.from("world_lore") as any)
            .update({ type: previousLoreType })
            .eq("id", locationId)
            .eq("world_id", worldId);
        }
        return {
          ok: false,
          error: locError.message
            ? `Kategorie konnte nicht gespeichert werden: ${locError.message}`
            : "Kategorie konnte nicht am Ort gespeichert werden.",
        };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/worlds/${worldId}`);
    revalidatePath(`/dashboard/worlds/${worldId}/lore/${locationId}`);
    return { ok: true, persisted: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern der Kategorie.",
    };
  }
}

/** Gespeicherte Kategorien für feste Code-Gebäude (Slug-Ids) aus locations/world_lore. */
export async function loadAurenfurtCodeBuildingCategories(): Promise<
  Record<string, BuildingCategory>
> {
  const supabase = await createClient();
  const ids = Object.keys(BUILDING_CATEGORY_BY_ID);
  if (ids.length === 0) return {};

  const result: Record<string, BuildingCategory> = {};

  const { data: locs } = await (supabase.from("locations") as any)
    .select("id, type")
    .eq("world_id", AURENFURT_WORLD_ID)
    .in("id", ids);

  for (const row of (locs ?? []) as { id: string; type: string | null }[]) {
    if (isBuildingCategory(row.type)) result[row.id] = row.type;
  }

  const missing = ids.filter((id) => !result[id]);
  if (missing.length > 0) {
    const { data: loreRows } = await (supabase.from("world_lore") as any)
      .select("id, type")
      .eq("world_id", AURENFURT_WORLD_ID)
      .in("id", missing);

    for (const row of (loreRows ?? []) as { id: string; type: string | null }[]) {
      if (isBuildingCategory(row.type)) result[row.id] = row.type;
    }
  }

  return result;
}

export async function updateAurenfurtBuildingStreet(input: {
  locationId: string;
  streetId: string | null;
  worldId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const worldId = input.worldId || AURENFURT_WORLD_ID;
  try {
    const { supabase } = await assertWorldGm(worldId);
    const streetId = input.streetId?.trim() || null;

    const { data: loc, error: fetchError } = await (supabase.from("locations") as any)
      .select("id, world_id, created_via_map_editor, map_district_id")
      .eq("id", input.locationId)
      .maybeSingle();

    if (fetchError || !loc || loc.world_id !== worldId) {
      return { ok: false, error: "Gebäude nicht gefunden." };
    }

    const { error } = await (supabase.from("locations") as any)
      .update({ aurenfurt_street_id: streetId })
      .eq("id", input.locationId);

    if (error) {
      return { ok: false, error: error.message || "Straße konnte nicht gespeichert werden." };
    }

    // Typ/Kategorie bleibt; optional Lore-Beschreibung unberührt.
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/worlds/${worldId}/lore/${input.locationId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler.",
    };
  }
}

export async function dismissAurenfurtBuildingNpcHint(
  locationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await assertWorldGm(AURENFURT_WORLD_ID);
    const { error } = await (supabase.from("locations") as any)
      .update({ npc_hint_dismissed_at: new Date().toISOString() })
      .eq("id", locationId)
      .eq("created_via_map_editor", true);

    if (error) {
      return { ok: false, error: error.message || "Hinweis konnte nicht geschlossen werden." };
    }
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler.",
    };
  }
}

export type AurenfurtBuildingLoreMeta = {
  streetId: string | null;
  fromEditor: boolean;
  districtId: CityDistrictId | null;
  active: boolean;
};

export async function loadAurenfurtBuildingLoreMeta(
  locationId: string,
): Promise<AurenfurtBuildingLoreMeta | null> {
  const supabase = await createClient();
  const { data } = await (supabase.from("locations") as any)
    .select("aurenfurt_street_id, created_via_map_editor, map_district_id")
    .eq("id", locationId)
    .maybeSingle();

  if (!data) return null;

  const streetId = (data.aurenfurt_street_id as string | null) ?? null;
  const fromEditor = Boolean(data.created_via_map_editor);
  const districtId = (data.map_district_id as CityDistrictId | null) ?? null;

  return {
    streetId,
    fromEditor,
    districtId,
    active: !fromEditor || Boolean(streetId?.trim()),
  };
}
