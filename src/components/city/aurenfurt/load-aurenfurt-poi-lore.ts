import {
  isPoiKind,
  parsePoiInfluences,
  type PoiInfluence,
  type PoiKind,
} from "./aurenfurt-map-pois";

export type AurenfurtPoiLoreExtras = {
  kind: PoiKind;
  influences: PoiInfluence[];
};

type LocPoiRow = {
  map_poi_kind: string | null;
  map_poi_influences: unknown;
  created_via_map_editor?: boolean | null;
  aurenfurt_street_id?: string | null;
  map_district_id?: string | null;
  map_u?: number | null;
  map_v?: number | null;
};

/** POI-Art und Einfluss aus der locations-Zeile (gleiche ID wie world_lore). */
export function poiExtrasFromLocationRow(
  row: LocPoiRow | null | undefined,
): AurenfurtPoiLoreExtras | null {
  if (!row?.map_poi_kind || !isPoiKind(row.map_poi_kind)) return null;
  return {
    kind: row.map_poi_kind,
    influences: parsePoiInfluences(row.map_poi_influences),
  };
}

/** Gebäude-Metadaten nur ohne POI-Art (POIs sind keine Gebäude). */
export function buildingMetaFromLocationRow(row: LocPoiRow | null | undefined) {
  if (!row) return null;
  if (row.map_poi_kind && isPoiKind(row.map_poi_kind)) return null;
  if (!row.created_via_map_editor && !row.aurenfurt_street_id) return null;
  const streetId = (row.aurenfurt_street_id as string | null) ?? null;
  const fromEditor = Boolean(row.created_via_map_editor);
  return {
    streetId,
    fromEditor,
    districtId: (row.map_district_id as string | null) ?? null,
    active: !fromEditor || Boolean(streetId?.trim()),
    mapU: typeof row.map_u === "number" ? row.map_u : null,
    mapV: typeof row.map_v === "number" ? row.map_v : null,
  };
}
