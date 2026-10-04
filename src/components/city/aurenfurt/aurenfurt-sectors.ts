import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { pointInPolygon, type UvPoint } from "./aurenfurt-district-polygons";

/** Neuer Key – v1 wird bewusst nicht gelesen/migriert. */
export const DISTRICT_SECTORS_STORAGE_KEY = "aurenfurt-district-sectors-v2";

/** Globale Gitterursprung (Karten-UV), für alle Viertel gleich. */
export const SECTOR_GRID_ORIGIN: UvPoint = { u: 0, v: 0 };

/** Sektorgröße in denselben UV-/Karten-Einheiten wie die Viertel-Polygone. */
export const SECTOR_SIZE_MIN = 0.005;
export const SECTOR_SIZE_MAX = 0.25;
export const SECTOR_SIZE_DEFAULT = 0.04;
export const SECTOR_SIZE_STEP = 0.001;
/** Soft-Cap für Vorschau/Speichern (Schutz vor riesigen Gittern). */
export const SECTOR_CELL_MAX = 2500;

const STORAGE_VERSION = 2;
const AREA_EPSILON = 1e-14;

/** Ein Sektor innerhalb eines Viertels – spätere Heatmap-Zelle. */
export type DistrictSector = {
  id: string;
  districtId: CityDistrictId;
  /** Gitterbezeichnung, z. B. `E19`. */
  label: string;
  /** Volle Koordinate, z. B. `Adelsviertel E19`. */
  address: string;
  polygon: UvPoint[];
  centroid: UvPoint;
};

export type DistrictSectorsByDistrict = Partial<Record<CityDistrictId, DistrictSector[]>>;

export type ResolveMapAddressResult = {
  sector: DistrictSector;
  polygon: UvPoint[];
  centroid: UvPoint;
};

export type SectorCellSize = {
  width: number;
  height: number;
};

export type DivideDistrictResult = {
  sectors: DistrictSector[];
  cellWidth: number;
  cellHeight: number;
  /** Anzahl Zellen mit Mittelpunkt im Polygon. */
  actual: number;
  /** Anzahl beschrifteter Spalten (A, B, …). */
  cols: number;
  /** Anzahl beschrifteter Zeilen (1, 2, …). */
  rows: number;
  /** true, wenn wegen SECTOR_CELL_MAX abgebrochen wurde. */
  truncated: boolean;
};

type BBox = { minU: number; maxU: number; minV: number; maxV: number };

/** Modul-Cache für `resolveMapAddress(address)` – der Hook aktualisiert ihn. */
let lookupSectors: DistrictSectorsByDistrict = {};

export function registerDistrictSectorsForLookup(sectors: DistrictSectorsByDistrict) {
  lookupSectors = sectors;
}

export function columnLabel(index: number): string {
  if (index < 0 || !Number.isFinite(index)) return "A";
  let n = Math.floor(index);
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function formatSectorAddress(districtName: string, label: string): string {
  return `${districtName.trim()} ${label.trim()}`;
}

export function normalizeMapAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function isUvPoint(value: unknown): value is UvPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as UvPoint;
  return (
    typeof point.u === "number" &&
    typeof point.v === "number" &&
    Number.isFinite(point.u) &&
    Number.isFinite(point.v)
  );
}

function isCityDistrictId(value: unknown): value is CityDistrictId {
  return typeof value === "string" && AURENFURT_DISTRICTS.some((d) => d.id === value);
}

export function polygonCentroid(points: UvPoint[]): UvPoint {
  if (points.length === 0) return { u: 0.5, v: 0.5 };
  if (points.length < 3) {
    const u = points.reduce((acc, p) => acc + p.u, 0) / points.length;
    const v = points.reduce((acc, p) => acc + p.v, 0) / points.length;
    return { u, v };
  }

  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const cross = points[j].u * points[i].v - points[i].u * points[j].v;
    area2 += cross;
    cx += (points[j].u + points[i].u) * cross;
    cy += (points[j].v + points[i].v) * cross;
  }
  if (Math.abs(area2) < AREA_EPSILON) {
    const u = points.reduce((acc, p) => acc + p.u, 0) / points.length;
    const v = points.reduce((acc, p) => acc + p.v, 0) / points.length;
    return { u, v };
  }
  const inv = 1 / (3 * area2);
  return { u: cx * inv, v: cy * inv };
}

