"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DistrictEditorPanel } from "./DistrictEditorPanel";
import { WallEditorPanel } from "./WallEditorPanel";
import { MapEditorToolbar } from "./MapEditorToolbar";
import type { CityBuilding } from "./aurenfurt-districts";
import type { AurenfurtMapPoi } from "./aurenfurt-map-pois";
import type { useAurenfurtWalls } from "./hooks/useAurenfurtWalls";
import type { useAurenfurtStreets } from "./hooks/useAurenfurtStreets";
import type { useAurenfurtWeather } from "./hooks/useAurenfurtWeather";
import type { useBuildingPositions } from "./hooks/useBuildingPositions";
import type { useDistrictPolygons } from "./hooks/useDistrictPolygons";
import type { useDistrictSectors } from "./hooks/useDistrictSectors";
import type { useLandmarkRotations } from "./hooks/useLandmarkRotations";
import type { useLandmarkScales } from "./hooks/useLandmarkScales";
import type { MapEditorSession } from "./hooks/useMapEditorSession";
import type { useMapEditorMutations } from "./hooks/useMapEditorMutations";

type Props = {
  isGm: boolean;
  session: MapEditorSession;
  mutations: ReturnType<typeof useMapEditorMutations>;
  buildings: CityBuilding[];
  pois: AurenfurtMapPoi[];
  polygons: ReturnType<typeof useDistrictPolygons>;
  sectorsApi: ReturnType<typeof useDistrictSectors>;
  buildingPositions: ReturnType<typeof useBuildingPositions>;
  landmarkScales: ReturnType<typeof useLandmarkScales>;
  landmarkRotations: ReturnType<typeof useLandmarkRotations>;
  streetsApi: ReturnType<typeof useAurenfurtStreets>;
  wallsApi: ReturnType<typeof useAurenfurtWalls>;
  dayWeather: ReturnType<typeof useAurenfurtWeather>["current"];
  viewedDay: string;
  layoutError: string | null;
};

