"use client";

import { useRef } from "react";
import type { Group } from "three";
import {
  AURENFURT_DISTRICTS,
  sameSelection,
  type CityBuilding,
  type CityDistrictId,
  type HoloSelection,
} from "./aurenfurt-districts";
import { resolveBuildingUv, type BuildingPositions } from "./aurenfurt-building-positions";
import { resolveLandmarkScale, type LandmarkScales } from "./aurenfurt-landmark-scales";
import { resolveLandmarkRotation, type LandmarkRotations } from "./aurenfurt-landmark-rotations";
import { pointInPolygon, type DistrictPolygons, type UvPoint } from "./aurenfurt-district-polygons";
import type { AurenfurtStreet } from "./aurenfurt-streets";
import type { DayWeather } from "./aurenfurt-weather";
import { DistrictNode } from "./DistrictNode";
import { useHoloFloat } from "./hooks/useHoloFloat";
import { HoloBuildingMarker } from "./scene/HoloBuildingMarker";
import { HoloChains } from "./scene/HoloChains";
import { HoloPlatform } from "./scene/HoloPlatform";
import { HoloPoiMarker } from "./scene/HoloPoiMarker";
import { HoloStreetLayer } from "./scene/HoloStreetLayer";
import { HoloWallLayer } from "./scene/HoloWallLayer";
import { HoloWeatherFx } from "./scene/HoloWeatherFx";
import type { WeatherFxId } from "./aurenfurt-weather-fx";
import type { AurenfurtWall } from "./aurenfurt-walls";
import type { AurenfurtMapPoi } from "./aurenfurt-map-pois";
import type { DistrictSector } from "./aurenfurt-sectors";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";
import { DistrictSectorOverlay } from "./scene/DistrictSectorOverlay";
import { HoloDecorationSlot } from "./scene/HoloDecorationLayer";
import { useAurenfurtDeco } from "./AurenfurtDecoProvider";

