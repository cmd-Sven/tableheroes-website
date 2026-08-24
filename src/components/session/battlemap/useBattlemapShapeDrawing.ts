/**
 * useBattlemapShapeDrawing — Fog/effect drag-draw state and pointer handlers for BattlemapStage.
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { pixelToGrid } from "@/src/lib/session/battlemap-grid";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapGridConfig,
} from "@/src/lib/session/battlemap-types";
import { normalizeEffectCone } from "./BattlemapEffectLayer";
import { normalizeFogCircle, normalizeFogRect } from "./BattlemapFogLayer";
import { clientToMapPixels } from "./battlemap-stage-utils";

export type FogDraft = {
  shape: "rect" | "circle";
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
} | null;

export type EffectDraft = {
  shape: "rect" | "circle" | "cone";
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  directionDeg?: number;
} | null;

type Args = {
  config: BattlemapGridConfig;
  mapSize: { width: number; height: number };
  fogDrawActive: boolean;
  effectDrawActive: boolean;
  fogTool: BattlemapFogTool;
  effectTool: BattlemapEffectTool;
  onFogShapeCreate?: (input: {
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  }) => void;
  onEffectTemplateCreate?: (input: {
    shape: "rect" | "circle" | "cone";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    directionDeg?: number;
  }) => void;
};

export function useBattlemapShapeDrawing({
  config,
  mapSize,
  fogDrawActive,
  effectDrawActive,
  fogTool,
  effectTool,
  onFogShapeCreate,
  onEffectTemplateCreate,
}: Args) {
  const [fogDraft, setFogDraft] = useState<FogDraft>(null);
  const fogDrawOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [effectDraft, setEffectDraft] = useState<EffectDraft>(null);
  const effectDrawOriginRef = useRef<{ x: number; y: number } | null>(null);

  const cellFromClient = useCallback(
    (clientX: number, clientY: number, el: HTMLElement) => {
      const coords = clientToMapPixels(
        clientX,
        clientY,
        el,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) return null;
      return pixelToGrid(coords.px, coords.py, config);
    },
    [config, mapSize.height, mapSize.width],
  );

  const handleFogPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogTool || fogTool === "select") return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-battlemap-token]") || target?.closest("[data-fog-shape]")) {
        return;
      }
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      fogDrawOriginRef.current = { x: cell.gridX, y: cell.gridY };
      if (fogTool === "circle") {
        setFogDraft({
          shape: "circle",
          ...normalizeFogCircle(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      } else {
        setFogDraft({
          shape: "rect",
          ...normalizeFogRect(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, fogDrawActive, fogTool],
  );

  const handleFogPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogDrawOriginRef.current || !fogTool) return;
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      const origin = fogDrawOriginRef.current;
      if (fogTool === "circle") {
        setFogDraft({
          shape: "circle",
          ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      } else {
        setFogDraft({
          shape: "rect",
          ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, fogDrawActive, fogTool],
  );

  const handleFogPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogDrawOriginRef.current || !fogTool || !onFogShapeCreate) {
        return;
      }
      const origin = fogDrawOriginRef.current;
      const cell =
        cellFromClient(e.clientX, e.clientY, e.currentTarget) ?? {
          gridX: origin.x,
          gridY: origin.y,
        };
      const normalized =
        fogTool === "circle"
          ? { shape: "circle" as const, ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY) }
          : { shape: "rect" as const, ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY) };
      fogDrawOriginRef.current = null;
      setFogDraft(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      onFogShapeCreate(normalized);
    },
    [cellFromClient, fogDrawActive, fogTool, onFogShapeCreate],
  );

  const handleEffectPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!effectDrawActive || !effectTool || effectTool === "select") return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("[data-battlemap-token]") ||
        target?.closest("[data-fog-shape]") ||
        target?.closest("[data-effect-template]")
      ) {
        return;
      }
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      effectDrawOriginRef.current = { x: cell.gridX, y: cell.gridY };
      if (effectTool === "circle") {
        setEffectDraft({
          shape: "circle",
          ...normalizeFogCircle(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      } else if (effectTool === "cone") {
        const cone = normalizeEffectCone(cell.gridX, cell.gridY, cell.gridX, cell.gridY);
        setEffectDraft({ shape: "cone", ...cone });
      } else {
        setEffectDraft({
          shape: "rect",
          ...normalizeFogRect(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, effectDrawActive, effectTool],
  );

  const handleEffectPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!effectDrawActive || !effectDrawOriginRef.current || !effectTool) return;
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      const origin = effectDrawOriginRef.current;
      if (effectTool === "circle") {
        setEffectDraft({
          shape: "circle",
          ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      } else if (effectTool === "cone") {
        const cone = normalizeEffectCone(origin.x, origin.y, cell.gridX, cell.gridY);
        setEffectDraft({ shape: "cone", ...cone });
      } else {
        setEffectDraft({
          shape: "rect",
          ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, effectDrawActive, effectTool],
  );

  const handleEffectPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!effectDrawActive || !effectDrawOriginRef.current || !effectTool || !onEffectTemplateCreate) {
        return;
      }
      const origin = effectDrawOriginRef.current;
      const cell =
        cellFromClient(e.clientX, e.clientY, e.currentTarget) ?? {
          gridX: origin.x,
          gridY: origin.y,
        };
      const normalized =
        effectTool === "circle"
          ? { shape: "circle" as const, ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY) }
          : effectTool === "cone"
            ? {
                shape: "cone" as const,
                ...normalizeEffectCone(origin.x, origin.y, cell.gridX, cell.gridY),
              }
            : { shape: "rect" as const, ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY) };
      effectDrawOriginRef.current = null;
      setEffectDraft(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      onEffectTemplateCreate({
        shape: normalized.shape,
        gridX: normalized.gridX,
        gridY: normalized.gridY,
        gridW: normalized.gridW,
        gridH: normalized.gridH,
        directionDeg: "directionDeg" in normalized ? normalized.directionDeg : undefined,
      });
    },
    [cellFromClient, effectDrawActive, effectTool, onEffectTemplateCreate],
  );

  const handleShapePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (fogDrawActive) handleFogPointerDown(e);
      else if (effectDrawActive) handleEffectPointerDown(e);
    },
    [effectDrawActive, fogDrawActive, handleEffectPointerDown, handleFogPointerDown],
  );

  const handleShapePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (fogDrawActive) handleFogPointerMove(e);
      else if (effectDrawActive) handleEffectPointerMove(e);
    },
    [effectDrawActive, fogDrawActive, handleEffectPointerMove, handleFogPointerMove],
  );

  const handleShapePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (fogDrawActive) handleFogPointerUp(e);
      else if (effectDrawActive) handleEffectPointerUp(e);
    },
    [effectDrawActive, fogDrawActive, handleEffectPointerUp, handleFogPointerUp],
  );

  const cancelShapeDraw = useCallback(() => {
    fogDrawOriginRef.current = null;
    setFogDraft(null);
    effectDrawOriginRef.current = null;
    setEffectDraft(null);
  }, []);

  return {
    fogDraft,
    setFogDraft,
    fogDrawOriginRef,
    effectDraft,
    setEffectDraft,
    effectDrawOriginRef,
    cellFromClient,
    handleShapePointerDown,
    handleShapePointerMove,
    handleShapePointerUp,
    cancelShapeDraw,
  };
}
