"use server";

import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { AURENFURT_LORE_ID } from "./aurenfurt-districts";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  AURENFURT_WORLD_ID,
  LORE_PLACEHOLDER_IMAGE,
  loreIdFromDistrictId,
} from "./aurenfurt-district-lore-ids";
import {
  isPoiInfluenceAspect,
  isPoiKind,
  mapEditorRowToPoi,
  poiTooltipImage,
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

/** Kartenfelder ohne gm_notes. locations bleibt für Notizen nur dem Spielleiter offen. */
const POI_COLUMNS =
  "id, name, type, description, image_url, map_u, map_v, map_district_id, map_poi_kind, map_poi_influences, created_via_map_editor, parent_location_id";

type LoreFace = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

async function rpcFlag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fn: "user_is_world_gm" | "user_can_access_world_maps",
) {
  const { data, error } = await (supabase as any).rpc(fn, { p_world_id: AURENFURT_WORLD_ID });
  if (error) return false;
  return data === true;
}

async function selectMapPois(client: { from: (table: string) => any }): Promise<MapEditorPoiRow[]> {
  const { data, error } = await client
    .from("locations")
    .select(POI_COLUMNS)
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("created_via_map_editor", true)
    .not("map_poi_kind", "is", null);
  if (error || !data) return [];
  return data as MapEditorPoiRow[];
}

async function readableLoreById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
) {
  const faces = new Map<string, LoreFace>();
  if (ids.length === 0) return faces;
  const { data } = await (supabase.from("world_lore") as any)
    .select("id, name, description, image_url")
    .in("id", ids);
  for (const row of (data ?? []) as LoreFace[]) {
    faces.set(row.id, row);
  }
  return faces;
}

/** Fehlende Lore einmalig anlegen. Vorhandene Zeilen bleiben unangetastet. */
async function ensurePoiLore(
  writer: { from: (table: string) => any },
  rows: MapEditorPoiRow[],
) {
  if (rows.length === 0) return;
  const ids = rows.map((row) => row.id);
  const { data } = await writer.from("world_lore").select("id").in("id", ids);
  const have = new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
  const missing = rows.filter((row) => !have.has(row.id));
  for (const row of missing) {
    await writer.from("world_lore").insert({
      id: row.id,
      world_id: AURENFURT_WORLD_ID,
      name: row.name,
      type: row.map_poi_kind,
      parent_id: row.parent_location_id,
      description: (row.description ?? "").trim(),
      image_url: (row.image_url ?? "").trim() || LORE_PLACEHOLDER_IMAGE,
      is_revealed: false,
    });
  }
}

function withLoreFace(row: MapEditorPoiRow, lore: LoreFace | undefined, mayReadLocationText: boolean) {
  if (lore) {
    return {
      ...row,
      name: lore.name?.trim() || row.name,
      description: (lore.description ?? "").trim(),
      image_url:
        poiTooltipImage(lore.image_url) ||
        poiTooltipImage(row.image_url) ||
        (lore.image_url ?? "").trim() ||
        row.image_url,
    };
  }
  if (!mayReadLocationText) return { ...row, description: "" };
  return row;
}

