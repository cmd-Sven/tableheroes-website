import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  clampUvPoint,
  pointInPolygon,
  type DistrictPolygons,
  type UvPoint,
} from "./aurenfurt-district-polygons";

/** Feste POI-Arten für den Karten-Editor. */
export const POI_KINDS = [
  "Brunnen",
  "Statue",
  "Parkanlage",
  "Denkmal",
  "Platz",
  "sonstiger Ort",
] as const;

export type PoiKind = (typeof POI_KINDS)[number];

export function isPoiKind(value: unknown): value is PoiKind {
  return typeof value === "string" && (POI_KINDS as readonly string[]).includes(value);
}

/** Einfluss-Aspekte inkl. erweiterter Kennzahlen. */
export const POI_INFLUENCE_ASPECTS = [
  { key: "crime", label: "Kriminalität" },
  { key: "vattrak", label: "Vattrak" },
  { key: "malanthir", label: "Malanthir" },
  { key: "guard", label: "Garde" },
  { key: "refugees", label: "Flüchtlinge" },
  { key: "economy", label: "Wirtschaft" },
  { key: "unemployment", label: "Arbeitslosigkeit" },
  { key: "religion", label: "Religion" },
  { key: "knowledge", label: "Wissen" },
  { key: "prestige", label: "Ansehen" },
] as const;

export type PoiInfluenceAspect = (typeof POI_INFLUENCE_ASPECTS)[number]["key"];

export type PoiInfluence = {
  aspect: PoiInfluenceAspect;
  delta: number;
};

export type MapEditorPoiRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  image_url: string | null;
  map_u: number | null;
  map_v: number | null;
  map_district_id: string | null;
  map_poi_kind: string | null;
  map_poi_influences: unknown;
  created_via_map_editor: boolean;
  parent_location_id: string | null;
};

/** Persistierter besonderer Ort (POI) auf der Aurenfurt-Karte. */
export type AurenfurtMapPoi = {
  id: string;
  name: string;
  kind: PoiKind;
  districtId: CityDistrictId;
  u: number;
  v: number;
  description: string;
  imageUrl: string;
  influences: PoiInfluence[];
};

const DISTRICT_IDS = new Set<string>(AURENFURT_DISTRICTS.map((d) => d.id));

export function isPoiInfluenceAspect(value: unknown): value is PoiInfluenceAspect {
  return (
    typeof value === "string" &&
    POI_INFLUENCE_ASPECTS.some((entry) => entry.key === value)
  );
}

export function aspectLabel(aspect: PoiInfluenceAspect): string {
  return POI_INFLUENCE_ASPECTS.find((entry) => entry.key === aspect)?.label ?? aspect;
}

export function parsePoiInfluences(raw: unknown): PoiInfluence[] {
  if (!Array.isArray(raw)) return [];
  const out: PoiInfluence[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const aspect = (entry as { aspect?: unknown }).aspect;
    const delta = (entry as { delta?: unknown }).delta;
    if (!isPoiInfluenceAspect(aspect)) continue;
    if (typeof delta !== "number" || !Number.isFinite(delta)) continue;
    const whole = Math.trunc(delta);
    if (whole === 0) continue;
    out.push({ aspect, delta: whole });
  }
  return out;
}

/** Spielertext ohne Roh-Dashboard: „stärkt Religion“, „senkt Kriminalität“. */
export function influenceInWords(influence: PoiInfluence): string {
  const label = aspectLabel(influence.aspect);
  const abs = Math.abs(influence.delta);
  if (influence.delta > 0) {
    return abs === 1 ? `stärkt ${label}` : `stärkt ${label} spürbar`;
  }
  return abs === 1 ? `senkt ${label}` : `senkt ${label} spürbar`;
}

export function formatInfluenceDelta(influence: PoiInfluence): string {
  const sign = influence.delta > 0 ? "+" : "";
  return `${aspectLabel(influence.aspect)} ${sign}${influence.delta}`;
}

/** Summe gleicher Aspekte über mehrere POIs (SL Clean View). */
export function sumPoiInfluences(pois: AurenfurtMapPoi[]): PoiInfluence[] {
  const totals = new Map<PoiInfluenceAspect, number>();
  for (const poi of pois) {
    for (const entry of poi.influences) {
      totals.set(entry.aspect, (totals.get(entry.aspect) ?? 0) + entry.delta);
    }
  }
  return POI_INFLUENCE_ASPECTS.map(({ key }) => {
    const delta = totals.get(key) ?? 0;
    return delta === 0 ? null : { aspect: key, delta };
  }).filter((row): row is PoiInfluence => row != null);
}

export function districtIdAtUv(
  point: UvPoint,
  polygons: DistrictPolygons,
): CityDistrictId | null {
  for (const district of AURENFURT_DISTRICTS) {
    const poly = polygons[district.id]?.points;
    if (poly && pointInPolygon(point, poly)) return district.id;
  }
  return null;
}

export function mapEditorRowToPoi(row: MapEditorPoiRow): AurenfurtMapPoi | null {
  if (!row.map_poi_kind || !isPoiKind(row.map_poi_kind)) return null;
  const districtId = row.map_district_id as CityDistrictId | null;
  if (!districtId || !DISTRICT_IDS.has(districtId)) return null;
  if (typeof row.map_u !== "number" || !Number.isFinite(row.map_u)) return null;
  if (typeof row.map_v !== "number" || !Number.isFinite(row.map_v)) return null;

  const uv = clampUvPoint({ u: row.map_u, v: row.map_v });
  const imageUrl =
    (row.image_url ?? "").trim() || "/images/lore/ort-platzhalter.png";

  return {
    id: row.id,
    name: row.name,
    kind: row.map_poi_kind,
    districtId,
    u: uv.u,
    v: uv.v,
    description: (row.description ?? "").trim(),
    imageUrl,
    influences: parsePoiInfluences(row.map_poi_influences),
  };
}

export function poisInDistrict(pois: AurenfurtMapPoi[], districtId: CityDistrictId) {
  return pois.filter((poi) => poi.districtId === districtId);
}

export function findPoi(pois: AurenfurtMapPoi[], id: string | null) {
  if (!id) return null;
  return pois.find((poi) => poi.id === id) ?? null;
}
