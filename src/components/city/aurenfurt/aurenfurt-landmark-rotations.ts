import { CITY_BUILDINGS } from "./aurenfurt-districts";

/** Drehung um die Hochachse in Grad. 0 ist die Ausrichtung aus der Modelldatei. */
export type LandmarkRotations = Record<string, number>;

export const LANDMARK_ROTATIONS_STORAGE_KEY = "aurenfurt-landmark-rotations-v1";

export const LANDMARK_ROTATION_MIN = 0;
export const LANDMARK_ROTATION_MAX = 360;
export const LANDMARK_ROTATION_DEFAULT = 0;
export const LANDMARK_ROTATION_STEP = 1;

const STORAGE_VERSION = 1;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isKnownBuildingId(id: string, extraKnownIds?: ReadonlySet<string>): boolean {
  if (CITY_BUILDINGS.some((building) => building.id === id)) return true;
  if (extraKnownIds?.has(id)) return true;
  return UUID_RE.test(id);
}

export function clampLandmarkRotation(value: number): number {
  if (!Number.isFinite(value)) return LANDMARK_ROTATION_DEFAULT;
  return Math.min(LANDMARK_ROTATION_MAX, Math.max(LANDMARK_ROTATION_MIN, value));
}

export function parseStoredLandmarkRotations(
  raw: string | null,
  extraKnownIds?: ReadonlySet<string>,
): LandmarkRotations | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const source =
      record.version === STORAGE_VERSION && record.rotations && typeof record.rotations === "object"
        ? (record.rotations as Record<string, unknown>)
        : record;

    const next: LandmarkRotations = {};
    let found = false;
    for (const [id, value] of Object.entries(source)) {
      if (id === "version" || id === "rotations") continue;
      if (!isKnownBuildingId(id, extraKnownIds) || typeof value !== "number") continue;
      next[id] = clampLandmarkRotation(value);
      found = true;
    }
    return found ? next : null;
  } catch {
    return null;
  }
}

export function serializeLandmarkRotations(rotations: LandmarkRotations): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    rotations,
  });
}

export function resolveLandmarkRotation(
  buildingId: string,
  overrides: LandmarkRotations | null | undefined,
): number {
  const override = overrides?.[buildingId];
  if (typeof override === "number") return clampLandmarkRotation(override);
  return LANDMARK_ROTATION_DEFAULT;
}
