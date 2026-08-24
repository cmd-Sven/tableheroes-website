/**
 * useBattlemapViewport — Fit-scale, pan/zoom helpers, resize observer, and wheel capture for BattlemapStage.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { fitScaleFor } from "./battlemap-stage-utils";

type Args = {
  battlemapId: string;
  initialWidth: number;
  initialHeight: number;
};

export function useBattlemapViewport({
  battlemapId,
  initialWidth,
  initialHeight,
}: Args) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [fitScale, setFitScale] = useState(1);
  const [viewScale, setViewScale] = useState(1);

  const computeFitScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || mapSize.width <= 0 || mapSize.height <= 0) return 1;
    return fitScaleFor(
      mapSize.width,
      mapSize.height,
      stage.clientWidth,
      stage.clientHeight,
    );
  }, [mapSize.height, mapSize.width]);

  const applyFitView = useCallback(() => {
    const nextFit = computeFitScale();
    setFitScale(nextFit);
    setViewScale(nextFit);
    requestAnimationFrame(() => {
      transformRef.current?.centerView(nextFit, 200);
    });
  }, [computeFitScale]);

  const panBy = useCallback((dx: number, dy: number) => {
    const api = transformRef.current;
    if (!api) return;
    const state = api.state ?? api.instance?.state;
    if (!state) return;
    api.setTransform(state.positionX + dx, state.positionY + dy, state.scale, 180);
  }, []);

  const zoomByFactor = useCallback(
    (factor: number) => {
      const api = transformRef.current;
      if (!api) return;
      const state = api.state ?? api.instance?.state;
      if (!state) return;
      const lo = Math.max(0.05, fitScale * 0.35);
      const hi = Math.max(4, fitScale * 8);
      const next = Math.min(hi, Math.max(lo, state.scale * factor));
      api.setTransform(state.positionX, state.positionY, next, 180);
      setViewScale(next);
    },
    [fitScale],
  );

  // Beim Map-Wechsel / Bildgröße: Fit-Scale neu berechnen (TransformWrapper remountet über key)
  useEffect(() => {
    setFitScale(computeFitScale());
  }, [computeFitScale, battlemapId]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      // Nur Fit-Scale für min/max aktualisieren — Zoom nicht hart zurücksetzen
      resizeTimer = setTimeout(() => {
        setFitScale(computeFitScale());
      }, 120);
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [computeFitScale]);

  // Mausrad: zoomen + Seiten-Scroll blockieren (Capture + non-passive).
  // Ohne preventDefault scrollt der äußere Live-Board-Container (overflow-y-auto).
  // TransformWrapper hat wheelDisabled — Zoom läuft bewusst hier.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY === 0) return;
      zoomByFactor(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    stage.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => stage.removeEventListener("wheel", onWheel, { capture: true });
  }, [zoomByFactor]);

  return {
    transformRef,
    stageRef,
    mapSize,
    setMapSize,
    fitScale,
    setFitScale,
    viewScale,
    setViewScale,
    computeFitScale,
    applyFitView,
    panBy,
    zoomByFactor,
  };
}
