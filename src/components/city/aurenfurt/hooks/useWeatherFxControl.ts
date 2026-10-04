"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WEATHER_FX_STORAGE_KEY,
  defaultWeatherFxPreference,
  parseStoredWeatherFx,
  serializeWeatherFx,
  type WeatherFxMode,
  type WeatherFxPreference,
} from "../aurenfurt-weather-fx";

export function useWeatherFxControl() {
  const [preference, setPreference] = useState<WeatherFxPreference>(() => defaultWeatherFxPreference());

  useEffect(() => {
    const stored = parseStoredWeatherFx(window.localStorage.getItem(WEATHER_FX_STORAGE_KEY));
    if (stored) setPreference(stored);
  }, []);

  const persist = useCallback((next: WeatherFxPreference) => {
    setPreference(next);
    try {
      window.localStorage.setItem(WEATHER_FX_STORAGE_KEY, serializeWeatherFx(next));
    } catch {
      // Quota oder privates Fenster: die Sitzung behält die Wahl.
    }
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...preference, enabled });
    },
    [persist, preference],
  );

  const setMode = useCallback(
    (mode: WeatherFxMode) => {
      persist({ enabled: true, mode });
    },
    [persist],
  );

  return { preference, setEnabled, setMode };
}
