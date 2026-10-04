import { clampUvPoint, type UvPoint } from "./aurenfurt-district-polygons";

export const WALLS_STORAGE_KEY = "aurenfurt-walls-v1";

export const WALL_CURVE_MIN = 0;
export const WALL_CURVE_MAX = 1;
export const WALL_HEIGHT_MIN = 0.06;
export const WALL_HEIGHT_MAX = 0.55;
export const WALL_THICKNESS_MIN = 0.02;
export const WALL_THICKNESS_MAX = 0.18;

export const WALL_HEIGHT_DEFAULT = 0.2;
export const WALL_THICKNESS_DEFAULT = 0.05;
export const WALL_CURVE_DEFAULT = 0.35;

/** Weltgröße einer Texturkachel. Größer = größere Steine, weniger Wiederholungen. */
export const WALL_TEXTURE_SCALE_MIN = 0.04;
export const WALL_TEXTURE_SCALE_MAX = 0.4;
export const WALL_TEXTURE_SCALE_DEFAULT = 0.16;

export const WALL_BRIGHTNESS_MIN = 0.25;
export const WALL_BRIGHTNESS_MAX = 1.8;
export const WALL_BRIGHTNESS_DEFAULT = 1;

export const WALL_MERLON_COUNT_MIN = 0;
export const WALL_MERLON_COUNT_MAX = 36;
export const WALL_MERLON_COUNT_DEFAULT = 8;

/** 0.35 = schmale, niedrige Zinnen. 2.2 = breit und hoch, mit schmaler Lücke. */
export const WALL_MERLON_SIZE_MIN = 0.35;
export const WALL_MERLON_SIZE_MAX = 2.2;
export const WALL_MERLON_SIZE_DEFAULT = 1;

export const WALL_TEXTURE_URL = "/images/cities/medieval-wall.jpg";

/** Reiner Karten-Abschnitt. Keine Spielwerte. */
export type AurenfurtWall = {
  id: string;
  name: string;
  points: UvPoint[];
  /** 0 = Gerade zwischen den Punkten, 1 = ausgeprägte Kurve. */
  curve: number;
  /** Höhe in Welteinheiten. */
  height: number;
  /** Dicke in Welteinheiten. */
  thickness: number;
  /** Kantenlänge einer Texturkachel in Welteinheiten. */
  textureScale: number;
  /** 1 = Textur wie geliefert, darunter dunkler, darüber heller. */
  brightness: number;
  /** Anzahl der Zinnen auf diesem Abschnitt. 0 blendet sie aus. */
  merlonCount: number;
  merlonSize: number;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function newWallId(): string {
  return `wall-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultWall(partial: Partial<AurenfurtWall> & { points: UvPoint[] }): AurenfurtWall {
  return {
    id: partial.id ?? newWallId(),
    name: (partial.name ?? "Mauerabschnitt").trim() || "Mauerabschnitt",
    points: partial.points.map((point) => clampUvPoint(point)),
    curve: clamp(partial.curve ?? WALL_CURVE_DEFAULT, WALL_CURVE_MIN, WALL_CURVE_MAX),
    height: clamp(partial.height ?? WALL_HEIGHT_DEFAULT, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
    thickness: clamp(partial.thickness ?? WALL_THICKNESS_DEFAULT, WALL_THICKNESS_MIN, WALL_THICKNESS_MAX),
    textureScale: clamp(
      partial.textureScale ?? WALL_TEXTURE_SCALE_DEFAULT,
      WALL_TEXTURE_SCALE_MIN,
      WALL_TEXTURE_SCALE_MAX,
    ),
    brightness: clamp(partial.brightness ?? WALL_BRIGHTNESS_DEFAULT, WALL_BRIGHTNESS_MIN, WALL_BRIGHTNESS_MAX),
    merlonCount: Math.round(
      clamp(partial.merlonCount ?? WALL_MERLON_COUNT_DEFAULT, WALL_MERLON_COUNT_MIN, WALL_MERLON_COUNT_MAX),
    ),
    merlonSize: clamp(partial.merlonSize ?? WALL_MERLON_SIZE_DEFAULT, WALL_MERLON_SIZE_MIN, WALL_MERLON_SIZE_MAX),
  };
}

function hermite(p0: UvPoint, p1: UvPoint, p2: UvPoint, p3: UvPoint, t: number, tension: number): UvPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const m1u = (p2.u - p0.u) * tension;
  const m1v = (p2.v - p0.v) * tension;
  const m2u = (p3.u - p1.u) * tension;
  const m2v = (p3.v - p1.v) * tension;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    u: h00 * p1.u + h10 * m1u + h01 * p2.u + h11 * m2u,
    v: h00 * p1.v + h10 * m1v + h01 * p2.v + h11 * m2v,
  };
}

/** Pfad für die Mauer. Kurve 0 bleibt die Gerade durch die gesetzten Punkte. */
export function sampleWallPath(points: UvPoint[], curve: number): UvPoint[] {
  if (points.length < 2) return points.map((point) => clampUvPoint(point));
  const tension = clamp(curve, 0, 1) * 0.55;
  if (tension < 0.02) return points.map((point) => clampUvPoint(point));

  const extended = [points[0], ...points, points[points.length - 1]];
  const steps = 8;
  const sampled: UvPoint[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];
    for (let step = 0; step < steps; step += 1) {
      sampled.push(hermite(p0, p1, p2, p3, step / steps, tension));
    }
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

function parsePoint(value: unknown): UvPoint | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { u?: unknown; v?: unknown };
  if (typeof row.u !== "number" || typeof row.v !== "number") return null;
  if (!Number.isFinite(row.u) || !Number.isFinite(row.v)) return null;
  return clampUvPoint({ u: row.u, v: row.v });
}

function parseWall(value: unknown): AurenfurtWall | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AurenfurtWall>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (!Array.isArray(row.points)) return null;
  const points = row.points.map(parsePoint).filter((point): point is UvPoint => point !== null);
  if (points.length < 2) return null;
  return defaultWall({
    id: row.id,
    name: typeof row.name === "string" ? row.name : "Mauerabschnitt",
    points,
    curve: typeof row.curve === "number" ? row.curve : WALL_CURVE_DEFAULT,
    height: typeof row.height === "number" ? row.height : WALL_HEIGHT_DEFAULT,
    thickness: typeof row.thickness === "number" ? row.thickness : WALL_THICKNESS_DEFAULT,
    textureScale: typeof row.textureScale === "number" ? row.textureScale : WALL_TEXTURE_SCALE_DEFAULT,
    brightness: typeof row.brightness === "number" ? row.brightness : WALL_BRIGHTNESS_DEFAULT,
    merlonCount: typeof row.merlonCount === "number" ? row.merlonCount : WALL_MERLON_COUNT_DEFAULT,
    merlonSize: typeof row.merlonSize === "number" ? row.merlonSize : WALL_MERLON_SIZE_DEFAULT,
  });
}

export function parseStoredWalls(raw: string | null): AurenfurtWall[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { version?: number; walls?: unknown };
    if (!data || data.version !== 1 || !Array.isArray(data.walls)) return null;
    return data.walls.map(parseWall).filter((wall): wall is AurenfurtWall => wall !== null);
  } catch {
    return null;
  }
}

export function serializeWalls(walls: AurenfurtWall[]): string {
  return JSON.stringify({ version: 1, walls });
}
