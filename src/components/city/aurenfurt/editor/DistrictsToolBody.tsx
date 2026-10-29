"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AURENFURT_DISTRICTS,
  type CityDistrict,
  type CityDistrictId,
} from "../aurenfurt-districts";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import {
  SECTOR_SIZE_MAX,
  SECTOR_SIZE_MIN,
  SECTOR_SIZE_STEP,
  clampSectorSize,
  type DivideDistrictResult,
  type SectorCellSize,
} from "../aurenfurt-sectors";

const COLOR_PRESETS = ["#7ec8ff", "#f0d85a", "#e0a36a", "#b7e38a", "#ff8a6a", "#ffe38a", "#cab926", "#23c763"];

export function DistrictsToolBody({
  polygons,
  editingDistrictId,
  active,
  activeDistrict,
  districtBboxHint,
  sectorsLocked,
  sectorCount,
  sectorWidth,
  sectorHeight,
  sectorBusy,
  sectorConfirmPending,
  sectorPreview,
  lastDivideResult,
  setSectorWidth,
  setSectorHeight,
  setSectorConfirmPending,
  setSectorBusy,
  setLastDivideResult,
  onSelectDistrict,
  onColorChange,
  onHoverOpacityChange,
  onDivideSectors,
}: {
  polygons: DistrictPolygons;
  editingDistrictId: CityDistrictId | null;
  active: DistrictPolygons[CityDistrictId] | null;
  activeDistrict: CityDistrict | null;
  districtBboxHint: { width: number; height: number } | null;
  sectorsLocked: boolean;
  sectorCount: number;
  sectorWidth: number;
  sectorHeight: number;
  sectorBusy: boolean;
  sectorConfirmPending: boolean;
  sectorPreview: DivideDistrictResult | null;
  lastDivideResult: DivideDistrictResult | null;
  setSectorWidth: Dispatch<SetStateAction<number>>;
  setSectorHeight: Dispatch<SetStateAction<number>>;
  setSectorConfirmPending: Dispatch<SetStateAction<boolean>>;
  setSectorBusy: Dispatch<SetStateAction<boolean>>;
  setLastDivideResult: Dispatch<SetStateAction<DivideDistrictResult | null>>;
  onSelectDistrict: (id: CityDistrictId | null) => void;
  onColorChange: (id: CityDistrictId, color: string) => void;
  onHoverOpacityChange: (id: CityDistrictId, opacity: number) => void;
  onDivideSectors: (cellSize: SectorCellSize) => DivideDistrictResult | null;
}) {
  return (
    <>
      <p className="mb-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
        Viertel wählen
      </p>
      <ul className="mb-4 max-h-36 space-y-1 overflow-y-auto">
        {AURENFURT_DISTRICTS.map((district) => {
          const selected = editingDistrictId === district.id;
          return (
            <li key={district.id}>
              <button
                type="button"
                onClick={() => onSelectDistrict(selected ? null : district.id)}
                className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                  selected
                    ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                    : "border-hero-dark/60 bg-slate-900/40 text-gray-200 hover:border-hero-border"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-hero-border/50"
                  style={{ backgroundColor: polygons[district.id].color }}
                  aria-hidden
                />
                <span className="font-barlow text-xs font-bold uppercase tracking-wide">{district.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {active && activeDistrict ? (
        <div className="mb-4 space-y-3 border-t border-hero-border/60 pt-3">
          <p className="font-cinzel text-sm font-bold text-accent-gold">{activeDistrict.name}</p>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Farbe der Fläche
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeColorInput(active.color)}
                onChange={(event) => onColorChange(activeDistrict.id, event.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-hero-dark bg-slate-900 p-1"
                aria-label="Flächenfarbe"
              />
              <div className="flex flex-wrap gap-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    title={preset}
                    onClick={() => onColorChange(activeDistrict.id, preset)}
                    className={`h-5 w-5 rounded-sm border transition-transform ${
                      active.color.toLowerCase() === preset.toLowerCase()
                        ? "border-accent-gold scale-110"
                        : "border-hero-dark/70 hover:border-hero-border"
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Transparenz beim Hover
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(active.hoverOpacity * 100)}
                onChange={(event) =>
                  onHoverOpacityChange(activeDistrict.id, Number(event.target.value) / 100)
                }
                className="h-2 w-full accent-hero-vibrant"
              />
              <span className="w-10 shrink-0 text-right font-libre text-xs text-gray-300">
                {Math.round(active.hoverOpacity * 100)}%
              </span>
            </div>
            <p className="font-libre text-[11px] text-gray-500">0 % unsichtbar · 100 % voll sichtbar</p>
          </label>

          <div className="space-y-2 border-t border-hero-border/40 pt-3">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Sektoren
            </p>
            <p className="font-libre text-[11px] text-gray-500">
              Feste Rechtecke in Karten-Einheiten (UV, wie die Viertel-Polygone). Adresse z.&nbsp;B.{" "}
              <span className="text-accent-gold">{activeDistrict.name} E19</span>.
            </p>
            {districtBboxHint ? (
              <p className="font-libre text-[11px] text-gray-500">
                Dieses Viertel misst ca. {districtBboxHint.width.toFixed(3)} ×{" "}
                {districtBboxHint.height.toFixed(3)} Karten-Einheiten — Werte wie 20 wären größer als
                die Stadt; sinnvoll sind eher 0,02–0,08.
              </p>
            ) : null}
            {!sectorsLocked ? (
              <p className="rounded border border-amber-500/50 bg-amber-950/40 px-2 py-1.5 font-libre text-[11px] leading-snug text-amber-200">
                Einmal gespeichert, lassen sich Größe und Einteilung nicht mehr ändern oder löschen.
              </p>
            ) : (
              <p className="rounded border border-hero-border/50 bg-slate-900/50 px-2 py-1.5 font-libre text-[11px] leading-snug text-gray-300">
                Gespeichert und gesperrt: {sectorCount} Sektoren. Größe und Einteilung lassen sich
                nicht mehr ändern oder löschen.
              </p>
            )}
            <SectorSizeField
              label="Breite (Karten-Einheiten)"
              value={sectorWidth}
              disabled={sectorsLocked || sectorBusy}
              onChange={(next) => {
                const clamped = clampSectorSize(next);
                setSectorWidth(clamped);
                setSectorHeight((prev) =>
                  Math.abs(prev - sectorWidth) < SECTOR_SIZE_STEP / 2 ? clamped : prev,
                );
                setSectorConfirmPending(false);
              }}
            />
            <SectorSizeField
              label="Höhe (Karten-Einheiten)"
              value={sectorHeight}
              disabled={sectorsLocked || sectorBusy}
              onChange={(next) => {
                setSectorHeight(clampSectorSize(next));
                setSectorConfirmPending(false);
              }}
            />
            {!sectorsLocked && sectorPreview ? (
              <p className="font-libre text-[11px] text-accent-gold" role="status">
                Vorschau: {sectorPreview.actual} Sektoren
                {" · "}
                Raster {sectorPreview.cols}×{sectorPreview.rows}
                {sectorPreview.truncated ? " · Limit erreicht, vergrößere die Zellen" : ""}
                {" · noch nicht gespeichert"}
              </p>
            ) : null}
            {lastDivideResult ? (
              <p className="font-libre text-[11px] text-accent-gold" role="status">
                Gespeichert: {lastDivideResult.actual} Sektoren · Zellen{" "}
                {lastDivideResult.cellWidth.toFixed(3)}×{lastDivideResult.cellHeight.toFixed(3)}.
              </p>
            ) : null}
            {!sectorsLocked ? (
              sectorConfirmPending ? (
                <div className="space-y-2">
                  <p className="font-libre text-[11px] leading-snug text-amber-200">
                    Endgültig speichern? Danach sind Größe und Einteilung für dieses Viertel
                    unveränderlich.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={sectorBusy || !sectorPreview || sectorPreview.actual === 0}
                      onClick={() => {
                        setSectorBusy(true);
                        window.setTimeout(() => {
                          try {
                            const result = onDivideSectors({
                              width: sectorWidth,
                              height: sectorHeight,
                            });
                            if (result) setLastDivideResult(result);
                            setSectorConfirmPending(false);
                          } finally {
                            setSectorBusy(false);
                          }
                        }, 0);
                      }}
                      className="flex-1 rounded border border-accent-gold bg-accent-gold/20 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
                    >
                      {sectorBusy ? "Speichere…" : "Endgültig speichern"}
                    </button>
                    <button
                      type="button"
                      disabled={sectorBusy}
                      onClick={() => setSectorConfirmPending(false)}
                      className="rounded border border-hero-dark px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-gray-400"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={sectorBusy || !sectorPreview || sectorPreview.actual === 0}
                  onClick={() => setSectorConfirmPending(true)}
                  className="w-full rounded border border-accent-gold/70 bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-40"
                >
                  Endgültig speichern
                </button>
              )
            ) : null}
          </div>

          <p className="font-libre text-xs text-gray-400">
            Ziehpunkte nur an diesem Viertel. Orbit ist beim Ziehen aus.
          </p>
        </div>
      ) : null}
    </>
  );
}

function SectorSizeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={SECTOR_SIZE_MIN}
          max={SECTOR_SIZE_MAX}
          step={SECTOR_SIZE_STEP}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full accent-hero-vibrant disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="number"
          min={SECTOR_SIZE_MIN}
          max={SECTOR_SIZE_MAX}
          step={SECTOR_SIZE_STEP}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-16 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </label>
  );
}

function normalizeColorInput(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#cab926";
}