type Props = {
  selection: HoloSelection | null;
  hovered: HoloSelection | null;
  editorTool: AurenfurtMapEditorTool | null;
  editingDistrictId: CityDistrictId | null;
  editingStreetId: string | null;
  drawingStreet: boolean;
  drawingWall: boolean;
  previewingWall: boolean;
  draftWallPoints: UvPoint[];
  draftWallCurve: number;
  previewWall: AurenfurtWall | null;
  walls: AurenfurtWall[];
  editingWallId: string | null;
  placingBuilding: boolean;
  placingPoi: boolean;
  draftStreetPoints: UvPoint[];
  streets: AurenfurtStreet[];
  dayWeather: DayWeather;
  weatherFx?: WeatherFxId | null;
  weatherFxIntensity?: number;
  viewedDay: string;
  streetsLayerVisible?: boolean;
  buildingsVisible?: boolean;
  poisVisible?: boolean;
  wallsVisible?: boolean;
  polygons: DistrictPolygons;
  /** Sektoren nur des gewählten Viertels (Editor). */
  editingSectors?: DistrictSector[];
  /** true = Vorschau vor dem Speichern (dezente Linien, keine Labels). */
  editingSectorsPreview?: boolean;
  /** Sektoren des Viertels im Stadtereignis-Assistenten, anklickbar. */
  eventPickSectors?: DistrictSector[];
  eventSectorIds?: string[];
  onPickEventSector?: (sector: DistrictSector) => void;
  highlightDistricts?: boolean;
  buildings: CityBuilding[];
  pois: AurenfurtMapPoi[];
  buildingPositions: BuildingPositions;
  landmarkScales?: LandmarkScales;
  landmarkRotations?: LandmarkRotations;
  suppressSelect: boolean;
  onSelect: (selection: HoloSelection | null) => void;
  onHover: (selection: HoloSelection | null) => void;
  onMoveVertex: (districtId: CityDistrictId, index: number, point: UvPoint) => void;
  onMoveBuilding: (buildingId: string, point: UvPoint) => void;
  onMoveStreetPoint: (streetId: string, index: number, point: UvPoint) => void;
  onCommitPolygons: () => void;
  onCommitBuildings: () => void;
  onCommitStreets: () => void;
  onAddDrawPoint: (point: UvPoint) => void;
  onFinishDrawStreet: () => void;
  onAddWallPoint: (point: UvPoint) => void;
  onFinishDrawWall: () => void;
  onMoveWallPoint: (wallId: string, index: number, point: UvPoint) => void;
  onSelectWall: (wallId: string | null) => void;
  onPlaceBuildingPoint: (point: UvPoint) => void;
  onPlacePoiPoint: (point: UvPoint) => void;
  onSelectStreet: (streetId: string | null) => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

export function CityModel({
  selection,
  hovered,
  editorTool,
  editingDistrictId,
  editingStreetId,
  drawingStreet,
  drawingWall,
  previewingWall,
  draftWallPoints,
  draftWallCurve,
  previewWall,
  walls,
  editingWallId,
  placingBuilding,
  placingPoi,
  draftStreetPoints,
  streets,
  dayWeather,
  weatherFx = null,
  weatherFxIntensity = 55,
  viewedDay,
  streetsLayerVisible = true,
  buildingsVisible = true,
  poisVisible = true,
  wallsVisible = true,
  polygons,
  editingSectors = [],
  editingSectorsPreview = false,
  eventPickSectors = [],
  eventSectorIds = [],
  onPickEventSector,
  highlightDistricts = false,
  buildings,
  pois,
  buildingPositions,
  landmarkScales,
  landmarkRotations,
  suppressSelect,
  onSelect,
  onHover,
  onMoveVertex,
  onMoveBuilding,
  onMoveStreetPoint,
  onCommitPolygons,
  onCommitBuildings,
  onCommitStreets,
  onAddDrawPoint,
  onFinishDrawStreet,
  onAddWallPoint,
  onFinishDrawWall,
  onMoveWallPoint,
  onSelectWall,
  onPlaceBuildingPoint,
  onPlacePoiPoint,
  onSelectStreet,
  onOrbitLock,
  onDragActive,
}: Props) {
  const floating = useRef<Group>(null);
  const deco = useAurenfurtDeco();
  const editMode = editorTool !== null;
  useHoloFloat(floating, editMode ? 0 : 0.055);

  const placingSomething = placingBuilding || placingPoi;
  const mapLocked = drawingStreet || drawingWall || placingSomething || deco.placingKey !== null;
  const showDistrictHandles = Boolean(
    editorTool === "districts" && editingDistrictId && !placingSomething,
  );
  const buildingsEditable = editorTool === "buildings" && !placingSomething;
  const streetsEditMode = editorTool === "streets";

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} scale={[1.85, 1, 1]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      <group ref={floating}>
        <HoloChains />
        <HoloPlatform
          onClear={() => onSelect(null)}
          interactive={!mapLocked}
        />
        {AURENFURT_DISTRICTS.map((district) => {
          const entry = polygons[district.id];
          const isEditing = showDistrictHandles && editingDistrictId === district.id;
          return (
            <DistrictNode
              key={district.id}
              district={district}
              points={entry.points}
              color={entry.color}
              hoverOpacity={entry.hoverOpacity}
              selected={sameSelection(selection, { type: "district", id: district.id })}
              hovered={sameSelection(hovered, { type: "district", id: district.id })}
              showHandles={isEditing}
              editingActive={Boolean(editorTool === "districts" && editingDistrictId === district.id)}
              highlight={highlightDistricts}
              suppressSelect={suppressSelect || mapLocked}
              onSelect={onSelect}
              onHover={onHover}
              onMoveVertex={onMoveVertex}
              onCommit={onCommitPolygons}
              onOrbitLock={onOrbitLock}
              onDragActive={onDragActive}
            />
          );
        })}
        {eventPickSectors.length > 0 ? (
          <DistrictSectorOverlay
            sectors={eventPickSectors}
            pickable
            selectedIds={eventSectorIds}
            onPick={onPickEventSector}
          />
        ) : editorTool === "districts" && editingDistrictId && editingSectors.length > 0 ? (
          <DistrictSectorOverlay sectors={editingSectors} preview={editingSectorsPreview} />
        ) : null}
        <group visible={buildingsVisible}>
        {buildings.map((building) => {
          const uv = resolveBuildingUv(building, buildingPositions);
          const polygon = polygons[building.districtId]?.points ?? [];
          const editable = buildingsEditable;
          const outside = editable && !pointInPolygon(uv, polygon);
          return (
            <HoloBuildingMarker
              key={building.id}
              building={building}
              u={uv.u}
              v={uv.v}
              selected={sameSelection(selection, { type: "building", id: building.id })}
              suppressSelect={suppressSelect || mapLocked}
              editable={editable}
              outside={outside}
              landmarkScale={resolveLandmarkScale(building.id, landmarkScales)}
              landmarkRotation={resolveLandmarkRotation(building.id, landmarkRotations)}
              onSelect={(id) => onSelect({ type: "building", id })}
              onHover={(id) => onHover(id ? { type: "building", id } : null)}
              onMove={onMoveBuilding}
              onCommit={onCommitBuildings}
              onOrbitLock={onOrbitLock}
              onDragActive={onDragActive}
            />
          );
        })}
        </group>
        <group visible={poisVisible}>
        {pois.map((poi) => (
          <HoloPoiMarker
            key={poi.id}
            poi={poi}
            selected={sameSelection(selection, { type: "poi", id: poi.id })}
            suppressSelect={suppressSelect || mapLocked}
            onSelect={(id) => onSelect({ type: "poi", id })}
            onHover={(id) => onHover(id ? { type: "poi", id } : null)}
          />
        ))}
        </group>
        <HoloStreetLayer
          streets={streets}
          dayWeather={dayWeather}
          viewedDay={viewedDay}
          editMode={streetsEditMode}
          editingStreetId={editingStreetId}
          drawing={drawingStreet || placingSomething}
          draftPoints={drawingStreet ? draftStreetPoints : []}
          layerVisible={streetsLayerVisible}
          onMoveStreetPoint={onMoveStreetPoint}
          onCommitStreets={onCommitStreets}
          onAddDrawPoint={
            placingPoi ? onPlacePoiPoint : placingBuilding ? onPlaceBuildingPoint : onAddDrawPoint
          }
          onFinishDraw={onFinishDrawStreet}
          onSelectStreet={onSelectStreet}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
        />
        <HoloWallLayer
          walls={walls}
          editMode={editorTool === "walls"}
          editingWallId={editingWallId}
          drawing={drawingWall}
          previewing={previewingWall}
          draftPoints={draftWallPoints}
          draftCurve={draftWallCurve}
          previewWall={previewWall}
          onMovePoint={onMoveWallPoint}
          onAddDrawPoint={onAddWallPoint}
          onFinishDraw={onFinishDrawWall}
          onSelectWall={onSelectWall}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
          layerVisible={wallsVisible}
        />
        <HoloDecorationSlot onOrbitLock={onOrbitLock} onDragActive={onDragActive} />
        {weatherFx ? <HoloWeatherFx effect={weatherFx} intensity={weatherFxIntensity} /> : null}
      </group>
    </>
  );
}
