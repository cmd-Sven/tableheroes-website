/**
 * WorldMapGridModal — Preview + grid calibration when uploading/editing a world map.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Save, X } from "lucide-react";
import { BattlemapGridOverlay } from "@/src/components/session/battlemap/BattlemapGridOverlay";
import {
  DEFAULT_WORLD_MAP_GRID,
  type WorldMap,
} from "@/src/lib/world-maps/types";
import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";

type GridSliderKey = "cellSizePx" | "originX" | "originY" | "columns" | "rows";

function GridSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
          {label}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            onChange(Math.min(max, Math.max(min, Math.round(v))));
          }}
          className="w-16 rounded border border-hero-border bg-slate-900/80 px-1.5 py-0.5 text-right text-xs text-white"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hero-dark accent-hero-vibrant"
      />
    </label>
  );
}

type Props = {
  open: boolean;
  title: string;
  imageUrl: string;
  initialGrid?: BattlemapGridConfig;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (grid: BattlemapGridConfig) => void;
};

export function WorldMapGridModal({
  open,
  title,
  imageUrl,
  initialGrid,
  confirmLabel = "Raster speichern",
  pending = false,
  onCancel,
  onConfirm,
}: Props) {
  const [gridDraft, setGridDraft] = useState<BattlemapGridConfig>(
    initialGrid ?? DEFAULT_WORLD_MAP_GRID,
  );
  const [previewSize, setPreviewSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (open) {
      setGridDraft(initialGrid ?? DEFAULT_WORLD_MAP_GRID);
      setPreviewSize({ width: 1200, height: 800 });
    }
  }, [open, initialGrid, imageUrl]);

  const sliderDefs = useMemo(() => {
    const maxOriginX = Math.max(0, previewSize.width - 8);
    const maxOriginY = Math.max(0, previewSize.height - 8);
    const maxCell = Math.max(
      8,
      Math.min(200, Math.floor(Math.min(previewSize.width, previewSize.height) / 2)),
    );
    return [
      { key: "cellSizePx" as GridSliderKey, label: "Zellengröße (px)", min: 8, max: maxCell },
      { key: "originX" as GridSliderKey, label: "Versatz X (links)", min: 0, max: maxOriginX },
      { key: "originY" as GridSliderKey, label: "Versatz Y (oben)", min: 0, max: maxOriginY },
      { key: "columns" as GridSliderKey, label: "Spalten", min: 1, max: 120 },
      { key: "rows" as GridSliderKey, label: "Zeilen", min: 1, max: 120 },
    ];
  }, [previewSize.height, previewSize.width]);

  const previewDisplayScale = Math.min(1, 520 / Math.max(previewSize.width, 1));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-hero-border bg-background-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-barlow text-xl font-semibold text-accent-blood border-b border-hero-border pb-2">
              Raster einstellen
            </h2>
            <p className="mt-2 font-libre text-sm text-gray-300">
              {title} — Zellengröße und Versatz so anpassen, dass das Raster zur Karte passt.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-hero-border p-1.5 text-gray-400 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-hero-border bg-black p-2">
          <div
            className="relative mx-auto origin-top"
            style={{
              width: previewSize.width * previewDisplayScale,
              height: previewSize.height * previewDisplayScale,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: previewSize.width,
                height: previewSize.height,
                transform: `scale(${previewDisplayScale})`,
                transformOrigin: "top left",
              }}
            >
              <Image
                src={imageUrl}
                alt={title}
                width={previewSize.width}
                height={previewSize.height}
                unoptimized
                className="block max-h-none max-w-none select-none"
                style={{ width: previewSize.width, height: previewSize.height }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setPreviewSize({
                    width: img.naturalWidth || 1200,
                    height: img.naturalHeight || 800,
                  });
                }}
              />
              <BattlemapGridOverlay
                config={gridDraft}
                mapWidth={previewSize.width}
                mapHeight={previewSize.height}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-lg border border-hero-border/50 bg-background-dark p-3">
          {sliderDefs.map((def) => (
            <GridSlider
              key={def.key}
              label={def.label}
              value={gridDraft[def.key]}
              min={def.min}
              max={def.max}
              onChange={(v) => setGridDraft((prev) => ({ ...prev, [def.key]: v }))}
            />
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-300 font-libre">
          <input
            type="checkbox"
            checked={gridDraft.showGrid}
            onChange={(e) =>
              setGridDraft((prev) => ({ ...prev, showGrid: e.target.checked }))
            }
          />
          Raster auf der Karte anzeigen
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-300"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(gridDraft)}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-black disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convenience: open grid modal for an existing WorldMap */
export type WorldMapGridEditTarget = Pick<WorldMap, "id" | "title" | "image_url" | "grid_config">;
