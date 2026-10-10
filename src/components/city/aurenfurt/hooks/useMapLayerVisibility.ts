"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapViewerPrefs, saveCityMapViewerFlag } from "../aurenfurt-city-map-db";

export type MapLayerId = "buildings" | "pois" | "streets" | "walls";

const COLUMN = {
  buildings: "buildings_visible",
  pois: "pois_visible",
  streets: "streets_visible",
  walls: "walls_visible",
} as const;

const DEFAULT_LAYERS = {
  buildings: true,
  pois: true,
  streets: true,
  walls: true,
};

export function useMapLayerVisibility(worldId: string, isGm: boolean) {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapViewerPrefs(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setLayers({
          buildings: result.data.buildingsVisible,
          pois: result.data.poisVisible,
          streets: result.data.streetsVisible,
          walls: result.data.wallsVisible,
        });
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Die Kartenebenen konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const toggleLayer = useCallback(
    (layer: MapLayerId) => {
      setLayers((prev) => {
        const value = !prev[layer];
        void saveCityMapViewerFlag(worldId, COLUMN[layer], value).then((error) => {
          if (error) {
            setLayers((current) => ({ ...current, [layer]: prev[layer] }));
            setSaveError(error);
            setSaved(false);
            return;
          }
          setSaveError(null);
          setSaved(true);
        });
        return { ...prev, [layer]: value };
      });
    },
    [worldId],
  );

  return { layers, toggleLayer, saved, ready, saveError };
}
