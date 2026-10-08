"use client";

import { useEffect, useState } from "react";
import { findDistrict, type CityDistrictId } from "./aurenfurt-districts";
import {
  listCitySimEvents,
  saveCitySimEvent,
  setCitySimEventActive,
} from "@/src/app/dashboard/worlds/city-sim-event-actions";
import {
  CITY_METER_LABELS,
  CITY_METERS,
  type CityMeter,
  type MeterEffect,
} from "@/src/lib/npcs/city-simulation";
import type { DistrictSector } from "./aurenfurt-sectors";

const FIELD =
  "w-full rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white outline-none focus:border-hero-vibrant";

type Listed = Awaited<ReturnType<typeof listCitySimEvents>>[number];
type Step = "story" | "place" | "effect";

type Props = {
  day: string;
  worldId: string;
  districtId: CityDistrictId | null;
  wholeCity: boolean;
  sectorIds: string[];
  sectors: DistrictSector[];
  onPlaceStep: (active: boolean) => void;
  onClose: () => void;
  onSaved: () => void;
};

export function CityEventWizard({
  day,
  worldId,
  districtId,
  wholeCity,
  sectorIds,
  sectors,
  onPlaceStep,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>("story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [meter, setMeter] = useState<CityMeter>("economy");
  const [delta, setDelta] = useState("-6");
  const [endMeter, setEndMeter] = useState<CityMeter | "">("");
  const [endOp, setEndOp] = useState<"gt" | "lt">("lt");
  const [endValue, setEndValue] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Listed[]>([]);

  useEffect(() => {
    onPlaceStep(step === "place");
  }, [onPlaceStep, step]);

  const reload = () => {
    void listCitySimEvents(worldId).then(setEvents).catch(() => setEvents([]));
  };

  useEffect(() => {
    reload();
  }, [worldId]);

  const picked = sectors.filter((sector) => sectorIds.includes(sector.id));
  const placeReady = wholeCity || Boolean(districtId);
  const districtName = districtId ? (findDistrict(districtId)?.name ?? districtId) : null;

  const placeLabel = wholeCity
    ? "Ganze Stadt"
    : picked.length > 0
      ? `${districtName}: ${picked.map((sector) => sector.label).join(", ")}`
      : districtId
        ? `${districtName} (ganzes Viertel)`
        : "Noch kein Ort";

  const save = () => {
    setError(null);
    const scope: "city" | "district" | "sector" =
      picked.length > 0 ? "sector" : districtId && !wholeCity ? "district" : "city";
    const effect: MeterEffect = { meter, delta: Number(delta) || 0 };
    setBusy(true);
    void saveCitySimEvent({
      worldId,
      title,
      body,
      scope,
      districtId: scope === "city" ? null : districtId,
      sectorLabel: scope === "sector" ? picked.map((sector) => sector.address).join(", ") : null,
      effects: effect.delta === 0 ? [] : [effect],
      durationDays: durationDays.trim() ? Number(durationDays) : null,
      startOn: day,
      endWhen: endMeter ? { meter: endMeter, op: endOp, value: Number(endValue) || 0 } : null,
    })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setBusy(false));
  };

  return (
    <section className="pointer-events-auto absolute bottom-4 left-4 z-20 w-[min(24rem,calc(100%-2rem))] max-h-[min(34rem,58vh)] overflow-y-auto rounded-md border border-accent-gold bg-background-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-cinzel text-base font-bold text-accent-gold">Stadtereignis</h3>
        <button
          type="button"
          onClick={onClose}
          className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-300"
        >
          Schließen
        </button>
      </div>
      <p className="mt-1 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant">
        {step === "story" ? "1 · Was geschieht" : step === "place" ? "2 · Wo" : "3 · Wirkung"}
      </p>

      {step === "story" ? (
        <div className="mt-3 space-y-2">
          <input className={FIELD} placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea
            className={`${FIELD} min-h-20`}
            placeholder="Was geschieht"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="font-libre text-xs text-gray-400">Beginn ist der gewählte Kartentag {day}.</p>
          {events.length > 0 ? (
            <ul className="space-y-1 border-t border-hero-dark pt-2">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-libre text-xs text-gray-200">
                    {event.title}
                    {event.active ? "" : " · beendet"}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 font-barlow text-[10px] font-bold uppercase text-accent-gold"
                    onClick={() => {
                      void setCitySimEventActive(worldId, event.id, !event.active).then(() => {
                        reload();
                        onSaved();
                      });
                    }}
                  >
                    {event.active ? "Beenden" : "Aufnehmen"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {step === "place" ? (
        <div className="mt-3 space-y-2">
          <p className="font-libre text-xs leading-relaxed text-gray-200">
            Klicke auf der Karte ein Viertel. Danach liegen dessen Sektoren auf dem Modell und lassen sich einzeln
            treffen. Ein Klick neben die Viertel setzt die ganze Stadt.
          </p>
          <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">{placeLabel}</p>
          {districtId && sectors.length === 0 ? (
            <p className="font-libre text-xs text-gray-400">
              Dieses Viertel hat noch keine Sektoren. Das Ereignis gilt für das ganze Viertel.
            </p>
          ) : null}
          {districtId && sectors.length > 0 && picked.length === 0 ? (
            <p className="font-libre text-xs text-gray-400">
              Ohne gewählten Sektor gilt das ganze Viertel. Klicke Sektoren an, um sie festzulegen.
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "effect" ? (
        <div className="mt-3 space-y-2">
          <p className="font-libre text-xs text-gray-300">{placeLabel}</p>
          <label className="block font-libre text-xs text-gray-400">
            Wirkzeit in Tagen
            <input className={`${FIELD} mt-1`} inputMode="numeric" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
          </label>
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <select className={FIELD} value={meter} onChange={(event) => setMeter(event.target.value as CityMeter)}>
              {CITY_METERS.map((key) => (
                <option key={key} value={key}>
                  {CITY_METER_LABELS[key]}
                </option>
              ))}
            </select>
            <input className={FIELD} inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} />
          </div>
          <p className="font-libre text-xs text-gray-400">Oder Ende, sobald ein Wert erreicht ist.</p>
          <div className="grid grid-cols-[1fr_5.5rem_4rem] gap-2">
            <select
              className={FIELD}
              value={endMeter}
              onChange={(event) => setEndMeter(event.target.value as CityMeter | "")}
            >
              <option value="">Endet an keiner Schwelle</option>
              {CITY_METERS.map((key) => (
                <option key={key} value={key}>
                  {CITY_METER_LABELS[key]}
                </option>
              ))}
            </select>
            <select className={FIELD} value={endOp} onChange={(event) => setEndOp(event.target.value as "gt" | "lt")}>
              <option value="lt">unter</option>
              <option value="gt">über</option>
            </select>
            <input className={FIELD} inputMode="numeric" value={endValue} onChange={(event) => setEndValue(event.target.value)} />
          </div>
          <p className="font-libre text-xs text-gray-400">Ein Sektor wirkt auf die Werte seines Viertels.</p>
        </div>
      ) : null}

      {error ? <p className="mt-2 font-libre text-xs text-red-300">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        {step !== "story" ? (
          <button
            type="button"
            className="rounded border border-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-200"
            onClick={() => setStep(step === "effect" ? "place" : "story")}
          >
            Zurück
          </button>
        ) : null}
        {step === "story" ? (
          <button
            type="button"
            disabled={!title.trim()}
            className="rounded border border-hero-vibrant px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant disabled:opacity-40"
            onClick={() => setStep("place")}
          >
            Weiter
          </button>
        ) : null}
        {step === "place" ? (
          <button
            type="button"
            disabled={!placeReady}
            className="rounded border border-hero-vibrant px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant disabled:opacity-40"
            onClick={() => setStep("effect")}
          >
            Weiter
          </button>
        ) : null}
        {step === "effect" ? (
          <button
            type="button"
            disabled={busy || !placeReady}
            className="rounded border border-hero-vibrant px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant disabled:opacity-40"
            onClick={save}
          >
            Stadtereignis anlegen
          </button>
        ) : null}
      </div>
    </section>
  );
}
