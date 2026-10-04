import {
  AURENFURT_DISTRICTS,
  type CityDistrict,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { arcSpan, polarToImage } from "./aurenfurt-layout";

export type UvPoint = { u: number; v: number };

/** Pro Viertel: Eckpunkte plus darstellbare Flächenfarbe und Hover-Sichtbarkeit. */
export type DistrictPolygonEntry = {
  points: UvPoint[];
  /** Flächenfarbe (CSS-Hex). */
  color: string;
  /** Opacity 0–1 beim Hover über die Fläche. */
  hoverOpacity: number;
};

export type DistrictPolygons = Record<CityDistrictId, DistrictPolygonEntry>;

export const DISTRICT_POLYGONS_STORAGE_KEY = "aurenfurt-district-polygons-v2";
export const DISTRICT_POLYGONS_LEGACY_STORAGE_KEY = "aurenfurt-district-polygons-v1";

const STORAGE_VERSION = 2;

const DEFAULT_HOVER_OPACITY = 0.22;

/** Ableitung aus Winkel-Wedges: Grenzstrahlen + Bogenpunkte. */
export function wedgeToPolygon(district: CityDistrict): UvPoint[] {
  const { start, end, inner, outer } = district;
  const span = arcSpan(start, end);

  if (inner <= 0.001) {
    const steps = 16;
    const points: UvPoint[] = [];
    for (let i = 0; i < steps; i += 1) {
      points.push(polarToImage((360 * i) / steps, outer));
    }
    return points;
  }

  const steps = Math.max(4, Math.round(span / 16));
  const points: UvPoint[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = start + (span * i) / steps;
    points.push(polarToImage(angle, outer));
  }
  for (let i = steps; i >= 0; i -= 1) {
    const angle = start + (span * i) / steps;
    points.push(polarToImage(angle, inner));
  }
  return points;
}

export function defaultDistrictPolygons(): DistrictPolygons {
  const next = {} as DistrictPolygons;
  for (const district of AURENFURT_DISTRICTS) {
    next[district.id] = {
      points: wedgeToPolygon(district),
      color: district.tint,
      hoverOpacity: DEFAULT_HOVER_OPACITY,
    };
  }
  return next;
}

function isUvPoint(value: unknown): value is UvPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as UvPoint;
  return typeof point.u === "number" && typeof point.v === "number" && Number.isFinite(point.u) && Number.isFinite(point.v);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function clampHoverOpacity(value: unknown, fallback = DEFAULT_HOVER_OPACITY): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function parseLegacyPointMap(parsed: Record<string, unknown>): DistrictPolygons | null {
  const defaults = defaultDistrictPolygons();
  let migrated = false;
  for (const district of AURENFURT_DISTRICTS) {
    const candidate = parsed[district.id];
    if (!Array.isArray(candidate) || candidate.length < 3) continue;
    if (!candidate.every(isUvPoint)) continue;
    defaults[district.id] = {
      ...defaults[district.id],
      points: candidate.map((point) => ({ u: point.u, v: point.v })),
    };
    migrated = true;
  }
  // Fehlende Viertel-Ids (z. B. neu hinzugekommen) bleiben aus `defaults` erhalten.
  return migrated ? defaults : null;
}

function parseVersionedMap(parsed: Record<string, unknown>): DistrictPolygons | null {
  const districtsRaw = parsed.districts;
  if (!districtsRaw || typeof districtsRaw !== "object") return null;
  const districts = districtsRaw as Record<string, unknown>;
  const defaults = defaultDistrictPolygons();
  let found = false;

  for (const district of AURENFURT_DISTRICTS) {
    const entry = districts[district.id];
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const pointsRaw = row.points;
    if (!Array.isArray(pointsRaw) || pointsRaw.length < 3 || !pointsRaw.every(isUvPoint)) continue;
    defaults[district.id] = {
      points: pointsRaw.map((point) => ({ u: point.u, v: point.v })),
      color: isHexColor(row.color) ? row.color : defaults[district.id].color,
      hoverOpacity: clampHoverOpacity(row.hoverOpacity, defaults[district.id].hoverOpacity),
    };
    found = true;
  }

  // Gespeicherte andere Viertel bleiben; fehlende Ids werden aus Defaults ergänzt.
  return found ? defaults : null;
}

/**
 * Merged gespeicherte Polygone mit aktuellen Viertel-Defaults:
 * bekannte Ids behalten gespeicherte Punkte/Farbe/Hover,
 * fehlende Ids (neue Viertel) werden ergänzt, ohne andere zu verwerfen.
 */
export function mergeDistrictPolygonsWithDefaults(
  stored: DistrictPolygons | null | undefined,
): DistrictPolygons {
  const defaults = defaultDistrictPolygons();
  if (!stored) return defaults;
  const merged = { ...defaults };
  for (const district of AURENFURT_DISTRICTS) {
    const entry = stored[district.id];
    if (!entry || !Array.isArray(entry.points) || entry.points.length < 3) continue;
    merged[district.id] = {
      points: entry.points.map((point) => ({ u: point.u, v: point.v })),
      color: isHexColor(entry.color) ? entry.color : defaults[district.id].color,
      hoverOpacity: clampHoverOpacity(entry.hoverOpacity, defaults[district.id].hoverOpacity),
    };
  }
  return merged;
}

/** Liest v2; fällt auf Legacy-v1-Punktlisten zurück und migriert sie. */
export function parseStoredDistrictPolygons(raw: string | null): DistrictPolygons | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;

    if (record.version === STORAGE_VERSION || record.districts) {
      return parseVersionedMap(record);
    }

    return parseLegacyPointMap(record);
  } catch {
    return null;
  }
}

export function serializeDistrictPolygons(polygons: DistrictPolygons): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    districts: polygons,
  });
}

export function clampUvPoint(point: UvPoint): UvPoint {
  return {
    u: Math.min(1.05, Math.max(-0.05, point.u)),
    v: Math.min(1.05, Math.max(-0.05, point.v)),
  };
}

export function worldXZToUv(x: number, z: number, width: number, depth: number): UvPoint {
  return clampUvPoint({
    u: x / width + 0.5,
    v: z / depth + 0.5,
  });
}

/**
 * Klassischer Ray-Cast (even-odd) in UV-Raum.
 * Polygone mit weniger als 3 Punkten gelten als leer (Punkt liegt außerhalb).
 */
export function pointInPolygon(point: UvPoint, polygon: UvPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses =
      a.v > point.v !== b.v > point.v &&
      point.u < ((b.u - a.u) * (point.v - a.v)) / (b.v - a.v + Number.EPSILON) + a.u;
    if (crosses) inside = !inside;
  }
  return inside;
}
