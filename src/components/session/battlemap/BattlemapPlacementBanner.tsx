/**
 * BattlemapPlacementBanner — Top banner during token/prop placement with cancel and dash controls.
 */
"use client";

import { Crosshair, X, Zap } from "lucide-react";
import type { CharacterTokenPlacement } from "@/src/lib/session/battlemap-types";

type Props = {
  placementLabel: string | null;
  characterPlacement?: CharacterTokenPlacement | null;
  movementMaxCells: number | null;
  onCancelPlacement?: () => void;
  onToggleDash?: () => void;
};

export function BattlemapPlacementBanner({
  placementLabel,
  characterPlacement,
  movementMaxCells,
  onCancelPlacement,
  onToggleDash,
}: Props) {
  if (!placementLabel) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-1 bg-accent-blood/90 px-4 py-2 text-center shadow-lg">
      <div className="flex items-center justify-center gap-3">
        <Crosshair className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
        <p className="font-barlow text-xs font-bold uppercase text-white">
          {placementLabel} — Zielzelle wählen
        </p>
        {onCancelPlacement ? (
          <button
            type="button"
            onClick={onCancelPlacement}
            className="pointer-events-auto ml-2 rounded border border-white/30 p-1 text-white hover:bg-white/10"
            aria-label="Abbrechen (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="font-libre text-[10px] text-gray-200">
        Esc abbricht · Navigation unten links (Pfeile / Zoom)
      </p>
      {characterPlacement && !characterPlacement.isFirstPlacement && movementMaxCells != null ? (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
            Reichweite: {movementMaxCells} Zellen ({characterPlacement.speedFt} ft
            {characterPlacement.useDash ? ", Dash ×2" : ""})
          </span>
          {onToggleDash ? (
            <button
              type="button"
              onClick={onToggleDash}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-barlow text-[10px] font-bold uppercase ${
                characterPlacement.useDash
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-white/30 text-gray-200 hover:border-accent-gold hover:text-accent-gold"
              }`}
            >
              <Zap className="h-3 w-3" />
              Aktion: Dash
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
