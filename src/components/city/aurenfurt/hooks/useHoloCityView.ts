"use client";

import { useCallback, useMemo, useState } from "react";
import {
  sameSelection,
  subjectFromSelection,
  type HoloSelection,
} from "../aurenfurt-districts";

export function useHoloCityView() {
  const [selection, setSelection] = useState<HoloSelection | null>(null);
  const [hovered, setHovered] = useState<HoloSelection | null>(null);
  const subject = useMemo(() => subjectFromSelection(selection), [selection]);
  const hoveredSubject = useMemo(() => subjectFromSelection(hovered), [hovered]);

  const focus = useCallback((next: HoloSelection | null) => {
    setSelection((current) => (sameSelection(current, next) ? null : next));
  }, []);

  const hover = useCallback((next: HoloSelection | null) => {
    setHovered(next);
  }, []);

  return { selection, hovered, subject, hoveredSubject, focus, hover };
}
