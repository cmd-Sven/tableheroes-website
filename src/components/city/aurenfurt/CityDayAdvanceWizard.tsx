"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { advanceCityClock, type CityAdvanceEvent } from "@/src/app/dashboard/worlds/city-clock-actions";
import { CITY_ADVANCE_MAX, CITY_WEATHER_KINDS, type CityClock, type CityClockWeather } from "@/src/lib/world/city-clock";
import { festivalsOnIso } from "@/src/lib/world/kassadras-festivals";
import { formatKassadrasDay } from "@/src/lib/world/kassadras-calendar";
import { CITY_METER_LABELS, CITY_METERS, type CityMeter } from "@/src/lib/npcs/city-simulation";
import { AURENFURT_DISTRICTS } from "./aurenfurt-districts";
import { holidayOnIso } from "./aurenfurt-chronicle";
import { listActiveMeasures } from "./aurenfurt-active-measures";
import { cityMetricsOn } from "./aurenfurt-history";
import { addIsoDays, parseDay } from "./aurenfurt-time";
import { convoyFallsOn } from "./aurenfurt-vattrak-stock";
import {
  applyWeatherOverrides,
  fetchWeatherForecast,
  weatherKindLabel,
  weatherOn,
  type WeatherKind,
  type WeatherOrigin,
} from "./aurenfurt-weather";
import { bumpCitySimVersion, citySimVersion, subscribeCitySim } from "./aurenfurt-city-sim";

type DraftEvent = {
  title: string;
  body: string;
  districtId: string;
  durationDays: string;
  meter: "" | CityMeter;
  delta: string;
};

type Props = {
  worldId: string;
  clock: CityClock;
  onClose: () => void;
  onDone: (clock: CityClock) => void;
};

const FIELD =
  "w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant";

function emptyEvent(): DraftEvent {
  return { title: "", body: "", districtId: "", durationDays: "1", meter: "", delta: "0" };
}

function modelWeather(iso: string): CityClockWeather {
  const weather = weatherOn(parseDay(iso), { model: true });
  return { day: iso, kind: weather.kind, tempC: weather.tempC, origin: "model" };
}

function eventFromDraft(draft: DraftEvent): CityAdvanceEvent | null {
  const title = draft.title.trim();
  if (!title) return null;
  const durationDays = Math.max(1, Math.min(30, Number(draft.durationDays) || 1));
  const delta = Math.max(-20, Math.min(20, Number(draft.delta) || 0));
  return {
    title,
    body: draft.body.trim(),
    districtId: draft.districtId || null,
    durationDays,
    meter: draft.meter && delta !== 0 ? draft.meter : null,
    delta,
  };
}

