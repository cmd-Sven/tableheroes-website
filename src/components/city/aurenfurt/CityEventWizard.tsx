"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
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
import { CityHudFrame } from "./CityHudFrame";

const FIELD =
  "w-full rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white outline-none focus:border-hero-vibrant";

type Listed = Awaited<ReturnType<typeof listCitySimEvents>>[number];
type Step = "hub" | "story" | "place" | "effect";

const STEPS: { id: Step; label: string; short: string }[] = [
  { id: "hub", label: "Start", short: "Karten wählen oder neu anlegen" },
  { id: "story", label: "Inhalt", short: "Titel und Beschreibung" },
  { id: "place", label: "Ort", short: "Stadt, Viertel oder Sektor" },
  { id: "effect", label: "Wirkung", short: "Kennzahlen und Dauer" },
];

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
  const [step, setStep] = useState<Step>("hub");
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
  const stepIndex = STEPS.findIndex((entry) => entry.id === step);
  const placing = step === "place";

  const placeLabel = wholeCity
    ? "Ganze Stadt"
    : picked.length > 0
      ? `${districtName}: ${picked.map((sector) => sector.label).join(", ")}`
      : districtId
        ? `${districtName} (ganzes Viertel)`
        : "Noch kein Ort";

  const startCreate = () => {
    setError(null);
    setTitle("");
    setBody("");
    setStep("story");
  };

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
    <div
      className={`pointer-events-none fixed inset-0 z-[120] flex p-4 ${
        placing ? "items-end justify-start bg-transparent" : "items-center justify-center bg-black/60"
      }`}
      role="presentation"
    >
      {!placing ? (
        <button
          type="button"
          aria-label="Schließen"
          className="pointer-events-auto absolute inset-0 cursor-default"
          onClick={onClose}
        />
      ) : null}

      <section
        role="dialog"
        aria-modal={!placing}
        aria-labelledby="city-event-wizard-title"
        className={`pointer-events-auto relative w-[min(32rem,calc(100%-1rem))] shadow-2xl ${
          placing ? "mb-2" : ""
        }`}
      >
        <CityHudFrame density="card" className="shadow-lg">
          <div className="max-h-[min(40rem,78vh)] overflow-y-auto px-5 pb-5 pt-12">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id="city-event-wizard-title"
                  className="font-cinzel text-lg font-bold text-accent-gold"
                >
                  Stadtereignis
                </h3>
                <p className="mt-0.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Schritt {stepIndex + 1} von {STEPS.length} · {STEPS[stepIndex]?.label}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-3 flex gap-1" aria-label="Wizard-Schritte">
              {STEPS.map((entry, index) => {
                const done = index < stepIndex;
                const current = index === stepIndex;
                return (
                  <li
                    key={entry.id}
                    className={`min-w-0 flex-1 rounded border px-1.5 py-1 ${
                      current
                        ? "border-accent-gold bg-accent-gold/10"
                        : done
                          ? "border-hero-border/50 bg-hero-dark/40"
                          : "border-hero-dark/40 bg-background-dark/40"
                    }`}
                  >
                    <p
                      className={`font-barlow text-[9px] font-bold uppercase tracking-wide ${
                        current ? "text-accent-gold" : "text-gray-400"
                      }`}
                    >
                      {index + 1}. {entry.label}
                    </p>
                    <p className="truncate font-libre text-[9px] leading-tight text-gray-500">
                      {entry.short}
                    </p>
                  </li>
                );
              })}
            </ol>

            {step === "hub" ? (
              <div className="mt-4 space-y-3">
                <div className="rounded border border-hero-border/40 bg-background-dark/50 px-3 py-2">
                  <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    So funktionieren Stadtereigniskarten
                  </p>
                  <p className="mt-1 font-libre text-xs leading-relaxed text-gray-300">
                    Eine Karte beschreibt ein Ereignis mit Titel und Text. Du legst Ort (Stadt, Viertel
                    oder Sektoren), Wirkzeit und Einfluss auf Stadtkennzahlen fest. Aktive Karten fließen
                    in die Tagessimulation ein; beendete Karten bleiben gespeichert und können erneut
                    aufgenommen werden.
                  </p>
                  <p className="mt-2 font-libre text-xs leading-relaxed text-gray-400">
                    Neues Ereignis: 4 Schritte — Start → Inhalt → Ort → Wirkung. Bestehende Karten
                    kannst du hier direkt aktivieren oder beenden.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startCreate}
                  className="w-full rounded border border-hero-vibrant bg-hero-vibrant/15 px-3 py-2.5 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/25"
                >
                  Neues Stadtereignis erstellen
                </button>

                <div>
                  <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Vorhandene Karten
                  </p>
                  {events.length === 0 ? (
                    <p className="font-libre text-xs text-gray-500">Noch keine Stadtereigniskarten.</p>
                  ) : (
                    <ul className="max-h-48 space-y-1 overflow-y-auto">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className="flex items-center justify-between gap-2 rounded border border-hero-dark/50 bg-background-card/60 px-2 py-1.5"
                        >
                          <span className="min-w-0 truncate font-libre text-xs text-gray-200">
                            {event.title}
                            {event.active ? (
                              <span className="text-hero-vibrant"> · aktiv</span>
                            ) : (
                              <span className="text-gray-500"> · beendet</span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:text-white"
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
                  )}
                </div>
              </div>
            ) : null}

            {step === "story" ? (
              <div className="mt-4 space-y-2">
                <input
                  className={FIELD}
                  placeholder="Titel"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <textarea
                  className={`${FIELD} min-h-24`}
                  placeholder="Was geschieht"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <p className="font-libre text-xs text-gray-400">
                  Beginn ist der gewählte Kartentag {day}.
                </p>
              </div>
            ) : null}

            {step === "place" ? (
              <div className="mt-4 space-y-2">
                <p className="font-libre text-xs leading-relaxed text-gray-200">
                  Klicke auf der Karte ein Viertel. Danach liegen dessen Sektoren auf dem Modell und
                  lassen sich einzeln treffen. Ein Klick neben die Viertel setzt die ganze Stadt.
                </p>
                <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
                  {placeLabel}
                </p>
                {districtId && sectors.length === 0 ? (
                  <p className="font-libre text-xs text-gray-400">
                    Dieses Viertel hat noch keine Sektoren. Das Ereignis gilt für das ganze Viertel.
                  </p>
                ) : null}
                {districtId && sectors.length > 0 && picked.length === 0 ? (
                  <p className="font-libre text-xs text-gray-400">
                    Ohne gewählten Sektor gilt das ganze Viertel. Klicke Sektoren an, um sie
                    festzulegen.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "effect" ? (
              <div className="mt-4 space-y-2">
                <p className="font-libre text-xs text-gray-300">{placeLabel}</p>
                <label className="block font-libre text-xs text-gray-400">
                  Wirkzeit in Tagen
                  <input
                    className={`${FIELD} mt-1`}
                    inputMode="numeric"
                    value={durationDays}
                    onChange={(event) => setDurationDays(event.target.value)}
                  />
                </label>
                <div className="grid grid-cols-[1fr_5rem] gap-2">
                  <select
                    className={FIELD}
                    value={meter}
                    onChange={(event) => setMeter(event.target.value as CityMeter)}
                  >
                    {CITY_METERS.map((key) => (
                      <option key={key} value={key}>
                        {CITY_METER_LABELS[key]}
                      </option>
                    ))}
                  </select>
                  <input
                    className={FIELD}
                    inputMode="numeric"
                    value={delta}
                    onChange={(event) => setDelta(event.target.value)}
                  />
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
                  <select
                    className={FIELD}
                    value={endOp}
                    onChange={(event) => setEndOp(event.target.value as "gt" | "lt")}
                  >
                    <option value="lt">unter</option>
                    <option value="gt">über</option>
                  </select>
                  <input
                    className={FIELD}
                    inputMode="numeric"
                    value={endValue}
                    onChange={(event) => setEndValue(event.target.value)}
                  />
                </div>
                <p className="font-libre text-xs text-gray-400">
                  Ein Sektor wirkt auf die Werte seines Viertels.
                </p>
              </div>
            ) : null}

            {error ? <p className="mt-2 font-libre text-xs text-red-300">{error}</p> : null}

            {step !== "hub" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-200"
                  onClick={() =>
                    setStep(step === "effect" ? "place" : step === "place" ? "story" : "hub")
                  }
                >
                  Zurück
                </button>
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
            ) : null}
          </div>
        </CityHudFrame>
      </section>
    </div>
  );
}
