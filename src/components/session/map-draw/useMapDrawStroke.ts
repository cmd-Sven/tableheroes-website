/**
 * useMapDrawStroke — Pointer handlers for freehand drawing on a map surface.
 */
"use client";

import { useCallback, useRef, useState } from "react";
import type { MapDrawPoint } from "@/src/lib/session/map-draw-types";

type Args = {
  enabled: boolean;
  mapWidth: number;
  mapHeight: number;
  mode?: "draw" | "erase";
  onStrokeComplete: (points: MapDrawPoint[]) => void;
  onErasePoint?: (point: MapDrawPoint) => void;
};

function clientToMapPx(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  mapWidth: number,
  mapHeight: number,
): MapDrawPoint | null {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * mapWidth;
  const y = ((clientY - rect.top) / rect.height) * mapHeight;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function useMapDrawStroke({
  enabled,
  mapWidth,
  mapHeight,
  mode = "draw",
  onStrokeComplete,
  onErasePoint,
}: Args) {
  const [draftPoints, setDraftPoints] = useState<MapDrawPoint[] | null>(null);
  const draftRef = useRef<MapDrawPoint[] | null>(null);
  const drawingRef = useRef(false);
  const onCompleteRef = useRef(onStrokeComplete);
  const onEraseRef = useRef(onErasePoint);
  onCompleteRef.current = onStrokeComplete;
  onEraseRef.current = onErasePoint;
  const erasing = mode === "erase";

  const setDraft = useCallback((next: MapDrawPoint[] | null) => {
    draftRef.current = next;
    setDraftPoints(next);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;
      const pt = clientToMapPx(e.clientX, e.clientY, e.currentTarget, mapWidth, mapHeight);
      if (!pt) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      if (erasing) {
        onEraseRef.current?.(pt);
        return;
      }
      setDraft([pt]);
    },
    [enabled, erasing, mapHeight, mapWidth, setDraft],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !drawingRef.current) return;
      const pt = clientToMapPx(e.clientX, e.clientY, e.currentTarget, mapWidth, mapHeight);
      if (!pt) return;
      if (erasing) {
        onEraseRef.current?.(pt);
        return;
      }
      const prev = draftRef.current;
      if (!prev || prev.length === 0) {
        setDraft([pt]);
        return;
      }
      const last = prev[prev.length - 1]!;
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < 4) return;
      setDraft([...prev, pt]);
    },
    [enabled, erasing, mapHeight, mapWidth, setDraft],
  );

  const finish = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const prev = draftRef.current;
      setDraft(null);
      if (!erasing && prev && prev.length >= 2) {
        queueMicrotask(() => onCompleteRef.current(prev));
      }
    },
    [erasing, setDraft],
  );

  return {
    draftPoints,
    drawHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
