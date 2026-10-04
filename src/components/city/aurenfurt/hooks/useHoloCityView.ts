"use client";

import { useCallback, useMemo, useState } from "react";
import {
  sameSelection,
  subjectFromSelection,
  type CityBuilding,
  type HoloSelection,
} from "../aurenfurt-districts";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";

export function useHoloCityView(buildings: CityBuilding[], pois: AurenfurtMapPoi[] = []) {
  const [selection, setSelection] = useState<HoloSelection | null>(null);
  const [hovered, setHovered] = useState<HoloSelection | null>(null);
  const subject = useMemo(
    () => subjectFromSelection(selection, buildings, pois),
    [selection, buildings, pois],
  );
  const hoveredSubject = useMemo(
    () => subjectFromSelection(hovered, buildings, pois),
    [hovered, buildings, pois],
  );

  const focus = useCallback((next: HoloSelection | null) => {
    setSelection((current) => (sameSelection(current, next) ? null : next));
  }, []);

  const hover = useCallback((next: HoloSelection | null) => {
    setHovered(next);
  }, []);

  return { selection, hovered, subject, hoveredSubject, focus, hover };
}
