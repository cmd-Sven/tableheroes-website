"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { holidayOnIso } from "./aurenfurt-chronicle";
import { formatDay, parseDay } from "./aurenfurt-time";
import { weatherOn, type DayWeather, type WeatherKind } from "./aurenfurt-weather";
import { formatGermanDay } from "./HoloDayCalendar";
import { WeatherPngIcon } from "@/src/components/session/live-board/WeatherPngIcon";
import { WEATHER_ICON_OPTIONS } from "@/src/components/session/live-board/live-session-weather";
import type { WeatherPresetId } from "@/src/lib/session-weather";

const DAY_MS = 86_400_000;
const WINDOW = 5;
const CELL_MAX = 120;
const CELL_MIN = 84;

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

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

const ARROW =
  "grid h-7 w-7 shrink-0 place-items-center rounded text-hero-vibrant hover:bg-hero-vibrant/15 disabled:opacity-30";

type Track = {
  phase: "idle" | "move";
  center: string;
  target: string;
  cells: string[];
  fromSteps: number;
  toSteps: number;
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

function dayDelta(from: string, to: string) {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS);
}

function around(center: string) {
  return [-2, -1, 0, 1, 2].map((offset) => addDays(center, offset));
}

function idleTrack(center: string): Track {
  return { phase: "idle", center, target: center, cells: around(center), fromSteps: 0, toSteps: 0 };
}

function beginTrack(from: string, to: string): Track {
  const delta = dayDelta(from, to);
  if (delta === 0) return idleTrack(to);
  const sign = delta > 0 ? 1 : -1;
  const steps = Math.min(Math.abs(delta), WINDOW);
  if (Math.abs(delta) <= WINDOW) {
    const start = sign > 0 ? addDays(from, -2) : addDays(to, -2);
    return {
      phase: "move",
      center: from,
      target: to,
      cells: Array.from({ length: WINDOW + steps }, (_, index) => addDays(start, index)),
      fromSteps: sign > 0 ? 0 : -steps,
      toSteps: sign > 0 ? -steps : 0,
    };
  }
  if (sign > 0) {
    return {
      phase: "move",
      center: from,
      target: to,
      cells: [...around(from), ...around(to)],
      fromSteps: 0,
      toSteps: -WINDOW,
    };
  }
  return {
    phase: "move",
    center: from,
    target: to,
    cells: [...around(to), ...around(from)],
    fromSteps: -WINDOW,
    toSteps: 0,
  };
}

