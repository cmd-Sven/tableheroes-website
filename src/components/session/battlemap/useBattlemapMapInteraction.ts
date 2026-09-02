/**
 * useBattlemapMapInteraction — Placement reachability, map clicks, hover, and prop drop for BattlemapStage.
 */
"use client";

import { useCallback, useState } from "react";
import { isCellBlockedByTokens, pixelToGrid } from "@/src/lib/session/battlemap-grid";
import {
  isWithinMovementRange,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import type {
  BattlemapGridConfig,
  BattlemapMarkerKind,
  BattlemapMarkerTool,
  CharacterTokenPlacement,
  GmPropPlacementDraft,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";
import { clientToMapPixels, isMarkerPlaceKind } from "./battlemap-stage-utils";

type TokenDragMoveContext = {
  originGridX: number;
  originGridY: number;
  maxCells: number;
};

type Args = {
  config: BattlemapGridConfig;
  mapSize: { width: number; height: number };
  tokens: SessionBattlemapToken[];
  isGm: boolean;
  characterPlacement?: CharacterTokenPlacement | null;
  tokenDragMoveContext?: TokenDragMoveContext | null;
  gmMoveTokenId?: string | null;
  gmPlacementSize: number;
  placementActive: boolean;
  fogDrawActive: boolean;
  effectDrawActive: boolean;
  fogInteractive: boolean;
  effectInteractive: boolean;
  markerInteractive: boolean;
  trapInteractive: boolean;
  markerPlaceActive: boolean;
  trapPlaceActive: boolean;
  containerPlaceActive?: boolean;
  markerTool: BattlemapMarkerTool;
  onCellClick?: (gridX: number, gridY: number) => void;
  onMarkerCreate?: (input: {
    kind: BattlemapMarkerKind;
    gridX: number;
    gridY: number;
  }) => void;
  onTrapPlaceCell?: (gridX: number, gridY: number) => void;
  onContainerPlaceCell?: (gridX: number, gridY: number) => void;
  onSelectFogShape?: (shapeId: string | null) => void;
  onSelectEffectTemplate?: (templateId: string | null) => void;
  onSelectMarker?: (markerId: string | null) => void;
  onSelectTrap?: (trapId: string | null) => void;
  onPropDrop?: (draft: GmPropPlacementDraft, posX: number, posY: number) => void;
};

export function useBattlemapMapInteraction({
  config,
  mapSize,
  tokens,
  isGm,
  characterPlacement,
  tokenDragMoveContext,
  gmMoveTokenId,
  gmPlacementSize,
  placementActive,
  fogDrawActive,
  effectDrawActive,
  fogInteractive,
  effectInteractive,
  markerInteractive,
  trapInteractive,
  markerPlaceActive,
  trapPlaceActive,
  containerPlaceActive = false,
  markerTool,
  onCellClick,
  onMarkerCreate,
  onTrapPlaceCell,
  onContainerPlaceCell,
  onSelectFogShape,
  onSelectEffectTemplate,
  onSelectMarker,
  onSelectTrap,
  onPropDrop,
}: Args) {
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [propDropHighlight, setPropDropHighlight] = useState(false);

  const movementMaxCells =
    characterPlacement && !characterPlacement.isFirstPlacement
      ? movementCellsForBurst(characterPlacement.baseCells, characterPlacement.useDash)
      : null;

  const isCellReachable = useCallback(
    (
      gridX: number,
      gridY: number,
      sizeCells = 1,
      excludeTokenId?: string | null,
    ): boolean => {
      if (
        gridX < 0 ||
        gridY < 0 ||
        gridX + sizeCells > config.columns ||
        gridY + sizeCells > config.rows
      ) {
        return false;
      }

      const excludeId =
        excludeTokenId ??
        (characterPlacement && !characterPlacement.isFirstPlacement
          ? tokens.find((t) => t.character_id === characterPlacement.characterId)?.id
          : gmMoveTokenId);

      for (let cx = gridX; cx < gridX + sizeCells; cx += 1) {
        for (let cy = gridY; cy < gridY + sizeCells; cy += 1) {
          if (isCellBlockedByTokens(tokens, cx, cy, excludeId)) return false;
        }
      }

      if (
        characterPlacement &&
        !characterPlacement.isFirstPlacement &&
        movementMaxCells != null &&
        characterPlacement.originGridX != null &&
        characterPlacement.originGridY != null
      ) {
        if (
          !isWithinMovementRange(
            characterPlacement.originGridX,
            characterPlacement.originGridY,
            gridX,
            gridY,
            movementMaxCells,
          )
        ) {
          return false;
        }
      } else if (tokenDragMoveContext) {
        if (
          !isWithinMovementRange(
            tokenDragMoveContext.originGridX,
            tokenDragMoveContext.originGridY,
            gridX,
            gridY,
            tokenDragMoveContext.maxCells,
          )
        ) {
          return false;
        }
      }

      return true;
    },
    [
      characterPlacement,
      config.columns,
      config.rows,
      gmMoveTokenId,
      movementMaxCells,
      tokenDragMoveContext,
      tokens,
    ],
  );

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (fogDrawActive) return;
      if (effectDrawActive) return;
      if (fogInteractive && e.target === e.currentTarget) {
        onSelectFogShape?.(null);
      }
      if (effectInteractive && e.target === e.currentTarget) {
        onSelectEffectTemplate?.(null);
      }
      if (markerInteractive && e.target === e.currentTarget) {
        onSelectMarker?.(null);
      }
      if (trapInteractive && e.target === e.currentTarget) {
        onSelectTrap?.(null);
      }
      if (markerPlaceActive && isMarkerPlaceKind(markerTool) && onMarkerCreate) {
        if (e.button !== 0) return;
        const coords = clientToMapPixels(
          e.clientX,
          e.clientY,
          e.currentTarget,
          mapSize.width,
          mapSize.height,
        );
        if (!coords) return;
        const cell = pixelToGrid(coords.px, coords.py, config);
        if (!cell) return;
        if (
          cell.gridX < 0 ||
          cell.gridY < 0 ||
          cell.gridX >= config.columns ||
          cell.gridY >= config.rows
        ) {
          return;
        }
        onMarkerCreate({
          kind: markerTool,
          gridX: cell.gridX,
          gridY: cell.gridY,
        });
        return;
      }
      if (trapPlaceActive && onTrapPlaceCell) {
        if (e.button !== 0) return;
        const coords = clientToMapPixels(
          e.clientX,
          e.clientY,
          e.currentTarget,
          mapSize.width,
          mapSize.height,
        );
        if (!coords) return;
        const cell = pixelToGrid(coords.px, coords.py, config);
        if (!cell) return;
        if (
          cell.gridX < 0 ||
          cell.gridY < 0 ||
          cell.gridX >= config.columns ||
          cell.gridY >= config.rows
        ) {
          return;
        }
        onTrapPlaceCell(cell.gridX, cell.gridY);
        return;
      }
      if (containerPlaceActive && onContainerPlaceCell) {
        if (e.button !== 0) return;
        const coords = clientToMapPixels(
          e.clientX,
          e.clientY,
          e.currentTarget,
          mapSize.width,
          mapSize.height,
        );
        if (!coords) return;
        const cell = pixelToGrid(coords.px, coords.py, config);
        if (!cell) return;
        if (
          cell.gridX < 0 ||
          cell.gridY < 0 ||
          cell.gridX >= config.columns ||
          cell.gridY >= config.rows
        ) {
          return;
        }
        onContainerPlaceCell(cell.gridX, cell.gridY);
        return;
      }
      if (!placementActive || !onCellClick) return;
      if (e.button !== 0) return;
      const coords = clientToMapPixels(
        e.clientX,
        e.clientY,
        e.currentTarget,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) return;
      const cell = pixelToGrid(coords.px, coords.py, config);
      if (!cell) return;
      const size = characterPlacement ? 1 : gmPlacementSize;
      if (!isCellReachable(cell.gridX, cell.gridY, size)) return;
      onCellClick(cell.gridX, cell.gridY);
    },
    [
      config,
      characterPlacement,
      effectDrawActive,
      effectInteractive,
      fogDrawActive,
      fogInteractive,
      gmPlacementSize,
      isCellReachable,
      mapSize.height,
      mapSize.width,
      markerInteractive,
      markerPlaceActive,
      markerTool,
      trapInteractive,
      trapPlaceActive,
      onCellClick,
      onMarkerCreate,
      onTrapPlaceCell,
      onSelectEffectTemplate,
      onSelectFogShape,
      onSelectMarker,
      onSelectTrap,
      placementActive,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementActive && !markerPlaceActive && !trapPlaceActive) {
        setHoverCell(null);
        return;
      }
      const coords = clientToMapPixels(
        e.clientX,
        e.clientY,
        e.currentTarget,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) {
        setHoverCell(null);
        return;
      }
      const cell = pixelToGrid(coords.px, coords.py, config);
      setHoverCell(cell ? { x: cell.gridX, y: cell.gridY } : null);
    },
    [config, mapSize.height, mapSize.width, markerPlaceActive, placementActive, trapPlaceActive],
  );

  const handlePropDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isGm) return;
      if (!e.dataTransfer.types.includes("application/x-battlemap-prop")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setPropDropHighlight(true);
    },
    [isGm],
  );

  const handlePropDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isGm || !onPropDrop) return;
      e.preventDefault();
      setPropDropHighlight(false);
      try {
        const raw = e.dataTransfer.getData("application/x-battlemap-prop");
        if (!raw) return;
        const draft = JSON.parse(raw) as GmPropPlacementDraft;
        const coords = clientToMapPixels(
          e.clientX,
          e.clientY,
          e.currentTarget,
          mapSize.width,
          mapSize.height,
        );
        if (!coords) return;
        const posX = Math.max(
          0,
          Math.min(1 - draft.width, coords.px / mapSize.width),
        );
        const posY = Math.max(
          0,
          Math.min(1 - draft.height, coords.py / mapSize.height),
        );
        onPropDrop(draft, posX, posY);
      } catch {
        /* ignore */
      }
    },
    [isGm, mapSize.height, mapSize.width, onPropDrop],
  );

  const hoverReachable =
    hoverCell != null
      ? isCellReachable(
          hoverCell.x,
          hoverCell.y,
          characterPlacement ? 1 : gmPlacementSize,
        )
      : false;

  const hoverSize = characterPlacement ? 1 : gmPlacementSize;

  return {
    hoverCell,
    setHoverCell,
    propDropHighlight,
    setPropDropHighlight,
    movementMaxCells,
    isCellReachable,
    handleContentClick,
    handleMouseMove,
    handlePropDragOver,
    handlePropDrop,
    hoverReachable,
    hoverSize,
  };
}
