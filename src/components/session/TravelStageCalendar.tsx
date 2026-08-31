"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin } from "lucide-react";
import {
  calendarDayCount,
  travelProgressPct,
  type DowntimeConfig,
  type TravelDayLog,
} from "@/src/lib/travel-fap-config";
import { getWeatherRule } from "@/src/lib/travel-weather-rules";
import { TravelWeatherIcon } from "@/src/components/session/TravelWeatherIcon";

const CARD_W = 96;
const CARD_GAP = 14;
const STEP = CARD_W + CARD_GAP;

type Props = {
  config: DowntimeConfig;
  currentDay: number;
  totalDays: number;
};

export function TravelStageCalendar({ config, currentDay, totalDays }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackX, setTrackX] = useState(0);
  const reduceMotion = useReducedMotion();

  const slots = calendarDayCount(config, currentDay, totalDays);
  const days = Array.from({ length: slots }, (_, i) => i + 1);
  const progressPct = travelProgressPct(config);
  const kmTraveled = config.kmTraveled ?? 0;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      setTrackX(w / 2 - CARD_W / 2 - (currentDay - 1) * STEP);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentDay, slots]);

  if (config.mode !== "travel") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-[44] flex -translate-y-1/2 justify-center px-3 sm:top-[42%] sm:px-6">
      <div className="w-full max-w-4xl">
        <div className="mb-3 text-center">
          {config.fromLocation && config.toLocation ? (
            <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold sm:text-base">
              {config.fromLocation}
              <span className="mx-2 text-gray-500">→</span>
              {config.toLocation}
            </p>
          ) : null}
          <p className="mt-1 font-libre text-xs text-gray-400 sm:text-sm">
            {config.openEnded ? (
              <>
                Tag <strong className="text-white">{currentDay}</strong> · {kmTraveled} km
                zurückgelegt · Ziel offen
              </>
            ) : config.distanceKm ? (
              <>
                Tag <strong className="text-white">{currentDay}</strong> von {totalDays} ·{" "}
                {kmTraveled} / {config.distanceKm} km
                {progressPct != null ? ` (${progressPct}%)` : ""}
              </>
            ) : (
              <>
                Tag <strong className="text-white">{currentDay}</strong> von {totalDays}
              </>
            )}
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative h-[9.5rem] overflow-hidden rounded-2xl border border-hero-border/50 bg-gradient-to-b from-background-card/95 to-background-dark/90 shadow-2xl backdrop-blur-md sm:h-[10.5rem]"
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-4 bg-gradient-to-r from-transparent via-hero-border/60 to-transparent" />
          <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background-dark/95 to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background-dark/95 to-transparent" />

          <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center">
            <ChevronDown className="h-6 w-6 text-accent-gold drop-shadow-[0_0_6px_rgba(202,185,38,0.6)]" />
            <span className="font-barlow text-[9px] font-bold uppercase tracking-widest text-accent-gold">
              Heute
            </span>
          </div>

          <motion.div
            className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center"
            animate={{ x: trackX }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 90, damping: 18, mass: 0.9 }
            }
          >
            {days.map((day) => {
              const log = config.dayLogs?.find((l) => l.day === day);
              return (
                <TravelDayCard
                  key={day}
                  day={day}
                  log={log}
                  isCurrent={day === currentDay}
                  isPast={day < currentDay}
                  reduceMotion={!!reduceMotion}
                />
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TravelDayCard({
  day,
  log,
  isCurrent,
  isPast,
  reduceMotion,
}: {
  day: number;
  log?: TravelDayLog;
  isCurrent: boolean;
  isPast: boolean;
  reduceMotion: boolean;
}) {
  const weather = getWeatherRule(log?.weatherId);
  const completed = log?.status === "completed" || isPast;
  const hasWeather = !!log?.weatherId;
  const halted = !!log?.travelHalted;

  return (
    <div
      className="relative shrink-0"
      style={{ width: CARD_W, marginRight: CARD_GAP }}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isCurrent ? 1.08 : completed ? 1 : 0.92,
          opacity: isCurrent ? 1 : completed ? 0.85 : 0.45,
        }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.35 }}
        className={`flex h-[7.25rem] flex-col items-center justify-between rounded-xl border px-2 pb-2 pt-3 ${
          isCurrent
            ? "border-accent-gold bg-accent-gold/15 shadow-lg shadow-accent-gold/25"
            : completed
              ? "border-hero-vibrant/35 bg-hero-vibrant/10"
              : "border-hero-border/25 bg-background-card/30"
        }`}
      >
        <span
          className={`font-barlow text-lg font-extrabold ${
            isCurrent ? "text-accent-gold" : completed ? "text-hero-vibrant" : "text-gray-500"
          }`}
        >
          {day}
        </span>

        <motion.div
          key={log?.weatherId ?? "empty"}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-0.5"
        >
          <TravelWeatherIcon
            weatherId={log?.weatherId}
            size={isCurrent ? 40 : 32}
            pending={isCurrent && !hasWeather}
          />
          {weather ? (
            <span className="max-w-full truncate text-center font-libre text-[9px] leading-tight text-gray-400">
              {weather.label}
            </span>
          ) : isCurrent ? (
            <span className="font-libre text-[9px] text-accent-gold/80">Wetter?</span>
          ) : null}
        </motion.div>

        {log?.kmThisDay != null && log.kmThisDay > 0 && !halted ? (
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
            {log.kmThisDay} km
          </span>
        ) : halted ? (
          <span className="font-barlow text-[8px] font-bold uppercase text-red-300/80">Stopp</span>
        ) : isCurrent && hasWeather ? (
          <MapPin className="h-3 w-3 text-gray-600" aria-hidden />
        ) : (
          <span className="h-3" />
        )}
      </motion.div>
    </div>
  );
}
