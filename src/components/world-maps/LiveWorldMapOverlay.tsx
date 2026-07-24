"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  getWorldMap,
  getWorldMapMarkers,
} from "@/src/lib/actions/world-map-actions";
import type { WorldMap, WorldMapMarker } from "@/src/lib/world-maps/types";
import { WorldMapEditor } from "@/src/components/world-maps/WorldMapEditor";

type Props = {
  worldMapId: string;
  worldId: string;
  campaignId: string;
  isGm: boolean;
  onClose?: () => void;
};

/**
 * Live-Session Force-View: zeigt die aktive Weltkarte fullscreen-ähnlich.
 * Spieler: view-only (isGm=false). GM kann weiter Markierungen bedienen.
 */
export function LiveWorldMapOverlay({
  worldMapId,
  worldId,
  campaignId,
  isGm,
  onClose,
}: Props) {
  const [map, setMap] = useState<WorldMap | null>(null);
  const [markers, setMarkers] = useState<WorldMapMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, mk] = await Promise.all([
          getWorldMap(worldMapId),
          getWorldMapMarkers(worldMapId),
        ]);
        if (cancelled) return;
        if (!m) {
          setError("Weltkarte nicht gefunden.");
          return;
        }
        setMap(m);
        setMarkers(mk);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [worldMapId]);

  return (
    <div className="absolute inset-0 z-[45] flex flex-col bg-black/95 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-barlow text-sm font-bold uppercase text-hero-vibrant">
          {map?.title ?? "Weltkarte"}
          {!isGm && (
            <span className="ml-2 text-xs font-normal normal-case text-gray-400">
              (Ansicht — SL steuert die Karte)
            </span>
          )}
        </div>
        {isGm && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 text-xs text-gray-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Ansicht beenden
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && !map && (
        <p className="text-sm text-gray-400 font-libre">Lade Weltkarte…</p>
      )}
      {map && (
        <div className="min-h-0 flex-1 overflow-auto">
          <WorldMapEditor
            map={map}
            markers={markers}
            worldId={worldId}
            campaignId={campaignId}
            isGm={isGm}
            linkOptions={{
              lore: [],
              npcs: [],
              factions: [],
              creatures: [],
              quests: [],
            }}
          />
        </div>
      )}
    </div>
  );
}
