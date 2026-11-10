"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { holidayOnIso } from "./aurenfurt-chronicle";
import { formatDay, parseDay } from "./aurenfurt-time";
import { weatherOn, type DayWeather, type WeatherKind } from "./aurenfurt-weather";
import { formatGermanDay } from "./HoloDayCalendar";
import { CITY_VIEW_CARD_SIZE } from "./CityViewSwitch";
import { WeatherPngIcon } from "@/src/components/session/live-board/WeatherPngIcon";
import { WEATHER_ICON_OPTIONS } from "@/src/components/session/live-board/live-session-weather";
import type { WeatherPresetId } from "@/src/lib/session-weather";

const DAY_MS = 86_400_000;
const WINDOW = 5;
const GAP = 6;
const ACTIVE_SCALE = 1.08;
const CELL_MAX = CITY_VIEW_CARD_SIZE;
const CELL_MIN = 56;
const GOLD = "#cab926";

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

/** Dieselben Grafiken wie die Live-Session. Nebel und Frost nutzen „Nur Wolken“, dort gibt es kein eigenes Bild. */
const KIND_PRESET: Record<WeatherKind, WeatherPresetId> = {
  clear: "sun",
  heat: "sun",
  cloudy: "clouds",
  frost: "clouds",
  fog: "clouds",
  rain: "rain",
  storm: "storm",
  snow: "snow",
};

type Props = {
  day: string;
  minDay: string;
  maxDay: string;
  isToday: boolean;
  liveWeather: DayWeather | null;
  onDayChange: (iso: string) => void;
  onStepDay: (delta: number) => void;
  onStepYear: (delta: number) => void;
  onGoToday: () => void;
};

function addDays(iso: string, delta: number) {
  return formatDay(parseDay(iso) + delta * DAY_MS);
}

function around(center: string) {
  return [-2, -1, 0, 1, 2].map((offset) => addDays(center, offset));
}

function weekdayDe(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS_DE[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

function weekdayShort(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS_SHORT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

function dayNumber(iso: string) {
  return Number(iso.slice(8, 10));
}

function weatherFor(iso: string, live: DayWeather | null) {
  if (live && live.day === iso) return live;
  return weatherOn(parseDay(iso));
}

function iconFor(kind: WeatherKind) {
  const preset = KIND_PRESET[kind];
  return WEATHER_ICON_OPTIONS.find((option) => option.id === preset) ?? WEATHER_ICON_OPTIONS[0];
}

export function HoloDayStrip({
  day,
  minDay,
  maxDay,
  isToday,
  liveWeather,
  onDayChange,
}: Props) {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(CELL_MAX);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = root?.parentElement;
    if (!root || !header) return;

    const measure = () => {
      const headerStyles = getComputedStyle(header);
      const pad = (parseFloat(headerStyles.paddingLeft) || 0) + (parseFloat(headerStyles.paddingRight) || 0);
      const headerGap = parseFloat(headerStyles.columnGap || headerStyles.gap) || 0;
      const reserved = Array.from(header.children).reduce((sum, child) => {
        if (child === root || (child as HTMLElement).dataset.calHint != null) return sum;
        return sum + (child as HTMLElement).offsetWidth;
      }, 0);
      const gaps = headerGap * Math.max(0, header.children.length - 1);
      const free = header.clientWidth - pad - gaps - reserved;
      // Rahmen-Padding (px-2 * 2) + innere Gaps abziehen
      const framePad = 16;
      const next = Math.max(
        CELL_MIN,
        Math.min(CELL_MAX, Math.floor((free - framePad - (WINDOW - 1) * GAP) / (WINDOW - 1 + ACTIVE_SCALE))),
      );
      setSide((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isToday]);

  const active = Math.round(side * ACTIVE_SCALE);
  const cells = around(day);

  return (
    <div
      ref={rootRef}
      data-city-map-hud="day-strip"
      className="relative flex shrink-0 items-end rounded-md border border-hero-dark/80 bg-background-dark/95 p-1.5 shadow-inner"
    >
      <p className="sr-only" aria-live="polite">
        {formatGermanDay(day)}
        {isToday ? ", heute" : ""}
      </p>

      <div className="flex items-end" style={{ gap: GAP }} role="group" aria-labelledby={labelId}>
        <span id={labelId} className="sr-only">
          Stadttage, der aktive Tag steht in der Mitte
        </span>
        {cells.map((iso) => {
          const weather = weatherFor(iso, liveWeather);
          const holiday = holidayOnIso(iso);
          const icon = iconFor(weather.kind);
          const inRange = iso >= minDay && iso <= maxDay;
          const selected = iso === day;
          const size = selected ? active : side;
          const iconPx = Math.round(size * 0.36);
          const label = [weekdayDe(iso), formatGermanDay(iso), weather.label, holiday?.title]
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={iso}
              type="button"
              disabled={!inRange}
              aria-current={selected ? "date" : undefined}
              aria-label={label}
              title={label}
              onClick={() => onDayChange(iso)}
              className={`relative flex shrink-0 flex-col items-center justify-center gap-0 rounded-[8px] bg-[#D3D3D3] px-0.5 py-1 shadow-sm transition-[width,height] duration-200 disabled:opacity-40 ${
                selected ? "" : "border border-black/10"
              }`}
              style={{
                width: size,
                height: size,
                ...(selected
                  ? {
                      border: `2px solid ${GOLD}`,
                      boxSizing: "border-box",
                    }
                  : null),
              }}
            >
              <span
                className={`font-barlow text-[8px] font-bold uppercase leading-none tracking-wide ${
                  inRange ? "text-black" : "text-gray-400"
                }`}
              >
                {weekdayShort(iso)}
              </span>
              <span
                className={`shrink-0 font-barlow font-extrabold tabular-nums leading-none ${
                  selected ? "text-base" : "text-sm"
                } ${inRange ? "text-black" : "text-gray-400"}`}
              >
                {dayNumber(iso)}
              </span>
              <span className="block shrink-0" style={{ width: iconPx, height: iconPx }}>
                <WeatherPngIcon option={icon} sizeClassName="h-full w-full" />
              </span>

              {selected ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-1/2 z-10"
                  style={{
                    width: 0,
                    height: 0,
                    marginLeft: -7,
                    marginBottom: -1,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderBottom: `10px solid ${GOLD}`,
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
