/**
 * BattlemapTokenDragOverlay — Movement arrow and target cell preview while dragging a token.
 */
"use client";

import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";
import {
  chebyshevDistance,
  FEET_PER_GRID_CELL,
} from "@/src/lib/session/battlemap-movement";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import { BattlemapMovementArrow } from "./BattlemapMovementArrow";

type TokenDragPreview = {
  tokenId: string;
  originGridX: number;
  originGridY: number;
  targetGridX: number;
  targetGridY: number;
};

type Props = {
  tokenDragPreview: TokenDragPreview | null;
  tokens: SessionBattlemapToken[];
  config: BattlemapGridConfig;
  isCellReachable: (
    gridX: number,
    gridY: number,
    sizeCells: number,
    ignoreTokenId: string,
  ) => boolean;
};

export function BattlemapTokenDragOverlay({
  tokenDragPreview,
  tokens,
  config,
  isCellReachable,
}: Props) {
  if (!tokenDragPreview) return null;

  const dragToken = tokens.find((t) => t.id === tokenDragPreview.tokenId) ?? null;
  if (!dragToken) return null;

  const sizeCells = dragToken.size_cells;
  const originPx = gridToPixel(
    tokenDragPreview.originGridX,
    tokenDragPreview.originGridY,
    config,
  );
  const targetPx = gridToPixel(
    tokenDragPreview.targetGridX,
    tokenDragPreview.targetGridY,
    config,
  );
  const fromX = originPx.x + (originPx.size * sizeCells) / 2;
  const fromY = originPx.y + (originPx.size * sizeCells) / 2;
  const toX = targetPx.x + (targetPx.size * sizeCells) / 2;
  const toY = targetPx.y + (targetPx.size * sizeCells) / 2;
  const cellDist = chebyshevDistance(
    tokenDragPreview.originGridX,
    tokenDragPreview.originGridY,
    tokenDragPreview.targetGridX,
    tokenDragPreview.targetGridY,
  );
  const feet = cellDist * FEET_PER_GRID_CELL;
  const reachable = isCellReachable(
    tokenDragPreview.targetGridX,
    tokenDragPreview.targetGridY,
    sizeCells,
    tokenDragPreview.tokenId,
  );

  return (
    <>
      <BattlemapMovementArrow
        fromX={fromX}
        fromY={fromY}
        toX={toX}
        toY={toY}
        feet={feet}
        valid={reachable}
      />
      <div
        className={`pointer-events-none absolute border-2 ${
          reachable
            ? "border-accent-gold/80 bg-accent-gold/15"
            : "border-red-500/80 bg-red-500/15"
        }`}
        style={{
          left: config.originX + tokenDragPreview.targetGridX * config.cellSizePx,
          top: config.originY + tokenDragPreview.targetGridY * config.cellSizePx,
          width: config.cellSizePx * sizeCells,
          height: config.cellSizePx * sizeCells,
        }}
      />
    </>
  );
}
