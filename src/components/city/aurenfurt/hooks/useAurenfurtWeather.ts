"use client";

import { useEffect, useMemo, useState } from "react";
import { HISTORY_START, formatDay, parseDay, utcToday } from "../aurenfurt-history";
import {
  fetchLiveAurenfurtWeather,
  weatherOn,
  weatherSeries,
  type DayWeather,
} from "../aurenfurt-weather";

export type LiveWeatherState = "loading" | "ready" | "unavailable";

export function useAurenfurtWeather(dayIso: string) {
  const today = useMemo(() => utcToday(), []);
  const todayIso = useMemo(() => formatDay(today), [today]);
  const isLiveDay = dayIso === todayIso;
  const history = useMemo(() => weatherSeries(parseDay(HISTORY_START), today), [today]);
  const [live, setLive] = useState<DayWeather | null>(null);
  const [liveState, setLiveState] = useState<LiveWeatherState>("loading");

  useEffect(() => {
    const controller = new AbortController();
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
  }, [today]);

  const series = useMemo(() => {
    if (!live) return history;
    return history.map((entry) => (entry.day === todayIso ? live : entry));
  }, [history, live, todayIso]);

  const current = useMemo(() => {
    if (isLiveDay && live) return live;
    return weatherOn(parseDay(dayIso));
  }, [isLiveDay, live, dayIso]);

  return { current, series, liveState };
}