export function CityDayAdvanceWizard({ worldId, clock, onClose, onDone }: Props) {
  const [count, setCount] = useState(1);
  const [weather, setWeather] = useState<Record<string, CityClockWeather>>({});
  const [events, setEvents] = useState<Record<string, DraftEvent>>({});
  const [forecastNote, setForecastNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const committed = useRef(false);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);

  const days = useMemo(
    () => Array.from({ length: count }, (_, index) => addIsoDays(clock.presentIso, index + 1)),
    [clock.presentIso, count],
  );

  useEffect(() => {
    setWeather((current) => {
      const next: Record<string, CityClockWeather> = {};
      for (const iso of days) next[iso] = current[iso] ?? modelWeather(iso);
      return next;
    });
    setEvents((current) => {
      const next: Record<string, DraftEvent> = {};
      for (const iso of days) next[iso] = current[iso] ?? emptyEvent();
      return next;
    });
  }, [days]);

  useEffect(() => {
    const drafts = days.map((iso) => weather[iso]).filter((entry): entry is CityClockWeather => !!entry);
    applyWeatherOverrides([...clock.weather, ...drafts]);
    bumpCitySimVersion();
    return () => {
      if (committed.current) return;
      applyWeatherOverrides(clock.weather);
      bumpCitySimVersion();
    };
  }, [clock.weather, days, weather]);

  const preview = useMemo(() => {
    const before = cityMetricsOn(parseDay(clock.presentIso));
    const after = cityMetricsOn(parseDay(days[days.length - 1] ?? clock.presentIso));
    return { before, after };
  }, [clock.presentIso, days, simVersion]);

  function setKind(iso: string, kind: WeatherKind) {
    setWeather((current) => {
      const previous = current[iso] ?? modelWeather(iso);
      return { ...current, [iso]: { ...previous, kind, origin: "hand" } };
    });
  }

  function setOriginModel() {
    setWeather((current) => {
      const next = { ...current };
      for (const iso of days) next[iso] = modelWeather(iso);
      return next;
    });
    setForecastNote(null);
  }

  async function pullForecast() {
    setBusy(true);
    setForecastNote(null);
    try {
      const forecast = await fetchWeatherForecast();
      const byDay = new Map(forecast.map((entry) => [entry.day, entry]));
      let filled = 0;
      setWeather((current) => {
        const next = { ...current };
        for (const iso of days) {
          const hit = byDay.get(iso);
          if (!hit) continue;
          next[iso] = { day: iso, kind: hit.kind, tempC: hit.tempC, origin: "forecast" };
          filled += 1;
        }
        return next;
      });
      setForecastNote(
        filled > 0
          ? `Prognose für ${filled} von ${days.length} Tagen übernommen. Die übrigen folgen dem Stadtmodell.`
          : "Für diese Stadttage liegt keine Prognose. Sie bleiben beim Stadtmodell.",
      );
    } catch {
      setForecastNote("Die Wetterprognose ist gerade nicht erreichbar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      const payload = days.map((iso) => ({
        iso,
        weather: weather[iso] ?? modelWeather(iso),
        event: eventFromDraft(events[iso] ?? emptyEvent()),
      }));
      const next = await advanceCityClock(worldId, payload);
      committed.current = true;
      toast.success(
        days.length === 1
          ? `Ein Tag ist vergangen. Heute ist ${formatKassadrasDay(next.presentIso)}.`
          : `${days.length} Tage sind vergangen. Heute ist ${formatKassadrasDay(next.presentIso)}.`,
      );
      onDone(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Der Tagwechsel ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-6 w-full max-w-3xl rounded-md border border-hero-border bg-background-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
              Tage vergehen lassen
            </h2>
            <p className="mt-1 font-libre text-sm text-gray-200">
              Die Stadt steht auf {formatKassadrasDay(clock.presentIso)}. Erst die Bestätigung schiebt Simulation, Wetter und Ereignisse weiter.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Schließen">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[1, 7].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCount(value)}
              className={`rounded border px-3 py-1.5 font-barlow text-xs font-bold uppercase tracking-wide ${
                count === value
                  ? "border-hero-vibrant bg-hero-vibrant text-background-dark"
                  : "border-hero-dark text-accent-gold"
              }`}
            >
              {value === 1 ? "1 Tag" : "7 Tage"}
            </button>
          ))}
          <label className="flex items-center gap-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-300">
            Anzahl
            <input
              type="number"
              min={1}
              max={CITY_ADVANCE_MAX}
              value={count}
              onChange={(event) => {
                const next = Math.max(1, Math.min(CITY_ADVANCE_MAX, Number(event.target.value) || 1));
                setCount(next);
              }}
              className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1 font-libre text-sm normal-case tracking-normal text-white outline-none focus:border-hero-vibrant"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void pullForecast()}
            className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant disabled:opacity-40"
          >
            Prognose
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={setOriginModel}
            className="rounded border border-hero-dark px-3 py-1.5 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold disabled:opacity-40"
          >
            Stadtmodell
          </button>
        </div>
        {forecastNote ? <p className="mt-2 font-libre text-sm text-gray-200">{forecastNote}</p> : null}

        <ol className="mt-5 space-y-4">
          {days.map((iso, index) => {
            const sky = weather[iso] ?? modelWeather(iso);
            const draft = events[iso] ?? emptyEvent();
            const previous = index === 0 ? clock.presentIso : days[index - 1];
            return (
              <li key={iso} className="rounded border border-hero-dark bg-background-dark p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-cinzel text-lg font-bold text-accent-gold">{formatKassadrasDay(iso)}</h3>
                  <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {originLabel(sky.origin)}
                  </span>
                </div>
                <DayHints iso={iso} previous={previous} />
                <label className="mt-3 block space-y-1">
                  <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">Wetter</span>
                  <select
                    value={sky.kind}
                    onChange={(event) => setKind(iso, event.target.value as WeatherKind)}
                    className={FIELD}
                  >
                    {CITY_WEATHER_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {weatherKindLabel(kind)} · {sky.kind === kind ? `${sky.tempC} °C` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                      Ereignis, leer lassen wenn nichts geschieht
                    </span>
                    <input
                      value={draft.title}
                      onChange={(event) => patchEvent(setEvents, iso, { title: event.target.value })}
                      placeholder="Titel"
                      className={FIELD}
                    />
                  </label>
                  <textarea
                    value={draft.body}
                    onChange={(event) => patchEvent(setEvents, iso, { body: event.target.value })}
                    placeholder="Ein Satz, was geschieht"
                    rows={2}
                    className={`${FIELD} sm:col-span-2`}
                  />
                  <select
                    value={draft.districtId}
                    onChange={(event) => patchEvent(setEvents, iso, { districtId: event.target.value })}
                    className={FIELD}
                  >
                    <option value="">Ganze Stadt</option>
                    {AURENFURT_DISTRICTS.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-300">
                    Dauer
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={draft.durationDays}
                      onChange={(event) => patchEvent(setEvents, iso, { durationDays: event.target.value })}
                      className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1 font-libre text-sm normal-case tracking-normal text-white outline-none"
                    />
                    Tage
                  </label>
                  <select
                    value={draft.meter}
                    onChange={(event) => patchEvent(setEvents, iso, { meter: event.target.value as DraftEvent["meter"] })}
                    className={FIELD}
                  >
                    <option value="">Keine Kennzahl</option>
                    {CITY_METERS.map((meter) => (
                      <option key={meter} value={meter}>
                        {CITY_METER_LABELS[meter]}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-300">
                    Wirkung
                    <input
                      type="number"
                      min={-20}
                      max={20}
                      value={draft.delta}
                      onChange={(event) => patchEvent(setEvents, iso, { delta: event.target.value })}
                      className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1 font-libre text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 font-libre text-sm leading-relaxed text-gray-200">
          Bis {formatKassadrasDay(days[days.length - 1] ?? clock.presentIso)} zieht die Simulation Kriminalität von {preview.before.crime} auf {preview.after.crime}, Wirtschaft von {preview.before.economy} auf {preview.after.economy}, Flüchtlinge von {preview.before.refugees} auf {preview.after.refugees}.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-dark px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-200"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="rounded border border-hero-vibrant bg-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-background-dark disabled:opacity-40"
          >
            Tage vergehen lassen
          </button>
        </div>
      </div>
    </div>
  );
}

function originLabel(origin: WeatherOrigin) {
  if (origin === "hand") return "Von Hand";
  if (origin === "forecast") return "Prognose";
  return "Stadtmodell";
}

function patchEvent(
  setEvents: Dispatch<SetStateAction<Record<string, DraftEvent>>>,
  iso: string,
  patch: Partial<DraftEvent>,
) {
  setEvents((current) => ({ ...current, [iso]: { ...(current[iso] ?? emptyEvent()), ...patch } }));
}

function DayHints({ iso, previous }: { iso: string; previous: string }) {
  const lines: string[] = [];
  const cityHoliday = holidayOnIso(iso);
  if (cityHoliday) lines.push(`Stadtfeier: ${cityHoliday.title}`);
  for (const festival of festivalsOnIso(iso)) {
    lines.push(`Weltenband: ${festival.title}. ${festival.summary} (${festival.peoples})`);
  }
  if (convoyFallsOn(iso)) lines.push("Nordkarawane bringt Vattrak.");
  const before = new Set(listActiveMeasures(previous).map((measure) => measure.title));
  const ending = listActiveMeasures(iso)
    .map((measure) => measure.title)
    .filter((title) => !before.has(title));
  const stopped = [...before].filter((title) => !listActiveMeasures(iso).some((measure) => measure.title === title));
  if (stopped.length > 0) lines.push(`Endet: ${stopped.slice(0, 3).join(", ")}`);
  if (ending.length > 0) lines.push(`Beginnt: ${ending.slice(0, 3).join(", ")}`);
  if (lines.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {lines.map((line) => (
        <li key={line} className="font-libre text-sm text-gray-200">
          {line}
        </li>
      ))}
    </ul>
  );
}
