"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapViewerPrefs, saveCityMapWeather } from "../aurenfurt-city-map-db";
import {
  defaultWeatherFxPreference,
  type WeatherFxMode,
  type WeatherFxPreference,
} from "../aurenfurt-weather-fx";

export function useWeatherFxControl(worldId: string, isGm: boolean) {
  const [preference, setPreference] = useState<WeatherFxPreference>(() => defaultWeatherFxPreference());
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapViewerPrefs(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setPreference(result.data.weather);
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Der Wettereffekt konnte nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const persist = useCallback(
    (next: WeatherFxPreference, previous: WeatherFxPreference) => {
      setPreference(next);
      void saveCityMapWeather(worldId, next).then((error) => {
        if (error) {
          setPreference(previous);
          setSaveError(error);
          setSaved(false);
          return;
        }
        setSaveError(null);
        setSaved(true);
      });
    },
    [worldId],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...preference, enabled }, preference);
    },
    [persist, preference],
  );

  const setMode = useCallback(
    (mode: WeatherFxMode) => {
      persist({ enabled: true, mode }, preference);
    },
    [persist, preference],
  );

  return { preference, setEnabled, setMode, saved, ready, saveError };
}
