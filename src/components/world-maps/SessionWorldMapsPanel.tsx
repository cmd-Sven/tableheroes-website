"use client";

import { useState, useTransition } from "react";
import { Globe2, Loader2, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import {
  attachWorldMapToSession,
  detachWorldMapFromSession,
  setActiveWorldMap,
} from "@/src/lib/actions/world-map-actions";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";

type Props = {
  sessionId: string;
  availableMaps: WorldMap[];
  attached: SessionWorldMap[];
  activeWorldMapId?: string | null;
  onActiveChange?: (id: string | null) => void;
};

/** Session-Prep / Live-Toolbar: Weltkarten anhängen und Force-View. */
export function SessionWorldMapsPanel({
  sessionId,
  availableMaps,
  attached: initialAttached,
  activeWorldMapId = null,
  onActiveChange,
}: Props) {
  const [attached, setAttached] = useState(initialAttached);
  const [pending, startTransition] = useTransition();
  const attachedIds = new Set(attached.map((a) => a.world_map_id));

  function toggleAttach(map: WorldMap) {
    startTransition(async () => {
      try {
        if (attachedIds.has(map.id)) {
          await detachWorldMapFromSession(sessionId, map.id);
          setAttached((prev) => prev.filter((a) => a.world_map_id !== map.id));
          if (activeWorldMapId === map.id) {
            await setActiveWorldMap(sessionId, null);
            onActiveChange?.(null);
          }
          toast.success("Weltkarte von Session entfernt.");
        } else {
          const link = await attachWorldMapToSession({
            sessionId,
            worldMapId: map.id,
          });
          setAttached((prev) => [...prev, link]);
          toast.success("Weltkarte der Session hinzugefügt.");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fehler.");
      }
    });
  }

  function forceView(mapId: string | null) {
    startTransition(async () => {
      try {
        await setActiveWorldMap(sessionId, mapId);
        onActiveChange?.(mapId);
        toast.success(
          mapId
            ? "Spieler auf Weltkarte geschoben."
            : "Weltkarten-Ansicht beendet.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Force-View fehlgeschlagen.");
      }
    });
  }

  if (availableMaps.length === 0) {
    return (
      <p className="text-sm text-gray-500 font-libre italic">
        Noch keine Weltkarten in dieser Welt. Lege sie im Welt-Editor unter „Weltkarten“ an.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-barlow text-sm font-bold uppercase text-hero-vibrant">
        <Globe2 className="h-4 w-4" />
        Weltkarten
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
      <ul className="space-y-2">
        {availableMaps.map((m) => {
          const isAttached = attachedIds.has(m.id);
          const isActive = activeWorldMapId === m.id;
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-2 rounded border border-hero-border/30 bg-background-dark px-3 py-2"
            >
              <span className="font-libre text-sm text-gray-200 flex-1 min-w-[8rem]">
                {m.title}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggleAttach(m)}
                className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                  isAttached
                    ? "border border-hero-vibrant text-hero-vibrant"
                    : "bg-hero-dark text-gray-300"
                }`}
              >
                {isAttached ? "Angehängt" : "Anhängen"}
              </button>
              {isAttached && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => forceView(isActive ? null : m.id)}
                  className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                    isActive
                      ? "bg-hero-vibrant text-black"
                      : "border border-accent-gold text-accent-gold"
                  }`}
                >
                  {isActive ? "Ansicht beenden" : "Zur Karte schieben"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {activeWorldMapId && (
        <button
          type="button"
          disabled={pending}
          onClick={() => forceView(null)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
        >
          <MapPinOff className="h-3.5 w-3.5" />
          Weltkarten-Force-View schließen
        </button>
      )}
    </div>
  );
}
