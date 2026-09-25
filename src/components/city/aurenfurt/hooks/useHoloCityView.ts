"use client";

import { useCallback, useMemo, useState } from "react";
import { CITY_CENTER } from "../aurenfurt-layout";
import { findDistrict, type CityDistrictId } from "../aurenfurt-districts";

export function useHoloCityView() {
  const [focusedId, setFocusedId] = useState<CityDistrictId | null>(null);
  const focused = findDistrict(focusedId);

  const camera = useMemo(() => {
    if (!focused) return { scale: 1, x: 0, y: 0 };
    const dx = CITY_CENTER.x - focused.label.x;
    const dy = CITY_CENTER.y - focused.label.y;
    return { scale: focused.id === "palast" ? 1.65 : 1.85, x: dx * 0.55, y: dy * 0.55 };
  }, [focused]);

  const focus = useCallback((id: CityDistrictId) => {
    setFocusedId((current) => (current === id ? null : id));
  }, []);

  const clear = useCallback(() => setFocusedId(null), []);

  return { focusedId, focused, camera, focus, clear };
}
