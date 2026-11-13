"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HISTORY_START,
  formatDay,
  parseDay,
  utcToday,
} from "../aurenfurt-history";

const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;

export function seriesMinDay() {
  return HISTORY_START;
}

/** Letzter simulierter Tag: echter heute, nicht hinter dem Reihenende. */
export function seriesMaxDay(now = new Date()) {
  return formatDay(utcToday(now));
}

export function clampViewDay(iso: string, now = new Date()) {
  const min = parseDay(seriesMinDay());
  const max = parseDay(seriesMaxDay(now));
  const day = parseDay(iso);
  if (Number.isNaN(day)) return seriesMaxDay(now);
  return formatDay(Math.max(min, Math.min(max, day)));
}

export function shiftViewDay(iso: string, deltaMs: number, now = new Date()) {
  return clampViewDay(formatDay(parseDay(iso) + deltaMs), now);
}

export type AurenfurtDayControls = {
  /** Betrachteter Tag als `YYYY-MM-DD`. */
  day: string;
  dayMs: number;
  minDay: string;
  maxDay: string;
  isToday: boolean;
  setDay: (iso: string) => void;
  stepDay: (delta: number) => void;
  stepYear: (delta: number) => void;
  goToday: () => void;
};

export function useAurenfurtDay(presentIso: string | null = null): AurenfurtDayControls {
  const minDay = useMemo(() => seriesMinDay(), []);
  const maxDay = presentIso ?? seriesMaxDay();
  const [day, setDayRaw] = useState(maxDay);

  const clamp = useCallback(
    (iso: string) => {
      const value = parseDay(iso);
      if (Number.isNaN(value)) return maxDay;
      return formatDay(Math.max(parseDay(minDay), Math.min(parseDay(maxDay), value)));
    },
    [maxDay, minDay],
  );

  useEffect(() => {
    setDayRaw((current) => clamp(current));
  }, [clamp]);

  const setDay = useCallback((iso: string) => {
    setDayRaw(clamp(iso));
  }, [clamp]);

  const stepDay = useCallback((delta: number) => {
    setDayRaw((current) => clamp(formatDay(parseDay(current) + delta * DAY_MS)));
  }, [clamp]);

  const stepYear = useCallback((delta: number) => {
    setDayRaw((current) => clamp(formatDay(parseDay(current) + delta * YEAR_MS)));
  }, [clamp]);

  const goToday = useCallback(() => {
    setDayRaw(maxDay);
  }, [maxDay]);

  return {
    day,
    dayMs: parseDay(day),
    minDay,
    maxDay,
    isToday: day === maxDay,
    setDay,
    stepDay,
    stepYear,
    goToday,
  };
}
