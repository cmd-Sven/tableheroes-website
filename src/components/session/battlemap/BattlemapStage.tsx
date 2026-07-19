"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Crosshair, X } from "lucide-react";
import type { BattlemapGridConfig, SessionBattlemap, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { pixelToGrid } from "@/src/lib/session/battlemap-grid";
import { BattlemapGridOverlay } from "./BattlemapGridOverlay";
import { BattlemapTokenLayer } from "./BattlemapTokenLayer";

type Props = {
  battlemap: SessionBattlemap;
  tokens: SessionBattlemapToken[];
  placementMode?: { characterId: string; characterName: string } | null;
  onCancelPlacement?: () => void;
  onCellClick?: (gridX: number, gridY: number) => void;
};

export function BattlemapStage({
  battlemap,
  tokens,
  placementMode,
  onCancelPlacement,
  onCellClick,
}: Props) {
  const config = battlemap.grid_config;
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode || !onCellClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = pixelToGrid(px, py, config);
      if (cell) onCellClick(cell.gridX, cell.gridY);
    },
    [config, onCellClick, placementMode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode) {
        setHoverCell(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = pixelToGrid(px, py, config);
      setHoverCell(cell ? { x: cell.gridX, y: cell.gridY } : null);
    },
    [config, placementMode],
  );

  return (
    <div className="absolute inset-0 z-[2] overflow-hidden bg-black">
      {placementMode ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-3 bg-accent-blood/90 px-4 py-2 text-center shadow-lg">
          <Crosshair className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
          <p className="font-barlow text-xs font-bold uppercase text-white">
            Token für {placementMode.characterName} setzen — Klicke auf eine Rasterzelle
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

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.25}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.08 }}
        panning={{ disabled: !!placementMode }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="!h-full !w-full"
          contentClass="!h-full !w-full flex items-center justify-center"
        >
          <div
            className={`relative ${placementMode ? "cursor-crosshair" : ""}`}
            onClick={handleContentClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCell(null)}
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
            <BattlemapTokenLayer
              tokens={tokens}
              config={config}
              highlightCharacterId={placementMode?.characterId}
            />
            {hoverCell && placementMode ? (
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
