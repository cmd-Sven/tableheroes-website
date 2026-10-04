import { CITY_BUILDINGS } from "./aurenfurt-districts";
import { clampUvPoint, type UvPoint } from "./aurenfurt-district-polygons";

/** UV-Overrides für Gebäude-Pins; Keys = Building-Ids. */
export type BuildingPositions = Record<string, UvPoint>;

export const BUILDING_POSITIONS_STORAGE_KEY = "aurenfurt-building-positions-v1";

const STORAGE_VERSION = 1;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function isKnownBuildingId(id: string, extraKnownIds?: ReadonlySet<string>): boolean {
  if (CITY_BUILDINGS.some((building) => building.id === id)) return true;
  if (extraKnownIds?.has(id)) return true;
  // Editor-Gebäude: UUID-Ids aus der DB behalten, auch wenn noch nicht geladen.
  return UUID_RE.test(id);
}

export function defaultBuildingPositions(): BuildingPositions {
  return {};
}

/** Liest Overrides; unbekannte Ids werden verworfen, bekannte Defaults bleiben im Code. */
export function parseStoredBuildingPositions(
  raw: string | null,
  extraKnownIds?: ReadonlySet<string>,
): BuildingPositions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const source =
      record.version === STORAGE_VERSION && record.positions && typeof record.positions === "object"
        ? (record.positions as Record<string, unknown>)
        : record;

    const next: BuildingPositions = {};
    let found = false;
    for (const [id, value] of Object.entries(source)) {
      if (id === "version" || id === "positions") continue;
      if (!isKnownBuildingId(id, extraKnownIds) || !isUvPoint(value)) continue;
      next[id] = clampUvPoint({ u: value.u, v: value.v });
      found = true;
    }
    return found ? next : null;
  } catch {
    return null;
  }
}

export function serializeBuildingPositions(positions: BuildingPositions): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    positions,
  });
}

export function resolveBuildingUv(
  building: { id: string; u: number; v: number },
  overrides: BuildingPositions | null | undefined,
): UvPoint {
  const override = overrides?.[building.id];
  if (override) return clampUvPoint(override);
  return { u: building.u, v: building.v };
}
