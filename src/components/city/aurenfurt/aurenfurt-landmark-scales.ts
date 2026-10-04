import { CITY_BUILDINGS } from "./aurenfurt-districts";

/** Multiplikator auf die Standard-Landmark-Breite; Keys = Building-Ids. */
export type LandmarkScales = Record<string, number>;

export const LANDMARK_SCALES_STORAGE_KEY = "aurenfurt-landmark-scales-v1";

export const LANDMARK_SCALE_MIN = 0.25;
export const LANDMARK_SCALE_MAX = 4;
export const LANDMARK_SCALE_DEFAULT = 1;
export const LANDMARK_SCALE_STEP = 0.05;

const STORAGE_VERSION = 1;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isKnownBuildingId(id: string, extraKnownIds?: ReadonlySet<string>): boolean {
  if (CITY_BUILDINGS.some((building) => building.id === id)) return true;
  if (extraKnownIds?.has(id)) return true;
  return UUID_RE.test(id);
}

export function clampLandmarkScale(value: number): number {
  if (!Number.isFinite(value)) return LANDMARK_SCALE_DEFAULT;
  return Math.min(LANDMARK_SCALE_MAX, Math.max(LANDMARK_SCALE_MIN, value));
}

export function defaultLandmarkScales(): LandmarkScales {
  return {};
}

/** Liest Skalen-Overrides; unbekannte Ids werden verworfen. */
export function parseStoredLandmarkScales(
  raw: string | null,
  extraKnownIds?: ReadonlySet<string>,
): LandmarkScales | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const source =
      record.version === STORAGE_VERSION && record.scales && typeof record.scales === "object"
        ? (record.scales as Record<string, unknown>)
        : record;

    const next: LandmarkScales = {};
    let found = false;
    for (const [id, value] of Object.entries(source)) {
      if (id === "version" || id === "scales") continue;
      if (!isKnownBuildingId(id, extraKnownIds) || typeof value !== "number") continue;
      next[id] = clampLandmarkScale(value);
      found = true;
    }
    return found ? next : null;
  } catch {
    return null;
  }
}

export function serializeLandmarkScales(scales: LandmarkScales): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    scales,
  });
}

export function resolveLandmarkScale(
  buildingId: string,
  overrides: LandmarkScales | null | undefined,
): number {
  const override = overrides?.[buildingId];
  if (typeof override === "number") return clampLandmarkScale(override);
  return LANDMARK_SCALE_DEFAULT;
}
