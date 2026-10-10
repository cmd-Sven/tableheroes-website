import { clampUvPoint, type UvPoint } from "./aurenfurt-district-polygons";

/** Weitere Modelle später nur hier ergänzen. */
export const DECO_CATALOG = [
  {
    key: "twisted-emerald-canopy",
    name: "Smaragdkiefer",
    url: "/models/aurenfurt/deko/twisted-emerald-canopy.glb",
  },
] as const;

export type DecoModelKey = (typeof DECO_CATALOG)[number]["key"];

export const DECO_SCALE_MIN = 0.25;
export const DECO_SCALE_MAX = 4;
export const DECO_SCALE_DEFAULT = 1;
export const DECO_SCALE_STEP = 0.05;

export const DECO_ROTATION_MIN = 0;
export const DECO_ROTATION_MAX = 360;
export const DECO_ROTATION_DEFAULT = 0;
export const DECO_ROTATION_STEP = 1;

export type CityMapDecoration = {
  id: string;
  modelKey: string;
  name: string | null;
  u: number;
  v: number;
  scale: number;
  rotation: number;
};

export function decoModelByKey(key: string) {
  return DECO_CATALOG.find((model) => model.key === key) ?? null;
}

export function decoDisplayName(item: Pick<CityMapDecoration, "modelKey" | "name">): string {
  const trimmed = item.name?.trim();
  if (trimmed) return trimmed;
  return decoModelByKey(item.modelKey)?.name ?? "Unbekanntes Modell";
}

export function clampDecoScale(value: number): number {
  if (!Number.isFinite(value)) return DECO_SCALE_DEFAULT;
  return Math.min(DECO_SCALE_MAX, Math.max(DECO_SCALE_MIN, value));
}

export function clampDecoRotation(value: number): number {
  if (!Number.isFinite(value)) return DECO_ROTATION_DEFAULT;
  const wrapped = ((value % 360) + 360) % 360;
  return Math.min(DECO_ROTATION_MAX, Math.max(DECO_ROTATION_MIN, wrapped));
}

export function clampDecoPoint(point: UvPoint): UvPoint {
  return clampUvPoint(point);
}
