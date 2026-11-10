"use client";

import { useEffect, useMemo, useState } from "react";
import { HISTORY_START, formatDay, parseDay, utcToday } from "../aurenfurt-history";
import {
  fetchLiveAurenfurtWeather,
  weatherOn,
  weatherSeries,
  type DayWeather,
} from "../aurenfurt-weather";

export type LiveWeatherState = "loading" | "ready" | "unavailable" | "disabled";

export type UseAurenfurtWeatherOptions = {
  /** Wenn false: keine Open-Meteo-Abfrage; Statistik nutzt simuliertes Wetter. */
  apiEnabled?: boolean;
};

export function useAurenfurtWeather(dayIso: string, options: UseAurenfurtWeatherOptions = {}) {
  const apiEnabled = options.apiEnabled !== false;
  const today = useMemo(() => utcToday(), []);
  const todayIso = useMemo(() => formatDay(today), [today]);
  const isLiveDay = dayIso === todayIso;
  const history = useMemo(() => weatherSeries(parseDay(HISTORY_START), today), [today]);
  const [live, setLive] = useState<DayWeather | null>(null);
  const [liveState, setLiveState] = useState<LiveWeatherState>(apiEnabled ? "loading" : "disabled");

  useEffect(() => {
    if (!apiEnabled) {
      setLive(null);
      setLiveState("disabled");
      return;
    }

    const controller = new AbortController();
    setLiveState("loading");
    fetchLiveAurenfurtWeather(controller.signal)
      .then((reading) => {
        if (controller.signal.aborted) return;
        if (!reading) {
          setLiveState("unavailable");
          return;
        }
        setLive(reading);
        setLiveState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLiveState("unavailable");
      });
    return () => controller.abort();
  }, [apiEnabled, today]);

  const series = useMemo(() => {
    if (!apiEnabled || !live) return history;
    return history.map((entry) => (entry.day === todayIso ? live : entry));
  }, [apiEnabled, history, live, todayIso]);

  const current = useMemo(() => {
    if (apiEnabled && isLiveDay && live) return live;
    return weatherOn(parseDay(dayIso));
  }, [apiEnabled, isLiveDay, live, dayIso]);

  return { current, series, liveState, live, apiEnabled };
}
