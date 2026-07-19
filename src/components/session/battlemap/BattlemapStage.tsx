"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Crosshair, Eye, EyeOff, Minus, Plus, Trash2, X } from "lucide-react";
import type {
  BattlemapGridConfig,
  GmPropPlacementDraft,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapProp,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";
import { pixelToGrid } from "@/src/lib/session/battlemap-grid";
import { BattlemapGridOverlay } from "./BattlemapGridOverlay";
import { BattlemapTokenLayer } from "./BattlemapTokenLayer";
import { BattlemapPropsLayer } from "./BattlemapPropsLayer";

type CharacterPlacement = { characterId: string; characterName: string };

type Props = {
  battlemap: SessionBattlemap;
  tokens: SessionBattlemapToken[];
  props: SessionBattlemapProp[];
  isGm?: boolean;
  characterPlacement?: CharacterPlacement | null;
  gmTokenPlacement?: GmTokenPlacementDraft | null;
  gmMoveTokenId?: string | null;
  selectedTokenId?: string | null;
  selectedPropId?: string | null;
  onCancelPlacement?: () => void;
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

  const placementActive = Boolean(characterPlacement || gmTokenPlacement || gmMoveTokenId);
  const placementLabel = characterPlacement
    ? `Token für ${characterPlacement.characterName} setzen`
    : gmMoveTokenId
      ? "SL-Token verschieben — Zielzelle wählen"
      : gmTokenPlacement
        ? `${gmTokenPlacement.name} platzieren`
        : null;

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementActive || !onCellClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = pixelToGrid(px, py, config);
      if (cell) onCellClick(cell.gridX, cell.gridY);
    },
    [config, onCellClick, placementActive],
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

  return (
    <div className="absolute inset-0 z-[2] overflow-hidden bg-black">
      {placementLabel ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-3 bg-accent-blood/90 px-4 py-2 text-center shadow-lg">
          <Crosshair className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
          <p className="font-barlow text-xs font-bold uppercase text-white">
            {placementLabel} — Klicke auf eine Rasterzelle
          </p>
          {onCancelPlacement ? (
            <button
              type="button"
              onClick={onCancelPlacement}
              className="pointer-events-auto ml-2 rounded border border-white/30 p-1 text-white hover:bg-white/10"
              aria-label="Abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

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
        panning={{ disabled: placementActive }}
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
            {/* Fog placeholder — Phase 3 */}
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
                className="pointer-events-none absolute border-2 border-accent-gold/80 bg-accent-gold/15"
                style={{
                  left: config.originX + hoverCell.x * config.cellSizePx,
                  top: config.originY + hoverCell.y * config.cellSizePx,
                  width: config.cellSizePx,
                  height: config.cellSizePx,
                }}
              />
            ) : null}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
