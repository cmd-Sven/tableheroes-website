"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  WALL_BRIGHTNESS_MAX,
  WALL_BRIGHTNESS_MIN,
  WALL_CURVE_MAX,
  WALL_CURVE_MIN,
  WALL_HEIGHT_MAX,
  WALL_HEIGHT_MIN,
  WALL_MERLON_COUNT_MAX,
  WALL_MERLON_COUNT_MIN,
  WALL_MERLON_SIZE_MAX,
  WALL_MERLON_SIZE_MIN,
  WALL_TEXTURE_SCALE_MAX,
  WALL_TEXTURE_SCALE_MIN,
  WALL_THICKNESS_MAX,
  WALL_THICKNESS_MIN,
  type AurenfurtWall,
} from "./aurenfurt-walls";

type Draft = {
  name: string;
  curve: number;
  height: number;
  thickness: number;
  textureScale: number;
  brightness: number;
  merlonCount: number;
  merlonSize: number;
};

type Props = {
  walls: AurenfurtWall[];
  saved: boolean;
  ready: boolean;
  saveError: string | null;
  editingWallId: string | null;
  drawing: boolean;
  draftReady: boolean;
  draftPointCount: number;
  draft: Draft;
  onDraftChange: (patch: Partial<Draft>) => void;
  onStartDraw: () => void;
  onCancelDraw: () => void;
  onFinishLine: () => void;
  onConfirmWall: () => void;
  onSelectWall: (id: string | null) => void;
  onUpdateWall: (id: string, patch: Partial<Omit<AurenfurtWall, "id">>) => void;
  onRemoveWall: (id: string) => void;
  onClose: () => void;
};

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  digits = 2,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  digits?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex justify-between font-barlow text-xs font-bold uppercase tracking-wide text-gray-300">
        {label}
        <span className="text-accent-gold">{value.toFixed(digits)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#cab926]"
      />
    </label>
  );
}

function AppearanceSliders({
  textureScale,
  brightness,
  merlonCount,
  merlonSize,
  onChange,
}: {
  textureScale: number;
  brightness: number;
  merlonCount: number;
  merlonSize: number;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <>
      <SliderRow
        label="Texturgröße"
        min={WALL_TEXTURE_SCALE_MIN}
        max={WALL_TEXTURE_SCALE_MAX}
        step={0.005}
        value={textureScale}
        onChange={(next) => onChange({ textureScale: next })}
      />
      <SliderRow
        label="Helligkeit"
        min={WALL_BRIGHTNESS_MIN}
        max={WALL_BRIGHTNESS_MAX}
        step={0.01}
        value={brightness}
        onChange={(next) => onChange({ brightness: next })}
      />
      <SliderRow
        label="Anzahl Zinnen"
        min={WALL_MERLON_COUNT_MIN}
        max={WALL_MERLON_COUNT_MAX}
        step={1}
        digits={0}
        value={merlonCount}
        onChange={(next) => onChange({ merlonCount: Math.round(next) })}
      />
      <SliderRow
        label="Zinnengröße"
        min={WALL_MERLON_SIZE_MIN}
        max={WALL_MERLON_SIZE_MAX}
        step={0.01}
        value={merlonSize}
        onChange={(next) => onChange({ merlonSize: next })}
      />
    </>
  );
}

