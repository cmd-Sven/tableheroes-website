"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import {
  DISTRICT_POLYGONS_LEGACY_STORAGE_KEY,
  DISTRICT_POLYGONS_STORAGE_KEY,
  clampUvPoint,
  defaultDistrictPolygons,
  mergeDistrictPolygonsWithDefaults,
  parseStoredDistrictPolygons,
  serializeDistrictPolygons,
  type DistrictPolygons,
  type UvPoint,
} from "../aurenfurt-district-polygons";

export function useDistrictPolygons() {
  const [polygons, setPolygons] = useState<DistrictPolygons>(() => defaultDistrictPolygons());
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const current = window.localStorage.getItem(DISTRICT_POLYGONS_STORAGE_KEY);
    const legacy = window.localStorage.getItem(DISTRICT_POLYGONS_LEGACY_STORAGE_KEY);
    const stored = parseStoredDistrictPolygons(current) ?? parseStoredDistrictPolygons(legacy);
    if (stored) {
      // Fehlende Viertel-Ids (z. B. Akademieviertel) aus Defaults ergänzen, gespeicherte nicht verwerfen.
      const merged = mergeDistrictPolygonsWithDefaults(stored);
      setPolygons(merged);
      setSavedLocally(true);
      try {
        window.localStorage.setItem(DISTRICT_POLYGONS_STORAGE_KEY, serializeDistrictPolygons(merged));
      } catch {
        // Quota / private mode
      }
    }
  }, []);

  const persist = useCallback((next: DistrictPolygons) => {
    try {
      window.localStorage.setItem(DISTRICT_POLYGONS_STORAGE_KEY, serializeDistrictPolygons(next));
      setSavedLocally(true);
    } catch {
      // Quota / private mode – State bleibt die Quelle für Mesh und Hits.
    }
  }, []);

  const moveVertex = useCallback((districtId: CityDistrictId, index: number, point: UvPoint) => {
    setPolygons((current) => {
      const entry = current[districtId];
      if (!entry || index < 0 || index >= entry.points.length) return current;
      const nextPoints = entry.points.slice();
      nextPoints[index] = clampUvPoint(point);
      return { ...current, [districtId]: { ...entry, points: nextPoints } };
    });
  }, []);

  const setDistrictColor = useCallback((districtId: CityDistrictId, color: string) => {
    setPolygons((current) => {
      const entry = current[districtId];
      if (!entry) return current;
      const next = { ...current, [districtId]: { ...entry, color } };
      persist(next);
      return next;
    });
  }, [persist]);

  const setDistrictHoverOpacity = useCallback((districtId: CityDistrictId, hoverOpacity: number) => {
    const clamped = Math.min(1, Math.max(0, hoverOpacity));
    setPolygons((current) => {
      const entry = current[districtId];
      if (!entry) return current;
      const next = { ...current, [districtId]: { ...entry, hoverOpacity: clamped } };
      persist(next);
      return next;
    });
  }, [persist]);

  const commit = useCallback(() => {
    setPolygons((current) => {
      persist(current);
      return current;
    });
  }, [persist]);

  return {
    polygons,
    moveVertex,
    setDistrictColor,
    setDistrictHoverOpacity,
    commit,
    savedLocally,
  };
}
