"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  Maximize2,
  Minus,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type {
  BattlemapFogTool,
  CharacterTokenPlacement,
  GmPropPlacementDraft,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapFogShape,
  SessionBattlemapProp,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import {
  isCellBlockedByTokens,
  pixelToGrid,
} from "@/src/lib/session/battlemap-grid";
import {
  isWithinMovementRange,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { BattlemapGridOverlay } from "./BattlemapGridOverlay";
import { BattlemapTokenLayer } from "./BattlemapTokenLayer";
import { BattlemapPropsLayer } from "./BattlemapPropsLayer";
import {
  BattlemapFogLayer,
  normalizeFogCircle,
  normalizeFogRect,
} from "./BattlemapFogLayer";

type Props = {
  battlemap: SessionBattlemap;
  tokens: SessionBattlemapToken[];
  props: SessionBattlemapProp[];
  fogShapes?: SessionBattlemapFogShape[];
  isGm?: boolean;
  characterPlacement?: CharacterTokenPlacement | null;
  gmTokenPlacement?: GmTokenPlacementDraft | null;
  gmMoveTokenId?: string | null;
  selectedTokenId?: string | null;
  selectedPropId?: string | null;
  selectedFogShapeId?: string | null;
  fogTool?: BattlemapFogTool;
  onCancelPlacement?: () => void;
  onToggleDash?: () => void;
  onCellClick?: (gridX: number, gridY: number) => void;
  onSelectToken?: (tokenId: string | null) => void;
  onSelectProp?: (propId: string | null) => void;
  onSelectFogShape?: (shapeId: string | null) => void;
  onFogShapeCreate?: (input: {
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  }) => void;
  onFogShapeMove?: (shapeId: string, gridX: number, gridY: number) => void;
  onPropDrop?: (draft: GmPropPlacementDraft, posX: number, posY: number) => void;
  onPropResize?: (propId: string, delta: number) => void;
  onToggleTokenVisibility?: (tokenId: string, visible: boolean) => void;
  onTogglePropVisibility?: (propId: string, visible: boolean) => void;
  onRemoveToken?: (tokenId: string) => void;
  onRemoveProp?: (propId: string) => void;
  hpByRef?: Record<string, { current: number; max: number }>;
  ownCharacterId?: string | null;
  /** characterId → Gemüt-/Zustands-Anzeige-URL */
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  /** characterId → aktive SL-Zustände */
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  onTokenContextMenu?: (
    token: SessionBattlemapToken,
    clientX: number,
    clientY: number,
  ) => void;
};

/** Bildschirmkoordinaten → Bildpixel (Zoom/Pan der TransformWrapper berücksichtigen). */
function clientToMapPixels(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  mapWidth: number,
  mapHeight: number,
): { px: number; py: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    px: ((clientX - rect.left) / rect.width) * mapWidth,
    py: ((clientY - rect.top) / rect.height) * mapHeight,
  };
}

function fitScaleFor(
  mapWidth: number,
  mapHeight: number,
  viewWidth: number,
  viewHeight: number,
): number {
  if (mapWidth <= 0 || mapHeight <= 0 || viewWidth <= 0 || viewHeight <= 0) {
    return 1;
  }
  // Etwas Luft am Rand, damit die Karte nicht bündig am Viewport klebt
  const padding = 0.92;
  return Math.min(viewWidth / mapWidth, viewHeight / mapHeight) * padding;
}

export function BattlemapStage({
  battlemap,
  tokens,
  props,
  fogShapes = [],
  isGm = false,
  characterPlacement,
  gmTokenPlacement,
  gmMoveTokenId,
  selectedTokenId,
  selectedPropId,
  selectedFogShapeId = null,
  fogTool = null,
  onCancelPlacement,
  onToggleDash,
  onCellClick,
  onSelectToken,
  onSelectProp,
  onSelectFogShape,
  onFogShapeCreate,
  onFogShapeMove,
  onPropDrop,
  onPropResize,
  onToggleTokenVisibility,
  onTogglePropVisibility,
  onRemoveToken,
  onRemoveProp,
  hpByRef,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  onTokenContextMenu,
}: Props) {
  const config = battlemap.grid_config;
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });
  const [fitScale, setFitScale] = useState(1);
  const [viewScale, setViewScale] = useState(1);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [propDropHighlight, setPropDropHighlight] = useState(false);
  const [spacePanHeld, setSpacePanHeld] = useState(false);
  const [fogDraft, setFogDraft] = useState<{
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  } | null>(null);
  const fogDrawOriginRef = useRef<{ x: number; y: number } | null>(null);
  const fogMovePreviewRef = useRef<{
    shapeId: string;
    gridX: number;
    gridY: number;
  } | null>(null);
  const [fogMovePreview, setFogMovePreview] = useState<{
    shapeId: string;
    gridX: number;
    gridY: number;
  } | null>(null);

  const fogDrawActive = Boolean(
    isGm && (fogTool === "rect" || fogTool === "circle") && onFogShapeCreate,
  );
  const fogSelectActive = Boolean(isGm && fogTool === "select");
  const placementActive = Boolean(characterPlacement || gmTokenPlacement || gmMoveTokenId);
  const mapInteractionLocked = placementActive || fogDrawActive;

  const movingGmToken = gmMoveTokenId
    ? tokens.find((t) => t.id === gmMoveTokenId) ?? null
    : null;
  const gmPlacementSize =
    gmTokenPlacement?.sizeCells ?? movingGmToken?.size_cells ?? 1;

  const movementMaxCells =
    characterPlacement && !characterPlacement.isFirstPlacement
      ? movementCellsForBurst(characterPlacement.baseCells, characterPlacement.useDash)
      : null;

  const placementLabel = characterPlacement
    ? characterPlacement.isFirstPlacement
      ? `Token für ${characterPlacement.characterName} platzieren`
      : `Token für ${characterPlacement.characterName} bewegen`
    : gmMoveTokenId
      ? "SL-Token verschieben — Zielzelle wählen"
      : gmTokenPlacement
        ? `${gmTokenPlacement.name} platzieren`
        : fogDrawActive
          ? fogTool === "circle"
            ? "Fog: Kreis ziehen"
            : "Fog: Rechteck ziehen"
          : null;

  const computeFitScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || mapSize.width <= 0 || mapSize.height <= 0) return 1;
    return fitScaleFor(
      mapSize.width,
      mapSize.height,
      stage.clientWidth,
      stage.clientHeight,
    );
  }, [mapSize.height, mapSize.width]);

  const applyFitView = useCallback(() => {
    const nextFit = computeFitScale();
    setFitScale(nextFit);
    setViewScale(nextFit);
    requestAnimationFrame(() => {
      transformRef.current?.centerView(nextFit, 200);
    });
  }, [computeFitScale]);

  const panBy = useCallback((dx: number, dy: number) => {
    const api = transformRef.current;
    if (!api) return;
    const state = api.state ?? api.instance?.state;
    if (!state) return;
    api.setTransform(state.positionX + dx, state.positionY + dy, state.scale, 180);
  }, []);

  const zoomByFactor = useCallback((factor: number) => {
    const api = transformRef.current;
    if (!api) return;
    const state = api.state ?? api.instance?.state;
    if (!state) return;
    const lo = Math.max(0.05, fitScale * 0.35);
    const hi = Math.max(4, fitScale * 8);
    const next = Math.min(hi, Math.max(lo, state.scale * factor));
    api.setTransform(state.positionX, state.positionY, next, 180);
    setViewScale(next);
  }, [fitScale]);

  // Beim Map-Wechsel / Bildgröße: Fit-Scale neu berechnen (TransformWrapper remountet über key)
  useEffect(() => {
    setFitScale(computeFitScale());
  }, [computeFitScale, battlemap.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      // Nur Fit-Scale für min/max aktualisieren — Zoom nicht hart zurücksetzen
      resizeTimer = setTimeout(() => {
        setFitScale(computeFitScale());
      }, 120);
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [computeFitScale]);

  // Mausrad über der Karte: Seiten-Scroll blockieren (Capture + non-passive).
  // Ohne preventDefault scrollt der äußere Live-Board-Container (overflow-y-auto).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    stage.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => stage.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  useEffect(() => {
    if (!placementActive && !fogDrawActive) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (fogDrawActive) {
          setFogDraft(null);
          fogDrawOriginRef.current = null;
          return;
        }
        onCancelPlacement?.();
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setSpacePanHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " " || e.code === "Space") {
        setSpacePanHeld(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      setSpacePanHeld(false);
    };
  }, [placementActive, fogDrawActive, onCancelPlacement]);

  const cellFromClient = useCallback(
    (clientX: number, clientY: number, el: HTMLElement) => {
      const coords = clientToMapPixels(
        clientX,
        clientY,
        el,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) return null;
      return pixelToGrid(coords.px, coords.py, config);
    },
    [config, mapSize.height, mapSize.width],
  );

  const handleFogPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogTool || fogTool === "select") return;
      if (e.button !== 0) return;
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      fogDrawOriginRef.current = { x: cell.gridX, y: cell.gridY };
      if (fogTool === "circle") {
        setFogDraft({
          shape: "circle",
          ...normalizeFogCircle(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      } else {
        setFogDraft({
          shape: "rect",
          ...normalizeFogRect(cell.gridX, cell.gridY, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, fogDrawActive, fogTool],
  );

  const handleFogPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogDrawOriginRef.current || !fogTool) return;
      const cell = cellFromClient(e.clientX, e.clientY, e.currentTarget);
      if (!cell) return;
      const origin = fogDrawOriginRef.current;
      if (fogTool === "circle") {
        setFogDraft({
          shape: "circle",
          ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      } else {
        setFogDraft({
          shape: "rect",
          ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY),
        });
      }
    },
    [cellFromClient, fogDrawActive, fogTool],
  );

  const handleFogPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fogDrawActive || !fogDrawOriginRef.current || !fogTool || !onFogShapeCreate) {
        return;
      }
      const origin = fogDrawOriginRef.current;
      const cell =
        cellFromClient(e.clientX, e.clientY, e.currentTarget) ?? {
          gridX: origin.x,
          gridY: origin.y,
        };
      const normalized =
        fogTool === "circle"
          ? { shape: "circle" as const, ...normalizeFogCircle(origin.x, origin.y, cell.gridX, cell.gridY) }
          : { shape: "rect" as const, ...normalizeFogRect(origin.x, origin.y, cell.gridX, cell.gridY) };
      fogDrawOriginRef.current = null;
      setFogDraft(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      onFogShapeCreate(normalized);
    },
    [cellFromClient, fogDrawActive, fogTool, onFogShapeCreate],
  );

  const displayFogShapes = fogMovePreview
    ? fogShapes.map((s) =>
        s.id === fogMovePreview.shapeId
          ? { ...s, grid_x: fogMovePreview.gridX, grid_y: fogMovePreview.gridY }
          : s,
      )
    : fogShapes;

  const isCellReachable = useCallback(
    (gridX: number, gridY: number, sizeCells = 1): boolean => {
      if (
        gridX < 0 ||
        gridY < 0 ||
        gridX + sizeCells > config.columns ||
        gridY + sizeCells > config.rows
      ) {
        return false;
      }

      const excludeId =
        characterPlacement && !characterPlacement.isFirstPlacement
          ? tokens.find((t) => t.character_id === characterPlacement.characterId)?.id
          : gmMoveTokenId;

      for (let cx = gridX; cx < gridX + sizeCells; cx += 1) {
        for (let cy = gridY; cy < gridY + sizeCells; cy += 1) {
          if (isCellBlockedByTokens(tokens, cx, cy, excludeId)) return false;
        }
      }

      if (
        characterPlacement &&
        !characterPlacement.isFirstPlacement &&
        movementMaxCells != null &&
        characterPlacement.originGridX != null &&
        characterPlacement.originGridY != null
      ) {
        if (
          !isWithinMovementRange(
            characterPlacement.originGridX,
            characterPlacement.originGridY,
            gridX,
            gridY,
            movementMaxCells,
          )
        ) {
          return false;
        }
      }

      return true;
    },
    [characterPlacement, config.columns, config.rows, gmMoveTokenId, movementMaxCells, tokens],
  );

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (fogDrawActive) return;
      if (fogSelectActive && e.target === e.currentTarget) {
        onSelectFogShape?.(null);
      }
      if (!placementActive || !onCellClick) return;
      if (e.button !== 0) return;
      const coords = clientToMapPixels(
        e.clientX,
        e.clientY,
        e.currentTarget,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) return;
      const cell = pixelToGrid(coords.px, coords.py, config);
      if (!cell) return;
      const size = characterPlacement ? 1 : gmPlacementSize;
      if (!isCellReachable(cell.gridX, cell.gridY, size)) return;
      onCellClick(cell.gridX, cell.gridY);
    },
    [
      config,
      characterPlacement,
      fogDrawActive,
      fogSelectActive,
      gmPlacementSize,
      isCellReachable,
      mapSize.height,
      mapSize.width,
      onCellClick,
      onSelectFogShape,
      placementActive,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementActive) {
        setHoverCell(null);
        return;
      }
      const coords = clientToMapPixels(
        e.clientX,
        e.clientY,
        e.currentTarget,
        mapSize.width,
        mapSize.height,
      );
      if (!coords) {
        setHoverCell(null);
        return;
      }
      const cell = pixelToGrid(coords.px, coords.py, config);
      setHoverCell(cell ? { x: cell.gridX, y: cell.gridY } : null);
    },
    [config, mapSize.height, mapSize.width, placementActive],
  );

  const handlePropDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isGm) return;
      if (!e.dataTransfer.types.includes("application/x-battlemap-prop")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setPropDropHighlight(true);
    },
    [isGm],
  );

  const handlePropDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isGm || !onPropDrop) return;
      e.preventDefault();
      setPropDropHighlight(false);
      try {
        const raw = e.dataTransfer.getData("application/x-battlemap-prop");
        if (!raw) return;
        const draft = JSON.parse(raw) as GmPropPlacementDraft;
        const coords = clientToMapPixels(
          e.clientX,
          e.clientY,
          e.currentTarget,
          mapSize.width,
          mapSize.height,
        );
        if (!coords) return;
        const posX = Math.max(
          0,
          Math.min(1 - draft.width, coords.px / mapSize.width),
        );
        const posY = Math.max(
          0,
          Math.min(1 - draft.height, coords.py / mapSize.height),
        );
        onPropDrop(draft, posX, posY);
      } catch {
        /* ignore */
      }
    },
    [isGm, mapSize.height, mapSize.width, onPropDrop],
  );

  const selectedToken = selectedTokenId
    ? tokens.find((t) => t.id === selectedTokenId) ?? null
    : null;
  const selectedProp = selectedPropId
    ? props.find((p) => p.id === selectedPropId) ?? null
    : null;

  const hoverReachable =
    hoverCell != null
      ? isCellReachable(
          hoverCell.x,
          hoverCell.y,
          characterPlacement ? 1 : gmPlacementSize,
        )
      : false;

  const hoverSize = characterPlacement ? 1 : gmPlacementSize;
  const minScale = Math.max(0.05, fitScale * 0.35);
  const maxScale = Math.max(4, fitScale * 8);

  return (
    <div ref={stageRef} className="absolute inset-0 z-[2] overflow-hidden overscroll-contain bg-black">
      {placementLabel ? (
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
      ) : null}

      {/* Karten-Navigation (Google-Maps-Stil): Pfeile + Zoom % */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-40 flex flex-col gap-2">
        {/* Pan-Pad */}
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

        {/* Zoom ± mit Prozent */}
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

      {isGm && (selectedToken || selectedProp) ? (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hero-border/70 bg-background-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
          <span className="max-w-[8rem] truncate font-barlow text-[10px] font-bold uppercase text-gray-300">
            {selectedToken?.label ?? selectedProp?.kind ?? "Auswahl"}
          </span>
          {selectedToken && onToggleTokenVisibility ? (
            <button
              type="button"
              title={selectedToken.is_visible_to_players ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
              onClick={() =>
                onToggleTokenVisibility(
                  selectedToken.id,
                  !selectedToken.is_visible_to_players,
                )
              }
              className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-accent-gold hover:text-accent-gold"
            >
              {selectedToken.is_visible_to_players ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          {selectedProp && onTogglePropVisibility ? (
            <>
              <button
                type="button"
                title={selectedProp.is_visible_to_players ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
                onClick={() =>
                  onTogglePropVisibility(
                    selectedProp.id,
                    !selectedProp.is_visible_to_players,
                  )
                }
                className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-accent-gold hover:text-accent-gold"
              >
                {selectedProp.is_visible_to_players ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
              {onPropResize ? (
                <>
                  <button
                    type="button"
                    title="Verkleinern"
                    onClick={() => onPropResize(selectedProp.id, -0.02)}
                    className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Vergrößern"
                    onClick={() => onPropResize(selectedProp.id, 0.02)}
                    className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          {selectedToken && onRemoveToken ? (
            <button
              type="button"
              title="Token entfernen"
              onClick={() => onRemoveToken(selectedToken.id)}
              className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-red-500 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {selectedProp && onRemoveProp ? (
            <button
              type="button"
              title="Prop entfernen"
              onClick={() => onRemoveProp(selectedProp.id)}
              className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-red-500 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <TransformWrapper
        key={`${battlemap.id}-${mapSize.width}x${mapSize.height}`}
        ref={transformRef}
        initialScale={fitScale}
        minScale={minScale}
        maxScale={maxScale}
        centerOnInit
        limitToBounds={false}
        wheel={{
          wheelDisabled: true,
        }}
        panning={{
          disabled: false,
          velocityDisabled: true,
          // Primär: Pfeil-Buttons; Ziehen nur Mittel-/Rechtsklick (kein Konflikt mit Token-Klick)
          allowLeftClickPan: mapInteractionLocked ? spacePanHeld : false,
          allowMiddleClickPan: true,
          allowRightClickPan: true,
        }}
        doubleClick={{ disabled: true }}
        onInit={(ref) => {
          const nextFit = computeFitScale();
          setFitScale(nextFit);
          setViewScale(nextFit);
          ref.centerView(nextFit, 0);
        }}
        onTransformed={(_ref, state) => {
          setViewScale(state.scale);
        }}
      >
        <TransformComponent
          wrapperClass="!h-full !w-full"
          contentClass="!flex !h-full !w-full !items-center !justify-center"
        >
          <div
            ref={mapRef}
            className={`relative ${mapInteractionLocked ? "cursor-crosshair" : ""} ${
              propDropHighlight ? "ring-2 ring-accent-gold ring-inset" : ""
            }`}
            onClick={handleContentClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCell(null)}
            onPointerDown={fogDrawActive ? handleFogPointerDown : undefined}
            onPointerMove={fogDrawActive ? handleFogPointerMove : undefined}
            onPointerUp={fogDrawActive ? handleFogPointerUp : undefined}
            onPointerCancel={
              fogDrawActive
                ? () => {
                    fogDrawOriginRef.current = null;
                    setFogDraft(null);
                  }
                : undefined
            }
            onDragOver={handlePropDragOver}
            onDragLeave={() => setPropDropHighlight(false)}
            onDrop={handlePropDrop}
            onContextMenu={mapInteractionLocked ? (e) => e.preventDefault() : undefined}
          >
            <Image
              src={battlemap.image_url}
              alt={battlemap.title}
              width={mapSize.width}
              height={mapSize.height}
              unoptimized
              className="block max-h-none max-w-none select-none"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                const width = img.naturalWidth || 1200;
                const height = img.naturalHeight || 800;
                setMapSize((prev) =>
                  prev.width === width && prev.height === height
                    ? prev
                    : { width, height },
                );
              }}
              style={{ width: mapSize.width, height: mapSize.height }}
            />
            <BattlemapGridOverlay
              config={config}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
            />
            <BattlemapPropsLayer
              props={props}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
              isGm={isGm}
              selectedPropId={selectedPropId}
              onSelectProp={
                fogDrawActive || fogSelectActive
                  ? undefined
                  : onSelectProp
              }
            />
            <BattlemapTokenLayer
              tokens={tokens}
              config={config}
              highlightCharacterId={characterPlacement?.characterId}
              isGm={isGm}
              selectedTokenId={selectedTokenId}
              hpByRef={hpByRef}
              ownCharacterId={ownCharacterId}
              characterDisplayUrlById={characterDisplayUrlById}
              characterConditionsById={characterConditionsById}
              onSelectToken={
                fogDrawActive || fogSelectActive ? undefined : onSelectToken
              }
              onTokenContextMenu={
                fogDrawActive || fogSelectActive ? undefined : onTokenContextMenu
              }
            />
            <BattlemapFogLayer
              shapes={displayFogShapes}
              config={config}
              isGm={isGm}
              interactive={fogSelectActive && !placementActive}
              interactionScale={viewScale}
              selectedShapeId={selectedFogShapeId}
              draft={fogDraft}
              onSelectShape={(id) => {
                onSelectFogShape?.(id);
                onSelectToken?.(null);
                onSelectProp?.(null);
              }}
              onShapeDragMove={(shapeId, gridX, gridY) => {
                const next = { shapeId, gridX, gridY };
                fogMovePreviewRef.current = next;
                setFogMovePreview(next);
              }}
              onShapeDragEnd={(shapeId, gridX, gridY) => {
                fogMovePreviewRef.current = null;
                setFogMovePreview(null);
                onFogShapeMove?.(shapeId, gridX, gridY);
              }}
            />
            {hoverCell && placementActive ? (
              <div
                className={`pointer-events-none absolute border-2 ${
                  hoverReachable
                    ? "border-accent-gold/80 bg-accent-gold/15"
                    : "border-red-500/80 bg-red-500/15"
                }`}
                style={{
                  left: config.originX + hoverCell.x * config.cellSizePx,
                  top: config.originY + hoverCell.y * config.cellSizePx,
                  width: config.cellSizePx * hoverSize,
                  height: config.cellSizePx * hoverSize,
                }}
              />
            ) : null}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
