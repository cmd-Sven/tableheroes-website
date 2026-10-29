import { CITY_BUILDINGS } from "./aurenfurt-districts";
import {
  AURENFURT_DISTRICT_LORE_IDS,
  AURENFURT_WORLD_ID,
} from "./aurenfurt-district-lore-ids";
import {
  isCityBuildingActive,
  mapEditorRowToCityBuilding,
  type MapEditorBuildingRow,
} from "./aurenfurt-map-buildings";
import { mapEditorRowToPoi, type MapEditorPoiRow } from "./aurenfurt-map-pois";

const DISTRICT_LORE_IDS = new Set<string>(Object.values(AURENFURT_DISTRICT_LORE_IDS));

/** Zeile aus `locations`, genug für die bestehenden Karten-Prüfungen. */
export type CitySimLocationRow = MapEditorBuildingRow & {
  world_id: string;
  image_url?: string | null;
  map_poi_kind?: string | null;
  map_poi_influences?: unknown;
};

/**
 * Nimmt die Aurenfurt-Simulation diesen Ort auf?
 * Gebäude: dieselbe Regel wie `loadAurenfurtMapEditorBuildings` plus `isCityBuildingActive`
 * (Karten-Editor, Welt Aurenfurt, Elternteil ist ein Stadtteil, gültiges Viertel, Straße gesetzt).
 * Kataloggebäude aus `CITY_BUILDINGS` gelten immer.
 * Besondere Orte: dieselbe Regel wie `mapEditorRowToPoi` für Editor-POIs.
 */
export function locationParticipatesInCitySimulation(row: CitySimLocationRow): boolean {
  if (row.world_id !== AURENFURT_WORLD_ID) return false;
  if (CITY_BUILDINGS.some((building) => building.id === row.id)) return true;

  if (row.map_poi_kind) {
    if (!row.created_via_map_editor) return false;
    const poiRow: MapEditorPoiRow = {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      image_url: row.image_url ?? null,
      map_u: row.map_u,
      map_v: row.map_v,
      map_district_id: row.map_district_id,
      map_poi_kind: row.map_poi_kind,
      map_poi_influences: row.map_poi_influences ?? null,
      created_via_map_editor: row.created_via_map_editor,
      parent_location_id: row.parent_location_id,
    };
    return mapEditorRowToPoi(poiRow) != null;
  }

  if (!row.created_via_map_editor) return false;
  if (!row.parent_location_id || !DISTRICT_LORE_IDS.has(row.parent_location_id)) return false;
  const building = mapEditorRowToCityBuilding(row);
  if (!building) return false;
  return isCityBuildingActive(building);
}

const LOCATION_SIM_COLUMNS =
  "id, world_id, name, type, description, image_url, map_u, map_v, map_district_id, aurenfurt_street_id, created_via_map_editor, parent_location_id, map_poi_kind, map_poi_influences";

export function loreLocationInCitySimulation(input: {
  worldId: string;
  locationId: string;
  name: string;
  type?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  locMeta?: {
    map_u?: number | null;
    map_v?: number | null;
    map_district_id?: string | null;
    aurenfurt_street_id?: string | null;
    created_via_map_editor?: boolean | null;
    map_poi_kind?: string | null;
    map_poi_influences?: unknown;
    parent_location_id?: string | null;
  } | null;
}): boolean {
  const meta = input.locMeta;
  return locationParticipatesInCitySimulation({
    id: input.locationId,
    world_id: input.worldId,
    name: input.name,
    type: input.type ?? null,
    description: input.description ?? null,
    image_url: input.imageUrl ?? null,
    map_u: typeof meta?.map_u === "number" ? meta.map_u : null,
    map_v: typeof meta?.map_v === "number" ? meta.map_v : null,
    map_district_id: meta?.map_district_id ?? null,
    aurenfurt_street_id: meta?.aurenfurt_street_id ?? null,
    created_via_map_editor: Boolean(meta?.created_via_map_editor),
    parent_location_id: meta?.parent_location_id ?? input.parentId ?? null,
    map_poi_kind: meta?.map_poi_kind ?? null,
    map_poi_influences: meta?.map_poi_influences ?? null,
  });
}

export async function anyLocationInCitySimulation(
  supabase: { from: (table: string) => any },
  locationIds: Array<string | null | undefined>,
): Promise<boolean> {
  const ids = [...new Set(locationIds.filter((id): id is string => Boolean(id && String(id).trim())))];
  if (ids.length === 0) return false;
  const { data, error } = await (supabase.from("locations") as any).select(LOCATION_SIM_COLUMNS).in("id", ids);
  if (error) {
    throw new Error("Ort für die Stadtsimulation konnte nicht geprüft werden.");
  }
  return (data ?? []).some((row: CitySimLocationRow) => locationParticipatesInCitySimulation(row));
}
