"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadCityMapPlacements,
  markerBuildingsFromPlacements,
  placementsToPositions,
  saveCityMapPosition,
  saveCityMapPositions,
  type PlacementMarker,
} from "../aurenfurt-city-map-db";
import { defaultBuildingPositions, type BuildingPositions } from "../aurenfurt-building-positions";
import { clampUvPoint, type UvPoint } from "../aurenfurt-district-polygons";
import type { EditorCityBuilding } from "../aurenfurt-map-buildings";

export function useBuildingPositions(worldId: string, isGm: boolean) {
  const [positions, setPositions] = useState<BuildingPositions>(() => defaultBuildingPositions());
  const [markerBuildings, setMarkerBuildings] = useState<EditorCityBuilding[]>([]);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapPlacements(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setPositions(placementsToPositions(result.data));
        setMarkerBuildings(markerBuildingsFromPlacements(result.data));
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Gebäudeplätze konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const moveBuilding = useCallback((buildingId: string, point: UvPoint) => {
    setPositions((current) => ({
      ...current,
      [buildingId]: clampUvPoint(point),
    }));
  }, []);

  const placeAndCommit = useCallback(
    (buildingId: string, point: UvPoint, marker?: PlacementMarker) => {
      const nextPoint = clampUvPoint(point);
      setPositions((current) => ({
        ...current,
        [buildingId]: nextPoint,
      }));
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Gebäudeplätze speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapPosition(worldId, buildingId, nextPoint, marker).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  const commit = useCallback(() => {
    setPositions((current) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Gebäudeplätze speichern.");
        setSaved(false);
        return current;
      }
      void saveCityMapPositions(worldId, current).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
      return current;
    });
  }, [isGm, worldId]);

  return {
    positions,
    markerBuildings,
    moveBuilding,
    placeAndCommit,
    commit,
    saved,
    ready,
    saveError,
  };
}
