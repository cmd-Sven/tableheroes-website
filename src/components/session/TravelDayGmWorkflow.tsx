"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CloudRain, Loader2, Tent, Wind } from "lucide-react";
import { updateTravelDayState, completeTravelDayAndAdvance } from "@/src/lib/actions/downtime-actions";
import {
  kmPerDayForTransport,
  playerFapBudgetForDay,
  TRAVEL_PACE_LABELS,
  travelFapCostPerDay,
  type DowntimeConfig,
  type TravelDayLog,
  type TravelPace,
} from "@/src/lib/travel-fap-config";
import {
  calculateDayKm,
  CAMP_QUALITY_RULES,
  formatSurvivalMod,
  getWeatherRule,
  isDayWorkflowComplete,
  resolveCampQuality,
  TRAVEL_WEATHER_RULES,
  weatherFapPlayerExtra,
  weatherFromW20,
  type TravelWeatherId,
} from "@/src/lib/travel-weather-rules";

type Props = {
  sessionId: string;
  config: DowntimeConfig;
  currentDay: number;
  totalDays: number;
  onReload: () => void | Promise<void>;
  onAdvanced?: () => void;
};

export function TravelDayGmWorkflow({
  sessionId,
  config,
  currentDay,
  totalDays,
  onReload,
  onAdvanced,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const dayLog = config.dayLogs?.find((l) => l.day === currentDay) ?? { day: currentDay };
  const [weatherRollInput, setWeatherRollInput] = useState(
    dayLog.weatherRoll != null ? String(dayLog.weatherRoll) : "",
  );
  const [survivalInput, setSurvivalInput] = useState(
    dayLog.survivalRoll != null ? String(dayLog.survivalRoll) : "",
  );

  useEffect(() => {
    setWeatherRollInput(dayLog.weatherRoll != null ? String(dayLog.weatherRoll) : "");
    setSurvivalInput(dayLog.survivalRoll != null ? String(dayLog.survivalRoll) : "");
  }, [currentDay, dayLog.weatherRoll, dayLog.survivalRoll]);

  const selectedWeather = getWeatherRule(dayLog.weatherId);
  const pace = dayLog.pace ?? config.pace ?? "normal";
  const transport = config.transport ?? "foot";
  const baseKm = kmPerDayForTransport(transport);

  const preview = useMemo(() => {
    const km = calculateDayKm({
      transport,
      weather: selectedWeather,
      baseKmPerDay: baseKm,
      travelHalted: dayLog.travelHalted,
    });
    const camp =
      dayLog.survivalEffective != null ? resolveCampQuality(dayLog.survivalEffective) : null;
    const paceCfg = { ...config, pace };
    const travelFap = travelFapCostPerDay(paceCfg);
    const playerBudget = playerFapBudgetForDay(config, {
      ...dayLog,
      pace,
      fapCampExtra: camp?.fapExtra,
      fapCampBonus: camp?.fapBonus,
    });
    return { km, camp, travelFap, playerBudget };
  }, [config, dayLog, selectedWeather, pace, transport, baseKm]);

  const canAdvance = isDayWorkflowComplete(dayLog);

  function save(patch: Partial<TravelDayLog>) {
    startTransition(async () => {
      const res = await updateTravelDayState(sessionId, currentDay, patch);
      if (!res.ok) alert(res.error ?? "Speichern fehlgeschlagen.");
      else await onReload();
    });
  }

  function pickWeather(id: TravelWeatherId) {
    const roll = Number(weatherRollInput);
    save({
      weatherId: id,
      weatherRoll: Number.isFinite(roll) && roll >= 1 ? roll : undefined,
      weather: TRAVEL_WEATHER_RULES.find((w) => w.id === id)?.label,
      status: "in_progress",
    });
  }

  function applyWeatherFromRoll() {
    const roll = Math.round(Number(weatherRollInput));
    if (!Number.isFinite(roll) || roll < 1 || roll > 20) {
      alert("Bitte W20-Ergebnis (1–20) eingeben.");
      return;
    }
    pickWeather(weatherFromW20(roll));
  }

  function setPaceForDay(p: TravelPace) {
    save({ pace: p, travelHalted: false });
  }

  function applySurvival() {
    const raw = Math.round(Number(survivalInput));
    if (!Number.isFinite(raw)) {
      alert("Überleben-Wurf eingeben.");
      return;
    }
    let effective = raw;
    const w = selectedWeather;
    if (typeof w?.survivalMod === "number") {
      effective = raw + w.survivalMod;
    }
    const camp = resolveCampQuality(effective);
    save({
      survivalRoll: raw,
      survivalEffective: effective,
      campQualityId: camp.id,
      fapCampExtra: camp.fapExtra,
      fapCampBonus: camp.fapBonus,
    });
  }

  function haltTravel() {
    save({ travelHalted: true, pace: undefined, kmThisDay: 0 });
  }

  function advanceDay() {
    startTransition(async () => {
      const res = await completeTravelDayAndAdvance(sessionId);
      if (!res.ok) {
        alert(res.error ?? "Tag konnte nicht abgeschlossen werden.");
        return;
      }
      await onReload();
      onAdvanced?.();
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded border border-hero-border/30 bg-background-dark/40 px-2 py-1.5 font-libre text-[10px] text-gray-500">
        Der Reisekalender läuft auf der Bühne — Wetter & Tempo erscheinen dort live für alle.
      </p>

      <section className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <CloudRain className="h-4 w-4 text-indigo-300" />
          <h3 className="font-barlow text-xs font-bold uppercase text-indigo-200">
            Schritt 1 — Wetter (W20)
          </h3>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="number"
            min={1}
            max={20}
            value={weatherRollInput}
            onChange={(e) => setWeatherRollInput(e.target.value)}
            placeholder="W20"
            className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={applyWeatherFromRoll}
            className="rounded border border-indigo-600/50 bg-indigo-900/40 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-indigo-100"
          >
            Aus Wurf übernehmen
          </button>
        </div>
        <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
          {TRAVEL_WEATHER_RULES.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={isPending}
              onClick={() => pickWeather(w.id)}
              className={`rounded border px-2 py-2 text-left font-libre text-[10px] leading-snug ${
                dayLog.weatherId === w.id
                  ? "border-indigo-400 bg-indigo-900/50 text-white"
                  : "border-hero-border/30 text-gray-400 hover:border-indigo-600/40"
              }`}
            >
              <span className="font-barlow text-[9px] font-bold uppercase text-indigo-200">
                {w.w20Range} · {w.label}
              </span>
            </button>
          ))}
        </div>
        {selectedWeather ? (
          <div className="mt-3 rounded border border-indigo-800/30 bg-black/20 p-2 font-libre text-[11px] text-gray-300">
            {selectedWeather.effect}
            <p className="mt-1 text-[10px] text-amber-200/80">
              Überleben-Mod: {formatSurvivalMod(selectedWeather.survivalMod)}
            </p>
          </div>
        ) : null}
      </section>

      {dayLog.weatherId ? (
        <section className="rounded-lg border border-hero-border/40 bg-background-dark/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Wind className="h-4 w-4 text-hero-vibrant" />
            <h3 className="font-barlow text-xs font-bold uppercase text-hero-vibrant">
              Schritt 2 — Reisetempo
            </h3>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(TRAVEL_PACE_LABELS) as TravelPace[]).map((p) => (
              <button
                key={p}
                type="button"
                disabled={isPending}
                onClick={() => setPaceForDay(p)}
                className={`rounded border px-3 py-2 font-barlow text-[10px] font-bold uppercase ${
                  pace === p && !dayLog.travelHalted
                    ? "border-hero-vibrant bg-hero-vibrant/15 text-hero-vibrant"
                    : "border-hero-border/40 text-gray-400"
                }`}
              >
                {TRAVEL_PACE_LABELS[p]}
              </button>
            ))}
            <button
              type="button"
              disabled={isPending}
              onClick={haltTravel}
              className={`rounded border px-3 py-2 font-barlow text-[10px] font-bold uppercase ${
                dayLog.travelHalted
                  ? "border-red-600 bg-red-950/50 text-red-200"
                  : "border-red-900/40 text-red-300/70"
              }`}
            >
              Reisestopp
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-barlow text-[10px] uppercase sm:grid-cols-4">
            <Stat label="Heute km" value={dayLog.travelHalted ? "0" : String(preview.km)} />
            <Stat
              label="Gesamt km"
              value={`${(config.kmTraveled ?? 0) + (dayLog.travelHalted ? 0 : preview.km)}`}
            />
            <Stat label="Reise-FAP" value={String(preview.travelFap)} />
            <Stat label="Spieler-FAP" value={String(preview.playerBudget)} highlight />
          </div>
        </section>
      ) : null}

      {dayLog.weatherId && (dayLog.pace || dayLog.travelHalted) ? (
        <section className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Tent className="h-4 w-4 text-amber-300" />
            <h3 className="font-barlow text-xs font-bold uppercase text-amber-200">
              Schritt 3 — Rastplatz
            </h3>
          </div>
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <input
              type="number"
              min={1}
              max={30}
              value={survivalInput}
              onChange={(e) => setSurvivalInput(e.target.value)}
              placeholder="Überleben"
              className="w-20 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={applySurvival}
              className="rounded border border-amber-600/50 bg-amber-900/30 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-amber-100"
            >
              Lager auswerten
            </button>
          </div>
          {preview.camp ? (
            <div className="rounded border border-amber-800/30 bg-black/20 p-2 font-libre text-[11px] text-gray-300">
              <strong className="text-amber-200">{preview.camp.label}</strong>
              <p className="mt-1 text-[10px] text-gray-500">{preview.camp.effect}</p>
            </div>
          ) : (
            <details className="font-libre text-[10px] text-gray-500">
              <summary className="cursor-pointer uppercase">Lager-Tabelle</summary>
              <ul className="mt-2 space-y-1">
                {CAMP_QUALITY_RULES.map((c) => (
                  <li key={c.id}>
                    {c.w20Range} {c.label}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ) : null}

      <button
        type="button"
        disabled={isPending || !canAdvance}
        onClick={advanceDay}
        className="flex w-full items-center justify-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 py-3 font-barlow text-xs font-extrabold uppercase text-accent-gold disabled:opacity-40"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Tag {currentDay} abschließen & weiter
      </button>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded border border-hero-border/30 bg-background-card/30 px-2 py-2">
      <p className="text-[8px] text-gray-500">{label}</p>
      <p className={`text-sm font-extrabold ${highlight ? "text-accent-gold" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
