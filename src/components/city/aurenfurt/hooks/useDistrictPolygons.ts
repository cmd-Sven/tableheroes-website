"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import { loadCityMapPolygons, saveCityMapPolygons } from "../aurenfurt-city-map-db";
import {
  clampUvPoint,
  defaultDistrictPolygons,
  type DistrictPolygons,
  type UvPoint,
} from "../aurenfurt-district-polygons";

export function useDistrictPolygons(worldId: string, isGm: boolean) {
  const [polygons, setPolygons] = useState<DistrictPolygons>(() => defaultDistrictPolygons());
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapPolygons(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setPolygons(result.data);
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Viertel-Polygone konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const persist = useCallback(
    (next: DistrictPolygons) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Viertel speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapPolygons(worldId, next).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  const moveVertex = useCallback((districtId: CityDistrictId, index: number, point: UvPoint) => {
    setPolygons((current) => {
      const entry = current[districtId];
      if (!entry || index < 0 || index >= entry.points.length) return current;
      const nextPoints = entry.points.slice();
      nextPoints[index] = clampUvPoint(point);
      return { ...current, [districtId]: { ...entry, points: nextPoints } };
    });
  }, []);

  const setDistrictColor = useCallback(
    (districtId: CityDistrictId, color: string) => {
      setPolygons((current) => {
        const entry = current[districtId];
        if (!entry) return current;
        const next = { ...current, [districtId]: { ...entry, color } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setDistrictHoverOpacity = useCallback(
    (districtId: CityDistrictId, hoverOpacity: number) => {
      const clamped = Math.min(1, Math.max(0, hoverOpacity));
      setPolygons((current) => {
        const entry = current[districtId];
        if (!entry) return current;
        const next = { ...current, [districtId]: { ...entry, hoverOpacity: clamped } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

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
    saved,
    ready,
    saveError,
  };
}
