"use client";

import { ChevronRight } from "lucide-react";
import type { TravelDayLog } from "@/src/lib/travel-fap-config";

type Props = {
  totalSlots: number;
  currentDay: number;
  dayLogs: TravelDayLog[];
  openEnded?: boolean;
  distanceKm?: number;
  kmTraveled?: number;
};

export function TravelCalendarStrip({
  totalSlots,
  currentDay,
  dayLogs,
  openEnded,
  distanceKm,
  kmTraveled = 0,
}: Props) {
  const days = Array.from({ length: totalSlots }, (_, i) => i + 1);
  const progressPct =
    distanceKm && distanceKm > 0 ? Math.min(100, Math.round((kmTraveled / distanceKm) * 100)) : null;

  return (
    <div className="rounded-lg border border-hero-border/50 bg-background-dark/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
          Reisekalender
        </span>
        {openEnded ? (
          <span className="font-libre text-[10px] text-gray-500">Offenes Ziel — Dauer unbekannt</span>
        ) : distanceKm ? (
          <span className="font-libre text-[10px] text-gray-400">
            {kmTraveled} / {distanceKm} km
            {progressPct != null ? ` (${progressPct}%)` : ""}
          </span>
        ) : null}
      </div>

      {progressPct != null ? (
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-background-card">
          <div
            className="h-full bg-gradient-to-r from-hero-dark to-hero-vibrant transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      <div className="relative flex items-end gap-1 overflow-x-auto pb-6 pt-2">
        {days.map((day) => {
          const log = dayLogs.find((l) => l.day === day);
          const isCurrent = day === currentDay;
          const isPast = day < currentDay;
          const isFuture = day > currentDay;
          const completed = log?.status === "completed" || isPast;

          return (
            <div
              key={day}
              className={`relative flex min-w-[2.75rem] flex-col items-center ${
                isCurrent ? "z-10" : ""
              }`}
            >
              {isCurrent ? (
                <div className="absolute -top-5 flex flex-col items-center">
                  <ChevronRight className="h-4 w-4 rotate-90 text-accent-gold" />
                </div>
              ) : null}
              <div
                className={`flex h-10 w-10 flex-col items-center justify-center rounded-md border text-center transition-all ${
                  isCurrent
                    ? "scale-110 border-accent-gold bg-accent-gold/20 shadow-lg shadow-accent-gold/20"
                    : completed
                      ? "border-hero-vibrant/40 bg-hero-vibrant/10"
                      : isFuture
                        ? "border-hero-border/20 bg-background-card/20 opacity-50"
                        : "border-hero-border/30 bg-background-card/40"
                }`}
                title={
                  log?.weatherId
                    ? `Tag ${day}: ${log.weatherId}${log.kmThisDay ? ` · ${log.kmThisDay} km` : ""}`
                    : `Tag ${day}`
                }
              >
                <span
                  className={`font-barlow text-sm font-extrabold ${
                    isCurrent ? "text-accent-gold" : completed ? "text-hero-vibrant" : "text-gray-500"
                  }`}
                >
                  {day}
                </span>
              </div>
              {log?.kmThisDay != null && log.kmThisDay > 0 ? (
                <span className="mt-0.5 font-libre text-[8px] text-gray-500">{log.kmThisDay}km</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
