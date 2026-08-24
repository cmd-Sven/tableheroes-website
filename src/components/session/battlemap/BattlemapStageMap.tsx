/**
 * BattlemapStageMap — Transformable map canvas: image, layers, drag overlays, and placement hover.
 */
"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import type { ActiveCombatTurnHighlight } from "@/src/lib/combat-initiative";
import type {
  BattlemapGridConfig,
  BattlemapMarkerTool,
  CharacterTokenPlacement,
  SessionBattlemap,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
  SessionBattlemapProp,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { BattlemapGridOverlay } from "./BattlemapGridOverlay";
import { BattlemapTokenLayer } from "./BattlemapTokenLayer";
import { BattlemapPropsLayer } from "./BattlemapPropsLayer";
import { BattlemapEffectLayer } from "./BattlemapEffectLayer";
import { MapDrawLayer } from "@/src/components/session/map-draw/MapDrawLayer";
import { useMapDrawStroke } from "@/src/components/session/map-draw/useMapDrawStroke";
import { BattlemapFogLayer } from "./BattlemapFogLayer";
import { BattlemapMarkerLayer } from "./BattlemapMarkerLayer";
import { BattlemapTrapOverlayLayer } from "./BattlemapTrapOverlayLayer";
import { BattlemapTokenDragOverlay } from "./BattlemapTokenDragOverlay";
import { isMarkerPlaceKind } from "./battlemap-stage-utils";
import { buildBattlemapLayerSelectHandlers } from "./battlemap-stage-map-selection";
import type { EffectDraft, FogDraft } from "./useBattlemapShapeDrawing";

type TokenDragPreview = {
  tokenId: string;
  originGridX: number;
  originGridY: number;
  targetGridX: number;
  targetGridY: number;
} | null;

export type BattlemapStageMapProps = {
  battlemap: SessionBattlemap;
  config: BattlemapGridConfig;
  mapRef: RefObject<HTMLDivElement | null>;
  transformRef: RefObject<ReactZoomPanPinchRef | null>;
  mapSize: { width: number; height: number };
  setMapSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
  fitScale: number;
  setFitScale: (v: number) => void;
  viewScale: number;
  setViewScale: (v: number) => void;
  computeFitScale: () => number;
  minScale: number;
  maxScale: number;
  mapInteractionLocked: boolean;
  spacePanHeld: boolean;
  propDropHighlight: boolean;
  shapeDrawActive: boolean;
  freehandDrawActive?: boolean;
  drawColor?: string;
  drawWidth?: number;
  drawStrokes?: import("@/src/lib/session/map-draw-types").SessionMapDrawStroke[];
  onDrawStroke?: (points: import("@/src/lib/session/map-draw-types").MapDrawPoint[]) => void;
  placementActive: boolean;
  shapeSelectActive: boolean;
  markerPlaceActive: boolean;
  trapPlaceActive: boolean;
  fogInteractive: boolean;
  effectInteractive: boolean;
  markerInteractive: boolean;
  trapInteractive: boolean;
  isGm: boolean;
  props: SessionBattlemapProp[];
  tokens: SessionBattlemapToken[];
  displayFogShapes: SessionBattlemapFogShape[];
  displayEffectTemplates: SessionBattlemapEffectTemplate[];
  displayMarkers: SessionBattlemapMarker[];
  traps: SessionBattlemapTrap[];
  fogDraft: FogDraft;
  effectDraft: EffectDraft;
  selectedPropId?: string | null;
  selectedTokenId?: string | null;
  selectedFogShapeId?: string | null;
  selectedEffectTemplateId?: string | null;
  selectedMarkerId?: string | null;
  selectedTrapId?: string | null;
  markerTool: BattlemapMarkerTool;
  hoverCell: { x: number; y: number } | null;
  hoverReachable: boolean;
  hoverSize: number;
  characterPlacement?: CharacterTokenPlacement | null;
  tokenDragPreview: TokenDragPreview;
  setTokenDragPreview: React.Dispatch<React.SetStateAction<TokenDragPreview>>;
  setFogMovePreview: React.Dispatch<
    React.SetStateAction<{ shapeId: string; gridX: number; gridY: number } | null>
  >;
  setEffectMovePreview: React.Dispatch<
    React.SetStateAction<{ templateId: string; gridX: number; gridY: number } | null>
  >;
  setMarkerMovePreview: React.Dispatch<
    React.SetStateAction<{ markerId: string; gridX: number; gridY: number } | null>
  >;
  cellFromClient: (
    clientX: number,
    clientY: number,
    el: HTMLElement,
  ) => { gridX: number; gridY: number } | null;
  isCellReachable: (
    gridX: number,
    gridY: number,
    sizeCells?: number,
    excludeTokenId?: string | null,
  ) => boolean;
  hpByRef?: Record<string, { current: number; max: number }>;
  activeTurnHighlight?: ActiveCombatTurnHighlight | null;
  ownCharacterId?: string | null;
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  onSelectProp?: (propId: string | null) => void;
  onSelectToken?: (tokenId: string | null) => void;
  onSelectFogShape?: (shapeId: string | null) => void;
  onSelectEffectTemplate?: (templateId: string | null) => void;
  onSelectMarker?: (markerId: string | null) => void;
  onSelectTrap?: (trapId: string | null) => void;
  onFogShapeMove?: (shapeId: string, gridX: number, gridY: number) => void;
  onFogShapeDelete?: (shapeId: string) => void;
  onEffectTemplateMove?: (templateId: string, gridX: number, gridY: number) => void;
  onEffectTemplateDelete?: (templateId: string) => void;
  onMarkerMove?: (markerId: string, gridX: number, gridY: number) => void;
  onMarkerDelete?: (markerId: string) => void;
  onTokenMove?: (token: SessionBattlemapToken, gridX: number, gridY: number) => void;
  onTokenContextMenu?: (
    token: SessionBattlemapToken,
    clientX: number,
    clientY: number,
  ) => void;
  handleContentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  setHoverCell: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  handleShapePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleShapePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleShapePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  cancelShapeDraw: () => void;
  handlePropDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  setPropDropHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  handlePropDrop: (e: React.DragEvent<HTMLDivElement>) => void;
};

export function BattlemapStageMap({
  battlemap,
  config,
  mapRef,
  transformRef,
  mapSize,
  setMapSize,
  fitScale,
  setFitScale,
  viewScale,
  setViewScale,
  computeFitScale,
  minScale,
  maxScale,
  mapInteractionLocked,
  spacePanHeld,
  propDropHighlight,
  shapeDrawActive,
  freehandDrawActive = false,
  drawColor = "#cab926",
  drawWidth = 4,
  drawStrokes = [],
  onDrawStroke,
  placementActive,
  shapeSelectActive,
  markerPlaceActive,
  trapPlaceActive,
  fogInteractive,
  effectInteractive,
  markerInteractive,
  trapInteractive,
  isGm,
  props,
  tokens,
  displayFogShapes,
  displayEffectTemplates,
  displayMarkers,
  traps,
  fogDraft,
  effectDraft,
  selectedPropId,
  selectedTokenId,
  selectedFogShapeId,
  selectedEffectTemplateId,
  selectedMarkerId,
  selectedTrapId,
  markerTool,
  hoverCell,
  hoverReachable,
  hoverSize,
  characterPlacement,
  tokenDragPreview,
  setTokenDragPreview,
  setFogMovePreview,
  setEffectMovePreview,
  setMarkerMovePreview,
  cellFromClient,
  isCellReachable,
  hpByRef,
  activeTurnHighlight,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  onSelectProp,
  onSelectToken,
  onSelectFogShape,
  onSelectEffectTemplate,
  onSelectMarker,
  onSelectTrap,
  onFogShapeMove,
  onFogShapeDelete,
  onEffectTemplateMove,
  onEffectTemplateDelete,
  onMarkerMove,
  onMarkerDelete,
  onTokenMove,
  onTokenContextMenu,
  handleContentClick,
  handleMouseMove,
  setHoverCell,
  handleShapePointerDown,
  handleShapePointerMove,
  handleShapePointerUp,
  cancelShapeDraw,
  handlePropDragOver,
  setPropDropHighlight,
  handlePropDrop,
}: BattlemapStageMapProps) {
  const layerSelect = buildBattlemapLayerSelectHandlers({
    onSelectProp,
    onSelectToken,
    onSelectFogShape,
    onSelectEffectTemplate,
    onSelectMarker,
    onSelectTrap,
  });

  const { draftPoints, drawHandlers } = useMapDrawStroke({
    enabled: freehandDrawActive,
    mapWidth: mapSize.width,
    mapHeight: mapSize.height,
    onStrokeComplete: (points) => onDrawStroke?.(points),
  });

  return (
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
      onTransform={(_ref, state) => {
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
          onPointerDown={
            freehandDrawActive
              ? drawHandlers.onPointerDown
              : shapeDrawActive
                ? handleShapePointerDown
                : undefined
          }
          onPointerMove={
            freehandDrawActive
              ? drawHandlers.onPointerMove
              : shapeDrawActive
                ? handleShapePointerMove
                : undefined
          }
          onPointerUp={
            freehandDrawActive
              ? drawHandlers.onPointerUp
              : shapeDrawActive
                ? handleShapePointerUp
                : undefined
          }
          onPointerCancel={
            freehandDrawActive
              ? drawHandlers.onPointerCancel
              : shapeDrawActive
                ? cancelShapeDraw
                : undefined
          }
          onDragOver={handlePropDragOver}
          onDragLeave={() => setPropDropHighlight(false)}
          onDrop={handlePropDrop}
          onContextMenu={(e) => {
            if ((e.target as HTMLElement).closest("[data-battlemap-token]")) return;
            if (mapInteractionLocked) e.preventDefault();
          }}
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
          <MapDrawLayer
            strokes={drawStrokes}
            draftPoints={draftPoints}
            draftColor={drawColor}
            draftWidth={drawWidth}
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
              placementActive ||
              shapeDrawActive ||
              markerPlaceActive ||
              trapPlaceActive ||
              shapeSelectActive
                ? undefined
                : onSelectProp
            }
          />
          <BattlemapFogLayer
            shapes={displayFogShapes}
            config={config}
            isGm={isGm}
            interactive={fogInteractive}
            interactionScale={viewScale}
            selectedShapeId={selectedFogShapeId}
            draft={fogDraft}
            onSelectShape={layerSelect.onSelectFogShape}
            onShapeDragMove={(shapeId, gridX, gridY) => {
              setFogMovePreview({ shapeId, gridX, gridY });
            }}
            onShapeDragEnd={(shapeId, gridX, gridY) => {
              setFogMovePreview(null);
              onFogShapeMove?.(shapeId, gridX, gridY);
            }}
            onDeleteShape={onFogShapeDelete}
          />
          <BattlemapEffectLayer
            templates={displayEffectTemplates}
            config={config}
            isGm={isGm}
            interactive={effectInteractive}
            interactionScale={viewScale}
            selectedTemplateId={selectedEffectTemplateId}
            draft={effectDraft}
            onSelectTemplate={layerSelect.onSelectEffectTemplate}
            onTemplateDragMove={(templateId, gridX, gridY) => {
              setEffectMovePreview({ templateId, gridX, gridY });
            }}
            onTemplateDragEnd={(templateId, gridX, gridY) => {
              setEffectMovePreview(null);
              onEffectTemplateMove?.(templateId, gridX, gridY);
            }}
            onDeleteTemplate={onEffectTemplateDelete}
          />
          <BattlemapMarkerLayer
            markers={displayMarkers}
            config={config}
            isGm={isGm}
            interactive={markerInteractive}
            interactionScale={viewScale}
            selectedMarkerId={selectedMarkerId}
            draftCell={
              markerPlaceActive && isMarkerPlaceKind(markerTool) && hoverCell
                ? {
                    kind: markerTool,
                    gridX: hoverCell.x,
                    gridY: hoverCell.y,
                  }
                : null
            }
            onSelectMarker={layerSelect.onSelectMarker}
            onMarkerDragMove={(markerId, gridX, gridY) => {
              setMarkerMovePreview({ markerId, gridX, gridY });
            }}
            onMarkerDragEnd={(markerId, gridX, gridY) => {
              setMarkerMovePreview(null);
              onMarkerMove?.(markerId, gridX, gridY);
            }}
            onDeleteMarker={onMarkerDelete}
          />
          <BattlemapTrapOverlayLayer
            traps={traps}
            config={config}
            isGm={isGm}
            interactive={trapInteractive}
            selectedTrapId={selectedTrapId}
            onSelectTrap={layerSelect.onSelectTrap}
          />
          <BattlemapTokenLayer
            tokens={tokens}
            config={config}
            highlightCharacterId={characterPlacement?.characterId}
            activeTurnHighlight={activeTurnHighlight}
            isGm={isGm}
            selectedTokenId={selectedTokenId}
            hpByRef={hpByRef}
            ownCharacterId={ownCharacterId}
            characterDisplayUrlById={characterDisplayUrlById}
            characterConditionsById={characterConditionsById}
            onSelectToken={
              placementActive || shapeSelectActive ? undefined : onSelectToken
            }
            onTokenContextMenu={
              placementActive || shapeSelectActive ? undefined : onTokenContextMenu
            }
            canDragToken={(token) => {
              if (placementActive || shapeSelectActive) return false;
              if (isGm) return true;
              return Boolean(ownCharacterId && token.character_id === ownCharacterId);
            }}
            onTokenDragPreview={(token, clientX, clientY) => {
              const el = mapRef.current;
              if (!el) return;
              const cell = cellFromClient(clientX, clientY, el);
              if (!cell) return;
              const sourceToken = tokens.find((t) => t.id === token.id) ?? token;
              setTokenDragPreview({
                tokenId: token.id,
                originGridX: sourceToken.grid_x,
                originGridY: sourceToken.grid_y,
                targetGridX: cell.gridX,
                targetGridY: cell.gridY,
              });
            }}
            onTokenDragEnd={(token, clientX, clientY) => {
              const el = mapRef.current;
              const preview =
                tokenDragPreview?.tokenId === token.id ? tokenDragPreview : null;
              setTokenDragPreview(null);
              if (!el || !onTokenMove) return;

              const pointerCell = cellFromClient(clientX, clientY, el);
              const cell = preview
                ? { gridX: preview.targetGridX, gridY: preview.targetGridY }
                : pointerCell;
              if (!cell) {
                toast.error("Token konnte nicht platziert werden — Ziel liegt außerhalb der Karte.");
                return;
              }

              const sourceToken = tokens.find((t) => t.id === token.id) ?? token;
              if (
                sourceToken.grid_x === cell.gridX &&
                sourceToken.grid_y === cell.gridY
              ) {
                return;
              }

              if (
                !isCellReachable(
                  cell.gridX,
                  cell.gridY,
                  sourceToken.size_cells,
                  sourceToken.id,
                )
              ) {
                toast.error("Diese Zelle ist nicht erreichbar.");
                return;
              }

              onTokenMove(sourceToken, cell.gridX, cell.gridY);
            }}
            onTokenDragCancel={() => setTokenDragPreview(null)}
            tokenDragPreview={tokenDragPreview}
          />
          <BattlemapTokenDragOverlay
            tokenDragPreview={tokenDragPreview}
            tokens={tokens}
            config={config}
            isCellReachable={isCellReachable}
          />
          {hoverCell && placementActive && !tokenDragPreview ? (
            <div
              className={`pointer-events-none absolute border-2 ${
                hoverReachable
                  ? "border-accent-gold/80 bg-accent-gold/15"
                  : "border-red-500/80 bg-red-500/15"
              }`}
              style={{
                left: config.originX + (hoverCell?.x ?? 0) * config.cellSizePx,
                top: config.originY + (hoverCell?.y ?? 0) * config.cellSizePx,
                width: config.cellSizePx * hoverSize,
                height: config.cellSizePx * hoverSize,
              }}
            />
          ) : null}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}
