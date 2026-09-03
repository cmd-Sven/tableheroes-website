"use client";

import { Map, Sun, Moon, CloudRain } from "lucide-react";
import {
  formatTravelSummary,
  getDayLog,
  playerFapBudgetForDay,
  travelFapCostPerDay,
  travelProgressPct,
  type DowntimeConfig,
} from "@/src/lib/travel-fap-config";
import { getWeatherRule } from "@/src/lib/travel-weather-rules";

type Props = {
  config: DowntimeConfig;
  currentDay: number;
  totalDays: number;
  showTravelDetails?: boolean;
};

/** Bühnen-Overlay — kompakte Infos oben; Kalender auf der Bühne */
export function TravelModeStageBanner({
  config,
  currentDay,
  totalDays,
  showTravelDetails = false,
}: Props) {
  const isLeisure = config.mode === "leisure";
  const isTravelStage = !isLeisure && showTravelDetails;
  const dayLog = getDayLog(config, currentDay);
  const paceConfig = { ...config, pace: dayLog?.pace ?? config.pace };
  const travelCost = travelFapCostPerDay(paceConfig);
  const playerBudget = playerFapBudgetForDay(config, dayLog);
  const weather = getWeatherRule(dayLog?.weatherId);
  const progressPct = travelProgressPct(config);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[45] flex justify-center px-4 pt-3">
      <div className="flex max-w-2xl flex-col items-center gap-1 rounded-xl border border-amber-700/50 bg-gradient-to-b from-amber-950/90 to-background-dark/85 px-4 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-accent-gold" />
          <span className="font-barlow text-sm font-extrabold uppercase tracking-wide text-accent-gold">
            {isLeisure ? "Stadtaufenthalt" : "Reise-Modus"}
          </span>
        </div>
        <p className="text-center font-libre text-xs text-gray-300">
          Tag <strong className="text-white">{currentDay}</strong> von{" "}
          <strong className="text-white">{config.openEnded ? "?" : totalDays}</strong>
          {!isLeisure && config.fromLocation && config.toLocation ? (
            <> · {config.fromLocation} → {config.toLocation}</>
          ) : null}
        </p>
        {!isTravelStage || !weather ? null : (
          <p className="flex items-center gap-1 font-libre text-[11px] text-indigo-200">
            <CloudRain className="h-3 w-3" />
            {weather.label}
            {dayLog?.kmThisDay != null && !dayLog.travelHalted ? (
              <span className="text-gray-400"> · ~{dayLog.kmThisDay} km heute</span>
            ) : null}
          </p>
        )}
        {!isTravelStage || (config.kmTraveled ?? 0) <= 0 ? null : (
          <p className="font-libre text-[10px] text-hero-vibrant">
            {config.kmTraveled} km zurückgelegt
            {config.distanceKm ? ` (${progressPct ?? 0}%)` : config.openEnded ? " · Ziel offen" : ""}
          </p>
        )}
        <p className="text-center font-libre text-[11px] text-gray-500">
          {formatTravelSummary(config)}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 font-barlow text-[10px] uppercase">
          <span className="flex items-center gap-1 text-amber-200/90">
            <Sun className="h-3 w-3" />3 Tagesabschnitte
          </span>
          <span className="flex items-center gap-1 text-indigo-300/90">
            <Moon className="h-3 w-3" />3 Nachtabschnitte
          </span>
          {!isLeisure ? (
            <span className="text-gray-400">
              {travelCost} FAP Reise · {playerBudget} FAP frei
            </span>
          ) : (
            <span className="text-hero-vibrant">6 FAP / Tag</span>
          )}
        </div>
      </div>
    </div>
  );
}
