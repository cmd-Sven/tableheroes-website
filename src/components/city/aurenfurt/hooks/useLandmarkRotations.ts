"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LANDMARK_ROTATIONS_STORAGE_KEY,
  clampLandmarkRotation,
  parseStoredLandmarkRotations,
  serializeLandmarkRotations,
  type LandmarkRotations,
} from "../aurenfurt-landmark-rotations";

export function useLandmarkRotations() {
  const [rotations, setRotations] = useState<LandmarkRotations>({});
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const stored = parseStoredLandmarkRotations(window.localStorage.getItem(LANDMARK_ROTATIONS_STORAGE_KEY));
    if (stored) {
      setRotations(stored);
      setSavedLocally(true);
    }
  }, []);

  const persist = useCallback((next: LandmarkRotations) => {
    try {
      window.localStorage.setItem(LANDMARK_ROTATIONS_STORAGE_KEY, serializeLandmarkRotations(next));
      setSavedLocally(true);
    } catch {
      // Quota / privater Modus
    }
  }, []);

  const setRotation = useCallback(
    (buildingId: string, degrees: number) => {
      setRotations((current) => {
        const next = {
          ...current,
          [buildingId]: clampLandmarkRotation(degrees),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return {
    rotations,
    setRotation,
    savedLocally,
  };
}
