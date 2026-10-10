"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapPlacements, placementsToRotations, saveCityMapRotation } from "../aurenfurt-city-map-db";
import { clampLandmarkRotation, type LandmarkRotations } from "../aurenfurt-landmark-rotations";

export function useLandmarkRotations(worldId: string, isGm: boolean) {
  const [rotations, setRotations] = useState<LandmarkRotations>({});
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapPlacements(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setRotations(placementsToRotations(result.data));
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Drehungen konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const setRotation = useCallback(
    (buildingId: string, degrees: number) => {
      const nextRotation = clampLandmarkRotation(degrees);
      setRotations((current) => ({
        ...current,
        [buildingId]: nextRotation,
      }));
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann die Drehung speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapRotation(worldId, buildingId, nextRotation).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  return { rotations, setRotation, saved, ready, saveError };
}
