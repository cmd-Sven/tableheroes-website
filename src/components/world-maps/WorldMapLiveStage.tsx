/**
 * WorldMapLiveStage — Interactive world map for live sessions (markers, FoW, effects, draw).
 */
"use client";

import { useCallback, useMemo, useRef, useState, useTransition, type SyntheticEvent } from "react";
import Image from "next/image";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { BattlemapGridOverlay } from "@/src/components/session/battlemap/BattlemapGridOverlay";
import { BattlemapFogLayer, normalizeFogCircle, normalizeFogRect } from "@/src/components/session/battlemap/BattlemapFogLayer";
import { BattlemapEffectLayer, normalizeEffectCone } from "@/src/components/session/battlemap/BattlemapEffectLayer";
import { BattlemapMarkerLayer } from "@/src/components/session/battlemap/BattlemapMarkerLayer";
import { MapDrawLayer } from "@/src/components/session/map-draw/MapDrawLayer";
import { useMapDrawStroke } from "@/src/components/session/map-draw/useMapDrawStroke";
import { WorldMapGroupToken } from "@/src/components/world-maps/WorldMapGroupToken";
import { WorldMapIcon } from "@/src/lib/world-maps/icons";
import { gridToPixel, pixelToGrid } from "@/src/lib/session/battlemap-grid";
import {
  setWorldMapGroupToken,
  toggleWorldMapMarkerVisibility,
  upsertWorldMapMarker,
} from "@/src/lib/actions/world-map-actions";
import type { WorldMap, WorldMapMarker } from "@/src/lib/world-maps/types";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerKind,
  BattlemapMarkerTool,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";
import type { MapDrawPoint, MapDrawTool, SessionMapDrawStroke } from "@/src/lib/session/map-draw-types";

type Props = {
  map: WorldMap;
  markers: WorldMapMarker[];
  worldId: string;
  campaignId: string;
  sessionId: string;
  isGm: boolean;
  fogShapes: SessionBattlemapFogShape[];
  effectTemplates: SessionBattlemapEffectTemplate[];
  effectMarkers: SessionBattlemapMarker[];
  drawStrokes: SessionMapDrawStroke[];
  fogTool: BattlemapFogTool;
  effectTool: BattlemapEffectTool;
  markerTool: BattlemapMarkerTool;
  drawTool: MapDrawTool;
  drawColor: string;
  drawWidth: number;
  onMapChange: (m: WorldMap) => void;
  onMarkersChange: (m: WorldMapMarker[]) => void;
  onFogCreate: (input: {
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  }) => void;
  onFogDelete: (id: string) => void;
  onEffectCreate: (input: {
    shape: "rect" | "circle" | "cone";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    directionDeg?: number;
  }) => void;
  onEffectDelete: (id: string) => void;
  onEffectMarkerCreate: (input: {
    kind: BattlemapMarkerKind;
    gridX: number;
    gridY: number;
  }) => void;
  onEffectMarkerDelete: (id: string) => void;
  onDrawStroke: (points: MapDrawPoint[]) => void;
};

