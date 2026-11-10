"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, X } from "lucide-react";
import { findDistrict, type CityDistrictId } from "./aurenfurt-districts";
import {
  activateCitySimEvent,
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
import { uploadLoreImage } from "@/src/lib/profile-media";
import type { DistrictSector } from "./aurenfurt-sectors";
import { CityHudFrame } from "./CityHudFrame";

const FIELD =
  "w-full rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white outline-none focus:border-hero-vibrant";

type Listed = Awaited<ReturnType<typeof listCitySimEvents>>[number];
type Step = "hub" | "story" | "place" | "effect";
type EffectDraft = { meter: CityMeter; delta: string };

const STEPS: { id: Step; label: string; short: string }[] = [
  { id: "hub", label: "Start", short: "Karten wählen oder neu anlegen" },
  { id: "story", label: "Inhalt", short: "Titel, Text und Motiv" },
  { id: "place", label: "Ort", short: "Stadt, Viertel oder Sektor" },
  { id: "effect", label: "Wirkung", short: "Kennzahlen und Dauer" },
];

const MAX_EFFECTS = 4;

type Props = {
  day: string;
  worldId: string;
  districtId: CityDistrictId | null;
  wholeCity: boolean;
  sectorIds: string[];
  sectors: DistrictSector[];
  onPlaceStep: (active: boolean) => void;
  /** Explizit: ganze Stadt (ohne Viertel/Sektoren). */
  onSelectWholeCity: () => void;
  /** Explizit: ganzes Viertel (Sektorwahl zurücksetzen). */
  onSelectWholeDistrict: () => void;
  /** Sektorwahl leeren, Viertel behalten. */
  onClearSectors: () => void;
  /** Ort aus vorhandener Karte laden (Bearbeiten). */
  onLoadPlace: (place: {
    wholeCity: boolean;
    districtId: CityDistrictId | null;
    sectorLabel: string | null;
  }) => void;
  onClose: () => void;
  onSaved: () => void;
};

function blankEffect(meter: CityMeter = "economy", delta = "-6"): EffectDraft {
  return { meter, delta };
}

export function CityEventWizard({
  day,
  worldId,
  districtId,
  wholeCity,
  sectorIds,
  sectors,
  onPlaceStep,
  onSelectWholeCity,
  onSelectWholeDistrict,
  onClearSectors,
  onLoadPlace,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>("hub");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [durationDays, setDurationDays] = useState("7");
  const [effects, setEffects] = useState<EffectDraft[]>([blankEffect()]);
  const [endMeter, setEndMeter] = useState<CityMeter | "">("");
  const [endOp, setEndOp] = useState<"gt" | "lt">("lt");
  const [endValue, setEndValue] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Listed[]>([]);
  /** Ort wird beim Verlassen des Ort-Schritts eingefroren — speichert auch, wenn Props später leer sind. */
  const [committedPlace, setCommittedPlace] = useState<{
    wholeCity: boolean;
    districtId: CityDistrictId | null;
    sectorIds: string[];
    sectorAddresses: string[];
  } | null>(null);

  useEffect(() => {
    onPlaceStep(step === "place");
  }, [onPlaceStep, step]);

  /** Während Ort-Schritt: Auswahl live mitschreiben, damit Speichern nicht „ganzes Viertel“ wird. */
  useEffect(() => {
    if (step !== "place") return;
    const addresses =
      sectors.filter((sector) => sectorIds.includes(sector.id)).map((sector) => sector.address);
    setCommittedPlace({
      wholeCity,
      districtId,
      sectorIds: [...sectorIds],
      sectorAddresses: addresses.length > 0 ? addresses : [...sectorIds],
    });
  }, [step, wholeCity, districtId, sectorIds, sectors]);

  const reload = () => {
    void listCitySimEvents(worldId).then(setEvents).catch(() => setEvents([]));
  };

  useEffect(() => {
    reload();
  }, [worldId]);

  const picked = sectors.filter((sector) => sectorIds.includes(sector.id));
  const effectiveWholeCity = committedPlace?.wholeCity ?? wholeCity;
  const effectiveDistrictId = committedPlace?.districtId ?? districtId;
  const effectiveSectorIds = committedPlace?.sectorIds ?? sectorIds;
  const effectiveAddresses =
    committedPlace?.sectorAddresses ??
    (picked.length > 0 ? picked.map((sector) => sector.address) : []);
  const placeReady = effectiveWholeCity || Boolean(effectiveDistrictId);
  const districtName = effectiveDistrictId
    ? (findDistrict(effectiveDistrictId)?.name ?? effectiveDistrictId)
    : null;
  const stepIndex = STEPS.findIndex((entry) => entry.id === step);
  const placing = step === "place";

  const placeLabel = effectiveWholeCity
    ? "Ganze Stadt"
    : effectiveSectorIds.length > 0
      ? `${districtName}: ${
          picked.length > 0
            ? picked.map((sector) => sector.label).join(", ")
            : effectiveAddresses.map((address) => address.split(" ").pop() ?? address).join(", ")
        }`
      : effectiveDistrictId
        ? `${districtName} (ganzes Viertel)`
        : "Noch kein Ort";

  const commitPlaceFromLive = () => {
    setCommittedPlace({
      wholeCity,
      districtId,
      sectorIds: [...sectorIds],
      sectorAddresses:
        picked.length > 0
          ? picked.map((sector) => sector.address)
          : [...sectorIds],
    });
  };

  const startCreate = () => {
    setError(null);
    setEditingId(null);
    setCommittedPlace(null);
    setTitle("");
    setBody("");
    setImageUrl("");
    setEffects([blankEffect()]);
    setDurationDays("7");
    setEndMeter("");
    setEndOp("lt");
    setEndValue("40");
    onSelectWholeCity();
    setStep("story");
  };

  const startEdit = (event: Listed) => {
    setError(null);
    setEditingId(event.id);
    setCommittedPlace(null);
    setTitle(event.title ?? "");
    setBody(event.body ?? "");
    setImageUrl(event.image_url?.trim() ?? "");
    setDurationDays(
      typeof event.duration_days === "number" && event.duration_days > 0
        ? String(event.duration_days)
        : "7",
    );
    const nextEffects =
      Array.isArray(event.effects) && event.effects.length > 0
        ? event.effects.map((effect) => ({
            meter: effect.meter,
            delta: String(effect.delta),
          }))
        : [blankEffect()];
    setEffects(nextEffects);
    if (event.end_when?.meter) {
      setEndMeter(event.end_when.meter);
      setEndOp(event.end_when.op === "gt" ? "gt" : "lt");
      setEndValue(String(event.end_when.value ?? 40));
    } else {
      setEndMeter("");
      setEndOp("lt");
      setEndValue("40");
    }
    onLoadPlace({
      wholeCity: event.scope === "city",
      districtId:
        event.scope !== "city" && event.district_id
          ? (event.district_id as CityDistrictId)
          : null,
      sectorLabel: event.scope === "sector" ? event.sector_label : null,
    });
    setStep("story");
  };

  const updateEffect = (index: number, patch: Partial<EffectDraft>) => {
    setEffects((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

  const save = () => {
    setError(null);
    const liveOrCommitted = committedPlace ?? {
      wholeCity,
      districtId,
      sectorIds: [...sectorIds],
      sectorAddresses:
        picked.length > 0 ? picked.map((sector) => sector.address) : [...sectorIds],
    };
    const scope: "city" | "district" | "sector" =
      liveOrCommitted.sectorIds.length > 0 && !liveOrCommitted.wholeCity
        ? "sector"
        : liveOrCommitted.districtId && !liveOrCommitted.wholeCity
          ? "district"
          : "city";
    const sectorLabel =
      scope === "sector"
        ? liveOrCommitted.sectorAddresses.filter(Boolean).join(", ") || null
        : null;
    if (scope === "sector" && !sectorLabel?.trim()) {
      setError("Sektoren gewählt, aber ohne Bezeichnung — bitte Ort-Schritt erneut öffnen.");
      return;
    }
    if (scope !== "city" && !liveOrCommitted.districtId) {
      setError("Bitte ein Viertel wählen.");
      return;
    }
    const parsedEffects: MeterEffect[] = effects
      .map((entry) => {
        const raw = Number(entry.delta) || 0;
        const delta = Math.max(-20, Math.min(20, raw));
        return { meter: entry.meter, delta };
      })
      .filter((entry) => entry.delta !== 0);
    if (parsedEffects.length === 0) {
      setError("Mindestens eine Wirkung mit Wert ungleich 0 festlegen.");
      return;
    }
    if (
      effects.some((entry) => {
        const raw = Number(entry.delta);
        return Number.isFinite(raw) && (raw < -20 || raw > 20);
      })
    ) {
      setError("Wirkung pro Kennzahl nur zwischen −20 und +20.");
      return;
    }
    setBusy(true);
    void saveCitySimEvent({
      id: editingId ?? undefined,
      worldId,
      title,
      body,
      imageUrl: imageUrl.trim() || null,
      scope,
      districtId: scope === "city" ? null : liveOrCommitted.districtId,
      sectorLabel,
      effects: parsedEffects,
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
                    Karten bleiben in der Hand: ausgespielt = aktiv (ausgegraut), nach Ablauf wieder
                    bereit. Ort, Dauer und Wirkung kannst du jederzeit bearbeiten.
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
                    <ul className="max-h-56 space-y-2 overflow-y-auto">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className="flex items-stretch gap-2 rounded border border-hero-dark/50 bg-background-card/60 p-2"
                        >
                          {event.image_url ? (
                            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded border border-hero-dark">
                              <Image
                                src={event.image_url}
                                alt=""
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded border border-hero-dark/60 bg-background-dark/70">
                              <span className="font-barlow text-[8px] font-bold uppercase text-gray-500">
                                Motiv
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-libre text-xs text-gray-200">
                              {event.title}
                              {event.active ? (
                                <span className="text-hero-vibrant"> · aktiv</span>
                              ) : (
                                <span className="text-gray-500"> · bereit</span>
                              )}
                            </p>
                            <p className="mt-0.5 truncate font-libre text-[10px] text-gray-500">
                              {(event.effects ?? [])
                                .map(
                                  (effect) =>
                                    `${CITY_METER_LABELS[effect.meter] ?? effect.meter} ${
                                      effect.delta > 0 ? "+" : ""
                                    }${effect.delta}`,
                                )
                                .join(" · ") || "Keine Wirkung"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:text-white"
                                onClick={() => startEdit(event)}
                              >
                                Bearbeiten
                              </button>
                              <button
                                type="button"
                                className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant hover:text-white"
                                onClick={() => {
                                  const action = event.active
                                    ? setCitySimEventActive(worldId, event.id, false)
                                    : activateCitySimEvent(worldId, event.id, day);
                                  void action.then(() => {
                                    reload();
                                    onSaved();
                                  });
                                }}
                              >
                                {event.active ? "Beenden" : "Ausspielen"}
                              </button>
                            </div>
                          </div>
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
                <div className="rounded border border-hero-dark/60 bg-background-dark/40 p-2">
                  <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    Kartenmotiv (optional)
                  </p>
                  <p className="mt-1 font-libre text-[11px] leading-snug text-gray-400">
                    Wird als Bild der Karte gezeigt, wenn du sie ausspielst.
                  </p>
                  <div className="mt-2 flex items-start gap-3">
                    {imageUrl ? (
                      <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded border border-hero-border">
                        <Image
                          src={imageUrl}
                          alt="Kartenmotiv"
                          fill
                          sizes="72px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded border border-dashed border-hero-dark bg-slate-900/80">
                        <span className="px-1 text-center font-barlow text-[9px] font-bold uppercase text-gray-500">
                          Kein Bild
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imageUploading}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          setImageUploading(true);
                          setError(null);
                          try {
                            const result = await uploadLoreImage(file, { worldId });
                            if ("error" in result) {
                              setError(result.error);
                              return;
                            }
                            setImageUrl(result.publicUrl);
                          } finally {
                            setImageUploading(false);
                          }
                        }}
                        className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-gray-300 file:mr-2 file:rounded file:border-0 file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-[10px] file:font-bold file:uppercase file:text-accent-gold"
                      />
                      {imageUrl ? (
                        <button
                          type="button"
                          className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-white"
                          onClick={() => setImageUrl("")}
                        >
                          Motiv entfernen
                        </button>
                      ) : (
                        <p className="font-libre text-[10px] text-gray-500">
                          {imageUploading ? "Upload läuft…" : "JPEG, PNG oder WebP · max. 5 MB"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="font-libre text-xs text-gray-400">
                  Beginn ist der gewählte Kartentag {day}.
                </p>
              </div>
            ) : null}

            {step === "place" ? (
              <div className="mt-4 space-y-3">
                <p className="font-libre text-xs leading-relaxed text-gray-200">
                  Reichweite wählen: ganze Stadt (Button), ein Viertel (Karte) oder Sektoren (Klick
                  auf Felder). Namen nur in der Liste unten — nicht auf der Karte.
                </p>
                <div
                  className="grid grid-cols-3 gap-1.5"
                  role="group"
                  aria-label="Ereignis-Reichweite"
                >
                  <button
                    type="button"
                    onClick={onSelectWholeCity}
                    className={`rounded border px-2 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                      wholeCity
                        ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                        : "border-hero-dark text-gray-300 hover:border-hero-vibrant/60"
                    }`}
                  >
                    Ganze Stadt
                  </button>
                  <button
                    type="button"
                    disabled={!districtId && !wholeCity}
                    onClick={() => {
                      if (!districtId) return;
                      onSelectWholeDistrict();
                    }}
                    className={`rounded border px-2 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide disabled:opacity-40 ${
                      !wholeCity && districtId && picked.length === 0
                        ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                        : "border-hero-dark text-gray-300 hover:border-hero-vibrant/60"
                    }`}
                  >
                    Ganzes Viertel
                  </button>
                  <button
                    type="button"
                    disabled={!districtId || sectors.length === 0}
                    onClick={() => {
                      /* Sektorwahl auf der Karte; Button macht nur den Modus sichtbar. */
                      if (picked.length > 0) return;
                      onClearSectors();
                    }}
                    className={`rounded border px-2 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide disabled:opacity-40 ${
                      picked.length > 0
                        ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                        : "border-hero-dark text-gray-300 hover:border-hero-vibrant/60"
                    }`}
                  >
                    Sektoren
                  </button>
                </div>
                <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
                  {placeLabel}
                </p>
                {picked.length > 0 ? (
                  <div className="space-y-1.5">
                    <ul className="flex flex-wrap gap-1.5" aria-label="Gewählte Sektoren">
                      {picked.map((sector) => (
                        <li
                          key={sector.id}
                          className="rounded border border-accent-gold/60 bg-accent-gold/10 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold"
                        >
                          {sector.label}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={onSelectWholeDistrict}
                      className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant hover:text-accent-gold"
                    >
                      Sektoren verwerfen → ganzes Viertel
                    </button>
                  </div>
                ) : null}
                {districtId && sectors.length === 0 ? (
                  <p className="font-libre text-xs text-gray-400">
                    Dieses Viertel hat noch keine Sektoren. Das Ereignis gilt für das ganze Viertel.
                  </p>
                ) : null}
                {districtId && sectors.length > 0 && picked.length === 0 && !wholeCity ? (
                  <p className="font-libre text-xs text-gray-400">
                    Aktuell: ganzes Viertel. Für engere Wirkung Sektoren auf der Karte anklicken.
                  </p>
                ) : null}
                {wholeCity ? (
                  <p className="font-libre text-xs text-gray-400">
                    Stadtweit — wirkt in allen Vierteln. Viertel klicken, um einzuschränken.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "effect" ? (
              <div className="mt-4 space-y-3">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                      Wirkungen auf Kennzahlen
                    </p>
                    <button
                      type="button"
                      disabled={effects.length >= MAX_EFFECTS}
                      onClick={() =>
                        setEffects((current) =>
                          current.length >= MAX_EFFECTS
                            ? current
                            : [...current, blankEffect("crime", "4")],
                        )
                      }
                      className="inline-flex items-center gap-1 rounded border border-hero-dark px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      Wirkung
                    </button>
                  </div>
                  <p className="font-libre text-[11px] leading-snug text-gray-400">
                    Bis zu {MAX_EFFECTS} Kennzahlen gleichzeitig. Positiv hebt, negativ senkt (−20 bis
                    +20).
                  </p>
                  {effects.map((entry, index) => (
                    <div key={index} className="grid grid-cols-[1fr_5rem_2rem] gap-2">
                      <select
                        className={FIELD}
                        value={entry.meter}
                        onChange={(event) =>
                          updateEffect(index, { meter: event.target.value as CityMeter })
                        }
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
                        value={entry.delta}
                        onChange={(event) => updateEffect(index, { delta: event.target.value })}
                        aria-label="Änderung"
                      />
                      <button
                        type="button"
                        disabled={effects.length <= 1}
                        onClick={() =>
                          setEffects((current) => current.filter((_, i) => i !== index))
                        }
                        className="flex items-center justify-center rounded border border-hero-dark text-gray-400 hover:text-red-300 disabled:opacity-30"
                        aria-label="Wirkung entfernen"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
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
                  Dauer und Schwelle gelten für die ganze Karte. Sektoren wirken auf die Werte ihres
                  Viertels.
                </p>
              </div>
            ) : null}

            {error ? <p className="mt-2 font-libre text-xs text-red-300">{error}</p> : null}

            {step !== "hub" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-200"
                  onClick={() => {
                    if (step === "effect") setCommittedPlace(null);
                    setStep(step === "effect" ? "place" : step === "place" ? "story" : "hub");
                  }}
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
                    onClick={() => {
                      commitPlaceFromLive();
                      setStep("effect");
                    }}
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
                    {editingId ? "Änderungen speichern" : "Stadtereignis anlegen"}
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
