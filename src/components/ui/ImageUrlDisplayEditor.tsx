"use client";

import Image from "next/image";
import {
  DEFAULT_IMAGE_DISPLAY,
  type ImageDisplaySettings,
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";

type Props = {
  value: ImageDisplaySettings;
  onChange: (next: ImageDisplaySettings) => void;
  /** Vorschau-URL (Hauptbild oder Eintrag-URL) */
  previewUrl: string | null | undefined;
  /** z. B. aspect-video oder aspect-[3/4] */
  previewAspectClassName?: string;
  className?: string;
};

export function ImageUrlDisplayEditor({
  value,
  onChange,
  previewUrl,
  previewAspectClassName = "aspect-video",
  className = "",
}: Props) {
  const d = normalizeImageDisplay(value);

  const set = (patch: Partial<ImageDisplaySettings>) => {
    onChange(normalizeImageDisplay({ ...d, ...patch }));
  };

  return (
    <div className={`space-y-4 rounded border border-hero-border/40 bg-slate-900/40 p-4 ${className}`}>
      <p className="font-barlow font-bold text-xs uppercase tracking-wide text-gray-400">
        Bilddarstellung
      </p>

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-200">
          <input
            type="radio"
            name="img-fit"
            checked={d.fit === "cover"}
            onChange={() => set({ fit: "cover" })}
            className="border-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
          />
          Ausschnitt füllen (Cover)
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-200">
          <input
            type="radio"
            name="img-fit"
            checked={d.fit === "contain"}
            onChange={() => set({ fit: "contain" })}
            className="border-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
          />
          Ganzes Bild sichtbar (Contain)
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-libre text-xs text-gray-400">
            Fokus horizontal ({d.posX}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={d.posX}
            onChange={(e) => set({ posX: Number(e.target.value) })}
            className="w-full accent-hero-vibrant"
          />
        </div>
        <div>
          <label className="mb-1 block font-libre text-xs text-gray-400">
            Fokus vertikal ({d.posY}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={d.posY}
            onChange={(e) => set({ posY: Number(e.target.value) })}
            className="w-full accent-hero-vibrant"
          />
        </div>
      </div>

      {d.fit === "contain" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-libre text-xs text-gray-400">Hintergrund (Leerraum)</label>
          <input
            type="color"
            value={d.letterboxColor.length === 7 ? d.letterboxColor : DEFAULT_IMAGE_DISPLAY.letterboxColor}
            onChange={(e) => set({ letterboxColor: e.target.value })}
            className="h-9 w-14 cursor-pointer rounded border border-hero-dark bg-slate-900"
            title="Farbe"
          />
          <input
            type="text"
            value={d.letterboxColor}
            onChange={(e) => set({ letterboxColor: e.target.value })}
            className="w-28 rounded border border-hero-dark bg-slate-900 px-2 py-1 font-mono text-xs text-white outline-none focus:border-accent-gold"
            placeholder="#0a1f10"
            maxLength={7}
          />
        </div>
      )}

      {previewUrl?.trim() ? (
        <div>
          <p className="mb-2 font-libre text-xs text-gray-500">Vorschau</p>
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-md border border-hero-border ${previewAspectClassName}`}
            style={imageDisplayBackdropStyle(d)}
          >
            <Image
              src={previewUrl.trim()}
              alt=""
              fill
              className="select-none"
              style={imageDisplayObjectStyle(d)}
              sizes="(max-width: 768px) 100vw, 448px"
              onError={(e) => {
                e.currentTarget.style.opacity = "0.3";
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
