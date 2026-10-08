"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { HoloCityRail } from "./HoloCityRail";
import { HoloDayCalendar } from "./HoloDayCalendar";
import { HoloOverlay } from "./HoloOverlay";
import { HoloWeatherControl } from "./HoloWeatherControl";
import { CityViewSwitch, type CitySurface } from "./CityViewSwitch";
import { DistrictEditorPanel } from "./DistrictEditorPanel";
import { WallEditorPanel } from "./WallEditorPanel";
import { MapEditorToolbar } from "./MapEditorToolbar";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";
import {
  CITY_BUILDINGS,
  findBuilding,
  findDistrict,
  type CityBuilding,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { findPlaceLore, type AurenfurtPlaceLore } from "./aurenfurt-lore";
import { pointInPolygon, type UvPoint } from "./aurenfurt-district-polygons";
import { useAurenfurtDay } from "./hooks/useAurenfurtDay";
import { useAurenfurtStreets } from "./hooks/useAurenfurtStreets";
import { useAurenfurtWalls } from "./hooks/useAurenfurtWalls";
import { useAurenfurtWeather } from "./hooks/useAurenfurtWeather";
import { useWeatherFxControl } from "./hooks/useWeatherFxControl";
import { resolveWeatherFx } from "./aurenfurt-weather-fx";
import { useDistrictFactions } from "./hooks/useDistrictFactions";
import { useDistrictMetrics } from "./hooks/useDistrictMetrics";
import { setCitySimLive, simBuildingFromCity } from "./aurenfurt-city-sim";
import { resolveBuildingUv } from "./aurenfurt-building-positions";
import { useDistrictNpcs } from "./hooks/useDistrictNpcs";
import { useBuildingPositions } from "./hooks/useBuildingPositions";
import { useLandmarkScales } from "./hooks/useLandmarkScales";
import { useLandmarkRotations } from "./hooks/useLandmarkRotations";
import { useDistrictPolygons } from "./hooks/useDistrictPolygons";
import { useDistrictSectors } from "./hooks/useDistrictSectors";
import { useHoloCityView } from "./hooks/useHoloCityView";
import { useKeyLocations } from "./hooks/useKeyLocations";
import { useStreetsVisibility } from "./hooks/useStreetsVisibility";
import type { DistrictSector } from "./aurenfurt-sectors";
import {
  WALL_BRIGHTNESS_DEFAULT,
  WALL_CURVE_DEFAULT,
  WALL_HEIGHT_DEFAULT,
  WALL_MERLON_COUNT_DEFAULT,
  WALL_MERLON_SIZE_DEFAULT,
  WALL_TEXTURE_SCALE_DEFAULT,
  WALL_THICKNESS_DEFAULT,
  defaultWall,
} from "./aurenfurt-walls";
import { loadAurenfurtFactionRecordIds, loadAurenfurtNpcRecordIds } from "./load-aurenfurt-npc-records";
import { loadAurenfurtPlaceLore } from "./load-aurenfurt-place-lore";
import {
  createAurenfurtMapBuilding,
  loadAurenfurtCodeBuildingCategories,
  loadAurenfurtMapEditorBuildings,
  updateAurenfurtMapBuildingCategory,
} from "./aurenfurt-map-building-actions";
import { mergeCityBuildings } from "./aurenfurt-map-buildings";
import {
  buildingCategoryForId,
  categoryToBuildingKind,
  isBuildingCategory,
  type BuildingCategory,
} from "./aurenfurt-building-categories";
import { AURENFURT_WORLD_ID, LORE_PLACEHOLDER_IMAGE } from "./aurenfurt-district-lore-ids";
import {
  createAurenfurtMapPoi,
  loadAurenfurtMapEditorPois,
  updateAurenfurtMapPoiPosition,
} from "./aurenfurt-map-poi-actions";
import {
  districtIdAtUv,
  findPoi,
  poisInDistrict,
  type AurenfurtMapPoi,
  type PoiInfluence,
  type PoiKind,
} from "./aurenfurt-map-pois";

const HoloCityCanvas = dynamic(() => import("./scene/HoloCityCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100/80">
      Diorama wird gehoben…
    </div>
  ),
});

const CityDashboard = dynamic(() => import("./CityDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
      Stadtbericht wird gerechnet…
    </div>
  ),
});

