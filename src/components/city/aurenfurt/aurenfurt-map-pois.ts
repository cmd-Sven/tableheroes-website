import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { LORE_PLACEHOLDER_IMAGE } from "./aurenfurt-district-lore-ids";
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
  "Laden/Geschäft",
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
  { key: "elysia", label: "Elysia" },
  { key: "chromus", label: "Chromus" },
  { key: "religion", label: "Religion" },
  { key: "knowledge", label: "Wissen" },
  { key: "prestige", label: "Ansehen" },
] as const;

export type PoiInfluenceAspect = (typeof POI_INFLUENCE_ASPECTS)[number]["key"];

export type PoiInfluence = {
  aspect: PoiInfluenceAspect;
  delta: number;
};

/** Einflussbereich auf der Karte: Sektor-Schritte oder ganzes Viertel. */
export const POI_REACH_MODES = ["sector", "district"] as const;
export type PoiReachMode = (typeof POI_REACH_MODES)[number];
/** Nach feinerem Sektornetz: bis 4 Schritte ≈ frühere ~2 Schritte bei 0.04. */
export const POI_REACH_RADII = [0, 1, 2, 3, 4] as const;
export type PoiReachRadius = (typeof POI_REACH_RADII)[number];

export type PoiReachSetting = {
  mode: PoiReachMode;
  /** Nur bei mode=sector: 0 = eigener Sektor, sonst Chebyshev-Schritte. */
  radius: PoiReachRadius;
};

export const DEFAULT_POI_REACH: PoiReachSetting = { mode: "sector", radius: 2 };

export function isPoiReachRadius(value: unknown): value is PoiReachRadius {
  return typeof value === "number" && (POI_REACH_RADII as readonly number[]).includes(value);
}

export function isPoiReachMode(value: unknown): value is PoiReachMode {
  return typeof value === "string" && (POI_REACH_MODES as readonly string[]).includes(value);
}

export function parsePoiReach(raw: unknown, influences: PoiInfluence[] = []): PoiReachSetting {
  const fromEnvelope =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as { reach?: unknown }).reach
      : null;
  const source = fromEnvelope && typeof fromEnvelope === "object" ? fromEnvelope : null;
  if (source) {
    const mode = (source as { mode?: unknown }).mode;
    const radiusRaw = (source as { radius?: unknown }).radius;
    if (mode === "district") return { mode: "district", radius: 0 };
    if (mode === "sector") {
      const radius = Number(radiusRaw);
      if (isPoiReachRadius(radius)) return { mode: "sector", radius };
      return { mode: "sector", radius: DEFAULT_POI_REACH.radius };
    }
  }
  // Alte Einträge ohne Reach: aus Einflussstärke ableiten (an feineres Raster angepasst).
  if (!influences.length) return { ...DEFAULT_POI_REACH, radius: 0 };
  const peak = Math.max(...influences.map((entry) => Math.abs(entry.delta)));
  if (peak >= 5) return { mode: "sector", radius: 4 };
  if (peak >= 3) return { mode: "sector", radius: 3 };
  if (peak >= 2) return { mode: "sector", radius: 2 };
  if (peak >= 1) return { mode: "sector", radius: 1 };
  return { mode: "sector", radius: 0 };
}

export function serializePoiInfluencePayload(
  influences: PoiInfluence[],
  reach: PoiReachSetting = DEFAULT_POI_REACH,
): { influences: PoiInfluence[]; reach: PoiReachSetting } {
  return {
    influences,
    reach:
      reach.mode === "district"
        ? { mode: "district", radius: 0 }
        : { mode: "sector", radius: reach.radius },
  };
}

export function poiReachLabel(reach: PoiReachSetting): string {
  if (reach.mode === "district") return "Ganzes Viertel";
  if (reach.radius === 0) return "Nur eigener Sektor";
  if (reach.radius === 1) return "Eigener Sektor + Nachbarn";
  return `${reach.radius} Sektor-Schritte`;
}

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
  reach: PoiReachSetting;
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

function parseInfluenceList(raw: unknown): PoiInfluence[] {
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

/** Akzeptiert Legacy-Array sowie Envelope `{ influences, reach }`. */
export function parsePoiInfluences(raw: unknown): PoiInfluence[] {
  if (Array.isArray(raw)) return parseInfluenceList(raw);
  if (raw && typeof raw === "object") {
    return parseInfluenceList((raw as { influences?: unknown }).influences);
  }
  return [];
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

/** Farben der Einfluss-Aspekte für kompakte KPI-Chips im Kartenfenster. */
export const POI_INFLUENCE_COLORS: Record<PoiInfluenceAspect, string> = {
  crime: "#ef4444",
  vattrak: "#379806",
  malanthir: "#a78bfa",
  guard: "#38bdf8",
  refugees: "#f59e0b",
  economy: "#cab926",
  unemployment: "#d4a574",
  elysia: "#e7b6c9",
  chromus: "#7f93c9",
  religion: "#cab926",
  knowledge: "#67e8f9",
  prestige: "#f0d060",
};

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

function finiteCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Bild für den Karten-Tooltip. Platzhalter und leere URLs bleiben unsichtbar. */
export function poiTooltipImage(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value || value === LORE_PLACEHOLDER_IMAGE || value.endsWith("/ort-platzhalter.png")) {
    return null;
  }
  return value;
}

/** Lore-Seite des Orts. In der Kampagne die Spieler-Seite, sonst die Welt-Lore. */
export function poiLoreHref(worldId: string, poiId: string, campaignId?: string | null) {
  if (campaignId) return `/dashboard/campaigns/${campaignId}/lore/${poiId}`;
  return `/dashboard/worlds/${worldId}/lore/${poiId}`;
}

export function mapEditorRowToPoi(row: MapEditorPoiRow): AurenfurtMapPoi | null {
  if (!row.map_poi_kind || !isPoiKind(row.map_poi_kind)) return null;
  const districtId = row.map_district_id as CityDistrictId | null;
  if (!districtId || !DISTRICT_IDS.has(districtId)) return null;
  const mapU = finiteCoordinate(row.map_u);
  const mapV = finiteCoordinate(row.map_v);
  if (mapU == null || mapV == null) return null;

  const uv = clampUvPoint({ u: mapU, v: mapV });
  const imageUrl = (row.image_url ?? "").trim() || LORE_PLACEHOLDER_IMAGE;
  const influences = parsePoiInfluences(row.map_poi_influences);

  return {
    id: row.id,
    name: row.name,
    kind: row.map_poi_kind,
    districtId,
    u: uv.u,
    v: uv.v,
    description: (row.description ?? "").trim(),
    imageUrl,
    influences,
    reach: parsePoiReach(row.map_poi_influences, influences),
  };
}

export function poisInDistrict(pois: AurenfurtMapPoi[], districtId: CityDistrictId) {
  return pois.filter((poi) => poi.districtId === districtId);
}

export function findPoi(pois: AurenfurtMapPoi[], id: string | null) {
  if (!id) return null;
  return pois.find((poi) => poi.id === id) ?? null;
}
