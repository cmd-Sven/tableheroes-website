"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CityModel } from "../CityModel";
import type { BuildingPositions } from "../aurenfurt-building-positions";
import type { LandmarkScales } from "../aurenfurt-landmark-scales";
import type { LandmarkRotations } from "../aurenfurt-landmark-rotations";
import type { CityBuilding, CityDistrictId, HoloSelection } from "../aurenfurt-districts";
import type { DistrictPolygons, UvPoint } from "../aurenfurt-district-polygons";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import type { AurenfurtStreet } from "../aurenfurt-streets";
import type { AurenfurtWall } from "../aurenfurt-walls";
import type { DayWeather } from "../aurenfurt-weather";
import type { WeatherFxId } from "../aurenfurt-weather-fx";
import type { DistrictSector } from "../aurenfurt-sectors";
import type { SectorCrimeCell } from "../aurenfurt-crime-heatmap";
import type { PoiReachCell } from "../aurenfurt-sector-reach";
import type { AurenfurtMapEditorTool } from "../aurenfurt-map-editor-tool";
import { HoloFocusRig } from "./HoloFocusRig";

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
  editingSectors?: DistrictSector[];
  /** true = Vorschau vor dem Speichern (dezente Linien). */
  editingSectorsPreview?: boolean;
  eventPickSectors?: DistrictSector[];
  eventSectorIds?: string[];
  onPickEventSector?: (sector: DistrictSector) => void;
  crimeHeatmapVisible?: boolean;
  crimeCells?: SectorCrimeCell[];
  poiReachCells?: PoiReachCell[];
  poiReachVisible?: boolean;
  /** Kamera bleibt stehen, z. B. während der Ort auf der Karte gewählt wird. */
  holdStill?: boolean;
  highlightDistricts?: boolean;
  buildings: CityBuilding[];
  pois: AurenfurtMapPoi[];
  worldId: string;
  campaignId?: string | null;
  buildingPositions: BuildingPositions;
  landmarkScales?: LandmarkScales;
  landmarkRotations?: LandmarkRotations;
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
  onMovePoi?: (poiId: string, point: UvPoint) => void;
  onCommitPoi?: (poiId: string) => void;
  onSelectStreet: (streetId: string | null) => void;
  /** WebGL-Kontext steht — Lade-Overlay kann auf Assets warten. */
  onSceneBoot?: () => void;
};

type BoundaryProps = { children: ReactNode; onRetry?: () => void };
type BoundaryState = { failed: boolean; message: string | null; webglLikely: boolean };

function isLikelyWebGlFailure(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /webgl|WebGL|WEBGL|getContext|GPU|graphics context/i.test(text);
}

class HoloCityErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, message: null, webglLikely: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    const message = error instanceof Error ? error.message : String(error ?? "Unbekannter Fehler");
    return {
      failed: true,
      message,
      webglLikely: isLikelyWebGlFailure(error),
    };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error("[HoloCity] Diorama-Renderfehler:", error, info?.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-libre text-sm text-gray-300">
            {this.state.webglLikely
              ? "Das Diorama konnte nicht geladen werden. WebGL ist in diesem Browser nicht verfügbar oder wurde blockiert."
              : "Das Diorama konnte nicht geladen werden. Der 3D-Aufbau ist fehlgeschlagen."}
          </p>
          {this.state.message ? (
            <p className="max-w-md font-libre text-xs text-gray-500 break-words">
              {this.state.message}
            </p>
          ) : null}
          {this.props.onRetry ? (
            <button
              type="button"
              onClick={this.props.onRetry}
              className="rounded border border-hero-border/60 bg-background-dark/80 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:border-accent-gold"
            >
              Erneut versuchen
            </button>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

function CursorReset() {
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  return null;
}

export default function HoloCityCanvas({
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
  crimeHeatmapVisible = false,
  crimeCells = [],
  poiReachCells = [],
  poiReachVisible = false,
  holdStill = false,
  highlightDistricts = false,
  buildings,
  pois,
  worldId,
  campaignId = null,
  buildingPositions,
  landmarkScales,
  landmarkRotations,
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
  onMovePoi,
  onCommitPoi,
  onSelectStreet,
  onSceneBoot,
}: Props) {
  const [orbitLocked, setOrbitLocked] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const dragActiveRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placingSomething = placingBuilding || placingPoi;
  /** Kamera-Draufsicht-Lock nur beim Straßen-Zeichnen. */
  const cameraDrawLock = drawingStreet || drawingWall;
  const rotateLocked = orbitLocked || cameraDrawLock;
  const editMode = editorTool !== null;

  useEffect(
    () => () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    },
    [],
  );

  function onDragActive(active: boolean) {
    if (suppressTimerRef.current) {
      clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
    if (active) {
      dragActiveRef.current = true;
      setDragActive(true);
      return;
    }
    suppressTimerRef.current = setTimeout(() => {
      dragActiveRef.current = false;
      setDragActive(false);
      suppressTimerRef.current = null;
    }, 80);
  }

  return (
    <HoloCityErrorBoundary key={canvasKey} onRetry={() => setCanvasKey((value) => value + 1)}>
      <Suspense fallback={<div className="h-full w-full bg-[#02080c]" aria-hidden />}>
        <Canvas
          camera={{ position: [0.2, 3.5, 5.25], fov: 34, near: 0.1, far: 40 }}
          // Schweben, Autorotation, Wetter und der Heatmap-Fade hängen an useFrame.
          frameloop="always"
          shadows={false}
          dpr={[1, 1.25]}
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onCreated={() => onSceneBoot?.()}
          onPointerMissed={() => {
            if (dragActiveRef.current || drawingStreet || drawingWall || placingSomething) return;
            onSelect(null);
          }}
        >
          <color attach="background" args={["#02080c"]} />
          <fog attach="fog" args={["#02080c", 8.5, 16]} />
          <ambientLight intensity={0.64} />
          <directionalLight position={[3.4, 6.4, 2.4]} intensity={1.5} color="#fff6e4" />
          <directionalLight position={[-4.2, 2.4, -1.6]} intensity={0.3} color="#9fd8ff" />
          <pointLight position={[0, -0.7, 0]} intensity={1.8} color="#37d7ff" distance={8} />
          <Suspense fallback={null}>
            <CityModel
              selection={selection}
              hovered={hovered}
              editorTool={editorTool}
              editingDistrictId={editingDistrictId}
              editingStreetId={editingStreetId}
              drawingStreet={drawingStreet}
              drawingWall={drawingWall}
              previewingWall={previewingWall}
              draftWallPoints={draftWallPoints}
              draftWallCurve={draftWallCurve}
              previewWall={previewWall}
              walls={walls}
              editingWallId={editingWallId}
              placingBuilding={placingBuilding}
              placingPoi={placingPoi}
              draftStreetPoints={draftStreetPoints}
              streets={streets}
              dayWeather={dayWeather}
              weatherFx={weatherFx}
              weatherFxIntensity={weatherFxIntensity}
              viewedDay={viewedDay}
              streetsLayerVisible={streetsLayerVisible}
              buildingsVisible={buildingsVisible}
              poisVisible={poisVisible}
              wallsVisible={wallsVisible}
              polygons={polygons}
              editingSectors={editingSectors}
              editingSectorsPreview={editingSectorsPreview}
              eventPickSectors={eventPickSectors}
              eventSectorIds={eventSectorIds}
              onPickEventSector={onPickEventSector}
              crimeHeatmapVisible={crimeHeatmapVisible}
              crimeCells={crimeCells}
              poiReachCells={poiReachCells}
              poiReachVisible={poiReachVisible}
              highlightDistricts={highlightDistricts}
              buildings={buildings}
              pois={pois}
              worldId={worldId}
              campaignId={campaignId}
              buildingPositions={buildingPositions}
              landmarkScales={landmarkScales}
              landmarkRotations={landmarkRotations}
              suppressSelect={dragActive}
              onSelect={onSelect}
              onHover={onHover}
              onMoveVertex={onMoveVertex}
              onMoveBuilding={onMoveBuilding}
              onMoveStreetPoint={onMoveStreetPoint}
              onCommitPolygons={onCommitPolygons}
              onCommitBuildings={onCommitBuildings}
              onCommitStreets={onCommitStreets}
              onAddDrawPoint={onAddDrawPoint}
              onFinishDrawStreet={onFinishDrawStreet}
              onAddWallPoint={onAddWallPoint}
              onFinishDrawWall={onFinishDrawWall}
              onMoveWallPoint={onMoveWallPoint}
              onSelectWall={onSelectWall}
              onPlaceBuildingPoint={onPlaceBuildingPoint}
              onPlacePoiPoint={onPlacePoiPoint}
              onMovePoi={onMovePoi}
              onCommitPoi={onCommitPoi}
              onSelectStreet={onSelectStreet}
              onOrbitLock={setOrbitLocked}
              onDragActive={onDragActive}
            />
          </Suspense>
          <HoloFocusRig
            selection={selection}
            polygons={polygons}
            buildingPositions={buildingPositions}
            buildings={buildings}
            pois={pois}
            drawingStreet={cameraDrawLock}
          />
          <OrbitControls
            makeDefault
            enabled={!cameraDrawLock}
            enablePan={false}
            enableRotate={!rotateLocked}
            enableZoom={!rotateLocked}
            enableDamping={!cameraDrawLock}
            dampingFactor={0.08}
            autoRotate={!selection && !editMode && !rotateLocked && !holdStill}
            autoRotateSpeed={0.28}
            minPolarAngle={0}
            maxPolarAngle={cameraDrawLock ? 0 : 1.15}
            minDistance={2.8}
            maxDistance={cameraDrawLock ? 14 : 12}
            target={[0, 0.12, 0]}
          />
          <CursorReset />
        </Canvas>
      </Suspense>
    </HoloCityErrorBoundary>
  );
}
