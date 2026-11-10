/**
 * LiveSessionAtmospherePanel — GM sidebar controls for weather, day phase, and temperature.
 */
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  SESSION_DAY_PHASE_ORDER,
  sessionDayPhaseLabel,
  type SessionDayPhase,
} from "@/src/lib/session-day-phase";
import {
  formatWeatherSummary,
  normalizeIntensity,
  type WeatherPresetId,
} from "@/src/lib/session-weather";
import { SessionDayPhaseIndicator } from "@/src/components/session/SessionDayPhaseIndicator";
import { useWeatherApiControl } from "@/src/components/city/aurenfurt/hooks/useWeatherApiControl";
import { AURENFURT_WORLD_ID } from "@/src/components/city/aurenfurt/aurenfurt-district-lore-ids";
import type { LiveState } from "./live-session-types";
import {
  TEMPERATURE_MIN,
  TEMPERATURE_MAX,
  normalizeTemperatureValue,
  getTemperatureFillPercent,
  getThermometerFillColor,
  WEATHER_ICON_OPTIONS,
} from "./live-session-weather";
import { WeatherPngIcon } from "./WeatherPngIcon";
import type { WeatherIconOption } from "./live-session-types";

type Props = {
  liveState: LiveState | null;
  weatherVisual: WeatherIconOption;
  dayPhase: SessionDayPhase;
  temperatureValue: number;
  temperatureDraft: number;
  onTemperatureDraftChange: (value: number) => void;
  onCommitTemperature: (value?: number) => void;
  onUpdateLiveState: (patch: Partial<LiveState>) => void;
  onWeatherSystemLog: (message: string) => void;
  /** Welt-ID für den Stadt-Wetter-API-Schalter (Aurenfurt-Default). */
  worldId?: string | null;
};

export function LiveSessionAtmospherePanel({
  liveState,
  weatherVisual,
  dayPhase,
  temperatureValue,
  temperatureDraft,
  onTemperatureDraftChange,
  onCommitTemperature,
  onUpdateLiveState,
  onWeatherSystemLog,
  worldId = null,
}: Props) {
  const resolvedWorldId = worldId || AURENFURT_WORLD_ID;
  const weatherApi = useWeatherApiControl(resolvedWorldId, true);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">Wetter</h3>
        <label className="mb-3 flex cursor-pointer items-start gap-3 rounded border border-hero-dark/70 bg-background-dark/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={weatherApi.enabled}
            onChange={(event) => weatherApi.setEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent-gold"
          />
          <span className="min-w-0">
            <span className="block font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
              Wetter API aktivieren
            </span>
            <span className="mt-0.5 block font-libre text-[11px] leading-snug text-gray-300">
              Statistik und Auswirkungen folgen der API. Die Buttons darunter ändern nur die Optik
              der Stadt.
            </span>
          </span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {WEATHER_ICON_OPTIONS.map((option) => {
            const active = weatherVisual.id === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  const intensity = normalizeIntensity(liveState?.weather_intensity) ?? 2;
                  const summary = formatWeatherSummary(
                    option.id,
                    intensity,
                    liveState?.weather_temperature ?? null,
                    null,
                  );
                  onUpdateLiveState({
                    weather_preset: option.id,
                    weather_intensity: intensity,
                    weather: summary,
                  });
                  const logByWeather: Partial<Record<WeatherPresetId, string>> = {
                    sun: "Die Wolken reißen auf und goldene Sonnenstrahlen brechen hervor.",
                    rain: "Ein feiner Nieselregen beginnt, die Welt in Grau zu hüllen.",
                    storm: "Ein heftiger Sturm peitscht auf und das Heulen des Windes wird ohrenbetäubend.",
                  };
                  if (logByWeather[option.id]) {
                    onWeatherSystemLog(logByWeather[option.id]!);
                  }
                }}
                className={`flex items-center justify-center bg-transparent p-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${
                  active
                    ? "scale-110 drop-shadow-[0_0_10px_rgba(202,185,38,0.8)]"
                    : "opacity-80 hover:opacity-100"
                }`}
                title={`${option.label} (nur Optik der Stadt)`}
                aria-label={`Wetteroptik auf ${option.label} setzen`}
              >
                <WeatherPngIcon option={option} sizeClassName="h-14 w-14" />
              </button>
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">Tageszeit</h3>
        <div className="flex justify-center py-2">
          <SessionDayPhaseIndicator phase={dayPhase} />
        </div>
        <label className="mt-2 flex flex-col gap-1">
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
            Phase setzen
          </span>
          <select
            value={dayPhase}
            onChange={(e) =>
              onUpdateLiveState({
                current_time: sessionDayPhaseLabel(e.target.value as SessionDayPhase),
              })
            }
            className="w-full rounded border border-amber-900/60 bg-[#0a1f10] px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
          >
            {SESSION_DAY_PHASE_ORDER.map((phase) => (
              <option key={phase} value={phase} className="bg-white text-slate-950">
                {sessionDayPhaseLabel(phase)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">Temperatur</h3>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative h-64 w-28 overflow-hidden"
            title={`Temperatur: ${temperatureValue} °C`}
            aria-label={`Temperatur: ${temperatureValue} Grad Celsius`}
          >
            <div className="absolute bottom-[29%] left-1/2 z-0 h-[49%] w-[12%] -translate-x-1/2 overflow-hidden rounded-full">
              <motion.div
                className="absolute bottom-0 left-0 h-full w-full origin-bottom rounded-full shadow-[0_0_18px_rgba(239,68,68,0.65)]"
                initial={false}
                animate={{
                  scaleY: getTemperatureFillPercent(temperatureValue) / 100,
                }}
                transition={{ type: "spring", damping: 28, stiffness: 180 }}
                style={{
                  background: getThermometerFillColor(temperatureValue),
                }}
              />
            </div>
            <Image
              src="/images/Session_ui/thermometer_frei.webp"
              alt=""
              fill
              sizes="96px"
              className="pointer-events-none absolute inset-0 z-10 object-contain"
              priority={false}
            />
            <span className="absolute inset-x-0 bottom-[10%] z-20 text-center font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
              {temperatureValue} °C
            </span>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                Regler
              </span>
              <span className="font-barlow text-sm font-extrabold text-accent-gold">
                {temperatureDraft} °C
              </span>
            </div>
            <input
              type="range"
              min={TEMPERATURE_MIN}
              max={TEMPERATURE_MAX}
              value={temperatureDraft}
              onChange={(e) => onTemperatureDraftChange(normalizeTemperatureValue(e.target.value))}
              onMouseUp={() => onCommitTemperature()}
              onTouchEnd={() => onCommitTemperature()}
              onKeyUp={() => onCommitTemperature()}
              onBlur={() => onCommitTemperature()}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background-dark/80 accent-accent-gold outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
