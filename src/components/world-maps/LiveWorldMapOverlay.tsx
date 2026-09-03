/**
 * LiveWorldMapOverlay — Fullscreen world map in live session with draw/POI/group token.
 */
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import {
  clearWorldMapMarkers,
  deleteWorldMapMarker,
  getWorldMap,
  getWorldMapMarkers,
} from "@/src/lib/actions/world-map-actions";
import {
  clearWorldMapEffectMarkers,
  clearWorldMapEffectTemplates,
  clearWorldMapFogShapes,
  createWorldMapEffectMarker,
  createWorldMapEffectTemplate,
  createWorldMapFogShape,
  listWorldMapEffectMarkers,
  listWorldMapEffectTemplates,
  listWorldMapFogShapes,
  removeWorldMapEffectMarker,
  removeWorldMapEffectTemplate,
  removeWorldMapFogShape,
} from "@/src/lib/actions/world-map-live-actions";
import {
  clearMapDrawStrokes,
  createMapDrawStroke,
  listMapDrawStrokes,
  undoLastMapDrawStroke,
} from "@/src/lib/actions/map-draw-actions";
import type { WorldMap, WorldMapMarker, WorldMapPoiTool } from "@/src/lib/world-maps/types";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";
import type { MapDrawTool, SessionMapDrawStroke } from "@/src/lib/session/map-draw-types";
import { WorldMapLiveStage } from "@/src/components/world-maps/WorldMapLiveStage";
import { WeatherPngIcon } from "@/src/components/session/live-board/WeatherPngIcon";
import type { WeatherIconOption } from "@/src/components/session/live-board/live-session-types";

type Props = {
  worldMapId: string;
  worldId: string;
  campaignId: string;
  sessionId: string;
  isGm: boolean;
  weatherVisual?: WeatherIconOption | null;
  temperatureValue?: number | null;
  fogTool?: BattlemapFogTool;
  effectTool?: BattlemapEffectTool;
  markerTool?: BattlemapMarkerTool;
  drawTool?: MapDrawTool;
  drawColor?: string;
  drawWidth?: number;
  poiTool?: WorldMapPoiTool;
  selectedPoiId?: string | null;
  onSelectedPoiIdChange?: (id: string | null) => void;
  onClose?: () => void;
  onFogCountChange?: (n: number) => void;
  onEffectCountChange?: (n: number) => void;
  onMarkerCountChange?: (n: number) => void;
  onPoiCountChange?: (n: number) => void;
  onDrawCountChange?: (n: number) => void;
  fogClearRequest?: number;
  effectClearRequest?: number;
  markerClearRequest?: number;
  poiClearRequest?: number;
  poiDeleteRequest?: number;
  drawUndoRequest?: number;
  drawClearRequest?: number;
};

