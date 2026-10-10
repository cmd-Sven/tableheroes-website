"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapViewerPrefs, saveCityMapStreetsVisible } from "../aurenfurt-city-map-db";

export function useStreetsVisibility(worldId: string, isGm: boolean) {
  const [streetsVisible, setStreetsVisibleState] = useState(true);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapViewerPrefs(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setStreetsVisibleState(result.data.streetsVisible);
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Die Straßensichtbarkeit konnte nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const setStreetsVisible = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setStreetsVisibleState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        void saveCityMapStreetsVisible(worldId, value).then((error) => {
          if (error) {
            setStreetsVisibleState(prev);
            setSaveError(error);
            setSaved(false);
            return;
          }
          setSaveError(null);
          setSaved(true);
        });
        return value;
      });
    },
    [worldId],
  );

  const toggleStreetsVisible = useCallback(() => {
    setStreetsVisible((prev) => !prev);
  }, [setStreetsVisible]);

  return { streetsVisible, setStreetsVisible, toggleStreetsVisible, saved, ready, saveError };
}
