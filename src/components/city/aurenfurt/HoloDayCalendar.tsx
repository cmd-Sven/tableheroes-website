"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

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

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export function formatGermanDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${MONTHS_DE[month - 1]} ${year}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Montag = 0 … Sonntag = 6 */
function mondayOffset(year: number, monthIndex: number) {
  const weekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function padIso(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${month}-${dayText}`;
}

type Props = {
  day: string;
  minDay: string;
  maxDay: string;
  isToday: boolean;
  onDayChange: (iso: string) => void;
  onStepDay: (delta: number) => void;
  onStepYear: (delta: number) => void;
  onGoToday: () => void;
};

export function HoloDayCalendar({
  day,
  minDay,
  maxDay,
  isToday,
  onDayChange,
  onStepDay,
  onStepYear,
  onGoToday,
}: Props) {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const [year, month] = day.split("-").map(Number);
    return { year, monthIndex: month - 1 };
  });
  const panelRef = useRef<HTMLDivElement>(null);

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

  const canPrevDay = day > minDay;
  const canNextDay = day < maxDay;
  const blank = mondayOffset(cursor.year, cursor.monthIndex);
  const count = daysInMonth(cursor.year, cursor.monthIndex);

  return (
    <div className="pointer-events-auto relative w-max max-w-[min(100%,22rem)]">
      <div
        className="flex flex-wrap items-center gap-1 rounded border border-hero-border/50 bg-background-dark/90 px-1.5 py-1 shadow-lg backdrop-blur-md"
        role="group"
        aria-labelledby={labelId}
      >
        <button
          type="button"
          title="Ein Jahr zurück"
          aria-label="Ein Jahr zurück"
          disabled={!canPrevDay}
          onClick={() => onStepYear(-1)}
          className="rounded p-0.5 text-hero-vibrant disabled:opacity-30 hover:bg-hero-vibrant/15"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Vorheriger Tag"
          aria-label="Vorheriger Tag"
          disabled={!canPrevDay}
          onClick={() => onStepDay(-1)}
          className="rounded p-0.5 text-hero-vibrant disabled:opacity-30 hover:bg-hero-vibrant/15"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 px-1 text-center">
          <p id={labelId} className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
            {formatGermanDay(day)}
            {isToday ? (
              <span className="ml-1 text-hero-vibrant">· heute</span>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          title="Nächster Tag"
          aria-label="Nächster Tag"
          disabled={!canNextDay}
          onClick={() => onStepDay(1)}
          className="rounded p-0.5 text-hero-vibrant disabled:opacity-30 hover:bg-hero-vibrant/15"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Ein Jahr vor"
          aria-label="Ein Jahr vor"
          disabled={!canNextDay}
          onClick={() => onStepYear(1)}
          className="rounded p-0.5 text-hero-vibrant disabled:opacity-30 hover:bg-hero-vibrant/15"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="Kalender öffnen"
          aria-label="Kalender öffnen"
          aria-expanded={open}
          onClick={openPicker}
          className={`rounded p-0.5 ${open ? "bg-hero-vibrant/20 text-hero-vibrant" : "text-accent-gold hover:bg-hero-vibrant/15"}`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
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
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-30 mt-1 w-64 rounded border border-hero-border/60 bg-background-card/98 p-2 shadow-xl backdrop-blur-md"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Vorheriger Monat"
                onClick={() => shiftMonth(-1)}
                className="rounded p-0.5 text-hero-vibrant hover:bg-hero-vibrant/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
                {MONTHS_DE[cursor.monthIndex]} {cursor.year}
              </p>
              <button
                type="button"
                aria-label="Nächster Monat"
                onClick={() => shiftMonth(1)}
                className="rounded p-0.5 text-hero-vibrant hover:bg-hero-vibrant/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS_DE.map((label) => (
                <span
                  key={label}
                  className="text-center font-barlow text-[8px] font-bold uppercase tracking-wide text-gray-500"
                >
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
      </AnimatePresence>
    </div>
  );
}
