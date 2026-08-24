/**
 * empty-battlemap — System default empty parchment map (60×60 grid) for Live Session.
 */

import type { BattlemapGridConfig } from "./battlemap-types";

/** Public static texture (3000×3000 → 60×60 @ 50px). */
export const EMPTY_BATTLEMAP_IMAGE_URL =
  "/images/battlemaps/empty-parchment.webp";

/** Sentinel in image_storage_path — no upload bucket object. */
export const EMPTY_BATTLEMAP_STORAGE_PATH = "system:empty-parchment";

/** German UI label for the default empty map. */
export const EMPTY_BATTLEMAP_TITLE = "Leere Karte (Pergament)";

/** Fixed grid: 60×60 cells, full-bleed over the parchment texture. */
export const EMPTY_BATTLEMAP_GRID: BattlemapGridConfig = {
  cellSizePx: 50,
  originX: 0,
  originY: 0,
  columns: 60,
  rows: 60,
  showGrid: true,
};

/** sort_order so the empty map stays at the top of pickers. */
export const EMPTY_BATTLEMAP_SORT_ORDER = -100;

export function isEmptyParchmentBattlemap(map: {
  image_url?: string | null;
  image_storage_path?: string | null;
}): boolean {
  if (map.image_storage_path === EMPTY_BATTLEMAP_STORAGE_PATH) return true;
  return map.image_url === EMPTY_BATTLEMAP_IMAGE_URL;
}
