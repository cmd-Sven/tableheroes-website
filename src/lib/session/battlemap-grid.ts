import {
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapGridConfig,
  type BattlemapTokenSide,
  type SessionBattlemapToken,
} from "./battlemap-types";

export function parseGridConfig(raw: unknown): BattlemapGridConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BATTLEMAP_GRID };
  const o = raw as Record<string, unknown>;
  return {
    cellSizePx: clampInt(o.cellSizePx, 8, 200, DEFAULT_BATTLEMAP_GRID.cellSizePx),
    originX: clampInt(o.originX, 0, 10000, DEFAULT_BATTLEMAP_GRID.originX),
    originY: clampInt(o.originY, 0, 10000, DEFAULT_BATTLEMAP_GRID.originY),
    columns: clampInt(o.columns, 1, 200, DEFAULT_BATTLEMAP_GRID.columns),
    rows: clampInt(o.rows, 1, 200, DEFAULT_BATTLEMAP_GRID.rows),
    showGrid: o.showGrid !== false,
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Pixel-Koordinaten (relativ zum Map-Bild) → Rasterzelle. */
export function pixelToGrid(
  px: number,
  py: number,
  config: BattlemapGridConfig,
): { gridX: number; gridY: number } | null {
  const { cellSizePx, originX, originY, columns, rows } = config;
  if (cellSizePx <= 0) return null;
  const gx = Math.floor((px - originX) / cellSizePx);
  const gy = Math.floor((py - originY) / cellSizePx);
  if (gx < 0 || gy < 0 || gx >= columns || gy >= rows) return null;
  return { gridX: gx, gridY: gy };
}

/** Rasterzelle → Pixel-Position (obere linke Ecke). */
export function gridToPixel(
  gridX: number,
  gridY: number,
  config: BattlemapGridConfig,
): { x: number; y: number; size: number } {
  const { cellSizePx, originX, originY } = config;
  return {
    x: originX + gridX * cellSizePx,
    y: originY + gridY * cellSizePx,
    size: cellSizePx,
  };
}

export function tokenOccupiesCell(
  token: Pick<SessionBattlemapToken, "grid_x" | "grid_y" | "size_cells">,
  gridX: number,
  gridY: number,
): boolean {
  return (
    gridX >= token.grid_x &&
    gridX < token.grid_x + token.size_cells &&
    gridY >= token.grid_y &&
    gridY < token.grid_y + token.size_cells
  );
}

export function tokenBlocksMovement(
  token: Pick<SessionBattlemapToken, "character_id" | "token_side">,
): boolean {
  if (token.character_id) return false;
  const side = token.token_side as BattlemapTokenSide;
  return side !== "party" && side !== "friendly";
}

export function isCellBlockedByTokens(
  tokens: SessionBattlemapToken[],
  gridX: number,
  gridY: number,
  excludeTokenId?: string | null,
): boolean {
  return tokens.some((t) => {
    if (excludeTokenId && t.id === excludeTokenId) return false;
    if (!tokenBlocksMovement(t)) return false;
    return tokenOccupiesCell(t, gridX, gridY);
  });
}

export function mapContentSize(config: BattlemapGridConfig): { width: number; height: number } {
  return {
    width: config.originX + config.columns * config.cellSizePx,
    height: config.originY + config.rows * config.cellSizePx,
  };
}