/** Editor-Toolbar und -Panels, per Portal in `document.body` gerendert. */
export function MapEditorPortals({
  isGm,
  session,
  mutations,
  buildings,
  pois,
  polygons,
  sectorsApi,
  buildingPositions,
  landmarkScales,
  landmarkRotations,
  streetsApi,
  wallsApi,
  dayWeather,
  viewedDay,
  layoutError,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const {
    mapAdminMode,
    activeTool,
    wallsTool,
    editingDistrictId,
    selectedBuildingId,
    selectedPoiId,
    editingStreetId,
    drawingStreet,
    draftStreetPoints,
    editingWallId,
    setEditingWallId,
    drawingWall,
    setDrawingWall,
    wallDraftReady,
    setWallDraftReady,
    draftWallPoints,
    setDraftWallPoints,
    wallDraft,
    setWallDraft,
    placingBuilding,
    buildingDraftUv,
    setBuildingDraftUv,
    buildingSaveError,
    categorySaveNote,
    buildingFormKey,
    placingPoi,
    repositioningPoi,
    poiDraftUv,
    setPoiDraftUv,
    poiDraftDistrictId,
    setPoiDraftDistrictId,
    poiSaveError,
    poiFormKey,
    setSectorPreviewSectors,
    toggleTool,
    toggleMapAdminMode,
    closeEditor,
  } = session;

  if (!(isGm && portalReady && mapAdminMode)) return null;

  return createPortal(
    <>
      <MapEditorToolbar
        activeTool={activeTool}
        onToggle={toggleTool}
        onClose={toggleMapAdminMode}
      />
      {wallsTool ? (
        <WallEditorPanel
          walls={wallsApi.walls}
          saved={wallsApi.saved}
          ready={wallsApi.ready}
          saveError={wallsApi.saveError}
          editingWallId={editingWallId}
          drawing={drawingWall}
          draftReady={wallDraftReady}
          draftPointCount={draftWallPoints.length}
          draft={wallDraft}
          onDraftChange={(patch) => setWallDraft((current) => ({ ...current, ...patch }))}
          onStartDraw={() => {
            setEditingWallId(null);
            setWallDraftReady(false);
            setDraftWallPoints([]);
            setDrawingWall(true);
          }}
          onCancelDraw={() => {
            setDrawingWall(false);
            setWallDraftReady(false);
            setDraftWallPoints([]);
          }}
          onFinishLine={() => {
            if (draftWallPoints.length < 2) return;
            setDrawingWall(false);
            setWallDraftReady(true);
          }}
          onConfirmWall={() => {
            if (draftWallPoints.length < 2) return;
            const wall = wallsApi.addWall({
              name: wallDraft.name,
              points: draftWallPoints,
              curve: wallDraft.curve,
              height: wallDraft.height,
              thickness: wallDraft.thickness,
              textureScale: wallDraft.textureScale,
              brightness: wallDraft.brightness,
              merlonCount: wallDraft.merlonCount,
              merlonSize: wallDraft.merlonSize,
            });
            setDrawingWall(false);
            setWallDraftReady(false);
            setDraftWallPoints([]);
            setEditingWallId(wall?.id ?? null);
          }}
          onSelectWall={setEditingWallId}
          onUpdateWall={wallsApi.updateWall}
          onRemoveWall={(id) => {
            wallsApi.removeWall(id);
            setEditingWallId((current) => (current === id ? null : current));
          }}
          onClose={closeEditor}
        />
      ) : activeTool ? (
        <DistrictEditorPanel
          open
          tool={activeTool}
          polygons={polygons.polygons}
          buildings={buildings}
          pois={pois}
          buildingPositions={buildingPositions.positions}
          landmarkScales={landmarkScales.scales}
          onLandmarkScaleChange={landmarkScales.setScale}
          landmarkRotations={landmarkRotations.rotations}
          onLandmarkRotationChange={landmarkRotations.setRotation}
          editingDistrictId={editingDistrictId}
          selectedBuildingId={selectedBuildingId}
          selectedPoiId={selectedPoiId}
          streets={streetsApi.streets}
          editingStreetId={editingStreetId}
          drawingStreet={drawingStreet}
          draftPointCount={draftStreetPoints.length}
          placingBuilding={placingBuilding}
          buildingDraftUv={buildingDraftUv}
          buildingSaveError={buildingSaveError}
          categorySaveNote={categorySaveNote}
          savingBuilding={mutations.savingBuilding}
          savingCategory={mutations.savingCategory}
          buildingFormKey={buildingFormKey}
          placingPoi={placingPoi}
          repositioningPoi={repositioningPoi}
          poiDraftUv={poiDraftUv}
          poiDraftDistrictId={poiDraftDistrictId}
          poiSaveError={poiSaveError}
          savingPoi={mutations.savingPoi}
          poiFormKey={poiFormKey}
          dayWeather={dayWeather}
          viewedDay={viewedDay}
          saved={
            polygons.saved ||
            buildingPositions.saved ||
            landmarkScales.saved ||
            landmarkRotations.saved ||
            streetsApi.saved ||
            sectorsApi.saved
          }
          ready={
            polygons.ready &&
            buildingPositions.ready &&
            landmarkScales.ready &&
            landmarkRotations.ready &&
            streetsApi.ready &&
            sectorsApi.ready
          }
          saveError={layoutError}
          onSelectDistrict={session.selectDistrict}
          onSelectBuilding={session.selectBuilding}
          onSelectPoi={session.selectPoi}
          onSelectStreet={session.selectStreet}
          onColorChange={polygons.setDistrictColor}
          onHoverOpacityChange={polygons.setDistrictHoverOpacity}
          onDivideSectors={(cellSize) => {
            if (!editingDistrictId) return null;
            const poly = polygons.polygons[editingDistrictId]?.points ?? [];
            return sectorsApi.divideDistrict(editingDistrictId, poly, cellSize);
          }}
          onSectorPreviewChange={setSectorPreviewSectors}
          sectorCount={
            editingDistrictId
              ? (sectorsApi.sectorsByDistrict[editingDistrictId]?.length ?? 0)
              : 0
          }
          sectorsByDistrict={sectorsApi.sectorsByDistrict}
          onStartDrawStreet={session.startDrawStreet}
          onFinishDrawStreet={session.finishDrawStreet}
          onCancelDrawStreet={session.cancelDrawStreet}
          onUpdateStreet={streetsApi.updateStreet}
          onRemoveStreet={streetsApi.removeStreet}
          onStartPlaceBuilding={session.startPlaceBuilding}
          onCancelPlaceBuilding={session.cancelPlaceBuilding}
          onClearBuildingDraft={() => setBuildingDraftUv(null)}
          onSaveBuilding={mutations.saveNewBuilding}
          onUpdateBuildingCategory={mutations.saveBuildingCategory}
          onStartPlacePoi={session.startPlacePoi}
          onStartRepositionPoi={session.startRepositionPoi}
          onCancelPlacePoi={session.cancelPlacePoi}
          onClearPoiDraft={() => {
            setPoiDraftUv(null);
            setPoiDraftDistrictId(null);
          }}
          onSavePoi={mutations.saveNewPoi}
          onClose={closeEditor}
        />
      ) : null}
    </>,
    document.body,
  );
}