function bboxOf(points: UvPoint[]): BBox | null {
  if (points.length === 0) return null;
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of points) {
    if (p.u < minU) minU = p.u;
    if (p.u > maxU) maxU = p.u;
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }
  if (!Number.isFinite(minU) || maxU - minU < 1e-12 || maxV - minV < 1e-12) return null;
  return { minU, maxU, minV, maxV };
}

export function clampSectorSize(value: number): number {
  if (!Number.isFinite(value)) return SECTOR_SIZE_DEFAULT;
  // Auf Step runden, damit Slider und Zahl konsistent bleiben.
  const stepped = Math.round(value / SECTOR_SIZE_STEP) * SECTOR_SIZE_STEP;
  const clamped = Math.min(SECTOR_SIZE_MAX, Math.max(SECTOR_SIZE_MIN, stepped));
  return Number(clamped.toFixed(6));
}

function fixedCellRect(col: number, row: number, cellW: number, cellH: number): UvPoint[] {
  const u0 = SECTOR_GRID_ORIGIN.u + col * cellW;
  const u1 = u0 + cellW;
  const v0 = SECTOR_GRID_ORIGIN.v + row * cellH;
  const v1 = v0 + cellH;
  // CCW: oben-links → oben-rechts → unten-rechts → unten-links (v wächst nach unten).
  return [
    { u: u0, v: v0 },
    { u: u1, v: v0 },
    { u: u1, v: v1 },
    { u: u0, v: v1 },
  ];
}

type GridHit = {
  col: number;
  row: number;
  polygon: UvPoint[];
  centroid: UvPoint;
};

/**
 * Legt ein globales Gitter fester Zellengröße über die Karte und behält
 * jede Zelle, deren Mittelpunkt im Viertel-Polygon liegt.
 * Zellen werden nie gestreckt oder an die Bounding-Box angepasst.
 */
export function divideDistrictIntoSectors(
  districtId: CityDistrictId,
  districtName: string,
  districtPoly: UvPoint[],
  cellSize: SectorCellSize,
): DivideDistrictResult {
  const cellWidth = clampSectorSize(cellSize.width);
  const cellHeight = clampSectorSize(cellSize.height);
  const empty: DivideDistrictResult = {
    sectors: [],
    cellWidth,
    cellHeight,
    actual: 0,
    cols: 0,
    rows: 0,
    truncated: false,
  };
  if (districtPoly.length < 3) return empty;

  const bbox = bboxOf(districtPoly);
  if (!bbox) return empty;

  const colStart = Math.floor((bbox.minU - SECTOR_GRID_ORIGIN.u) / cellWidth);
  const colEnd = Math.floor((bbox.maxU - SECTOR_GRID_ORIGIN.u) / cellWidth);
  const rowStart = Math.floor((bbox.minV - SECTOR_GRID_ORIGIN.v) / cellHeight);
  const rowEnd = Math.floor((bbox.maxV - SECTOR_GRID_ORIGIN.v) / cellHeight);

  const hits: GridHit[] = [];
  let truncated = false;

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      const polygon = fixedCellRect(col, row, cellWidth, cellHeight);
      const centroid = {
        u: SECTOR_GRID_ORIGIN.u + (col + 0.5) * cellWidth,
        v: SECTOR_GRID_ORIGIN.v + (row + 0.5) * cellHeight,
      };
      if (!pointInPolygon(centroid, districtPoly)) continue;
      hits.push({ col, row, polygon, centroid });
      if (hits.length >= SECTOR_CELL_MAX) {
        truncated = true;
        break;
      }
    }
    if (truncated) break;
  }

  if (hits.length === 0) return empty;

  const uniqueCols = [...new Set(hits.map((h) => h.col))].sort((a, b) => a - b);
  const uniqueRows = [...new Set(hits.map((h) => h.row))].sort((a, b) => a - b);
  const colIndex = new Map(uniqueCols.map((c, i) => [c, i]));
  const rowIndex = new Map(uniqueRows.map((r, i) => [r, i]));

  // Links→rechts, oben→unten (steigendes v).
  hits.sort((a, b) => a.row - b.row || a.col - b.col);

  const sectors: DistrictSector[] = hits.map((hit) => {
    const labelCol = colIndex.get(hit.col) ?? 0;
    const labelRow = rowIndex.get(hit.row) ?? 0;
    const label = `${columnLabel(labelCol)}${labelRow + 1}`;
    const address = formatSectorAddress(districtName, label);
    return {
      id: `${districtId}:${label}`,
      districtId,
      label,
      address,
      polygon: hit.polygon,
      centroid: hit.centroid,
    };
  });

  return {
    sectors,
    cellWidth,
    cellHeight,
    actual: sectors.length,
    cols: uniqueCols.length,
    rows: uniqueRows.length,
    truncated,
  };
}

