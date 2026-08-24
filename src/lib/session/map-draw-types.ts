/**
 * Freihändige Karten-Zeichnungen (Battlemap + Weltkarte) für Live-Sessions.
 */

export type MapDrawPoint = { x: number; y: number };

export type SessionMapDrawStroke = {
  id: string;
  session_id: string;
  campaign_id: string;
  battlemap_id: string | null;
  world_map_id: string | null;
  color: string;
  stroke_width: number;
  points: MapDrawPoint[];
  z_index: number;
  created_at?: string;
  updated_at?: string;
};

/** null = aus; draw = zeichnen; erase = letzten Stroke löschen via UI */
export type MapDrawTool = "draw" | null;

export const MAP_DRAW_DEFAULT_COLOR = "#cab926";
export const MAP_DRAW_DEFAULT_WIDTH = 4;

export const MAP_DRAW_PRESET_COLORS = [
  "#cab926", // accent-gold
  "#379806", // hero-vibrant
  "#ffffff",
  "#ef4444",
  "#3b82f6",
  "#000000",
] as const;

export function normalizeMapDrawStroke(row: Record<string, unknown>): SessionMapDrawStroke {
  const rawPoints = Array.isArray(row.points) ? row.points : [];
  const points: MapDrawPoint[] = rawPoints
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const o = p as Record<string, unknown>;
      const x = Number(o.x);
      const y = Number(o.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter((p): p is MapDrawPoint => p != null);

  const colorRaw = row.color != null ? String(row.color) : MAP_DRAW_DEFAULT_COLOR;
  const color = /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw : MAP_DRAW_DEFAULT_COLOR;

  return {
    id: String(row.id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    battlemap_id: row.battlemap_id != null ? String(row.battlemap_id) : null,
    world_map_id: row.world_map_id != null ? String(row.world_map_id) : null,
    color,
    stroke_width: Math.max(1, Math.min(64, Number(row.stroke_width ?? MAP_DRAW_DEFAULT_WIDTH))),
    points,
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}