export function WorldMapLiveStage({
  map,
  markers,
  worldId,
  campaignId: _campaignId,
  sessionId: _sessionId,
  isGm,
  fogShapes,
  effectTemplates,
  effectMarkers,
  drawStrokes,
  fogTool,
  effectTool,
  markerTool,
  drawTool,
  drawColor,
  drawWidth,
  onMapChange,
  onMarkersChange,
  onFogCreate,
  onFogDelete,
  onEffectCreate,
  onEffectDelete,
  onEffectMarkerCreate,
  onEffectMarkerDelete,
  onDrawStroke,
}: Props) {
  const config = map.grid_config;
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });
  const [pending, startTransition] = useTransition();
  const [placePoi, setPlacePoi] = useState(false);
  const [selectedFogId, setSelectedFogId] = useState<string | null>(null);
  const [fogDraft, setFogDraft] = useState<{
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  } | null>(null);
  const fogOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [effectDraft, setEffectDraft] = useState<{
    shape: "rect" | "circle" | "cone";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    directionDeg?: number;
  } | null>(null);
  const effectOriginRef = useRef<{ x: number; y: number } | null>(null);

  const visibleMarkers = useMemo(
    () => (isGm ? markers : markers.filter((m) => m.is_visible_to_players)),
    [isGm, markers],
  );

  const groupPixel =
    map.group_token_grid_x != null && map.group_token_grid_y != null
      ? gridToPixel(map.group_token_grid_x, map.group_token_grid_y, config)
      : null;

  const fogDrawActive = Boolean(isGm && fogTool && fogTool !== "select");
  const effectDrawActive = Boolean(isGm && effectTool && effectTool !== "select");
  const drawActive = Boolean(isGm && drawTool === "draw");

  const { draftPoints, drawHandlers } = useMapDrawStroke({
    enabled: drawActive,
    mapWidth: mapSize.width,
    mapHeight: mapSize.height,
    onStrokeComplete: onDrawStroke,
  });

  const cellFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!mapRef.current) return null;
      const rect = mapRef.current.getBoundingClientRect();
      const px = ((clientX - rect.left) / Math.max(1, rect.width)) * mapSize.width;
      const py = ((clientY - rect.top) / Math.max(1, rect.height)) * mapSize.height;
      return pixelToGrid(px, py, config);
    },
    [config, mapSize.height, mapSize.width],
  );

  const onImgLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setMapSize({
      width: img.naturalWidth || 1200,
      height: img.naturalHeight || 800,
    });
  }, []);

  return (
    <div className="relative h-full overflow-hidden rounded border border-hero-border bg-black">
      {isGm && (
        <div className="absolute left-2 top-2 z-30 flex flex-wrap gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setPlacePoi((v) => !v)}
            className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
              placePoi
                ? "bg-hero-vibrant text-black"
                : "border border-hero-border bg-black/70 text-gray-300"
            }`}
          >
            POI setzen
          </button>
        </div>
      )}
      <div className="absolute right-2 top-2 z-30 flex gap-1">
        <button
          type="button"
          className="rounded bg-black/70 p-1.5 text-white"
          onClick={() => transformRef.current?.zoomIn()}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded bg-black/70 p-1.5 text-white"
          onClick={() => transformRef.current?.zoomOut()}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <TransformWrapper
        ref={transformRef}
        initialScale={0.55}
        minScale={0.15}
        maxScale={4}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        panning={{ disabled: fogDrawActive || effectDrawActive || drawActive || placePoi }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: mapSize.width, height: mapSize.height }}
        >
          <div
            ref={mapRef}
            className="relative"
            style={{
              width: mapSize.width,
              height: mapSize.height,
              cursor: drawActive ? "crosshair" : undefined,
            }}
            onClick={(e) => {
              if (!isGm) return;
              const cell = cellFromClient(e.clientX, e.clientY);
              if (!cell) return;

              if (placePoi) {
                startTransition(async () => {
                  try {
                    const saved = await upsertWorldMapMarker({
                      worldId,
                      mapId: map.id,
                      icon: "marker",
                      name: "Neuer Ort",
                      gridX: cell.gridX,
                      gridY: cell.gridY,
                      isVisibleToPlayers: false,
                    });
                    onMarkersChange([...markers, saved]);
                    setPlacePoi(false);
                    toast.success("Markierung gesetzt (noch verborgen).");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Fehler.");
                  }
                });
                return;
              }

              if (markerTool && markerTool !== "select") {
                onEffectMarkerCreate({
                  kind: markerTool,
                  gridX: cell.gridX,
                  gridY: cell.gridY,
                });
              }
            }}
            onPointerDown={(e) => {
              if (drawActive) {
                drawHandlers.onPointerDown(e);
                return;
              }
              if (fogDrawActive && fogTool && fogTool !== "select") {
                const cell = cellFromClient(e.clientX, e.clientY);
                if (!cell) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                fogOriginRef.current = { x: cell.gridX, y: cell.gridY };
                setFogDraft({
                  shape: fogTool === "circle" ? "circle" : "rect",
                  ...(fogTool === "circle"
                    ? normalizeFogCircle(cell.gridX, cell.gridY, cell.gridX, cell.gridY)
                    : normalizeFogRect(cell.gridX, cell.gridY, cell.gridX, cell.gridY)),
                });
                return;
              }
              if (effectDrawActive && effectTool && effectTool !== "select") {
                const cell = cellFromClient(e.clientX, e.clientY);
                if (!cell) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                effectOriginRef.current = { x: cell.gridX, y: cell.gridY };
                if (effectTool === "cone") {
                  setEffectDraft({
                    shape: "cone",
                    ...normalizeEffectCone(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
                  });
                } else if (effectTool === "circle") {
                  setEffectDraft({
                    shape: "circle",
                    ...normalizeFogCircle(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
                  });
                } else {
                  setEffectDraft({
                    shape: "rect",
                    ...normalizeFogRect(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
                  });
                }
              }
            }}
            onPointerMove={(e) => {
              if (drawActive) {
                drawHandlers.onPointerMove(e);
                return;
              }
              if (fogOriginRef.current && fogTool && fogTool !== "select") {
                const cell = cellFromClient(e.clientX, e.clientY);
                if (!cell) return;
                const o = fogOriginRef.current;
                setFogDraft({
                  shape: fogTool === "circle" ? "circle" : "rect",
                  ...(fogTool === "circle"
                    ? normalizeFogCircle(o.x, o.y, cell.gridX, cell.gridY)
                    : normalizeFogRect(o.x, o.y, cell.gridX, cell.gridY)),
                });
                return;
              }
              if (effectOriginRef.current && effectTool && effectTool !== "select") {
                const cell = cellFromClient(e.clientX, e.clientY);
                if (!cell) return;
                const o = effectOriginRef.current;
                if (effectTool === "cone") {
                  setEffectDraft({
                    shape: "cone",
                    ...normalizeEffectCone(o.x, o.y, cell.gridX, cell.gridY),
                  });
                } else if (effectTool === "circle") {
                  setEffectDraft({
                    shape: "circle",
                    ...normalizeFogCircle(o.x, o.y, cell.gridX, cell.gridY),
                  });
                } else {
                  setEffectDraft({
                    shape: "rect",
                    ...normalizeFogRect(o.x, o.y, cell.gridX, cell.gridY),
                  });
                }
              }
            }}
            onPointerUp={(e) => {
              if (drawActive) {
                drawHandlers.onPointerUp(e);
                return;
              }
              if (fogOriginRef.current && fogDraft) {
                onFogCreate(fogDraft);
                fogOriginRef.current = null;
                setFogDraft(null);
                return;
              }
              if (effectOriginRef.current && effectDraft) {
                onEffectCreate(effectDraft);
                effectOriginRef.current = null;
                setEffectDraft(null);
              }
            }}
            onPointerCancel={(e) => {
              if (drawActive) drawHandlers.onPointerCancel(e);
              fogOriginRef.current = null;
              setFogDraft(null);
              effectOriginRef.current = null;
              setEffectDraft(null);
            }}
          >
            <Image
              src={map.image_url}
              alt={map.title}
              width={mapSize.width}
              height={mapSize.height}
              unoptimized
              className="pointer-events-none select-none"
              onLoad={onImgLoad}
            />
            {config.showGrid && (
              <BattlemapGridOverlay
                config={config}
                mapWidth={mapSize.width}
                mapHeight={mapSize.height}
              />
            )}

            <MapDrawLayer
              strokes={drawStrokes}
              draftPoints={draftPoints}
              draftColor={drawColor}
              draftWidth={drawWidth}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
            />

            <BattlemapFogLayer
              shapes={fogShapes}
              config={config}
              isGm={isGm}
              interactive={fogTool === "select"}
              selectedShapeId={selectedFogId}
              draft={fogDraft}
              onSelectShape={setSelectedFogId}
              onDeleteShape={onFogDelete}
            />

            <BattlemapEffectLayer
              templates={effectTemplates}
              config={config}
              isGm={isGm}
              interactive={effectTool === "select"}
              draft={effectDraft}
              onDeleteTemplate={onEffectDelete}
            />

            <BattlemapMarkerLayer
              markers={effectMarkers}
              config={config}
              isGm={isGm}
              interactive={markerTool === "select"}
              onDeleteMarker={onEffectMarkerDelete}
            />

            {visibleMarkers.map((m) => {
              const pos = gridToPixel(m.grid_x, m.grid_y, config);
              const hidden = !m.is_visible_to_players;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow ${
                    hidden
                      ? "border-dashed border-amber-400/80 bg-black/70 text-amber-300"
                      : "border-hero-vibrant bg-hero-dark text-hero-vibrant"
                  }`}
                  style={{
                    left: pos.x + config.cellSizePx / 2,
                    top: pos.y + config.cellSizePx / 2,
                  }}
                  title={
                    isGm
                      ? `${m.name}${hidden ? " (verborgen)" : ""} — Klick: Sichtbarkeit`
                      : m.name
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isGm) return;
                    startTransition(async () => {
                      try {
                        const saved = await toggleWorldMapMarkerVisibility(
                          m.id,
                          map.id,
                          worldId,
                          !m.is_visible_to_players,
                        );
                        onMarkersChange(
                          markers.map((x) => (x.id === saved.id ? saved : x)),
                        );
                        toast.success(
                          saved.is_visible_to_players
                            ? "Markierung für Spieler sichtbar."
                            : "Markierung verborgen.",
                        );
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Fehler.");
                      }
                    });
                  }}
                >
                  <WorldMapIcon icon={m.icon} className="h-4 w-4" />
                </button>
              );
            })}

            {groupPixel && (isGm || map.group_token_visible) && (
              <WorldMapGroupToken
                left={groupPixel.x + config.cellSizePx / 2}
                top={groupPixel.y + config.cellSizePx / 2}
                cellSize={config.cellSizePx}
                isCamping={map.group_token_is_camping}
                isGm={isGm}
                onToggleCamping={(next) => {
                  startTransition(async () => {
                    try {
                      const updated = await setWorldMapGroupToken({
                        mapId: map.id,
                        worldId,
                        gridX: map.group_token_grid_x,
                        gridY: map.group_token_grid_y,
                        visible: map.group_token_visible,
                        isCamping: next,
                      });
                      onMapChange(updated);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Fehler.");
                    }
                  });
                }}
                onMoveToPixel={(clientX, clientY) => {
                  const cell = cellFromClient(clientX, clientY);
                  if (!cell) return;
                  startTransition(async () => {
                    try {
                      const updated = await setWorldMapGroupToken({
                        mapId: map.id,
                        worldId,
                        gridX: cell.gridX,
                        gridY: cell.gridY,
                        visible: true,
                        isCamping: map.group_token_is_camping,
                      });
                      onMapChange(updated);
                    } catch {
                      /* ignore */
                    }
                  });
                }}
              />
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
