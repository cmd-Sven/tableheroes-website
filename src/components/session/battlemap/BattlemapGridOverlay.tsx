/**
 * BattlemapGridOverlay — Das Raster unter den Figuren.
 * Fünf-Fuß-Schritte in Pixel gegossen — die unsichtbare Geometrie jedes Kampfes.
 */
"use client";

import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";
import { mapContentSize } from "@/src/lib/session/battlemap-grid";

type Props = {
  config: BattlemapGridConfig;
  mapWidth: number;
  mapHeight: number;
};

export function BattlemapGridOverlay({ config, mapWidth, mapHeight }: Props) {
  if (!config.showGrid) return null;

  const { cellSizePx, originX, originY, columns, rows } = config;
  const content = mapContentSize(config);
  const w = Math.max(mapWidth, content.width);
  const h = Math.max(mapHeight, content.height);

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

  for (let c = 0; c <= columns; c++) {
    const x = originX + c * cellSizePx;
    lines.push({ x1: x, y1: originY, x2: x, y2: originY + rows * cellSizePx, key: `v-${c}` });
  }
  for (let r = 0; r <= rows; r++) {
    const y = originY + r * cellSizePx;
    lines.push({ x1: originX, y1: y, x2: originX + columns * cellSizePx, y2: y, key: `h-${r}` });
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={w}
      height={h}
      aria-hidden
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(35, 199, 99, 0.45)"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
