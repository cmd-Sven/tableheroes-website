"use client";

import { useEffect, useMemo, useState } from "react";
import type { AurenfurtMapEditorTool } from "../aurenfurt-map-editor-tool";
import {
  findBuilding,
  type CityBuilding,
  type CityDistrictId,
  type HoloSelection,
} from "../aurenfurt-districts";
import type { UvPoint } from "../aurenfurt-district-polygons";
import type { DistrictSector } from "../aurenfurt-sectors";
import {
  WALL_BRIGHTNESS_DEFAULT,
  WALL_CURVE_DEFAULT,
  WALL_HEIGHT_DEFAULT,
  WALL_MERLON_COUNT_DEFAULT,
  WALL_MERLON_SIZE_DEFAULT,
  WALL_TEXTURE_SCALE_DEFAULT,
  WALL_THICKNESS_DEFAULT,
  defaultWall,
} from "../aurenfurt-walls";

type Params = {
  isGm: boolean;
  buildings: CityBuilding[];
  focusSelection: (selection: HoloSelection | null) => void;
  addStreet: (points: UvPoint[]) => string | null | undefined;
};

/** Admin-Tools, Zeichnen/Platzieren und Auswahl-Resets des Karten-Editors. */
export function useMapEditorSession({ isGm, buildings, focusSelection, addStreet }: Params) {
  const [mapAdminMode, setMapAdminMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AurenfurtMapEditorTool | null>(null);
  const [editingDistrictId, setEditingDistrictId] = useState<CityDistrictId | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [editingStreetId, setEditingStreetId] = useState<string | null>(null);
  const [drawingStreet, setDrawingStreet] = useState(false);
  const [draftStreetPoints, setDraftStreetPoints] = useState<UvPoint[]>([]);
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [drawingWall, setDrawingWall] = useState(false);
  const [wallDraftReady, setWallDraftReady] = useState(false);
  const [draftWallPoints, setDraftWallPoints] = useState<UvPoint[]>([]);
  const [wallDraft, setWallDraft] = useState({
    name: "Mauerabschnitt",
    curve: WALL_CURVE_DEFAULT,
    height: WALL_HEIGHT_DEFAULT,
    thickness: WALL_THICKNESS_DEFAULT,
    textureScale: WALL_TEXTURE_SCALE_DEFAULT,
    brightness: WALL_BRIGHTNESS_DEFAULT,
    merlonCount: WALL_MERLON_COUNT_DEFAULT,
    merlonSize: WALL_MERLON_SIZE_DEFAULT,
  });
  const [placingBuilding, setPlacingBuilding] = useState(false);
  const [buildingDraftUv, setBuildingDraftUv] = useState<UvPoint | null>(null);
  const [buildingSaveError, setBuildingSaveError] = useState<string | null>(null);
  const [categorySaveNote, setCategorySaveNote] = useState<string | null>(null);
  const [buildingFormKey, setBuildingFormKey] = useState(0);
  const [placingPoi, setPlacingPoi] = useState(false);
  const [repositioningPoi, setRepositioningPoi] = useState(false);
  const [poiDraftUv, setPoiDraftUv] = useState<UvPoint | null>(null);
  const [poiDraftDistrictId, setPoiDraftDistrictId] = useState<CityDistrictId | null>(null);
  const [poiSaveError, setPoiSaveError] = useState<string | null>(null);
  const [poiFormKey, setPoiFormKey] = useState(0);
  const [sectorPreviewSectors, setSectorPreviewSectors] = useState<DistrictSector[]>([]);

  function resetPlacementState() {
    setPlacingBuilding(false);
    setBuildingDraftUv(null);
    setBuildingSaveError(null);
    setPlacingPoi(false);
    setRepositioningPoi(false);
    setPoiDraftUv(null);
    setPoiDraftDistrictId(null);
    setPoiSaveError(null);
  }

  function resetEditorModes() {
    setEditingDistrictId(null);
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    setEditingStreetId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    setEditingWallId(null);
    setDrawingWall(false);
    setWallDraftReady(false);
    setDraftWallPoints([]);
    setSectorPreviewSectors([]);
    resetPlacementState();
  }

  useEffect(() => {
    if (!isGm && (activeTool || mapAdminMode)) {
      setMapAdminMode(false);
      setActiveTool(null);
      resetEditorModes();
    }
  }, [activeTool, isGm, mapAdminMode]);

  function closeEditor() {
    setActiveTool(null);
    resetEditorModes();
  }

  function toggleMapAdminMode() {
    if (mapAdminMode) {
      closeEditor();
      setMapAdminMode(false);
      return;
    }
    setMapAdminMode(true);
  }

  function toggleTool(tool: AurenfurtMapEditorTool) {
    if (activeTool === tool) {
      closeEditor();
      return;
    }
    resetEditorModes();
    setActiveTool(tool);
  }

  function selectDistrict(id: CityDistrictId | null) {
    setEditingStreetId(null);
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    resetPlacementState();
    setSectorPreviewSectors([]);
    setEditingDistrictId(id);
  }

  function selectBuilding(id: string | null) {
    setEditingStreetId(null);
    setSelectedPoiId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    resetPlacementState();
    setSectorPreviewSectors([]);
    setSelectedBuildingId(id);
    setBuildingSaveError(null);
    setCategorySaveNote(null);
    if (id) {
      const building = findBuilding(id, buildings);
      if (building) {
        setEditingDistrictId(building.districtId);
        focusSelection({ type: "building", id });
      }
    }
  }

  function selectPoi(id: string | null) {
    setEditingStreetId(null);
    setSelectedBuildingId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    resetPlacementState();
    setSectorPreviewSectors([]);
    setSelectedPoiId(id);
    if (id) {
      focusSelection({ type: "poi", id });
    }
  }

  function selectStreet(id: string | null) {
    setEditingDistrictId(null);
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    resetPlacementState();
    setSectorPreviewSectors([]);
    setEditingStreetId(id);
  }

  function startDrawStreet() {
    setEditingDistrictId(null);
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    setEditingStreetId(null);
    resetPlacementState();
    setDrawingStreet(true);
    setDraftStreetPoints([]);
  }

  function cancelDrawStreet() {
    setDrawingStreet(false);
    setDraftStreetPoints([]);
  }

  function finishDrawStreet() {
    if (draftStreetPoints.length < 2) return;
    const id = addStreet(draftStreetPoints);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    if (id) setEditingStreetId(id);
  }

  function addDrawPoint(point: UvPoint) {
    setDraftStreetPoints((current) => [...current, point]);
  }

  function startPlaceBuilding() {
    setEditingStreetId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    setPlacingPoi(false);
    setRepositioningPoi(false);
    setPoiSaveError(null);
    setBuildingSaveError(null);
    setPlacingBuilding(true);
  }

  function cancelPlaceBuilding() {
    setPlacingBuilding(false);
  }

  function startPlacePoi() {
    setEditingStreetId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    setPlacingBuilding(false);
    setBuildingSaveError(null);
    setPoiSaveError(null);
    setRepositioningPoi(false);
    setPlacingPoi(true);
  }

  function startRepositionPoi() {
    if (!selectedPoiId) return;
    setEditingStreetId(null);
    setDrawingStreet(false);
    setDraftStreetPoints([]);
    setPlacingBuilding(false);
    setBuildingSaveError(null);
    setPoiSaveError(null);
    setPoiDraftUv(null);
    setPoiDraftDistrictId(null);
    setRepositioningPoi(true);
    setPlacingPoi(true);
  }

  function cancelPlacePoi() {
    setPlacingPoi(false);
    setRepositioningPoi(false);
  }

  const districtsTool = activeTool === "districts";
  const streetsTool = activeTool === "streets";
  const buildingsTool = activeTool === "buildings";
  const poisTool = activeTool === "pois";
  const wallsTool = activeTool === "walls";
  const streetDrawActive = streetsTool && drawingStreet;
  const wallDrawActive = wallsTool && drawingWall;
  const previewWall = useMemo(() => {
    if (!wallDraftReady || draftWallPoints.length < 2) return null;
    return defaultWall({
      id: "wall-preview",
      points: draftWallPoints,
      ...wallDraft,
    });
  }, [draftWallPoints, wallDraft, wallDraftReady]);
  const placingBuildingActive = buildingsTool && placingBuilding;
  const placingPoiActive = poisTool && placingPoi;

  return {
    mapAdminMode,
    activeTool,
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
    setPlacingBuilding,
    buildingDraftUv,
    setBuildingDraftUv,
    buildingSaveError,
    setBuildingSaveError,
    categorySaveNote,
    setCategorySaveNote,
    buildingFormKey,
    setBuildingFormKey,
    placingPoi,
    setPlacingPoi,
    repositioningPoi,
    setRepositioningPoi,
    poiDraftUv,
    setPoiDraftUv,
    poiDraftDistrictId,
    setPoiDraftDistrictId,
    poiSaveError,
    setPoiSaveError,
    poiFormKey,
    setPoiFormKey,
    sectorPreviewSectors,
    setSectorPreviewSectors,
    districtsTool,
    streetsTool,
    buildingsTool,
    poisTool,
    wallsTool,
    streetDrawActive,
    wallDrawActive,
    previewWall,
    placingBuildingActive,
    placingPoiActive,
    closeEditor,
    toggleMapAdminMode,
    toggleTool,
    selectDistrict,
    selectBuilding,
    selectPoi,
    selectStreet,
    startDrawStreet,
    cancelDrawStreet,
    finishDrawStreet,
    addDrawPoint,
    startPlaceBuilding,
    cancelPlaceBuilding,
    startPlacePoi,
    startRepositionPoi,
    cancelPlacePoi,
  };
}

export type MapEditorSession = ReturnType<typeof useMapEditorSession>;