export function LiveWorldMapOverlay({
  worldMapId,
  worldId,
  campaignId,
  sessionId,
  isGm,
  weatherVisual = null,
  temperatureValue = null,
  fogTool = null,
  effectTool = null,
  markerTool = null,
  drawTool = null,
  drawColor = "#cab926",
  drawWidth = 4,
  poiTool = null,
  selectedPoiId = null,
  onSelectedPoiIdChange,
  onClose,
  onFogCountChange,
  onEffectCountChange,
  onMarkerCountChange,
  onPoiCountChange,
  onDrawCountChange,
  fogClearRequest = 0,
  effectClearRequest = 0,
  markerClearRequest = 0,
  poiClearRequest = 0,
  poiDeleteRequest = 0,
  drawUndoRequest = 0,
  drawClearRequest = 0,
}: Props) {
  const [map, setMap] = useState<WorldMap | null>(null);
  const [markers, setMarkers] = useState<WorldMapMarker[]>([]);
  const [fogShapes, setFogShapes] = useState<SessionBattlemapFogShape[]>([]);
  const [effectTemplates, setEffectTemplates] = useState<SessionBattlemapEffectTemplate[]>([]);
  const [effectMarkers, setEffectMarkers] = useState<SessionBattlemapMarker[]>([]);
  const [drawStrokes, setDrawStrokes] = useState<SessionMapDrawStroke[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const supabase = useRef(createClient()).current;
  const selectedPoiIdRef = useRef(selectedPoiId);
  selectedPoiIdRef.current = selectedPoiId;

  const syncPoiCount = useCallback(
    (list: WorldMapMarker[]) => {
      onPoiCountChange?.(list.length);
    },
    [onPoiCountChange],
  );

  const reloadOverlays = useCallback(async () => {
    const [fog, effects, marks, strokes] = await Promise.all([
      listWorldMapFogShapes(worldMapId, sessionId),
      listWorldMapEffectTemplates(worldMapId, sessionId),
      listWorldMapEffectMarkers(worldMapId, sessionId),
      listMapDrawStrokes({ sessionId, worldMapId }),
    ]);
    setFogShapes(fog);
    setEffectTemplates(effects);
    setEffectMarkers(marks);
    setDrawStrokes(strokes);
    onFogCountChange?.(fog.length);
    onEffectCountChange?.(effects.length);
    onMarkerCountChange?.(marks.length);
    onDrawCountChange?.(strokes.length);
  }, [
    worldMapId,
    sessionId,
    onFogCountChange,
    onEffectCountChange,
    onMarkerCountChange,
    onDrawCountChange,
  ]);

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
        syncPoiCount(mk);
        await reloadOverlays();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [worldMapId, reloadOverlays, syncPoiCount]);

  // Realtime: map + markers + overlays
  useEffect(() => {
    const channel = supabase
      .channel(`world_map_live_${worldMapId}_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "world_maps", filter: `id=eq.${worldMapId}` },
        (payload) => {
          if (payload.new) {
            void getWorldMap(worldMapId).then((m) => m && setMap(m));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "world_map_markers",
          filter: `world_map_id=eq.${worldMapId}`,
        },
        () => {
          void getWorldMapMarkers(worldMapId).then((mk) => {
            setMarkers(mk);
            syncPoiCount(mk);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_world_map_fog_shapes",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void listWorldMapFogShapes(worldMapId, sessionId).then((fog) => {
            setFogShapes(fog);
            onFogCountChange?.(fog.length);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_world_map_effect_templates",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void listWorldMapEffectTemplates(worldMapId, sessionId).then((fx) => {
            setEffectTemplates(fx);
            onEffectCountChange?.(fx.length);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_world_map_effect_markers",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void listWorldMapEffectMarkers(worldMapId, sessionId).then((mk) => {
            setEffectMarkers(mk);
            onMarkerCountChange?.(mk.length);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_map_draw_strokes",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void listMapDrawStrokes({ sessionId, worldMapId }).then((st) => {
            setDrawStrokes(st);
            onDrawCountChange?.(st.length);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    worldMapId,
    sessionId,
    onFogCountChange,
    onEffectCountChange,
    onMarkerCountChange,
    onDrawCountChange,
    syncPoiCount,
  ]);

  useEffect(() => {
    if (!isGm || fogClearRequest <= 0) return;
    startTransition(async () => {
      try {
        await clearWorldMapFogShapes(worldMapId, sessionId);
        setFogShapes([]);
        onFogCountChange?.(0);
        toast.success("Fog of War gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [fogClearRequest, isGm, worldMapId, sessionId, onFogCountChange]);

  useEffect(() => {
    if (!isGm || effectClearRequest <= 0) return;
    startTransition(async () => {
      try {
        await clearWorldMapEffectTemplates(worldMapId, sessionId);
        setEffectTemplates([]);
        onEffectCountChange?.(0);
        toast.success("Effekt-Schablonen gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [effectClearRequest, isGm, worldMapId, sessionId, onEffectCountChange]);

  useEffect(() => {
    if (!isGm || markerClearRequest <= 0) return;
    startTransition(async () => {
      try {
        await clearWorldMapEffectMarkers(worldMapId, sessionId);
        setEffectMarkers([]);
        onMarkerCountChange?.(0);
        toast.success("Spezialeffekte gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [markerClearRequest, isGm, worldMapId, sessionId, onMarkerCountChange]);

  useEffect(() => {
    if (!isGm || poiClearRequest <= 0) return;
    startTransition(async () => {
      try {
        await clearWorldMapMarkers(worldMapId, worldId);
        setMarkers([]);
        syncPoiCount([]);
        onSelectedPoiIdChange?.(null);
        toast.success("Alle POIs gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [
    poiClearRequest,
    isGm,
    worldMapId,
    worldId,
    syncPoiCount,
    onSelectedPoiIdChange,
  ]);

  useEffect(() => {
    if (!isGm || poiDeleteRequest <= 0) return;
    const id = selectedPoiIdRef.current;
    if (!id) return;
    startTransition(async () => {
      try {
        await deleteWorldMapMarker(id, worldMapId, worldId);
        setMarkers((prev) => {
          const next = prev.filter((m) => m.id !== id);
          queueMicrotask(() => syncPoiCount(next));
          return next;
        });
        onSelectedPoiIdChange?.(null);
        toast.success("POI gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [
    poiDeleteRequest,
    isGm,
    worldMapId,
    worldId,
    syncPoiCount,
    onSelectedPoiIdChange,
  ]);

  useEffect(() => {
    if (!isGm || drawUndoRequest <= 0) return;
    startTransition(async () => {
      try {
        const id = await undoLastMapDrawStroke({ sessionId, worldMapId });
        if (!id) {
          toast.message("Keine Zeichnung zum Rückgängigmachen.");
          return;
        }
        setDrawStrokes((prev) => {
          const next = prev.filter((s) => s.id !== id);
          queueMicrotask(() => onDrawCountChange?.(next.length));
          return next;
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rückgängig fehlgeschlagen.");
      }
    });
  }, [drawUndoRequest, isGm, sessionId, worldMapId, onDrawCountChange]);

  useEffect(() => {
    if (!isGm || drawClearRequest <= 0) return;
    startTransition(async () => {
      try {
        await clearMapDrawStrokes({ sessionId, worldMapId });
        setDrawStrokes([]);
        onDrawCountChange?.(0);
        toast.success("Alle Zeichnungen gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [drawClearRequest, isGm, sessionId, worldMapId, onDrawCountChange]);

  return (
    <div className="absolute inset-0 z-[45] flex flex-col bg-black/95 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
          <div className="font-barlow text-sm font-bold uppercase text-hero-vibrant">
            {map?.title ?? "Weltkarte"}
          </div>
          {weatherVisual ? (
            <div
              className="inline-flex items-center gap-2 rounded-lg border border-accent-gold/50 bg-black/75 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
              title={`${weatherVisual.label} · ${temperatureValue ?? "—"} °C`}
            >
              <span className="relative block h-9 w-9 shrink-0 drop-shadow-[0_0_12px_rgba(202,185,38,0.4)]">
                <WeatherPngIcon option={weatherVisual} sizeClassName="h-full w-full" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
                  {weatherVisual.label}
                </span>
                <span className="font-barlow text-lg font-extrabold tabular-nums text-white">
                  {temperatureValue != null ? `${temperatureValue} °C` : "— °C"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        {isGm && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-hero-border px-2 py-1 text-xs text-gray-300 hover:text-white"
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
        <div className="min-h-0 flex-1 overflow-hidden">
          <WorldMapLiveStage
            map={map}
            markers={markers}
            worldId={worldId}
            campaignId={campaignId}
            sessionId={sessionId}
            isGm={isGm}
            fogShapes={fogShapes}
            effectTemplates={effectTemplates}
            effectMarkers={effectMarkers}
            drawStrokes={drawStrokes}
            fogTool={isGm ? fogTool : null}
            effectTool={isGm ? effectTool : null}
            markerTool={isGm ? markerTool : null}
            drawTool={isGm ? drawTool : null}
            drawColor={drawColor}
            drawWidth={drawWidth}
            poiTool={isGm ? poiTool : null}
            selectedPoiId={selectedPoiId}
            onSelectedPoiIdChange={onSelectedPoiIdChange}
            onMapChange={setMap}
            onMarkersChange={(next) => {
              setMarkers(next);
              syncPoiCount(next);
            }}
            onFogCreate={(input) => {
              startTransition(async () => {
                try {
                  const created = await createWorldMapFogShape({
                    sessionId,
                    worldMapId,
                    ...input,
                  });
                  setFogShapes((prev) => {
                    const next = [...prev, created];
                    queueMicrotask(() => onFogCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Fog fehlgeschlagen.");
                }
              });
            }}
            onFogDelete={(id) => {
              startTransition(async () => {
                try {
                  await removeWorldMapFogShape(id, sessionId);
                  setFogShapes((prev) => {
                    const next = prev.filter((s) => s.id !== id);
                    queueMicrotask(() => onFogCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                }
              });
            }}
            onEffectCreate={(input) => {
              startTransition(async () => {
                try {
                  const created = await createWorldMapEffectTemplate({
                    sessionId,
                    worldMapId,
                    ...input,
                  });
                  setEffectTemplates((prev) => {
                    const next = [...prev, created];
                    queueMicrotask(() => onEffectCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Effekt fehlgeschlagen.");
                }
              });
            }}
            onEffectDelete={(id) => {
              startTransition(async () => {
                try {
                  await removeWorldMapEffectTemplate(id, sessionId);
                  setEffectTemplates((prev) => {
                    const next = prev.filter((s) => s.id !== id);
                    queueMicrotask(() => onEffectCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                }
              });
            }}
            onEffectMarkerCreate={(input) => {
              startTransition(async () => {
                try {
                  const created = await createWorldMapEffectMarker({
                    sessionId,
                    worldMapId,
                    ...input,
                  });
                  setEffectMarkers((prev) => {
                    const next = [...prev, created];
                    queueMicrotask(() => onMarkerCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Marker fehlgeschlagen.");
                }
              });
            }}
            onEffectMarkerDelete={(id) => {
              startTransition(async () => {
                try {
                  await removeWorldMapEffectMarker(id, sessionId);
                  setEffectMarkers((prev) => {
                    const next = prev.filter((s) => s.id !== id);
                    queueMicrotask(() => onMarkerCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                }
              });
            }}
            onDrawStroke={(points) => {
              startTransition(async () => {
                try {
                  const created = await createMapDrawStroke({
                    sessionId,
                    worldMapId,
                    color: drawColor,
                    strokeWidth: drawWidth,
                    points,
                  });
                  setDrawStrokes((prev) => {
                    const next = [...prev, created];
                    queueMicrotask(() => onDrawCountChange?.(next.length));
                    return next;
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Zeichnen fehlgeschlagen.");
                }
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