export function WallEditorPanel({
  walls,
  saved,
  ready,
  saveError,
  editingWallId,
  drawing,
  draftReady,
  draftPointCount,
  draft,
  onDraftChange,
  onStartDraw,
  onCancelDraw,
  onFinishLine,
  onConfirmWall,
  onSelectWall,
  onUpdateWall,
  onRemoveWall,
  onClose,
}: Props) {
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const selected = walls.find((wall) => wall.id === editingWallId) ?? null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed right-14 top-1/2 z-[410] max-h-[90vh] w-80 -translate-y-1/2 overflow-y-auto rounded-md border border-hero-dark bg-background-card p-4 shadow-lg"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-hero-border pb-2">
        <div>
          <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">Stadtmauern</p>
          <p className={`font-libre text-xs ${saveError ? "text-red-300" : "text-gray-400"}`}>
            {saveError
              ? saveError
              : !ready
                ? "Wird aus der Datenbank geladen."
                : saved
                  ? "In der Datenbank gespeichert."
                  : "Noch nicht in der Datenbank."}{" "}
            Nur optisch auf der Karte.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-barlow text-xs font-bold uppercase text-gray-400 transition-colors hover:text-accent-gold"
        >
          Schließen
        </button>
      </div>

      {!drawing && !draftReady ? (
        <button
          type="button"
          onClick={onStartDraw}
          className="mb-4 w-full border border-accent-gold bg-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
        >
          Mauer zeichnen
        </button>
      ) : null}

      {drawing || draftReady ? (
        <div className="mb-4 border border-hero-border p-3">
          <p className="mb-2 font-libre text-xs leading-relaxed text-gray-200">
            {drawing
              ? "Klicke Punkte auf der Karte. Doppelklick oder „Linie fertig“ schließt den Zug."
              : `${draftPointCount} Punkte. Passe Kurve, Höhe und Dicke an, dann erstelle die Mauer.`}
          </p>
          <label className="mb-3 block">
            <span className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-gray-300">
              Bezeichnung
            </span>
            <input
              value={draft.name}
              onChange={(event) => onDraftChange({ name: event.target.value })}
              className="w-full border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </label>
          <SliderRow
            label="Kurvenneigung"
            min={WALL_CURVE_MIN}
            max={WALL_CURVE_MAX}
            step={0.01}
            value={draft.curve}
            onChange={(curve) => onDraftChange({ curve })}
          />
          <SliderRow
            label="Höhe"
            min={WALL_HEIGHT_MIN}
            max={WALL_HEIGHT_MAX}
            step={0.01}
            value={draft.height}
            onChange={(height) => onDraftChange({ height })}
          />
          <SliderRow
            label="Dicke"
            min={WALL_THICKNESS_MIN}
            max={WALL_THICKNESS_MAX}
            step={0.005}
            value={draft.thickness}
            onChange={(thickness) => onDraftChange({ thickness })}
          />
          <AppearanceSliders
            textureScale={draft.textureScale}
            brightness={draft.brightness}
            merlonCount={draft.merlonCount}
            merlonSize={draft.merlonSize}
            onChange={onDraftChange}
          />
          <div className="flex gap-2">
            {drawing ? (
              <button
                type="button"
                disabled={draftPointCount < 2}
                onClick={onFinishLine}
                className="flex-1 border border-hero-vibrant px-2 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                Linie fertig
              </button>
            ) : (
              <button
                type="button"
                disabled={draftPointCount < 2}
                onClick={onConfirmWall}
                className="flex-1 border border-hero-vibrant px-2 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                Mauer erstellen
              </button>
            )}
            <button
              type="button"
              onClick={onCancelDraw}
              className="border border-hero-dark px-2 py-1.5 font-barlow text-xs font-bold uppercase text-gray-300"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      <p className="mb-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-400">Abschnitte</p>
      <ul className="space-y-1">
        {walls.length === 0 ? (
          <li className="font-libre text-xs text-gray-400">Noch keine Mauer.</li>
        ) : (
          walls.map((wall) => (
            <li key={wall.id}>
              <button
                type="button"
                onClick={() => onSelectWall(wall.id === editingWallId ? null : wall.id)}
                className={`w-full border px-2 py-1.5 text-left font-libre text-sm ${
                  wall.id === editingWallId
                    ? "border-accent-gold text-accent-gold"
                    : "border-hero-dark text-gray-200"
                }`}
              >
                {wall.name}
              </button>
            </li>
          ))
        )}
      </ul>

      {selected ? (
        <div className="mt-4 border-t border-hero-border pt-3">
          <label className="mb-3 block">
            <span className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-gray-300">
              Bezeichnung
            </span>
            <input
              value={selected.name}
              onChange={(event) => onUpdateWall(selected.id, { name: event.target.value })}
              className="w-full border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </label>
          <SliderRow
            label="Kurvenneigung"
            min={WALL_CURVE_MIN}
            max={WALL_CURVE_MAX}
            step={0.01}
            value={selected.curve}
            onChange={(curve) => onUpdateWall(selected.id, { curve })}
          />
          <SliderRow
            label="Höhe"
            min={WALL_HEIGHT_MIN}
            max={WALL_HEIGHT_MAX}
            step={0.01}
            value={selected.height}
            onChange={(height) => onUpdateWall(selected.id, { height })}
          />
          <SliderRow
            label="Dicke"
            min={WALL_THICKNESS_MIN}
            max={WALL_THICKNESS_MAX}
            step={0.005}
            value={selected.thickness}
            onChange={(thickness) => onUpdateWall(selected.id, { thickness })}
          />
          <AppearanceSliders
            textureScale={selected.textureScale}
            brightness={selected.brightness}
            merlonCount={selected.merlonCount}
            merlonSize={selected.merlonSize}
            onChange={(patch) => onUpdateWall(selected.id, patch)}
          />
          <p className="mb-3 font-libre text-xs text-gray-400">
            Ziehe die goldenen Punkte auf der Karte, um den Verlauf zu ändern.
          </p>
          <button
            type="button"
            onClick={() => {
              if (armedDelete === selected.id) {
                onRemoveWall(selected.id);
                setArmedDelete(null);
                return;
              }
              setArmedDelete(selected.id);
            }}
            className="font-barlow text-xs font-bold uppercase text-red-300"
          >
            {armedDelete === selected.id ? "Wirklich entfernen" : "Abschnitt entfernen"}
          </button>
        </div>
      ) : null}
    </motion.aside>
  );
}
