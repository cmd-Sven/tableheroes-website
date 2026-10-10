"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapPlacements, placementsToScales, saveCityMapScale } from "../aurenfurt-city-map-db";
import { clampLandmarkScale, defaultLandmarkScales, type LandmarkScales } from "../aurenfurt-landmark-scales";

export function useLandmarkScales(worldId: string, isGm: boolean) {
  const [scales, setScales] = useState<LandmarkScales>(() => defaultLandmarkScales());
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapPlacements(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setScales(placementsToScales(result.data));
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Maßstäbe konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const setScale = useCallback(
    (buildingId: string, scale: number) => {
      const nextScale = clampLandmarkScale(scale);
      setScales((current) => ({
        ...current,
        [buildingId]: nextScale,
      }));
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann den Maßstab speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapScale(worldId, buildingId, nextScale).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  return { scales, setScale, saved, ready, saveError };
}
