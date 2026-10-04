"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LANDMARK_SCALES_STORAGE_KEY,
  clampLandmarkScale,
  defaultLandmarkScales,
  parseStoredLandmarkScales,
  serializeLandmarkScales,
  type LandmarkScales,
} from "../aurenfurt-landmark-scales";

export function useLandmarkScales() {
  const [scales, setScales] = useState<LandmarkScales>(() => defaultLandmarkScales());
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const stored = parseStoredLandmarkScales(window.localStorage.getItem(LANDMARK_SCALES_STORAGE_KEY));
    if (stored) {
      setScales(stored);
      setSavedLocally(true);
    }
  }, []);

  const persist = useCallback((next: LandmarkScales) => {
    try {
      window.localStorage.setItem(LANDMARK_SCALES_STORAGE_KEY, serializeLandmarkScales(next));
      setSavedLocally(true);
    } catch {
      // Quota / private mode – State bleibt die Quelle für die Karte.
    }
  }, []);

  const setScale = useCallback(
    (buildingId: string, scale: number) => {
      setScales((current) => {
        const next = {
          ...current,
          [buildingId]: clampLandmarkScale(scale),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return {
    scales,
    setScale,
    savedLocally,
  };
}
