/**
 * BattlemapStage — Die Arena des Live-Tischs.
 * Zoom, Pan, Platzierung und SL-Werkzeuge: hier wird die Battlemap zur Bühne,
 * auf der Tokens und Schablonen die Geschichte vorantreiben.
 */
"use client";

import { useRef, useState } from "react";
import { BATTLEMAP_MARKER_META } from "@/src/lib/session/battlemap-types";
import { BattlemapPlacementBanner } from "./BattlemapPlacementBanner";
import { BattlemapStageNavigation } from "./BattlemapStageNavigation";
import { BattlemapSelectionToolbar } from "./BattlemapSelectionToolbar";
import { BattlemapStageMap } from "./BattlemapStageMap";
import {
  type BattlemapStageProps,
  isMarkerPlaceKind,
} from "./battlemap-stage-utils";
import { useBattlemapStageKeyboard } from "./useBattlemapStageKeyboard";
import { useBattlemapViewport } from "./useBattlemapViewport";
import { useBattlemapShapeDrawing } from "./useBattlemapShapeDrawing";
import { useBattlemapMapInteraction } from "./useBattlemapMapInteraction";

export function BattlemapStage({
  battlemap,
  tokens,
  props,
  fogShapes = [],
  effectTemplates = [],
  markers = [],
  traps = [],
  containers = [],
  isGm = false,
  characterPlacement,
  gmTokenPlacement,
  gmMoveTokenId,
  selectedTokenId,
  selectedPropId,
  selectedFogShapeId = null,
  fogTool = null,
  effectTool = null,
  markerTool = null,
  trapTool = null,
  containerTool = null,
  disableSpacePan = false,
  selectedEffectTemplateId = null,
  selectedMarkerId = null,
  selectedTrapId = null,
  selectedContainerId = null,
  onSelectEffectTemplate,
  onEffectTemplateCreate,
  onEffectTemplateMove,
  onEffectTemplateDelete,
  onEffectToolCancel,
  onSelectMarker,
  onMarkerCreate,
  onMarkerMove,
  onMarkerDelete,
  onMarkerToolCancel,
  onSelectTrap,
  onTrapPlaceCell,
  onTrapToolCancel,
  onTrapDelete,
  onTrapMarkDiscovered,
  onTrapTrigger,
  onTrapDisarm,
  onSelectContainer,
  onContainerPlaceCell,
  onContainerToolCancel,
  onContainerDelete,
  onContainerTrapMarkDiscovered,
  onContainerMarkDiscovered,
  onContainerTrapTrigger,
  onContainerTrapDisarm,
  onCancelPlacement,
  onToggleDash,
  onCellClick,
  onSelectToken,
  onSelectProp,
  onSelectFogShape,
  onFogShapeCreate,
  onFogShapeMove,
  onFogShapeDelete,
  onFogToolCancel,
  onTokenMove,
  onPropDrop,
  onPropResize,
  onToggleTokenVisibility,
  onTogglePropVisibility,
  onRemoveToken,
  onRemoveProp,
  hpByRef,
  activeTurnHighlight = null,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  playerMoveMaxCells,
  onTokenContextMenu,
  drawTool = null,
  drawColor = "#cab926",
  drawWidth = 4,
  drawStrokes = [],
  onDrawStroke,
}: BattlemapStageProps) {
  const config = battlemap.grid_config;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const {
    transformRef,
    stageRef,
    mapSize,
    setMapSize,
    fitScale,
    setFitScale,
    viewScale,
    setViewScale,
    computeFitScale,
    applyFitView,
    panBy,
    zoomByFactor,
  } = useBattlemapViewport({
    battlemapId: battlemap.id,
    initialWidth: 1200,
    initialHeight: 800,
  });
  const [spacePanHeld, setSpacePanHeld] = useState(false);
  const [fogMovePreview, setFogMovePreview] = useState<{
    shapeId: string;
    gridX: number;
    gridY: number;
  } | null>(null);
  const [effectMovePreview, setEffectMovePreview] = useState<{
    templateId: string;
    gridX: number;
    gridY: number;
  } | null>(null);
  const [markerMovePreview, setMarkerMovePreview] = useState<{
    markerId: string;
    gridX: number;
    gridY: number;
  } | null>(null);
  const [tokenDragPreview, setTokenDragPreview] = useState<{
    tokenId: string;
    originGridX: number;
    originGridY: number;
    targetGridX: number;
    targetGridY: number;
  } | null>(null);

  const placementActive = Boolean(characterPlacement || gmTokenPlacement || gmMoveTokenId);
  const fogDrawActive = Boolean(
    isGm && (fogTool === "rect" || fogTool === "circle") && onFogShapeCreate,
  );
  const effectDrawActive = Boolean(
    isGm &&
      (effectTool === "rect" || effectTool === "circle" || effectTool === "cone") &&
      onEffectTemplateCreate,
  );
  const markerPlaceActive = Boolean(
    isGm && isMarkerPlaceKind(markerTool) && onMarkerCreate,
  );
  const trapPlaceActive = Boolean(isGm && trapTool === "place" && onTrapPlaceCell);
  const containerPlaceActive = Boolean(
    isGm && containerTool === "place" && onContainerPlaceCell,
  );
  const shapeDrawActive = fogDrawActive || effectDrawActive;
  const freehandDrawActive = Boolean(isGm && drawTool === "draw" && onDrawStroke);
  const fogInteractive = Boolean(
    isGm &&
      fogTool === "select" &&
      !placementActive &&
      !fogDrawActive &&
      !effectDrawActive &&
      !markerPlaceActive &&
      !trapPlaceActive &&
      !containerPlaceActive,
  );
  const effectInteractive = Boolean(
    isGm &&
      effectTool === "select" &&
      !placementActive &&
      !fogDrawActive &&
      !effectDrawActive &&
      !markerPlaceActive &&
      !trapPlaceActive &&
      !containerPlaceActive,
  );
  const markerInteractive = Boolean(
    isGm &&
      markerTool === "select" &&
      !placementActive &&
      !fogDrawActive &&
      !effectDrawActive &&
      !markerPlaceActive &&
      !trapPlaceActive &&
      !containerPlaceActive,
  );
  const trapInteractive = Boolean(
    isGm &&
      trapTool === "select" &&
      !placementActive &&
      !fogDrawActive &&
      !effectDrawActive &&
      !markerPlaceActive &&
      !trapPlaceActive &&
      !containerPlaceActive,
  );
  const containerInteractive = Boolean(
    isGm &&
      containerTool === "select" &&
      !placementActive &&
      !fogDrawActive &&
      !effectDrawActive &&
      !markerPlaceActive &&
      !trapPlaceActive &&
      !containerPlaceActive,
  );
  const playerDisarmActive = Boolean(
    !isGm &&
      ownCharacterId &&
      !placementActive &&
      !trapPlaceActive &&
      !shapeDrawActive,
  );
  const ownCharacterGrid = (() => {
    if (!ownCharacterId) return null;
    const token = tokens.find((t) => t.character_id === ownCharacterId);
    if (!token) return null;
    return { x: token.grid_x, y: token.grid_y };
  })();
  const shapeSelectActive =
    fogInteractive ||
    effectInteractive ||
    markerInteractive ||
    trapInteractive ||
    containerInteractive;
  const mapInteractionLocked =
    placementActive ||
    shapeDrawActive ||
    markerPlaceActive ||
    trapPlaceActive ||
    containerPlaceActive ||
    freehandDrawActive;

  const movingGmToken = gmMoveTokenId
    ? tokens.find((t) => t.id === gmMoveTokenId) ?? null
    : null;
  const gmPlacementSize =
    gmTokenPlacement?.sizeCells ?? movingGmToken?.size_cells ?? 1;

  const tokenDragMoveContext =
    tokenDragPreview && !isGm && !characterPlacement && playerMoveMaxCells != null
      ? {
          originGridX: tokenDragPreview.originGridX,
          originGridY: tokenDragPreview.originGridY,
          maxCells: playerMoveMaxCells,
        }
      : null;

  const {
    fogDraft,
    setFogDraft,
    fogDrawOriginRef,
    effectDraft,
    setEffectDraft,
    effectDrawOriginRef,
    cellFromClient,
    handleShapePointerDown,
    handleShapePointerMove,
    handleShapePointerUp,
    cancelShapeDraw,
  } = useBattlemapShapeDrawing({
    config,
    mapSize,
    fogDrawActive,
    effectDrawActive,
    fogTool,
    effectTool,
    onFogShapeCreate,
    onEffectTemplateCreate,
  });

  const {
    hoverCell,
    setHoverCell,
    propDropHighlight,
    setPropDropHighlight,
    movementMaxCells,
    isCellReachable,
    handleContentClick,
    handleMouseMove,
    handlePropDragOver,
    handlePropDrop,
    hoverReachable,
    hoverSize,
  } = useBattlemapMapInteraction({
    config,
    mapSize,
    tokens,
    isGm,
    characterPlacement,
    tokenDragMoveContext,
    gmMoveTokenId,
    gmPlacementSize,
    placementActive,
    fogDrawActive,
    effectDrawActive,
    fogInteractive,
    effectInteractive,
    markerInteractive,
    trapInteractive,
    markerPlaceActive,
    trapPlaceActive,
    containerPlaceActive,
    markerTool,
    onCellClick,
    onMarkerCreate,
    onTrapPlaceCell,
    onContainerPlaceCell,
    onSelectFogShape,
    onSelectEffectTemplate,
    onSelectMarker,
    onSelectTrap,
    onPropDrop,
  });

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
          : effectDrawActive
            ? effectTool === "circle"
              ? "Effekt: Kreis ziehen"
              : effectTool === "cone"
                ? "Effekt: Kegel ziehen (Spitze → Richtung)"
                : "Effekt: Rechteck ziehen"
            : markerPlaceActive && isMarkerPlaceKind(markerTool)
              ? `Marker: ${BATTLEMAP_MARKER_META[markerTool].label} setzen`
              : trapPlaceActive
                ? "Falle: Trigger-Zelle wählen (Trap-Wizard)"
                : null;

  useBattlemapStageKeyboard({
    placementActive,
    shapeDrawActive,
    markerPlaceActive,
    trapPlaceActive,
    disableSpacePan,
    fogDrawActive,
    effectDrawActive,
    fogDraft,
    effectDraft,
    fogDrawOriginRef,
    effectDrawOriginRef,
    setFogDraft,
    setEffectDraft,
    setSpacePanHeld,
    onCancelPlacement,
    onFogToolCancel,
    onEffectToolCancel,
    onMarkerToolCancel,
    onTrapToolCancel,
    isGm,
    selectedFogShapeId,
    selectedEffectTemplateId,
    selectedMarkerId,
    selectedTrapId,
    onFogShapeDelete,
    onEffectTemplateDelete,
    onMarkerDelete,
    onTrapDelete,
  });

  const displayFogShapes = fogMovePreview
    ? fogShapes.map((s) =>
        s.id === fogMovePreview.shapeId
          ? { ...s, grid_x: fogMovePreview.gridX, grid_y: fogMovePreview.gridY }
          : s,
      )
    : fogShapes;

  const displayEffectTemplates = effectMovePreview
    ? effectTemplates.map((t) =>
        t.id === effectMovePreview.templateId
          ? { ...t, grid_x: effectMovePreview.gridX, grid_y: effectMovePreview.gridY }
          : t,
      )
    : effectTemplates;

  const displayMarkers = markerMovePreview
    ? markers.map((m) =>
        m.id === markerMovePreview.markerId
          ? { ...m, grid_x: markerMovePreview.gridX, grid_y: markerMovePreview.gridY }
          : m,
      )
    : markers;

  const selectedToken = selectedTokenId
    ? tokens.find((t) => t.id === selectedTokenId) ?? null
    : null;
  const selectedProp = selectedPropId
    ? props.find((p) => p.id === selectedPropId) ?? null
    : null;

  const minScale = Math.max(0.05, fitScale * 0.35);
  const maxScale = Math.max(4, fitScale * 8);

  return (
    <div ref={stageRef} className="absolute inset-0 z-[2] overflow-hidden overscroll-contain bg-black">
      <BattlemapPlacementBanner
        placementLabel={placementLabel}
        characterPlacement={characterPlacement}
        movementMaxCells={movementMaxCells}
        onCancelPlacement={onCancelPlacement}
        onToggleDash={onToggleDash}
      />

      <BattlemapStageNavigation
        panBy={panBy}
        applyFitView={applyFitView}
        zoomByFactor={zoomByFactor}
        viewScale={viewScale}
        fitScale={fitScale}
      />

      <BattlemapSelectionToolbar
        isGm={isGm}
        selectedToken={selectedToken}
        selectedProp={selectedProp}
        onToggleTokenVisibility={onToggleTokenVisibility}
        onTogglePropVisibility={onTogglePropVisibility}
        onPropResize={onPropResize}
        onRemoveToken={onRemoveToken}
        onRemoveProp={onRemoveProp}
      />

      <BattlemapStageMap
        battlemap={battlemap}
        config={config}
        mapRef={mapRef}
        transformRef={transformRef}
        mapSize={mapSize}
        setMapSize={setMapSize}
        fitScale={fitScale}
        setFitScale={setFitScale}
        viewScale={viewScale}
        setViewScale={setViewScale}
        computeFitScale={computeFitScale}
        minScale={minScale}
        maxScale={maxScale}
        mapInteractionLocked={mapInteractionLocked}
        spacePanHeld={spacePanHeld}
        propDropHighlight={propDropHighlight}
        shapeDrawActive={shapeDrawActive}
        freehandDrawActive={freehandDrawActive}
        drawColor={drawColor}
        drawWidth={drawWidth}
        drawStrokes={drawStrokes}
        onDrawStroke={onDrawStroke}
        placementActive={placementActive}
        shapeSelectActive={shapeSelectActive}
        markerPlaceActive={markerPlaceActive}
        trapPlaceActive={trapPlaceActive}
        containerPlaceActive={containerPlaceActive}
        fogInteractive={fogInteractive}
        effectInteractive={effectInteractive}
        markerInteractive={markerInteractive}
        trapInteractive={trapInteractive}
        containerInteractive={containerInteractive}
        isGm={isGm}
        props={props}
        tokens={tokens}
        displayFogShapes={displayFogShapes}
        displayEffectTemplates={displayEffectTemplates}
        displayMarkers={displayMarkers}
        traps={traps}
        containers={containers}
        fogDraft={fogDraft}
        effectDraft={effectDraft}
        selectedPropId={selectedPropId}
        selectedTokenId={selectedTokenId}
        selectedFogShapeId={selectedFogShapeId}
        selectedEffectTemplateId={selectedEffectTemplateId}
        selectedMarkerId={selectedMarkerId}
        selectedTrapId={selectedTrapId}
        selectedContainerId={selectedContainerId}
        markerTool={markerTool}
        hoverCell={hoverCell}
        hoverReachable={hoverReachable}
        hoverSize={hoverSize}
        characterPlacement={characterPlacement}
        tokenDragPreview={tokenDragPreview}
        setTokenDragPreview={setTokenDragPreview}
        setFogMovePreview={setFogMovePreview}
        setEffectMovePreview={setEffectMovePreview}
        setMarkerMovePreview={setMarkerMovePreview}
        cellFromClient={cellFromClient}
        isCellReachable={isCellReachable}
        hpByRef={hpByRef}
        activeTurnHighlight={activeTurnHighlight}
        ownCharacterId={ownCharacterId}
        characterDisplayUrlById={characterDisplayUrlById}
        characterConditionsById={characterConditionsById}
        onSelectProp={onSelectProp}
        onSelectToken={onSelectToken}
        onSelectFogShape={onSelectFogShape}
        onSelectEffectTemplate={onSelectEffectTemplate}
        onSelectMarker={onSelectMarker}
        onSelectTrap={onSelectTrap}
        onFogShapeMove={onFogShapeMove}
        onFogShapeDelete={onFogShapeDelete}
        onEffectTemplateMove={onEffectTemplateMove}
        onEffectTemplateDelete={onEffectTemplateDelete}
        onMarkerMove={onMarkerMove}
        onMarkerDelete={onMarkerDelete}
        onTrapDelete={onTrapDelete}
        onTrapMarkDiscovered={onTrapMarkDiscovered}
        onTrapTrigger={onTrapTrigger}
        onTrapDisarm={onTrapDisarm}
        onSelectContainer={onSelectContainer}
        onContainerDelete={onContainerDelete}
        onContainerTrapMarkDiscovered={onContainerTrapMarkDiscovered}
        onContainerMarkDiscovered={onContainerMarkDiscovered}
        onContainerTrapTrigger={onContainerTrapTrigger}
        onContainerTrapDisarm={onContainerTrapDisarm}
        playerDisarmActive={playerDisarmActive}
        ownCharacterGrid={ownCharacterGrid}
        onTokenMove={onTokenMove}
        onTokenContextMenu={onTokenContextMenu}
        handleContentClick={handleContentClick}
        handleMouseMove={handleMouseMove}
        setHoverCell={setHoverCell}
        handleShapePointerDown={handleShapePointerDown}
        handleShapePointerMove={handleShapePointerMove}
        handleShapePointerUp={handleShapePointerUp}
        cancelShapeDraw={cancelShapeDraw}
        handlePropDragOver={handlePropDragOver}
        setPropDropHighlight={setPropDropHighlight}
        handlePropDrop={handlePropDrop}
      />
    </div>
  );
}