function weekdayDe(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS_DE[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
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

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function mondayOffset(year: number, monthIndex: number) {
  const weekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function padIso(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function HoloDayStrip({
  day,
  minDay,
  maxDay,
  isToday,
  liveWeather,
  onDayChange,
  onStepDay,
  onStepYear,
  onGoToday,
}: Props) {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(CELL_MAX);
  const cellRef = useRef(cell);
  cellRef.current = cell;
  const x = useMotionValue(0);
  const [track, setTrack] = useState<Track>(() => idleTrack(day));
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const [year, month] = day.split("-").map(Number);
    return { year, monthIndex: month - 1 };
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = root?.parentElement;
    if (!root || !header) return;

    const measure = () => {
      const left = root.querySelector<HTMLElement>("[data-cal-left]")?.offsetWidth ?? 0;
      const right = root.querySelector<HTMLElement>("[data-cal-right]")?.offsetWidth ?? 0;
      const headerStyles = getComputedStyle(header);
      const pad = (parseFloat(headerStyles.paddingLeft) || 0) + (parseFloat(headerStyles.paddingRight) || 0);
      const headerGap = parseFloat(headerStyles.columnGap || headerStyles.gap) || 0;
      const reserved = Array.from(header.children).reduce((sum, child) => {
        if (child === root || (child as HTMLElement).dataset.calHint != null) return sum;
        return sum + (child as HTMLElement).offsetWidth;
      }, 0);
      const gaps = headerGap * Math.max(0, header.children.length - 1);
      const innerGap = parseFloat(getComputedStyle(root).columnGap || getComputedStyle(root).gap) || 0;
      const free = header.clientWidth - pad - gaps - reserved - left - right - innerGap * 2;
      const next = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(free / WINDOW)));
      setCell((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    const left = root.querySelector<HTMLElement>("[data-cal-left]");
    const right = root.querySelector<HTMLElement>("[data-cal-right]");
    if (left) observer.observe(left);
    if (right) observer.observe(right);
    return () => observer.disconnect();
  }, [isToday]);

  useLayoutEffect(() => {
    if (track.phase !== "idle") return;
    x.set(0);
    if (track.center === day) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTrack(reduce ? idleTrack(day) : beginTrack(track.center, day));
  }, [track, day, x]);

  useLayoutEffect(() => {
    if (track.phase !== "move") return;
    const size = cellRef.current;
    x.set(track.fromSteps * size);
    let active = true;
    const controls = animate(x, track.toSteps * size, {
      duration: 0.45,
      ease: "easeInOut",
      onComplete: () => {
        if (!active) return;
        setTrack(idleTrack(track.target));
      },
    });
    return () => {
      active = false;
      controls.stop();
    };
  }, [track, x]);

  const canPrevDay = day > minDay;
  const canNextDay = day < maxDay;
  const origin = track.phase === "move" ? new Set(around(track.center)) : null;
  const destination = new Set(around(track.phase === "move" ? track.target : track.center));
  const blank = mondayOffset(cursor.year, cursor.monthIndex);
  const count = daysInMonth(cursor.year, cursor.monthIndex);

  function openPicker() {
    const [year, month] = day.split("-").map(Number);
    setCursor({ year, monthIndex: month - 1 });
    setOpen((value) => !value);
  }

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.monthIndex + delta, 1));
      return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
    });
  }

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-1">
      <p className="sr-only" aria-live="polite">
        {formatGermanDay(day)}
        {isToday ? ", heute" : ""}
      </p>
      <div data-cal-left className="flex shrink-0 items-center gap-0.5">
        <button type="button" title="Ein Jahr zurück" aria-label="Ein Jahr zurück" disabled={!canPrevDay} onClick={() => onStepYear(-1)} className={ARROW}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" title="Vorheriger Tag" aria-label="Vorheriger Tag" disabled={!canPrevDay} onClick={() => onStepDay(-1)} className={ARROW}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div
        className="relative overflow-hidden"
        style={{ width: cell * WINDOW, height: cell }}
        role="group"
        aria-labelledby={labelId}
      >
        <span id={labelId} className="sr-only">
          Stadttage, der aktive Tag steht in der Mitte
        </span>
        <motion.div className="flex h-full" style={{ x }}>
          {track.cells.map((iso) => {
            const weather = weatherFor(iso, liveWeather);
            const holiday = holidayOnIso(iso);
            const icon = iconFor(weather.kind);
            const inRange = iso >= minDay && iso <= maxDay;
            const iconPx = Math.round(cell * 0.36);
            const label = [
              weekdayDe(iso),
              formatGermanDay(iso),
              weather.label,
              holiday?.title,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <motion.div
                key={iso}
                className="shrink-0"
                style={{ width: cell, height: cell }}
                initial={origin && !origin.has(iso) ? { opacity: 0 } : false}
                animate={{ opacity: destination.has(iso) ? 1 : 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
              >
                <button
                  type="button"
                  disabled={!inRange}
                  aria-current={iso === day ? "date" : undefined}
                  aria-label={label}
                  title={label}
                  onClick={() => onDayChange(iso)}
                  className="flex h-full w-full flex-col items-center overflow-hidden bg-background-card px-1 py-1 outline outline-1 outline-white/10 disabled:text-gray-500"
                >
                  <span className="font-barlow text-[10px] font-bold uppercase leading-none tracking-wide text-gray-200">
                    {weekdayDe(iso)}
                  </span>
                  <span className="mt-0.5 line-clamp-2 h-5 shrink-0 text-center font-libre text-[8px] leading-tight text-accent-gold">
                    {holiday?.title ?? ""}
                  </span>
                  <span className="my-auto block shrink-0" style={{ width: iconPx, height: iconPx }}>
                    <WeatherPngIcon option={icon} sizeClassName="h-full w-full" />
                  </span>
                  <span className="shrink-0 font-barlow text-lg font-extrabold tabular-nums leading-none text-hero-vibrant">
                    {dayNumber(iso)}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
        <div
          className="pointer-events-none absolute top-0 z-10"
          style={{
            left: cell * 2,
            width: cell,
            height: cell,
            outline: "2px solid #379806",
            outlineOffset: "-2px",
          }}
          aria-hidden
        />
      </div>

      <div data-cal-right className="relative flex shrink-0 items-center gap-0.5">
        <button type="button" title="Nächster Tag" aria-label="Nächster Tag" disabled={!canNextDay} onClick={() => onStepDay(1)} className={ARROW}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" title="Ein Jahr vor" aria-label="Ein Jahr vor" disabled={!canNextDay} onClick={() => onStepYear(1)} className={ARROW}>
          <ChevronsRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Kalender öffnen"
          aria-label="Kalender öffnen"
          aria-expanded={open}
          onClick={openPicker}
          className={`grid h-7 w-7 place-items-center rounded ${open ? "bg-hero-vibrant/20 text-hero-vibrant" : "text-accent-gold hover:bg-hero-vibrant/15"}`}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        {!isToday ? (
          <button
            type="button"
            onClick={onGoToday}
            className="rounded border border-hero-border/40 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/15"
          >
            Heute
          </button>
        ) : null}
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-40 mt-1 w-64 rounded border border-hero-border/60 bg-background-card p-2 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button type="button" aria-label="Vorheriger Monat" onClick={() => shiftMonth(-1)} className="rounded p-0.5 text-hero-vibrant hover:bg-hero-vibrant/15">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
                {MONTHS_DE[cursor.monthIndex]} {cursor.year}
              </p>
              <button type="button" aria-label="Nächster Monat" onClick={() => shiftMonth(1)} className="rounded p-0.5 text-hero-vibrant hover:bg-hero-vibrant/15">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS_SHORT.map((label) => (
                <span key={label} className="text-center font-barlow text-[8px] font-bold uppercase tracking-wide text-gray-500">
                  {label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: blank }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {Array.from({ length: count }, (_, index) => {
                const cellDay = index + 1;
                const iso = padIso(cursor.year, cursor.monthIndex, cellDay);
                const disabled = iso < minDay || iso > maxDay;
                const selected = iso === day;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => {
                      onDayChange(iso);
                      setOpen(false);
                    }}
                    className={`rounded py-1 font-barlow text-[10px] font-bold tabular-nums ${
                      selected
                        ? "bg-hero-vibrant text-background-dark"
                        : disabled
                          ? "text-gray-600 opacity-40"
                          : "text-gray-200 hover:bg-hero-vibrant/20 hover:text-hero-vibrant"
                    }`}
                  >
                    {cellDay}
                  </button>
                );
              })}
            </div>
            <label className="mt-2 flex items-center gap-2 border-t border-hero-border/30 pt-2 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
              Datum
              <input
                type="date"
                min={minDay}
                max={maxDay}
                value={day}
                onChange={(event) => {
                  if (!event.target.value) return;
                  onDayChange(event.target.value);
                  setOpen(false);
                }}
                className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-white outline-none focus:border-hero-vibrant"
              />
            </label>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
