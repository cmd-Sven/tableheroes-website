"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BUILDING_POSITIONS_STORAGE_KEY,
  defaultBuildingPositions,
  parseStoredBuildingPositions,
  serializeBuildingPositions,
  type BuildingPositions,
} from "../aurenfurt-building-positions";
import { clampUvPoint, type UvPoint } from "../aurenfurt-district-polygons";

export function useBuildingPositions() {
  const [positions, setPositions] = useState<BuildingPositions>(() => defaultBuildingPositions());
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const stored = parseStoredBuildingPositions(window.localStorage.getItem(BUILDING_POSITIONS_STORAGE_KEY));
    if (stored) {
      setPositions(stored);
      setSavedLocally(true);
    }
  }, []);

  const persist = useCallback((next: BuildingPositions) => {
    try {
      window.localStorage.setItem(BUILDING_POSITIONS_STORAGE_KEY, serializeBuildingPositions(next));
      setSavedLocally(true);
    } catch {
      // Quota / private mode – State bleibt die Quelle für Marker und Hits.
    }
  }, []);

  const moveBuilding = useCallback((buildingId: string, point: UvPoint) => {
    setPositions((current) => ({
      ...current,
      [buildingId]: clampUvPoint(point),
    }));
  }, []);

  /** Sofort setzen und in localStorage schreiben (z. B. nach DB-Create). */
  const placeAndCommit = useCallback(
    (buildingId: string, point: UvPoint) => {
      setPositions((current) => {
        const next = {
          ...current,
          [buildingId]: clampUvPoint(point),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const commit = useCallback(() => {
    setPositions((current) => {
      persist(current);
      return current;
    });
  }, [persist]);

  return {
    positions,
    moveBuilding,
    placeAndCommit,
    commit,
    savedLocally,
  };
}
