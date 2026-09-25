"use client";

import { useCallback, useMemo, useState } from "react";
import { findBuilding } from "../aurenfurt-districts";

export function useHoloCityView() {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const focused = useMemo(() => findBuilding(focusedId), [focusedId]);
  const hovered = useMemo(() => findBuilding(hoveredId), [hoveredId]);

  const focus = useCallback((id: string | null) => {
    setFocusedId((current) => {
      if (id == null) return null;
      return current === id ? null : id;
    });
  }, []);

  const hover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  return { focusedId, focused, hovered, focus, hover };
}
