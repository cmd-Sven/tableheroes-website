"use client";

import { Globe2, X } from "lucide-react";
import { SessionWorldMapsPanel } from "@/src/components/world-maps/SessionWorldMapsPanel";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";

type Props = {
  onClose: () => void;
  sessionId: string;
  availableMaps: WorldMap[];
  attached: SessionWorldMap[];
  activeWorldMapId: string | null;
  onActiveChange?: (id: string | null) => void;
};

export function LiveSessionWorldMapsPanel({
  onClose,
  sessionId,
  availableMaps,
  attached,
  activeWorldMapId,
  onActiveChange,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0 flex items-center gap-2">
          <Globe2 className="h-4 w-4 shrink-0 text-hero-vibrant" />
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
              Weltkarten
            </h2>
            <p className="font-libre text-[10px] text-gray-500">
              Land-, Regions- und Stadtkarten
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Weltkarten-Panel schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <SessionWorldMapsPanel
          sessionId={sessionId}
          availableMaps={availableMaps}
          attached={attached}
          activeWorldMapId={activeWorldMapId}
          onActiveChange={onActiveChange}
        />
      </div>
    </div>
  );
}