export function parseStoredDistrictSectors(raw: string | null): DistrictSectorsByDistrict | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const districtsRaw =
      record.version === STORAGE_VERSION || record.districts
        ? record.districts
        : record;
    if (!districtsRaw || typeof districtsRaw !== "object") return null;

    const result: DistrictSectorsByDistrict = {};
    let found = false;
    for (const [key, value] of Object.entries(districtsRaw as Record<string, unknown>)) {
      if (!isCityDistrictId(key) || !Array.isArray(value)) continue;
      const sectors: DistrictSector[] = [];
      for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const row = entry as Record<string, unknown>;
        if (typeof row.label !== "string" || typeof row.address !== "string") continue;
        if (!Array.isArray(row.polygon) || row.polygon.length < 3 || !row.polygon.every(isUvPoint)) {
          continue;
        }
        const centroid =
          row.centroid && isUvPoint(row.centroid)
            ? { u: row.centroid.u, v: row.centroid.v }
            : polygonCentroid(row.polygon);
        sectors.push({
          id: typeof row.id === "string" ? row.id : `${key}:${row.label}`,
          districtId: key,
          label: row.label,
          address: row.address,
          polygon: row.polygon.map((p) => ({ u: p.u, v: p.v })),
          centroid,
        });
      }
      if (sectors.length > 0) {
        result[key] = sectors;
        found = true;
      }
    }
    return found ? result : null;
  } catch {
    return null;
  }
}

export function serializeDistrictSectors(sectors: DistrictSectorsByDistrict): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    districts: sectors,
  });
}

/**
 * Findet einen Sektor über die volle Koordinate (`Adelsviertel E19`).
 * Name case-insensitive, Leerzeichen normalisiert.
 */
export function resolveMapAddress(address: string): ResolveMapAddressResult | null {
  return resolveMapAddressIn(address, lookupSectors);
}

export function resolveMapAddressIn(
  address: string,
  sectorsByDistrict: DistrictSectorsByDistrict,
): ResolveMapAddressResult | null {
  const normalized = normalizeMapAddress(address);
  if (!normalized) return null;

  for (const district of AURENFURT_DISTRICTS) {
    const sectors = sectorsByDistrict[district.id];
    if (!sectors || sectors.length === 0) continue;
    const nameNorm = district.name.trim().toLowerCase();
    for (const sector of sectors) {
      if (normalizeMapAddress(sector.address) === normalized) {
        return { sector, polygon: sector.polygon, centroid: sector.centroid };
      }
      // Fallback: `${name} ${label}` auch wenn address-Feld abweicht
      const composed = normalizeMapAddress(`${district.name} ${sector.label}`);
      if (composed === normalized) {
        return { sector, polygon: sector.polygon, centroid: sector.centroid };
      }
      // Prefix-Match mit Viertelname + Label
      if (normalized.startsWith(`${nameNorm} `)) {
        const labelPart = normalized.slice(nameNorm.length).trim();
        if (labelPart === sector.label.toLowerCase()) {
          return { sector, polygon: sector.polygon, centroid: sector.centroid };
        }
      }
    }
  }
  return null;
}
