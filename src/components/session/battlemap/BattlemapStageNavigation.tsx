/**
 * BattlemapStageNavigation — Pan pad and zoom controls for the battlemap viewport.
 */
"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";

type Props = {
  panBy: (dx: number, dy: number) => void;
  applyFitView: () => void;
  zoomByFactor: (factor: number) => void;
  viewScale: number;
  fitScale: number;
};

export function BattlemapStageNavigation({
  panBy,
  applyFitView,
  zoomByFactor,
  viewScale,
  fitScale,
}: Props) {
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[55] flex flex-col gap-2">
      <div className="rounded-xl border border-hero-border/70 bg-background-card/95 p-1 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-3 gap-0.5">
          <span className="h-9 w-9" aria-hidden />
          <button
            type="button"
            title="Nach oben"
            onClick={() => panBy(0, 120)}
            className="grid h-9 w-9 place-items-center rounded-md border border-hero-border/40 text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="h-9 w-9" aria-hidden />
          <button
            type="button"
            title="Nach links"
            onClick={() => panBy(120, 0)}
            className="grid h-9 w-9 place-items-center rounded-md border border-hero-border/40 text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Einpassen"
            onClick={() => applyFitView()}
            className="grid h-9 w-9 place-items-center rounded-md border border-accent-gold/40 text-accent-gold hover:bg-accent-gold/10"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Nach rechts"
            onClick={() => panBy(-120, 0)}
            className="grid h-9 w-9 place-items-center rounded-md border border-hero-border/40 text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="h-9 w-9" aria-hidden />
          <button
            type="button"
            title="Nach unten"
            onClick={() => panBy(0, -120)}
            className="grid h-9 w-9 place-items-center rounded-md border border-hero-border/40 text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="h-9 w-9" aria-hidden />
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-hero-border/70 bg-background-card/95 shadow-xl backdrop-blur-md">
        <button
          type="button"
          title="Vergrößern"
          onClick={() => zoomByFactor(1.25)}
          className="grid h-9 w-full place-items-center border-b border-hero-border/40 text-gray-200 hover:bg-hero-vibrant/10 hover:text-hero-vibrant"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div
          className="px-2 py-1.5 text-center font-barlow text-[11px] font-bold tabular-nums text-accent-gold"
          title="Zoom relativ zur Einpassung (100 % = ganze Karte sichtbar)"
        >
          {Math.max(1, Math.round((viewScale / Math.max(fitScale, 0.0001)) * 100))}%
        </div>
        <button
          type="button"
          title="Verkleinern"
          onClick={() => zoomByFactor(1 / 1.25)}
          className="grid h-9 w-full place-items-center border-t border-hero-border/40 text-gray-200 hover:bg-hero-vibrant/10 hover:text-hero-vibrant"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