type Props = {
  onLeave: () => void;
  worldId?: string | null;
  campaignId?: string | null;
  isGm?: boolean;
};

export function HoloCityMap({ onLeave, worldId = null, campaignId = null, isGm = false }: Props) {
  const [editorBuildings, setEditorBuildings] = useState<CityBuilding[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, BuildingCategory>>({});
  const [pois, setPois] = useState<AurenfurtMapPoi[]>([]);
  const buildings = useMemo(
    () => mergeCityBuildings(editorBuildings, categoryOverrides),
    [editorBuildings, categoryOverrides],
  );

  const view = useHoloCityView(buildings, pois);
  const calendar = useAurenfurtDay();
  const metrics = useDistrictMetrics(view.subject?.districtId ?? null, calendar.day);
  const districtFactions = useDistrictFactions(view.subject?.districtId ?? null, calendar.day);
  const keyLocations = useKeyLocations(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
    buildings,
  );
  const [npcRecordIds, setNpcRecordIds] = useState<Record<string, string> | null>(null);
  const [factionRecordIds, setFactionRecordIds] = useState<Record<string, string>>({});
  const districtNpcs = useDistrictNpcs(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
    npcRecordIds,
    calendar.day,
  );
  const climate = useAurenfurtWeather(calendar.day);
  const weatherFx = useWeatherFxControl();
  const shownWeather = resolveWeatherFx(
    weatherFx.preference,
    climate.current.kind,
    climate.current.intensity,
  );
  const polygons = useDistrictPolygons();
  const sectorsApi = useDistrictSectors();
  const buildingPositions = useBuildingPositions();
  const landmarkScales = useLandmarkScales();
  const landmarkRotations = useLandmarkRotations();
  const streetsApi = useAurenfurtStreets(polygons.polygons);
  const wallsApi = useAurenfurtWalls();

  useEffect(() => {
    setCitySimLive({
      buildings: buildings.map((building) => {
        const uv = resolveBuildingUv(building, buildingPositions.positions);
        return { ...simBuildingFromCity(building), u: uv.u, v: uv.v };
      }),
      streets: streetsApi.streets.map((street) => ({
        districtIds: street.districtIds,
        category: street.category,
        crime: street.crime,
        security: street.security,
        condition: street.condition,
        traffic: street.traffic,
        segments: Math.max(1, street.points.length - 1),
      })),
      pois: pois.map((poi) => ({
        districtId: poi.districtId,
        influences: poi.influences,
      })),
      liveWeatherKind: climate.current.source === "live" ? climate.current.kind : null,
      sectors: sectorsApi.sectorsByDistrict,
      polygons: polygons.polygons,
    });
  }, [
    buildings,
    streetsApi.streets,
    pois,
    climate.current,
    buildingPositions.positions,
    sectorsApi.sectorsByDistrict,
    polygons.polygons,
  ]);
  const { streetsVisible, toggleStreetsVisible } = useStreetsVisibility(isGm);
  const [citySurface, setCitySurface] = useState<CitySurface>("map");
  const [dashboardScope, setDashboardScope] = useState<CityDistrictId | null>(null);
  const [places, setPlaces] = useState<AurenfurtPlaceLore[]>([]);
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
  const [savingBuilding, startSaveBuilding] = useTransition();
  const [savingCategory, startSaveCategory] = useTransition();
  const [placingPoi, setPlacingPoi] = useState(false);
  const [repositioningPoi, setRepositioningPoi] = useState(false);
  const [poiDraftUv, setPoiDraftUv] = useState<UvPoint | null>(null);
  const [poiDraftDistrictId, setPoiDraftDistrictId] = useState<CityDistrictId | null>(null);
  const [poiSaveError, setPoiSaveError] = useState<string | null>(null);
  const [poiFormKey, setPoiFormKey] = useState(0);
  const [savingPoi, startSavePoi] = useTransition();
  const [portalReady, setPortalReady] = useState(false);
  const [sectorPreviewSectors, setSectorPreviewSectors] = useState<DistrictSector[]>([]);

  const editorActive = isGm && activeTool !== null;
  const streetsLayerVisible = editorActive || streetsVisible;
  const resolvedWorldId = worldId || AURENFURT_WORLD_ID;
  const selectedPoi =
    view.subject?.type === "poi" ? findPoi(pois, view.subject.id) : null;
  const districtPoiInfluences = useMemo(() => {
    if (view.subject?.type !== "district") return [];
    return poisInDistrict(pois, view.subject.districtId);
  }, [pois, view.subject]);

  useEffect(() => {
    let active = true;
    loadAurenfurtPlaceLore()
      .then((rows) => {
        if (active) setPlaces(rows);
      })
      .catch(() => {
        if (active) setPlaces([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtNpcRecordIds()
      .then((rows) => {
        if (active) setNpcRecordIds(rows);
      })
      .catch(() => {
        if (active) setNpcRecordIds({});
      });
    loadAurenfurtFactionRecordIds()
      .then((rows) => {
        if (active) setFactionRecordIds(rows);
      })
      .catch(() => {
        if (active) setFactionRecordIds({});
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtMapEditorBuildings()
      .then((rows) => {
        if (active) setEditorBuildings(rows);
      })
      .catch(() => {
        if (active) setEditorBuildings([]);
      });
    loadAurenfurtCodeBuildingCategories()
      .then((rows) => {
        if (active) setCategoryOverrides(rows);
      })
      .catch(() => {
        /* Defaults aus BUILDING_CATEGORY_BY_ID bleiben */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtMapEditorPois()
      .then((rows) => {
        if (active) setPois(rows);
      })
      .catch(() => {
        if (active) setPois([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
    if (!isGm && activeTool) {
      setActiveTool(null);
      resetEditorModes();
    }
  }, [activeTool, isGm]);

  function closeEditor() {
    setActiveTool(null);
    resetEditorModes();
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
        view.focus({ type: "building", id });
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
      view.focus({ type: "poi", id });
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
    const id = streetsApi.addStreet(draftStreetPoints);
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

  const placeBuildingPoint = useCallback(
    (point: UvPoint) => {
      if (!editingDistrictId) return;
      const poly = polygons.polygons[editingDistrictId]?.points ?? [];
      if (!pointInPolygon(point, poly)) {
        setBuildingSaveError("Gebäude nur innerhalb des Viertel-Polygons platzieren.");
        return;
      }
      setBuildingSaveError(null);
      setBuildingDraftUv(point);
      setPlacingBuilding(false);
    },
    [editingDistrictId, polygons.polygons],
  );

  const placePoiPoint = useCallback(
    (point: UvPoint) => {
      const districtId = districtIdAtUv(point, polygons.polygons);
      if (!districtId) {
        setPoiSaveError(
          "Dieser Punkt liegt in keinem Viertel. Bitte innerhalb einer Viertel-Fläche setzen.",
        );
        return;
      }
      setPoiSaveError(null);

      if (repositioningPoi && selectedPoiId) {
        setPlacingPoi(false);
        setRepositioningPoi(false);
        startSavePoi(async () => {
          const result = await updateAurenfurtMapPoiPosition({
            worldId: resolvedWorldId,
            poiId: selectedPoiId,
            districtId,
            u: point.u,
            v: point.v,
          });
          if (!result.ok) {
            setPoiSaveError(result.error);
            return;
          }
          setPois((current) => [
            ...current.filter((p) => p.id !== result.poi.id),
            result.poi,
          ]);
        });
        return;
      }

      setPoiDraftUv(point);
      setPoiDraftDistrictId(districtId);
      setPlacingPoi(false);
    },
    [polygons.polygons, repositioningPoi, resolvedWorldId, selectedPoiId],
  );

  function saveNewBuilding(input: {
    name: string;
    summary: string;
    category: BuildingCategory;
    streetId: string | null;
  }) {
    if (!editingDistrictId || !buildingDraftUv) {
      setBuildingSaveError("Bitte zuerst eine Position im Viertel setzen.");
      return;
    }
    setBuildingSaveError(null);
    setCategorySaveNote(null);
    startSaveBuilding(async () => {
      const result = await createAurenfurtMapBuilding({
        worldId: resolvedWorldId,
        districtId: editingDistrictId,
        name: input.name,
        summary: input.summary,
        category: input.category,
        u: buildingDraftUv.u,
        v: buildingDraftUv.v,
        streetId: input.streetId,
      });
      if (!result.ok) {
        setBuildingSaveError(result.error);
        return;
      }
      setEditorBuildings((current) => [
        ...current.filter((b) => b.id !== result.building.id),
        result.building,
      ]);
      buildingPositions.placeAndCommit(result.building.id, {
        u: result.building.u,
        v: result.building.v,
      });
      setBuildingDraftUv(null);
      setPlacingBuilding(false);
      setBuildingFormKey((key) => key + 1);
      setPlaces((current) => [
        ...current.filter((p) => p.name !== result.building.name),
        {
          name: result.building.name,
          description: result.building.summary,
          imageUrl: LORE_PLACEHOLDER_IMAGE,
        },
      ]);
    });
  }

  function saveBuildingCategory(buildingId: string, category: BuildingCategory) {
    if (!isBuildingCategory(category)) {
      setBuildingSaveError("Bitte eine gültige Kategorie wählen.");
      return;
    }

    const previous =
      (isBuildingCategory(categoryOverrides[buildingId])
        ? categoryOverrides[buildingId]
        : null) ??
      buildingCategoryForId(
        buildingId,
        findBuilding(buildingId, buildings)?.category ?? null,
      );

    setBuildingSaveError(null);
    setCategorySaveNote(null);
    setCategoryOverrides((current) => ({ ...current, [buildingId]: category }));
    setEditorBuildings((current) =>
      current.map((building) =>
        building.id === buildingId
          ? { ...building, category, kind: categoryToBuildingKind(category) }
          : building,
      ),
    );

    startSaveCategory(async () => {
      const result = await updateAurenfurtMapBuildingCategory({
        locationId: buildingId,
        category,
        worldId: resolvedWorldId,
      });
      if (!result.ok) {
        setCategoryOverrides((current) => ({ ...current, [buildingId]: previous }));
        setEditorBuildings((current) =>
          current.map((building) =>
            building.id === buildingId
              ? { ...building, category: previous, kind: categoryToBuildingKind(previous) }
              : building,
          ),
        );
        setBuildingSaveError(result.error);
        return;
      }
      if (!result.persisted) {
        setCategorySaveNote(result.note);
      }
    });
  }

  function saveNewPoi(input: {
    name: string;
    description: string;
    kind: PoiKind;
    imageUrl: string | null;
    influences: PoiInfluence[];
  }) {
    if (!poiDraftUv || !poiDraftDistrictId) {
      setPoiSaveError("Bitte zuerst eine Position auf der Karte setzen.");
      return;
    }
    setPoiSaveError(null);
    startSavePoi(async () => {
      const result = await createAurenfurtMapPoi({
        worldId: resolvedWorldId,
        districtId: poiDraftDistrictId,
        name: input.name,
        description: input.description,
        kind: input.kind,
        imageUrl: input.imageUrl,
        influences: input.influences,
        u: poiDraftUv.u,
        v: poiDraftUv.v,
      });
      if (!result.ok) {
        setPoiSaveError(result.error);
        return;
      }
      setPois((current) => [...current.filter((p) => p.id !== result.poi.id), result.poi]);
      setPoiDraftUv(null);
      setPoiDraftDistrictId(null);
      setPlacingPoi(false);
      setRepositioningPoi(false);
      setPoiFormKey((key) => key + 1);
      setPlaces((current) => [
        ...current.filter((p) => p.name !== result.poi.name),
        {
          name: result.poi.name,
          description: result.poi.description,
          imageUrl: result.poi.imageUrl,
        },
      ]);
    });
  }

  const hint =
    view.hoveredSubject && view.hoveredSubject.id !== view.subject?.id
      ? view.hoveredSubject.name
      : null;

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

  const editorControls =
    isGm && portalReady
      ? createPortal(
          <>
            <MapEditorToolbar activeTool={activeTool} onToggle={toggleTool} />
            {wallsTool ? (
              <WallEditorPanel
                walls={wallsApi.walls}
                savedLocally={wallsApi.savedLocally}
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
                savingBuilding={savingBuilding}
                savingCategory={savingCategory}
                buildingFormKey={buildingFormKey}
                placingPoi={placingPoi}
                repositioningPoi={repositioningPoi}
                poiDraftUv={poiDraftUv}
                poiDraftDistrictId={poiDraftDistrictId}
                poiSaveError={poiSaveError}
                savingPoi={savingPoi}
                poiFormKey={poiFormKey}
                dayWeather={climate.current}
                viewedDay={calendar.day}
                savedLocally={
                  polygons.savedLocally ||
                  buildingPositions.savedLocally ||
                  landmarkScales.savedLocally ||
                  landmarkRotations.savedLocally ||
                  streetsApi.savedLocally ||
                  sectorsApi.savedLocally
                }
                onSelectDistrict={selectDistrict}
                onSelectBuilding={selectBuilding}
                onSelectPoi={selectPoi}
                onSelectStreet={selectStreet}
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
                onStartDrawStreet={startDrawStreet}
                onFinishDrawStreet={finishDrawStreet}
                onCancelDrawStreet={cancelDrawStreet}
                onUpdateStreet={streetsApi.updateStreet}
                onRemoveStreet={streetsApi.removeStreet}
                onStartPlaceBuilding={startPlaceBuilding}
                onCancelPlaceBuilding={cancelPlaceBuilding}
                onClearBuildingDraft={() => setBuildingDraftUv(null)}
                onSaveBuilding={saveNewBuilding}
                onUpdateBuildingCategory={saveBuildingCategory}
                onStartPlacePoi={startPlacePoi}
                onStartRepositionPoi={startRepositionPoi}
                onCancelPlacePoi={cancelPlacePoi}
                onClearPoiDraft={() => {
                  setPoiDraftUv(null);
                  setPoiDraftDistrictId(null);
                }}
                onSavePoi={saveNewPoi}
                onClose={closeEditor}
              />
            ) : null}
          </>,
          document.body,
        )
      : null;

  return (
    <div className="fixed inset-0 z-[80] flex bg-[#02080c]">
      <HoloCityRail
        selection={view.selection}
        subject={view.subject}
        sim={metrics.sim}
        scopeLabel={view.subject ? (findDistrict(view.subject.districtId)?.name ?? "Viertel") : "Stadt gesamt"}
        onSelect={(selection) => {
          view.focus(selection);
          if (citySurface === "dashboard" && selection.type === "district") setDashboardScope(selection.id);
        }}
        onLeave={onLeave}
      />
      {citySurface === "map" ? (
      <HoloOverlay
        subject={view.subject}
        lore={view.subject ? findPlaceLore(places, view.subject.name) : null}
        sim={metrics.sim}
        series={metrics.series}
        weather={climate.current}
        weatherSeries={climate.series}
        influences={metrics.influences}
        factions={districtFactions.factions}
        factionRecordIds={factionRecordIds}
        locations={keyLocations.locations}
        selectedLocation={keyLocations.selected}
        leaders={districtNpcs.leaders}
        operator={districtNpcs.operator}
        npcLinkContext={{ worldId, campaignId }}
        viewDay={calendar.day}
        isGm={isGm}
        selectedPoi={selectedPoi}
        districtPois={districtPoiInfluences}
        landmark={
          view.subject?.type === "building"
            ? (buildings.find((entry) => entry.id === view.subject?.id)?.landmark ?? null)
            : null
        }
        onClose={() => view.focus(null)}
        onSelect={view.focus}
      />
      ) : null}
      <div className="relative min-w-0 flex-1">
        <div className={citySurface === "dashboard" ? "invisible absolute inset-0" : "h-full"}>
        <HoloCityCanvas
          selection={view.selection}
          hovered={view.hovered}
          editorTool={isGm ? activeTool : null}
          editingDistrictId={
            isGm && (districtsTool || buildingsTool) ? editingDistrictId : null
          }
          editingStreetId={isGm && streetsTool ? editingStreetId : null}
          drawingStreet={isGm && streetDrawActive}
          drawingWall={isGm && wallDrawActive}
          previewingWall={isGm && wallsTool && (drawingWall || wallDraftReady)}
          draftWallPoints={draftWallPoints}
          draftWallCurve={wallDraft.curve}
          previewWall={isGm && wallsTool ? previewWall : null}
          walls={wallsApi.walls}
          editingWallId={isGm && wallsTool ? editingWallId : null}
          placingBuilding={isGm && placingBuildingActive}
          placingPoi={isGm && placingPoiActive}
          draftStreetPoints={draftStreetPoints}
          streets={streetsApi.streets}
          dayWeather={climate.current}
          weatherFx={shownWeather.effect}
          weatherFxIntensity={shownWeather.intensity}
          viewedDay={calendar.day}
          streetsLayerVisible={streetsLayerVisible}
          polygons={polygons.polygons}
          editingSectors={
            isGm && districtsTool && editingDistrictId
              ? (sectorsApi.sectorsByDistrict[editingDistrictId]?.length ?? 0) > 0
                ? (sectorsApi.sectorsByDistrict[editingDistrictId] ?? [])
                : sectorPreviewSectors
              : []
          }
          editingSectorsPreview={Boolean(
            isGm &&
              districtsTool &&
              editingDistrictId &&
              (sectorsApi.sectorsByDistrict[editingDistrictId]?.length ?? 0) === 0 &&
              sectorPreviewSectors.length > 0,
          )}
          buildings={buildings.length > 0 ? buildings : CITY_BUILDINGS}
          pois={pois}
          buildingPositions={buildingPositions.positions}
          landmarkScales={landmarkScales.scales}
          landmarkRotations={landmarkRotations.rotations}
          onSelect={view.focus}
          onHover={view.hover}
          onMoveVertex={polygons.moveVertex}
          onMoveBuilding={buildingPositions.moveBuilding}
          onMoveStreetPoint={streetsApi.moveStreetPoint}
          onCommitPolygons={polygons.commit}
          onCommitBuildings={buildingPositions.commit}
          onCommitStreets={streetsApi.commit}
          onAddDrawPoint={addDrawPoint}
          onFinishDrawStreet={finishDrawStreet}
          onAddWallPoint={(point) => setDraftWallPoints((current) => [...current, point])}
          onFinishDrawWall={() => {
            if (draftWallPoints.length < 2) return;
            setDrawingWall(false);
            setWallDraftReady(true);
          }}
          onMoveWallPoint={wallsApi.movePoint}
          onSelectWall={setEditingWallId}
          onPlaceBuildingPoint={placeBuildingPoint}
          onPlacePoiPoint={placePoiPoint}
          onSelectStreet={selectStreet}
        />
        <div className="pointer-events-none absolute left-4 top-4 z-10 space-y-2">
          <CityViewSwitch mode={citySurface} onChange={setCitySurface} />
          <div>
            <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
            <p className="font-libre text-sm text-gray-300">
              {wallDrawActive
                ? "Klicke Punkte für die Mauer. Doppelklick schließt die Linie."
                : placingBuildingActive
                ? "Klicke im Viertel, um das Gebäude zu setzen."
                : placingPoiActive
                  ? repositioningPoi
                    ? "Klicke auf die Karte, um den Ort neu zu setzen."
                    : "Klicke auf die Karte, um den besonderen Ort zu setzen."
                  : (hint ?? view.subject?.name ?? "Viertel links wählen.")}
            </p>
          </div>
          <HoloDayCalendar
            day={calendar.day}
            minDay={calendar.minDay}
            maxDay={calendar.maxDay}
            isToday={calendar.isToday}
            onDayChange={calendar.setDay}
            onStepDay={calendar.stepDay}
            onStepYear={calendar.stepYear}
            onGoToday={calendar.goToday}
          />
          {!editorActive ? (
            <button
              type="button"
              aria-label="Straßen ein- oder ausblenden"
              aria-pressed={streetsVisible}
              onClick={toggleStreetsVisible}
              className={`pointer-events-auto inline-flex items-center rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide shadow-lg backdrop-blur-md transition-colors ${
                streetsVisible
                  ? "border-accent-gold/70 bg-hero-dark/95 text-accent-gold"
                  : "border-hero-dark bg-background-dark/90 text-gray-400 hover:border-accent-gold/40 hover:text-accent-gold/80"
              }`}
            >
              Straßen
            </button>
          ) : null}
          <HoloWeatherControl
            enabled={weatherFx.preference.enabled}
            mode={weatherFx.preference.mode}
            autoEffect={shownWeather.autoEffect}
            onEnabledChange={weatherFx.setEnabled}
            onModeChange={weatherFx.setMode}
          />
        </div>
        </div>
        {citySurface === "dashboard" ? (
          <CityDashboard
            day={calendar.day}
            minDay={calendar.minDay}
            maxDay={calendar.maxDay}
            isToday={calendar.isToday}
            liveWeather={climate.current}
            scopeId={dashboardScope}
            onScopeId={setDashboardScope}
            onDayChange={calendar.setDay}
            onStepDay={calendar.stepDay}
            onStepYear={calendar.stepYear}
            onGoToday={calendar.goToday}
            onShowMap={() => setCitySurface("map")}
          />
        ) : null}
      </div>

      {editorControls}
    </div>
  );
}