export async function loadAurenfurtMapEditorPois(): Promise<AurenfurtMapPoi[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [worldGm, mapViewer] = await Promise.all([
    rpcFlag(supabase, "user_is_world_gm"),
    rpcFlag(supabase, "user_can_access_world_maps"),
  ]);

  const { data: profile } = await (supabase.from("users") as any)
    .select("is_admin, primary_role")
    .eq("id", user.id)
    .maybeSingle();
  const staff =
    Boolean((profile as { is_admin?: boolean } | null)?.is_admin) ||
    (profile as { primary_role?: string } | null)?.primary_role === "Admin";

  const userRows = await selectMapPois(supabase as any);

  let rows: MapEditorPoiRow[] = [];
  let canBackfill = false;

  if (userRows.length > 0 || worldGm) {
    rows = userRows;
    canBackfill = true;
  } else if (staff || mapViewer) {
    const admin = tryCreateAdminClient();
    if (!admin) return [];
    rows = await selectMapPois(admin as any);
    canBackfill = staff;
  } else {
    return [];
  }

  if (canBackfill) {
    const writer = worldGm ? supabase : tryCreateAdminClient();
    if (writer) {
      try {
        await ensurePoiLore(writer as any, rows);
      } catch {
        // Marker bleiben sichtbar, auch wenn die Lore-Nachziehung scheitert.
      }
    }
  }

  const lore = await readableLoreById(
    supabase,
    rows.map((row) => row.id),
  );
  return rows
    .map((row) => withLoreFace(row, lore.get(row.id), worldGm || staff))
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

    const { data: siblingLore } = await (supabase.from("world_lore") as any)
      .select("id, name, description, image_url")
      .eq("world_id", worldId)
      .eq("parent_id", parentId);

    const linked = ((siblingLore ?? []) as LoreFace[]).find(
      (entry) => entry.name.trim().toLowerCase() === name.toLowerCase(),
    );

    let loreId: string;
    let createdLore = false;
    let displayName = name;
    let displayDescription = description;
    let displayImage = imageUrl;

    if (linked) {
      loreId = linked.id;
      displayName = linked.name.trim() || name;
      displayDescription = (linked.description ?? "").trim() || description;
      displayImage = (linked.image_url ?? "").trim() || imageUrl;
      const lorePatch: { description?: string; image_url?: string } = {};
      if (!(linked.description ?? "").trim()) lorePatch.description = description;
      const linkedImage = (linked.image_url ?? "").trim();
      if ((!linkedImage || linkedImage === LORE_PLACEHOLDER_IMAGE) && imageUrl !== LORE_PLACEHOLDER_IMAGE) {
        lorePatch.image_url = imageUrl;
        displayImage = imageUrl;
      }
      if (Object.keys(lorePatch).length > 0) {
        await (supabase.from("world_lore") as any).update(lorePatch).eq("id", loreId);
      }
    } else {
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
      loreId = loreEntry.id as string;
      createdLore = true;
    }

    const locationPayload = {
      world_id: worldId,
      name: displayName,
      type: loreType,
      description: displayDescription,
      image_url: displayImage,
      parent_location_id: parentId,
      map_u: input.u,
      map_v: input.v,
      map_district_id: input.districtId,
      map_poi_kind: input.kind,
      map_poi_influences: influences,
      created_via_map_editor: true,
    };

    const { data: existingLoc } = await (supabase.from("locations") as any)
      .select("id")
      .eq("id", loreId)
      .maybeSingle();

    const { error: locError } = existingLoc
      ? await (supabase.from("locations") as any).update(locationPayload).eq("id", loreId)
      : await (supabase.from("locations") as any).insert({ id: loreId, ...locationPayload });

    if (locError) {
      if (createdLore) {
        await (supabase.from("world_lore") as any).delete().eq("id", loreId);
      }
      return {
        ok: false,
        error: locError.message
          ? `Ort konnte nicht gespeichert werden: ${locError.message}`
          : "Ort konnte nicht gespeichert werden.",
      };
    }

    const poi = mapEditorRowToPoi({
      id: loreId,
      name: displayName,
      type: loreType,
      description: displayDescription,
      image_url: displayImage,
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

export type MapLocationLeadNpc = {
  id: string;
  name: string;
  imageUrl: string;
  role: string | null;
};

/**
 * Führender NPC eines Orts: zuerst Ansässige (home), sonst Gäste (current).
 * Nur mit Portrait, damit das Kartenfenster einen Kreis zeigen kann.
 */
export async function loadLeadingNpcForMapLocation(
  worldId: string,
  locationId: string,
  options?: { fallbackCatalogId?: string | null },
): Promise<MapLocationLeadNpc | null> {
  if (!worldId || !locationId) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const canRead =
      (await rpcFlag(supabase, "user_can_access_world_maps")) ||
      (await rpcFlag(supabase, "user_is_world_gm"));
    if (!canRead) {
      const { data: profile } = await (supabase.from("users") as any)
        .select("is_admin, primary_role")
        .eq("id", user.id)
        .maybeSingle();
      const admin =
        Boolean((profile as { is_admin?: boolean } | null)?.is_admin) ||
        (profile as { primary_role?: string } | null)?.primary_role === "Admin";
      if (!admin) return null;
    }

    const pick = (
      rows: Array<{ id: string; name: string | null; image_url: string | null; role: string | null }>,
    ) => {
      for (const row of rows) {
        const imageUrl = (row.image_url ?? "").trim();
        if (!imageUrl) continue;
        const name = (row.name ?? "").trim();
        if (!name) continue;
        return {
          id: row.id,
          name,
          imageUrl,
          role: (row.role ?? "").trim() || null,
        } satisfies MapLocationLeadNpc;
      }
      return null;
    };

    const { data: residents } = await (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("world_id", worldId)
      .eq("home_location_id", locationId)
      .order("name", { ascending: true })
      .limit(8);

    const resident = pick(
      (residents ?? []) as Array<{
        id: string;
        name: string | null;
        image_url: string | null;
        role: string | null;
      }>,
    );
    if (resident) return resident;

    const { data: guests } = await (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("world_id", worldId)
      .eq("current_location_id", locationId)
      .order("name", { ascending: true })
      .limit(8);

    const guest = pick(
      (guests ?? []) as Array<{
        id: string;
        name: string | null;
        image_url: string | null;
        role: string | null;
      }>,
    );
    if (guest) return guest;

    const fallbackCatalogId = options?.fallbackCatalogId?.trim();
    if (!fallbackCatalogId) return null;

    const { data: catalogNpc } = await (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("world_id", worldId)
      .eq("aurenfurt_catalog_id", fallbackCatalogId)
      .maybeSingle();

    return catalogNpc
      ? pick([
          catalogNpc as {
            id: string;
            name: string | null;
            image_url: string | null;
            role: string | null;
          },
        ])
      : null;
  } catch {
    return null;
  }
}

export type MapNpcOverlayDetail = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string | null;
  alignment: string | null;
  imageUrl: string;
  description: string | null;
  forCitySimulation: boolean;
  cityInfluenceTier: string | null;
  cityFactionId: string | null;
  cityDeity: string | null;
  cityAgenda: string | null;
  cityAxisLoyalCriminal: number | null;
  cityAxisGreedyAltruist: number | null;
  cityAxisPiousSkeptic: number | null;
  cityAxisSuperstitionReason: number | null;
  /** Nur für den Spielleiter befüllt. */
  eventCards: Array<{
    id: string;
    title: string;
    text: string;
    trigger: string | null;
    sortOrder: number;
    durationDays?: number;
    range?: "district" | "adjacent" | "sector" | "city";
    sectorLabel?: string | null;
    effects?: Array<{ meter: string; delta: number }>;
  }>;
  cardPlays: Array<{ cardId: string; startedOn: string }>;
  isGm: boolean;
};

/**
 * Volle Karten-Overlay-Daten zu einem NPC (Portrait-Klick).
 * Ereigniskarten nur für den Spielleiter der Welt.
 */
export async function loadMapNpcOverlayDetail(
  worldId: string,
  npcId: string,
): Promise<MapNpcOverlayDetail | null> {
  if (!worldId || !npcId) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [mapViewer, worldGm] = await Promise.all([
      rpcFlag(supabase, "user_can_access_world_maps"),
      rpcFlag(supabase, "user_is_world_gm"),
    ]);
    const { data: profile } = await (supabase.from("users") as any)
      .select("is_admin, primary_role")
      .eq("id", user.id)
      .maybeSingle();
    const staff =
      Boolean((profile as { is_admin?: boolean } | null)?.is_admin) ||
      (profile as { primary_role?: string } | null)?.primary_role === "Admin";
    if (!mapViewer && !worldGm && !staff) return null;

    const { data: row } = await (supabase.from("npcs") as any)
      .select(
        "id, name, title, role, race, status, alignment, image_url, description, world_id, for_city_simulation, city_influence_tier, city_faction_id, city_deity, city_agenda, city_axis_loyal_criminal, city_axis_greedy_altruist, city_axis_pious_skeptic, city_axis_superstition_reason, city_event_deck, city_card_plays",
      )
      .eq("id", npcId)
      .eq("world_id", worldId)
      .maybeSingle();
    if (!row) return null;

    const { citySimulationFromDb } = await import("@/src/lib/npcs/city-simulation");
    const city = citySimulationFromDb(row as Parameters<typeof citySimulationFromDb>[0]);
    const isGm = worldGm || staff;
    const imageUrl = ((row as { image_url?: string | null }).image_url ?? "").trim();
    if (!imageUrl) return null;

    return {
      id: String((row as { id: string }).id),
      name: String((row as { name?: string | null }).name ?? "").trim() || "Unbekannt",
      title: ((row as { title?: string | null }).title ?? "").trim() || null,
      role: ((row as { role?: string | null }).role ?? "").trim() || null,
      race: ((row as { race?: string | null }).race ?? "").trim() || null,
      status: ((row as { status?: string | null }).status ?? "").trim() || null,
      alignment: ((row as { alignment?: string | null }).alignment ?? "").trim() || null,
      imageUrl,
      description: ((row as { description?: string | null }).description ?? "").trim() || null,
      forCitySimulation: city.forCitySimulation,
      cityInfluenceTier: city.cityInfluenceTier,
      cityFactionId: city.cityFactionId,
      cityDeity: city.cityDeity,
      cityAgenda: city.cityAgenda,
      cityAxisLoyalCriminal: city.cityAxisLoyalCriminal,
      cityAxisGreedyAltruist: city.cityAxisGreedyAltruist,
      cityAxisPiousSkeptic: city.cityAxisPiousSkeptic,
      cityAxisSuperstitionReason: city.cityAxisSuperstitionReason,
      eventCards: isGm
        ? city.cityEventDeck.map((card) => ({
            id: card.id,
            title: card.title,
            text: card.text,
            trigger: card.trigger ?? null,
            sortOrder: card.sortOrder,
            durationDays: card.durationDays,
            range: card.range,
            sectorLabel: card.sectorLabel ?? null,
            effects: card.effects,
          }))
        : [],
      cardPlays: isGm ? city.cityCardPlays.map((play) => ({ ...play })) : [],
      isGm,
    };
  } catch {
    return null;
  }
}

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
