"use server";

import { createClient } from "@/src/lib/supabase/server";
import { AURENFURT_LORE_ID } from "./aurenfurt-districts";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  AURENFURT_DISTRICT_LORE_IDS,
  AURENFURT_WORLD_ID,
  LORE_PLACEHOLDER_IMAGE,
  loreIdFromDistrictId,
} from "./aurenfurt-district-lore-ids";
import {
  isPoiInfluenceAspect,
  isPoiKind,
  mapEditorRowToPoi,
  type AurenfurtMapPoi,
  type MapEditorPoiRow,
  type PoiInfluence,
  type PoiKind,
} from "./aurenfurt-map-pois";
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
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
      throw new Error("Nur Spielleiter oder Admin dürfen besondere Orte anlegen.");
    }
  }

  return { supabase, userId: user.id };
}

function normalizeInfluences(raw: PoiInfluence[]): PoiInfluence[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Bitte mindestens einen Einflussfaktor angeben." };
  }
  const out: PoiInfluence[] = [];
  for (const entry of raw) {
    if (!isPoiInfluenceAspect(entry.aspect)) {
      return { error: "Ungültiger Einfluss-Aspekt." };
    }
    if (typeof entry.delta !== "number" || !Number.isFinite(entry.delta)) {
      return { error: "Delta muss eine ganze Zahl sein." };
    }
    const delta = Math.trunc(entry.delta);
    if (delta === 0) {
      return { error: "Delta darf nicht 0 sein." };
    }
    out.push({ aspect: entry.aspect, delta });
  }
  return out;
}

export async function loadAurenfurtMapEditorPois(): Promise<AurenfurtMapPoi[]> {
  const supabase = await createClient();
  const districtIds = Object.values(AURENFURT_DISTRICT_LORE_IDS);

  const { data, error } = await (supabase.from("locations") as any)
    .select(
      "id, name, type, description, image_url, map_u, map_v, map_district_id, map_poi_kind, map_poi_influences, created_via_map_editor, parent_location_id",
    )
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("created_via_map_editor", true)
    .not("map_poi_kind", "is", null)
    .in("parent_location_id", districtIds);

  if (error || !data) return [];

  return (data as MapEditorPoiRow[])
    .map(mapEditorRowToPoi)
    .filter((row): row is AurenfurtMapPoi => row != null);
}

export type CreateAurenfurtMapPoiInput = {
  worldId?: string;
  districtId: CityDistrictId;
  name: string;
  description: string;
  kind: PoiKind;
  imageUrl?: string | null;
  influences: PoiInfluence[];
  u: number;
  v: number;
};

export type CreateAurenfurtMapPoiResult =
  | { ok: true; poi: AurenfurtMapPoi }
  | { ok: false; error: string };

export async function createAurenfurtMapPoi(
  input: CreateAurenfurtMapPoiInput,
): Promise<CreateAurenfurtMapPoiResult> {
  const worldId = input.worldId || AURENFURT_WORLD_ID;
  try {
    const { supabase } = await assertWorldGm(worldId);

    const name = input.name.trim();
    const description = input.description.trim();
    if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
    if (!description) return { ok: false, error: "Bitte eine Beschreibung angeben." };
    if (!isPoiKind(input.kind)) {
      return { ok: false, error: "Bitte eine gültige Art wählen." };
    }
    if (!Number.isFinite(input.u) || !Number.isFinite(input.v)) {
      return { ok: false, error: "Ungültige Position auf der Karte." };
    }

    const influences = normalizeInfluences(input.influences);
    if ("error" in influences) return { ok: false, error: influences.error };

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

    const imageUrl = (input.imageUrl ?? "").trim() || LORE_PLACEHOLDER_IMAGE;
    // Art (Brunnen, Statue, …) als Lore-/Location-Typ, damit die Kinderliste sie klar zeigt
    const loreType = input.kind;

    const { data: loreEntry, error: loreError } = await (supabase.from("world_lore") as any)
      .insert({
        world_id: worldId,
        name,
        type: loreType,
        parent_id: parentId,
        description,
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
      type: loreType,
      description,
      image_url: imageUrl,
      parent_location_id: parentId,
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      map_poi_kind: input.kind,
      map_poi_influences: influences,
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

    const poi = mapEditorRowToPoi({
      id: loreId,
      name,
      type: loreType,
      description,
      image_url: imageUrl,
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      map_poi_kind: input.kind,
      map_poi_influences: influences,
      created_via_map_editor: true,
      parent_location_id: parentId,
    });

    if (!poi) {
      return { ok: false, error: "Ort konnte nach dem Speichern nicht geladen werden." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/worlds/${worldId}`);
    revalidatePath(`/dashboard/worlds/${worldId}/lore/${parentId}`);
    return { ok: true, poi };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern.",
    };
  }
}

export type UpdateAurenfurtMapPoiPositionInput = {
  worldId?: string;
  poiId: string;
  districtId: CityDistrictId;
  u: number;
  v: number;
};

export type UpdateAurenfurtMapPoiPositionResult =
  | { ok: true; poi: AurenfurtMapPoi }
  | { ok: false; error: string };

/** Bestehende DB-Felder map_u / map_v / map_district_id — kein neuer Speicherpfad. */
export async function updateAurenfurtMapPoiPosition(
  input: UpdateAurenfurtMapPoiPositionInput,
): Promise<UpdateAurenfurtMapPoiPositionResult> {
  const worldId = input.worldId || AURENFURT_WORLD_ID;
  try {
    const { supabase } = await assertWorldGm(worldId);

    if (!Number.isFinite(input.u) || !Number.isFinite(input.v)) {
      return { ok: false, error: "Ungültige Position auf der Karte." };
    }

    const parentId = loreIdFromDistrictId(input.districtId);

    const { data: existing, error: fetchError } = await (supabase.from("locations") as any)
      .select(
        "id, name, type, description, image_url, map_u, map_v, map_district_id, map_poi_kind, map_poi_influences, created_via_map_editor, parent_location_id, world_id",
      )
      .eq("id", input.poiId)
      .maybeSingle();

    if (fetchError || !existing || existing.world_id !== worldId) {
      return { ok: false, error: "Ort nicht gefunden." };
    }
    if (!existing.created_via_map_editor || !existing.map_poi_kind) {
      return { ok: false, error: "Nur Karten-Editor-Orte können verschoben werden." };
    }

    const { error } = await (supabase.from("locations") as any)
      .update({
        map_u: input.u,
        map_v: input.v,
        map_district_id: input.districtId,
        parent_location_id: parentId,
      })
      .eq("id", input.poiId);

    if (error) {
      return {
        ok: false,
        error: error.message
          ? `Position konnte nicht gespeichert werden: ${error.message}`
          : "Position konnte nicht gespeichert werden.",
      };
    }

    // Lore-Parent nachziehen, falls das Viertel gewechselt wurde.
    await (supabase.from("world_lore") as any)
      .update({ parent_id: parentId })
      .eq("id", input.poiId);

    const poi = mapEditorRowToPoi({
      ...(existing as MapEditorPoiRow),
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      parent_location_id: parentId,
    });

    if (!poi) {
      return { ok: false, error: "Ort konnte nach dem Speichern nicht geladen werden." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/worlds/${worldId}`);
    return { ok: true, poi };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern.",
    };
  }
}
