"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertCircle, Route, Trash2 } from "lucide-react";
import { AURENFURT_DISTRICTS } from "../aurenfurt-districts";
import {
  STREET_CATEGORY_META,
  STREET_WIDTH_MAX,
  STREET_WIDTH_MIN,
  effectiveStreet,
  streetCategoryLabel,
  worksKindLabel,
  type AurenfurtStreet,
  type StreetCategory,
  type StreetWorks,
} from "../aurenfurt-streets";
import type { DayWeather } from "../aurenfurt-weather";
import type { StreetLinkDraft } from "../hooks/useStreetLinkDraft";

const WORKS_OPTIONS: { kind: StreetWorks["kind"]; label: string }[] = [
  { kind: "none", label: "Normal" },
  { kind: "full_closure", label: "Komplettsperrung" },
  { kind: "full_closure_detour", label: "Sperrung + Umgehung" },
  { kind: "partial", label: "Teilsperrung" },
  { kind: "works", label: "Bauarbeiten" },
];

const CATEGORY_OPTIONS: StreetCategory[] = ["main", "side", "alley"];

export function StreetsToolBody({
  streets,
  editingStreetId,
  drawingStreet,
  draftPointCount,
  activeStreet,
  streetEffective,
  linkDraft,
  linkError,
  linkDirty,
  draftConnectionError,
  connectCandidates,
  confirmRemoveId,
  dayWeather,
  viewedDay,
  setConfirmRemoveId,
  setLinkDraft,
  setLinkError,
  selectStreet,
  changeDraftCategory,
  toggleConnect,
  saveStreetLinks,
  setWorksKind,
  onStartDrawStreet,
  onFinishDrawStreet,
  onCancelDrawStreet,
  onUpdateStreet,
  onRemoveStreet,
  onSelectStreet,
}: {
  streets: AurenfurtStreet[];
  editingStreetId: string | null;
  drawingStreet: boolean;
  draftPointCount: number;
  activeStreet: AurenfurtStreet | null;
  streetEffective: ReturnType<typeof effectiveStreet> | null;
  linkDraft: StreetLinkDraft | null;
  linkError: string | null;
  linkDirty: boolean;
  draftConnectionError: string | null;
  connectCandidates: AurenfurtStreet[];
  confirmRemoveId: string | null;
  dayWeather: DayWeather;
  viewedDay: string;
  setConfirmRemoveId: Dispatch<SetStateAction<string | null>>;
  setLinkDraft: Dispatch<SetStateAction<StreetLinkDraft | null>>;
  setLinkError: Dispatch<SetStateAction<string | null>>;
  selectStreet: (id: string | null) => void;
  changeDraftCategory: (category: StreetCategory) => void;
  toggleConnect: (streetId: string) => void;
  saveStreetLinks: () => void;
  setWorksKind: (kind: StreetWorks["kind"]) => void;
  onStartDrawStreet: () => void;
  onFinishDrawStreet: () => void;
  onCancelDrawStreet: () => void;
  onUpdateStreet: (
    streetId: string,
    patch: Partial<Omit<AurenfurtStreet, "id" | "points" | "districtIds">>,
  ) => void;
  onRemoveStreet: (streetId: string) => void;
  onSelectStreet: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
          Alle Straßen
        </p>
        <Route className="h-3.5 w-3.5 text-accent-gold" aria-hidden />
      </div>

      {drawingStreet ? (
        <div className="space-y-2 rounded border border-hero-border/50 bg-slate-900/50 p-2">
          <p className="font-libre text-xs text-gray-300">
            Klicks setzen Punkte ({draftPointCount}). Doppelklick oder Fertig schließt die Linie (mind.
            2). Kamera bleibt in Draufsicht.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={draftPointCount < 2}
              onClick={onFinishDrawStreet}
              className="rounded border border-accent-gold bg-accent-gold/10 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              Fertig
            </button>
            <button
              type="button"
              onClick={onCancelDrawStreet}
              className="rounded border border-hero-dark px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400 hover:text-accent-gold"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirmRemoveId(null);
            onStartDrawStreet();
          }}
          className="w-full rounded border border-hero-border bg-hero-dark/40 px-2 py-1.5 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold transition-colors hover:bg-background-card"
        >
          Straße zeichnen
        </button>
      )}

      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {streets.length === 0 ? (
          <li className="font-libre text-xs text-gray-500">Noch keine Straßen.</li>
        ) : (
          streets.map((street) => {
            const selected = editingStreetId === street.id;
            const eff = effectiveStreet(street, dayWeather, viewedDay);
            const catColor = STREET_CATEGORY_META[street.category].color;
            return (
              <li key={street.id}>
                <button
                  type="button"
                  onClick={() => selectStreet(selected ? null : street.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-hero-dark/60 bg-slate-900/40 text-gray-200 hover:border-hero-border"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: catColor }}
                      aria-hidden
                    />
                    <span className="truncate font-barlow text-xs font-bold uppercase tracking-wide">
                      {street.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-libre text-[10px] text-gray-400">
                    {eff.passabilityLabel}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {activeStreet && streetEffective && linkDraft && !drawingStreet ? (
        <div className="space-y-3 rounded border border-hero-border/40 bg-slate-900/30 p-2">
          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Name
            </span>
            <input
              type="text"
              value={activeStreet.name}
              onChange={(event) => onUpdateStreet(activeStreet.id, { name: event.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Beschreibung
            </span>
            <textarea
              value={activeStreet.description}
              onChange={(event) =>
                onUpdateStreet(activeStreet.id, { description: event.target.value })
              }
              rows={4}
              placeholder="Lage, Höhenunterschied, Aufgänge, Kontrollen — was eine KI über diese Straße wissen muss."
              className="w-full resize-y rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none placeholder:text-gray-500 focus:border-hero-vibrant"
            />
          </label>

          <div className="space-y-2 rounded border border-hero-dark/50 bg-background-dark/30 p-2">
            <label className="block space-y-1">
              <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Kategorie
              </span>
              <select
                value={linkDraft.category}
                onChange={(event) => changeDraftCategory(event.target.value as StreetCategory)}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {STREET_CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Dicke ({linkDraft.width})
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={STREET_WIDTH_MIN}
                  max={STREET_WIDTH_MAX}
                  step={1}
                  value={linkDraft.width}
                  onChange={(event) => {
                    const width = Number(event.target.value);
                    setLinkDraft((current) => (current ? { ...current, width } : current));
                    setLinkError(null);
                  }}
                  className="h-2 w-full accent-hero-vibrant"
                />
                <input
                  type="number"
                  min={STREET_WIDTH_MIN}
                  max={STREET_WIDTH_MAX}
                  value={linkDraft.width}
                  onChange={(event) => {
                    const width = Math.min(
                      STREET_WIDTH_MAX,
                      Math.max(STREET_WIDTH_MIN, Math.round(Number(event.target.value) || STREET_WIDTH_MIN)),
                    );
                    setLinkDraft((current) => (current ? { ...current, width } : current));
                    setLinkError(null);
                  }}
                  className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </div>
            </label>

            <div className="space-y-1">
              <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Verbindungen
              </p>
              {connectCandidates.length === 0 ? (
                <p className="font-libre text-xs text-gray-500">Keine anderen Straßen zum Verbinden.</p>
              ) : (
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {connectCandidates.map((candidate) => {
                    const checked = linkDraft.connectsTo.includes(candidate.id);
                    return (
                      <li key={candidate.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded border border-hero-dark/50 bg-slate-900/40 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleConnect(candidate.id)}
                            className="accent-hero-vibrant"
                          />
                          <span
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: STREET_CATEGORY_META[candidate.category].color }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-barlow text-xs font-bold uppercase tracking-wide text-gray-100">
                            {candidate.name}
                          </span>
                          <span className="shrink-0 font-libre text-[10px] text-gray-400">
                            {streetCategoryLabel(candidate.category)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {linkDraft.category === "side" ? (
                <p className="font-libre text-[10px] text-gray-500">
                  Nebenstraßen brauchen mind. eine Verbindung zu einer Hauptstraße.
                </p>
              ) : null}
              {linkDraft.category === "alley" ? (
                <p className="font-libre text-[10px] text-gray-500">
                  Seitengassen brauchen mind. eine Verbindung zu einer Neben- oder Hauptstraße.
                </p>
              ) : null}
            </div>

            {(linkError || draftConnectionError) && (linkDirty || linkError) ? (
              <p className="flex items-start gap-1.5 font-libre text-xs text-red-400" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{linkError ?? draftConnectionError}</span>
              </p>
            ) : null}

            <button
              type="button"
              disabled={!linkDirty || Boolean(draftConnectionError)}
              onClick={saveStreetLinks}
              className="w-full rounded border border-accent-gold bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kategorie &amp; Verbindungen speichern
            </button>
          </div>

          <div className="space-y-1">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Durchquerte Viertel
            </p>
            {activeStreet.districtIds.length === 0 ? (
              <p className="font-libre text-xs text-gray-500">Keine (Linie außerhalb der Flächen).</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {activeStreet.districtIds.map((id) => {
                  const name = AURENFURT_DISTRICTS.find((d) => d.id === id)?.name ?? id;
                  return (
                    <li
                      key={id}
                      className="rounded border border-hero-dark/60 bg-background-dark/60 px-1.5 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-200"
                    >
                      {name}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ScoreField
            label="Sicherheit"
            value={activeStreet.security}
            onChange={(security) => onUpdateStreet(activeStreet.id, { security })}
          />
          <ScoreField
            label="Kriminalität"
            value={activeStreet.crime}
            onChange={(crime) => onUpdateStreet(activeStreet.id, { crime })}
          />
          <ScoreField
            label="Zustand (Basis)"
            value={activeStreet.condition}
            onChange={(condition) => onUpdateStreet(activeStreet.id, { condition })}
          />
          <ScoreField
            label="Verkehr"
            value={activeStreet.traffic}
            onChange={(traffic) => onUpdateStreet(activeStreet.id, { traffic })}
          />

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Baumaßnahme
            </span>
            <select
              value={activeStreet.works.kind}
              onChange={(event) => setWorksKind(event.target.value as StreetWorks["kind"])}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            >
              {WORKS_OPTIONS.map((opt) => (
                <option key={opt.kind} value={opt.kind}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {(activeStreet.works.kind === "full_closure" ||
            activeStreet.works.kind === "full_closure_detour") && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Start
                </span>
                <input
                  type="date"
                  value={activeStreet.works.closureStart}
                  onChange={(event) => {
                    const works = activeStreet.works;
                    if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return;
                    onUpdateStreet(activeStreet.id, {
                      works: { ...works, closureStart: event.target.value },
                    });
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Tage
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={activeStreet.works.closureDays}
                  onChange={(event) => {
                    const works = activeStreet.works;
                    if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return;
                    const closureDays = Math.max(1, Math.round(Number(event.target.value) || 1));
                    onUpdateStreet(activeStreet.id, { works: { ...works, closureDays } });
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </label>
            </div>
          )}

          {activeStreet.works.kind === "full_closure_detour" ? (
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                Umgehungsstraße
              </span>
              <select
                value={activeStreet.works.detourStreetId ?? ""}
                onChange={(event) => {
                  const works = activeStreet.works;
                  if (works.kind !== "full_closure_detour") return;
                  const detourStreetId = event.target.value || undefined;
                  onUpdateStreet(activeStreet.id, {
                    works: { ...works, detourStreetId },
                  });
                }}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
              >
                <option value="">— keine / eigene Polyline —</option>
                {streets
                  .filter((s) => s.id !== activeStreet.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <p className="font-libre text-[10px] text-gray-500">
                Alternativ kurze Umgehungs-Polyline in den Daten; Auswahl hier verknüpft eine andere
                Straße.
              </p>
            </label>
          ) : null}

          <div className="rounded border border-hero-dark/50 bg-background-dark/40 p-2">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
              Heute auf der Karte
            </p>
            {activeStreet.description.trim() ? (
              <p className="mt-1 line-clamp-3 font-libre text-xs text-gray-300">
                {activeStreet.description.trim()}
              </p>
            ) : null}
            <p className="mt-1 font-libre text-xs text-gray-200">
              {streetCategoryLabel(activeStreet.category)} · Dicke {activeStreet.width}
            </p>
            <p className="font-libre text-xs text-gray-200">
              Passierbarkeit: {streetEffective.passabilityLabel}
            </p>
            <p className="font-libre text-xs text-gray-400">
              Effektiver Zustand: {streetEffective.effectiveCondition}
              {streetEffective.weatherPenalty > 0
                ? ` (−${streetEffective.weatherPenalty} Wetter)`
                : ""}
            </p>
            <p className="font-libre text-xs text-gray-500">
              Wetter {dayWeather.label} · {worksKindLabel(activeStreet.works.kind)}
            </p>
            {streetEffective.worksExpired ? (
              <p className="mt-1 font-libre text-xs text-amber-400">
                Sperrfenster abgelaufen — Straße wieder freigegeben.
              </p>
            ) : null}
            {streetEffective.eventText ? (
              <p className="mt-1 font-libre text-xs text-gray-300">{streetEffective.eventText}</p>
            ) : null}
          </div>

          {confirmRemoveId === activeStreet.id ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onRemoveStreet(activeStreet.id);
                  setConfirmRemoveId(null);
                  onSelectStreet(null);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded border border-red-500/70 bg-red-950/40 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Endgültig entfernen
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                className="rounded border border-hero-dark px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-gray-400"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemoveId(activeStreet.id)}
              className="flex w-full items-center justify-center gap-1 rounded border border-red-500/40 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-red-400 hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Entfernen
            </button>
          )}

          <p className="font-libre text-[11px] text-gray-500">
            Straßen bleiben auf der Karte sichtbar. Handles nur bei gewählter Straße im Editor.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full accent-hero-vibrant"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) =>
            onChange(Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))))
          }
          className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant"
        />
      </div>
    </label>
  );
}
