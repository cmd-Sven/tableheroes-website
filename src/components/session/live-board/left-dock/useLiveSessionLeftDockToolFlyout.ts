/**
 * useLiveSessionLeftDockToolFlyout — Positions and dismisses battlemap tool flyouts anchored to the left rail.
 */
"use client";

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ToolFlyoutId } from "./left-dock-constants";

export type LeftDockToolAnchorRefs = {
  fog: RefObject<HTMLDivElement | null>;
  effect: RefObject<HTMLDivElement | null>;
  marker: RefObject<HTMLDivElement | null>;
  trap: RefObject<HTMLDivElement | null>;
  container: RefObject<HTMLDivElement | null>;
  draw: RefObject<HTMLDivElement | null>;
};

export function useLiveSessionLeftDockToolFlyout(mapToolsActive: boolean) {
  const [toolFlyout, setToolFlyout] = useState<ToolFlyoutId | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const fogAnchorRef = useRef<HTMLDivElement>(null);
  const effectAnchorRef = useRef<HTMLDivElement>(null);
  const markerAnchorRef = useRef<HTMLDivElement>(null);
  const trapAnchorRef = useRef<HTMLDivElement>(null);
  const containerAnchorRef = useRef<HTMLDivElement>(null);
  const drawAnchorRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  const anchorRefs: LeftDockToolAnchorRefs = {
    fog: fogAnchorRef,
    effect: effectAnchorRef,
    marker: markerAnchorRef,
    trap: trapAnchorRef,
    container: containerAnchorRef,
    draw: drawAnchorRef,
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mapToolsActive) setToolFlyout(null);
  }, [mapToolsActive]);

  function flyoutAnchorEl(id: ToolFlyoutId) {
    if (id === "fog") return fogAnchorRef.current;
    if (id === "effect") return effectAnchorRef.current;
    if (id === "marker") return markerAnchorRef.current;
    if (id === "draw") return drawAnchorRef.current;
    if (id === "container") return containerAnchorRef.current;
    return trapAnchorRef.current;
  }

  useLayoutEffect(() => {
    if (!toolFlyout) {
      setFlyoutPos(null);
      return;
    }
    const anchor = flyoutAnchorEl(toolFlyout);
    if (!anchor) return;

    function updatePos() {
      if (!toolFlyout) return;
      const el = flyoutAnchorEl(toolFlyout);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setFlyoutPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [toolFlyout]);

  useEffect(() => {
    if (!toolFlyout) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setToolFlyout(null);
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (fogAnchorRef.current?.contains(target)) return;
      if (effectAnchorRef.current?.contains(target)) return;
      if (markerAnchorRef.current?.contains(target)) return;
      if (trapAnchorRef.current?.contains(target)) return;
      if (drawAnchorRef.current?.contains(target)) return;
      const flyout = document.getElementById("th-tool-flyout");
      if (flyout?.contains(target)) return;
      setToolFlyout(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [toolFlyout]);

  function toggleToolFlyout(id: ToolFlyoutId) {
    setToolFlyout((prev) => (prev === id ? null : id));
  }

  return {
    toolFlyout,
    flyoutPos,
    portalReady,
    anchorRefs,
    toggleToolFlyout,
  };
}
