"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Crosshair, Eye, EyeOff, Minus, Plus, Trash2, X, Zap } from "lucide-react";
import type {
  BattlemapGridConfig,
  CharacterTokenPlacement,
  GmPropPlacementDraft,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapProp,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";
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
import { BattlemapFogLayer } from "./BattlemapFogLayer";

type Props = {
  battlemap: SessionBattlemap;
  tokens: SessionBattlemapToken[];
  props: SessionBattlemapProp[];
  isGm?: boolean;
  characterPlacement?: CharacterTokenPlacement | null;
  gmTokenPlacement?: GmTokenPlacementDraft | null;
  gmMoveTokenId?: string | null;
  selectedTokenId?: string | null;
  selectedPropId?: string | null;
  onCancelPlacement?: () => void;
  onToggleDash?: () => void;
  onCellClick?: (gridX: number, gridY: number) => void;
  onSelectToken?: (tokenId: string | null) => void;
  onSelectProp?: (propId: string | null) => void;
  onPropDrop?: (draft: GmPropPlacementDraft, posX: number, posY: number) => void;
  onPropResize?: (propId: string, delta: number) => void;
  onToggleTokenVisibility?: (tokenId: string, visible: boolean) => void;
  onTogglePropVisibility?: (propId: string, visible: boolean) => void;
  onRemoveToken?: (tokenId: string) => void;
  onRemoveProp?: (propId: string) => void;
};

export function BattlemapStage({
  battlemap,
  tokens,
  props,
  isGm = false,
  characterPlacement,
  gmTokenPlacement,
  gmMoveTokenId,
  selectedTokenId,
  selectedPropId,
  onCancelPlacement,
  onToggleDash,
  onCellClick,
  onSelectToken,
  onSelectProp,
  onPropDrop,
  onPropResize,
  onToggleTokenVisibility,
  onTogglePropVisibility,
  onRemoveToken,
  onRemoveProp,
}: Props) {
  const config = battlemap.grid_config;
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [propDropHighlight, setPropDropHighlight] = useState(false);
  const [spacePanHeld, setSpacePanHeld] = useState(false);

  const placementActive = Boolean(characterPlacement || gmTokenPlacement || gmMoveTokenId);

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
        : null;

  useEffect(() => {
    if (!placementActive) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
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
  }, [placementActive, onCancelPlacement]);

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
      if (!placementActive || !onCellClick) return;
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = pixelToGrid(px, py, config);
      if (!cell) return;
      const size = characterPlacement ? 1 : gmPlacementSize;
      if (!isCellReachable(cell.gridX, cell.gridY, size)) return;
      onCellClick(cell.gridX, cell.gridY);
    },
    [
      config,
      characterPlacement,
      gmPlacementSize,
      isCellReachable,
      onCellClick,
      placementActive,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementActive) {
        setHoverCell(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = pixelToGrid(px, py, config);
      setHoverCell(cell ? { x: cell.gridX, y: cell.gridY } : null);
    },
    [config, placementActive],
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
        const rect = e.currentTarget.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const posX = Math.max(0, Math.min(1 - draft.width, px / mapSize.width));
        const posY = Math.max(0, Math.min(1 - draft.height, py / mapSize.height));
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

  return (
    <div className="absolute inset-0 z-[2] overflow-hidden bg-black">
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
            Esc abbricht · Leertaste + Ziehen oder Mittel-/Rechtsklick zum Verschieben der Karte
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
      ) : (
        <p className="pointer-events-none absolute inset-x-0 bottom-1 z-20 text-center font-libre text-[10px] text-gray-500/90">
          Jeder zoomt lokal · Der SL wechselt die aktive Karte
        </p>
      )}

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
        ref={transformRef}
        initialScale={1}
        minScale={0.25}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.08 }}
        panning={{
          disabled: false,
          allowLeftClickPan: placementActive ? spacePanHeld : true,
          allowMiddleClickPan: true,
          allowRightClickPan: true,
        }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="!h-full !w-full"
          contentClass="!h-full !w-full flex items-center justify-center"
        >
          <div
            ref={mapRef}
            className={`relative ${placementActive ? "cursor-crosshair" : ""} ${
              propDropHighlight ? "ring-2 ring-accent-gold ring-inset" : ""
            }`}
            onClick={handleContentClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCell(null)}
            onDragOver={handlePropDragOver}
            onDragLeave={() => setPropDropHighlight(false)}
            onDrop={handlePropDrop}
            onContextMenu={placementActive ? (e) => e.preventDefault() : undefined}
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
                setMapSize({
                  width: img.naturalWidth || 1200,
                  height: img.naturalHeight || 800,
                });
              }}
              style={{ width: mapSize.width, height: mapSize.height }}
            />
            <BattlemapGridOverlay
              config={config}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
            />
            <BattlemapFogLayer
              fogState={null}
              isGm={isGm}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
            />
            <BattlemapPropsLayer
              props={props}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
              isGm={isGm}
              selectedPropId={selectedPropId}
              onSelectProp={onSelectProp}
            />
            <BattlemapTokenLayer
              tokens={tokens}
              config={config}
              highlightCharacterId={characterPlacement?.characterId}
              isGm={isGm}
              selectedTokenId={selectedTokenId}
              onSelectToken={onSelectToken}
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
