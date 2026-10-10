"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, Building2, MapPin, Route, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  AURENFURT_DISTRICTS,
  buildingsInDistrict,
  type CityBuilding,
  type CityDistrict,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { BUILDING_CATEGORIES, buildingCategoryForId, type BuildingCategory } from "./aurenfurt-building-categories";
import { resolveBuildingUv, type BuildingPositions } from "./aurenfurt-building-positions";
import { allAurenfurtNpcs } from "./aurenfurt-npcs";
import { reportBuildingReach } from "./aurenfurt-sector-reach";
import type { DistrictSectorsByDistrict } from "./aurenfurt-sectors";
import {
  LANDMARK_SCALE_DEFAULT,
  LANDMARK_SCALE_MAX,
  LANDMARK_SCALE_MIN,
  LANDMARK_SCALE_STEP,
  resolveLandmarkScale,
  type LandmarkScales,
} from "./aurenfurt-landmark-scales";
import {
  LANDMARK_ROTATION_MAX,
  LANDMARK_ROTATION_MIN,
  LANDMARK_ROTATION_STEP,
  resolveLandmarkRotation,
  type LandmarkRotations,
} from "./aurenfurt-landmark-rotations";
import { pointInPolygon, type DistrictPolygons, type UvPoint } from "./aurenfurt-district-polygons";
import { nearbyStreetsForBuilding, isCityBuildingActive } from "./aurenfurt-map-buildings";
import {
  POI_INFLUENCE_ASPECTS,
  POI_KINDS,
  formatInfluenceDelta,
  type AurenfurtMapPoi,
  type PoiInfluence,
  type PoiInfluenceAspect,
  type PoiKind,
} from "./aurenfurt-map-pois";
import {
  STREET_CATEGORY_META,
  STREET_WIDTH_MAX,
  STREET_WIDTH_MIN,
  candidateConnectStreets,
  effectiveStreet,
  streetCategoryLabel,
  validateStreetConnections,
  worksKindLabel,
  type AurenfurtStreet,
  type StreetCategory,
  type StreetWorks,
} from "./aurenfurt-streets";
import type { DayWeather } from "./aurenfurt-weather";
import { uploadLoreImage } from "@/src/lib/profile-media";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import {
  SECTOR_SIZE_DEFAULT,
  SECTOR_SIZE_MAX,
  SECTOR_SIZE_MIN,
  SECTOR_SIZE_STEP,
  clampSectorSize,
  divideDistrictIntoSectors,
  type DistrictSector,
  type DivideDistrictResult,
  type SectorCellSize,
} from "./aurenfurt-sectors";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";

type Props = {
  open: boolean;
  tool: AurenfurtMapEditorTool;
  polygons: DistrictPolygons;
  buildings: CityBuilding[];
  pois: AurenfurtMapPoi[];
  buildingPositions: BuildingPositions;
  landmarkScales: LandmarkScales;
  onLandmarkScaleChange: (buildingId: string, scale: number) => void;
  landmarkRotations: LandmarkRotations;
  onLandmarkRotationChange: (buildingId: string, degrees: number) => void;
  editingDistrictId: CityDistrictId | null;
  selectedBuildingId: string | null;
  selectedPoiId: string | null;
  streets: AurenfurtStreet[];
  editingStreetId: string | null;
  drawingStreet: boolean;
  draftPointCount: number;
  placingBuilding: boolean;
  buildingDraftUv: UvPoint | null;
  buildingSaveError: string | null;
  categorySaveNote: string | null;
  savingBuilding: boolean;
  savingCategory: boolean;
  buildingFormKey: number;
  placingPoi: boolean;
  repositioningPoi: boolean;
  poiDraftUv: UvPoint | null;
  poiDraftDistrictId: CityDistrictId | null;
  poiSaveError: string | null;
  savingPoi: boolean;
  poiFormKey: number;
  dayWeather: DayWeather;
  viewedDay: string;
  saved: boolean;
  ready: boolean;
  saveError: string | null;
  sectorCount: number;
  sectorsByDistrict: DistrictSectorsByDistrict;
  onSelectDistrict: (id: CityDistrictId | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onSelectPoi: (id: string | null) => void;
  onSelectStreet: (id: string | null) => void;
  onColorChange: (id: CityDistrictId, color: string) => void;
  onHoverOpacityChange: (id: CityDistrictId, opacity: number) => void;
  onDivideSectors: (cellSize: SectorCellSize) => DivideDistrictResult | null;
  onSectorPreviewChange: (sectors: DistrictSector[]) => void;
  onStartDrawStreet: () => void;
  onFinishDrawStreet: () => void;
  onCancelDrawStreet: () => void;
  onUpdateStreet: (
    streetId: string,
    patch: Partial<Omit<AurenfurtStreet, "id" | "points" | "districtIds">>,
  ) => void;
  onRemoveStreet: (streetId: string) => void;
  onStartPlaceBuilding: () => void;
  onCancelPlaceBuilding: () => void;
  onClearBuildingDraft: () => void;
  onSaveBuilding: (input: {
    name: string;
    summary: string;
    category: BuildingCategory;
    streetId: string | null;
  }) => void;
  onUpdateBuildingCategory: (buildingId: string, category: BuildingCategory) => void;
  onStartPlacePoi: () => void;
  onStartRepositionPoi: () => void;
  onCancelPlacePoi: () => void;
  onClearPoiDraft: () => void;
  onSavePoi: (input: {
    name: string;
    description: string;
    kind: PoiKind;
    imageUrl: string | null;
    influences: PoiInfluence[];
  }) => void;
  onClose: () => void;
};

const TOOL_TITLES: Record<AurenfurtMapEditorTool, string> = {
  districts: "Viertel",
  streets: "Straßen",
  buildings: "Gebäude",
  pois: "Orte",
  walls: "Mauern",
};

const COLOR_PRESETS = ["#7ec8ff", "#f0d85a", "#e0a36a", "#b7e38a", "#ff8a6a", "#ffe38a", "#cab926", "#23c763"];

const WORKS_OPTIONS: { kind: StreetWorks["kind"]; label: string }[] = [
  { kind: "none", label: "Normal" },
  { kind: "full_closure", label: "Komplettsperrung" },
  { kind: "full_closure_detour", label: "Sperrung + Umgehung" },
  { kind: "partial", label: "Teilsperrung" },
  { kind: "works", label: "Bauarbeiten" },
];

const CATEGORY_OPTIONS: StreetCategory[] = ["main", "side", "alley"];

type StreetLinkDraft = {
  category: StreetCategory;
  width: number;
  connectsTo: string[];
};

export function DistrictEditorPanel({
  open,
  tool,
  polygons,
  buildings,
  pois,
  buildingPositions,
  landmarkScales,
  onLandmarkScaleChange,
  landmarkRotations,
  onLandmarkRotationChange,
  editingDistrictId,
  selectedBuildingId,
  selectedPoiId,
  streets,
  editingStreetId,
  drawingStreet,
  draftPointCount,
  placingBuilding,
  buildingDraftUv,
  buildingSaveError,
  categorySaveNote,
  savingBuilding,
  savingCategory,
  buildingFormKey,
  placingPoi,
  repositioningPoi,
  poiDraftUv,
  poiDraftDistrictId,
  poiSaveError,
  savingPoi,
  poiFormKey,
  dayWeather,
  viewedDay,
  saved,
  ready,
  saveError,
  sectorCount,
  sectorsByDistrict,
  onSelectDistrict,
  onSelectBuilding,
  onSelectPoi,
  onSelectStreet,
  onColorChange,
  onHoverOpacityChange,
  onDivideSectors,
  onSectorPreviewChange,
  onStartDrawStreet,
  onFinishDrawStreet,
  onCancelDrawStreet,
  onUpdateStreet,
  onRemoveStreet,
  onStartPlaceBuilding,
  onCancelPlaceBuilding,
  onClearBuildingDraft,
  onSaveBuilding,
  onUpdateBuildingCategory,
  onStartPlacePoi,
  onStartRepositionPoi,
  onCancelPlacePoi,
  onClearPoiDraft,
  onSavePoi,
  onClose,
}: Props) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<StreetLinkDraft | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newCategory, setNewCategory] = useState<BuildingCategory>("Wohnhaus");
  const [newStreetId, setNewStreetId] = useState("");
  const [poiCreateOpen, setPoiCreateOpen] = useState(false);
  const [poiName, setPoiName] = useState("");
  const [poiDescription, setPoiDescription] = useState("");
  const [poiKind, setPoiKind] = useState<PoiKind>("Statue");
  const [poiImageUrl, setPoiImageUrl] = useState("");
  const [poiImageUploading, setPoiImageUploading] = useState(false);
  const [poiInfluences, setPoiInfluences] = useState<PoiInfluence[]>([
    { aspect: "religion", delta: 5 },
  ]);
  const [sectorWidth, setSectorWidth] = useState(SECTOR_SIZE_DEFAULT);
  const [sectorHeight, setSectorHeight] = useState(SECTOR_SIZE_DEFAULT);
  const [sectorConfirmPending, setSectorConfirmPending] = useState(false);
  const [lastDivideResult, setLastDivideResult] = useState<DivideDistrictResult | null>(null);
  const [sectorBusy, setSectorBusy] = useState(false);
  const sectorsLocked = sectorCount > 0;

  const active = editingDistrictId ? polygons[editingDistrictId] : null;
  const activeDistrict = editingDistrictId
    ? AURENFURT_DISTRICTS.find((d) => d.id === editingDistrictId) ?? null
    : null;
  const buildingsByDistrict = useMemo(() => {
    return AURENFURT_DISTRICTS.map((district) => ({
      district,
      buildings: buildingsInDistrict(district.id, buildings),
    })).filter((group) => group.buildings.length > 0);
  }, [buildings]);
  const orphanBuildings = useMemo(() => {
    const known = new Set(AURENFURT_DISTRICTS.map((d) => d.id));
    return buildings.filter((b) => !known.has(b.districtId));
  }, [buildings]);
  const poiDraftDistrictName = poiDraftDistrictId
    ? AURENFURT_DISTRICTS.find((d) => d.id === poiDraftDistrictId)?.name ?? poiDraftDistrictId
    : null;
  const selectedPoi = useMemo(
    () => (selectedPoiId ? pois.find((poi) => poi.id === selectedPoiId) ?? null : null),
    [pois, selectedPoiId],
  );

  const nearbyStreets = useMemo(() => {
    if (!editingDistrictId) return [];
    return nearbyStreetsForBuilding(editingDistrictId, buildingDraftUv, streets);
  }, [buildingDraftUv, editingDistrictId, streets]);

  useEffect(() => {
    setCreateOpen(false);
    setNewName("");
    setNewSummary("");
    setNewCategory("Wohnhaus");
    setNewStreetId("");
  }, [editingDistrictId]);

  useEffect(() => {
    if (buildingFormKey === 0) return;
    setCreateOpen(false);
    setNewName("");
    setNewSummary("");
    setNewCategory("Wohnhaus");
    setNewStreetId("");
  }, [buildingFormKey]);

  useEffect(() => {
    if (poiFormKey === 0) return;
    setPoiCreateOpen(false);
    setPoiName("");
    setPoiDescription("");
    setPoiKind("Statue");
    setPoiImageUrl("");
    setPoiInfluences([{ aspect: "religion", delta: 5 }]);
  }, [poiFormKey]);

  useEffect(() => {
    setPoiCreateOpen(false);
    setPoiName("");
    setPoiDescription("");
    setPoiKind("Statue");
    setPoiImageUrl("");
    setPoiInfluences([{ aspect: "religion", delta: 5 }]);
  }, [tool]);

  useEffect(() => {
    setSectorConfirmPending(false);
    setLastDivideResult(null);
    setSectorBusy(false);
    setSectorWidth(SECTOR_SIZE_DEFAULT);
    setSectorHeight(SECTOR_SIZE_DEFAULT);
  }, [editingDistrictId]);

  useEffect(() => {
    if (sectorCount > 0) {
      setSectorConfirmPending(false);
    }
  }, [sectorCount]);

  const districtBboxHint = useMemo(() => {
    if (!active?.points || active.points.length === 0) return null;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of active.points) {
      if (p.u < minU) minU = p.u;
      if (p.u > maxU) maxU = p.u;
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }
    if (!Number.isFinite(minU)) return null;
    return { width: maxU - minU, height: maxV - minV };
  }, [active?.points]);

  const sectorPreview = useMemo((): DivideDistrictResult | null => {
    if (sectorsLocked || !editingDistrictId || !activeDistrict || !active?.points) return null;
    if (active.points.length < 3) return null;
    return divideDistrictIntoSectors(editingDistrictId, activeDistrict.name, active.points, {
      width: sectorWidth,
      height: sectorHeight,
    });
  }, [
    active?.points,
    activeDistrict,
    editingDistrictId,
    sectorHeight,
    sectorWidth,
    sectorsLocked,
  ]);

  useEffect(() => {
    if (!open || tool !== "districts" || sectorsLocked) {
      onSectorPreviewChange([]);
      return;
    }
    onSectorPreviewChange(sectorPreview?.sectors ?? []);
  }, [onSectorPreviewChange, open, sectorPreview, sectorsLocked, tool]);

  useEffect(() => {
    if (!newStreetId) return;
    if (!nearbyStreets.some((street) => street.id === newStreetId)) {
      setNewStreetId("");
    }
  }, [nearbyStreets, newStreetId]);

  const activeStreet = useMemo(
    () => streets.find((street) => street.id === editingStreetId) ?? null,
    [streets, editingStreetId],
  );
  const streetEffective = useMemo(
    () => (activeStreet ? effectiveStreet(activeStreet, dayWeather, viewedDay) : null),
    [activeStreet, dayWeather, viewedDay],
  );

  useEffect(() => {
    if (!activeStreet) {
      setLinkDraft(null);
      setLinkError(null);
      return;
    }
    setLinkDraft({
      category: activeStreet.category,
      width: activeStreet.width,
      connectsTo: [...activeStreet.connectsTo],
    });
    setLinkError(null);
    // Sync nur bei Straßenwechsel oder gespeicherten Link-Feldern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStreet?.id,
    activeStreet?.category,
    activeStreet?.width,
    activeStreet ? activeStreet.connectsTo.join("|") : "",
  ]);

  const connectCandidates = useMemo(() => {
    if (!activeStreet) return [];
    return candidateConnectStreets(activeStreet, streets);
  }, [activeStreet, streets]);

  const draftConnectionError = useMemo(() => {
    if (!linkDraft) return null;
    return validateStreetConnections(linkDraft, streets);
  }, [linkDraft, streets]);

  if (!open) return null;

  function selectDistrict(id: CityDistrictId | null) {
    setConfirmRemoveId(null);
    onSelectBuilding(null);
    onSelectPoi(null);
    onSelectStreet(null);
    onSelectDistrict(id);
  }

  function selectStreet(id: string | null) {
    setConfirmRemoveId(null);
    onSelectDistrict(null);
    onSelectBuilding(null);
    onSelectPoi(null);
    onSelectStreet(id);
  }

  function selectBuilding(id: string | null) {
    setConfirmRemoveId(null);
    onSelectStreet(null);
    onSelectPoi(null);
    onSelectBuilding(id);
  }

  function selectPoi(id: string | null) {
    setConfirmRemoveId(null);
    onSelectStreet(null);
    onSelectBuilding(null);
    onSelectPoi(id);
  }

  function setWorksKind(kind: StreetWorks["kind"]) {
    if (!activeStreet) return;
    if (kind === "none" || kind === "partial" || kind === "works") {
      onUpdateStreet(activeStreet.id, { works: { kind } });
      return;
    }
    const prev = activeStreet.works;
    const closureDays =
      prev.kind === "full_closure" || prev.kind === "full_closure_detour" ? prev.closureDays : 3;
    const closureStart =
      prev.kind === "full_closure" || prev.kind === "full_closure_detour" ? prev.closureStart : viewedDay;
    if (kind === "full_closure") {
      onUpdateStreet(activeStreet.id, { works: { kind, closureDays, closureStart } });
      return;
    }
    const detourStreetId =
      prev.kind === "full_closure_detour" ? prev.detourStreetId : undefined;
    const detourPoints = prev.kind === "full_closure_detour" ? prev.detourPoints : undefined;
    onUpdateStreet(activeStreet.id, {
      works: { kind: "full_closure_detour", closureDays, closureStart, detourStreetId, detourPoints },
    });
  }

  function changeDraftCategory(category: StreetCategory) {
    setLinkDraft((current) => {
      if (!current) return current;
      const width =
        current.width === STREET_CATEGORY_META[current.category].defaultWidth
          ? STREET_CATEGORY_META[category].defaultWidth
          : current.width;
      return { ...current, category, width };
    });
    setLinkError(null);
  }

  function toggleConnect(streetId: string) {
    setLinkDraft((current) => {
      if (!current) return current;
      const has = current.connectsTo.includes(streetId);
      return {
        ...current,
        connectsTo: has
          ? current.connectsTo.filter((id) => id !== streetId)
          : [...current.connectsTo, streetId],
      };
    });
    setLinkError(null);
  }

  function saveStreetLinks() {
    if (!activeStreet || !linkDraft) return;
    const error = validateStreetConnections(linkDraft, streets);
    if (error) {
      setLinkError(error);
      return;
    }
    setLinkError(null);
    onUpdateStreet(activeStreet.id, {
      category: linkDraft.category,
      width: linkDraft.width,
      connectsTo: linkDraft.connectsTo,
    });
  }

  const linkDirty =
    Boolean(activeStreet && linkDraft) &&
    (linkDraft!.category !== activeStreet!.category ||
      linkDraft!.width !== activeStreet!.width ||
      linkDraft!.connectsTo.length !== activeStreet!.connectsTo.length ||
      linkDraft!.connectsTo.some((id, i) => id !== activeStreet!.connectsTo[i]));

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed right-14 top-1/2 z-[410] max-h-[90vh] w-80 -translate-y-1/2 overflow-y-auto rounded-md border border-hero-dark bg-background-card p-4 shadow-lg"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-hero-border pb-2">
        <div>
          <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
            {TOOL_TITLES[tool]}
          </p>
          <p className={`font-libre text-xs ${saveError ? "text-red-300" : "text-gray-400"}`}>
            {saveError
              ? saveError
              : !ready
                ? "Wird aus der Datenbank geladen."
                : saved
                  ? "In der Datenbank gespeichert."
                  : "Noch nicht in der Datenbank."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-barlow text-xs font-bold uppercase text-gray-400 transition-colors hover:text-accent-gold"
        >
          Schließen
        </button>
      </div>

      {tool === "districts" ? (
        <DistrictsToolBody
          polygons={polygons}
          editingDistrictId={editingDistrictId}
          active={active}
          activeDistrict={activeDistrict}
          districtBboxHint={districtBboxHint}
          sectorsLocked={sectorsLocked}
          sectorCount={sectorCount}
          sectorWidth={sectorWidth}
          sectorHeight={sectorHeight}
          sectorBusy={sectorBusy}
          sectorConfirmPending={sectorConfirmPending}
          sectorPreview={sectorPreview}
          lastDivideResult={lastDivideResult}
          setSectorWidth={setSectorWidth}
          setSectorHeight={setSectorHeight}
          setSectorConfirmPending={setSectorConfirmPending}
          setSectorBusy={setSectorBusy}
          setLastDivideResult={setLastDivideResult}
          onSelectDistrict={selectDistrict}
          onColorChange={onColorChange}
          onHoverOpacityChange={onHoverOpacityChange}
          onDivideSectors={onDivideSectors}
        />
      ) : null}

      {tool === "buildings" ? (
        <BuildingsToolBody
          polygons={polygons}
          buildingsByDistrict={buildingsByDistrict}
          orphanBuildings={orphanBuildings}
          buildings={buildings}
          buildingPositions={buildingPositions}
          landmarkScales={landmarkScales}
          landmarkRotations={landmarkRotations}
          sectorsByDistrict={sectorsByDistrict}
          editingDistrictId={editingDistrictId}
          selectedBuildingId={selectedBuildingId}
          placingBuilding={placingBuilding}
          buildingDraftUv={buildingDraftUv}
          buildingSaveError={buildingSaveError}
          categorySaveNote={categorySaveNote}
          savingBuilding={savingBuilding}
          savingCategory={savingCategory}
          createOpen={createOpen}
          newName={newName}
          newSummary={newSummary}
          newCategory={newCategory}
          newStreetId={newStreetId}
          nearbyStreets={nearbyStreets}
          setCreateOpen={setCreateOpen}
          setNewName={setNewName}
          setNewSummary={setNewSummary}
          setNewCategory={setNewCategory}
          setNewStreetId={setNewStreetId}
          onSelectBuilding={selectBuilding}
          onSelectDistrict={onSelectDistrict}
          onLandmarkScaleChange={onLandmarkScaleChange}
          onLandmarkRotationChange={onLandmarkRotationChange}
          onStartPlaceBuilding={onStartPlaceBuilding}
          onCancelPlaceBuilding={onCancelPlaceBuilding}
          onClearBuildingDraft={onClearBuildingDraft}
          onCancelPlacePoi={onCancelPlacePoi}
          onClearPoiDraft={onClearPoiDraft}
          onSaveBuilding={onSaveBuilding}
          onUpdateBuildingCategory={onUpdateBuildingCategory}
        />
      ) : null}

      {tool === "pois" ? (
        <PoisToolBody
          pois={pois}
          selectedPoiId={selectedPoiId}
          selectedPoi={selectedPoi}
          placingPoi={placingPoi}
          repositioningPoi={repositioningPoi}
          poiDraftUv={poiDraftUv}
          poiDraftDistrictId={poiDraftDistrictId}
          poiDraftDistrictName={poiDraftDistrictName}
          poiSaveError={poiSaveError}
          savingPoi={savingPoi}
          poiCreateOpen={poiCreateOpen}
          poiName={poiName}
          poiDescription={poiDescription}
          poiKind={poiKind}
          poiImageUrl={poiImageUrl}
          poiImageUploading={poiImageUploading}
          poiInfluences={poiInfluences}
          setPoiCreateOpen={setPoiCreateOpen}
          setPoiName={setPoiName}
          setPoiDescription={setPoiDescription}
          setPoiKind={setPoiKind}
          setPoiImageUrl={setPoiImageUrl}
          setPoiImageUploading={setPoiImageUploading}
          setPoiInfluences={setPoiInfluences}
          onSelectPoi={selectPoi}
          onStartPlacePoi={onStartPlacePoi}
          onStartRepositionPoi={onStartRepositionPoi}
          onCancelPlacePoi={onCancelPlacePoi}
          onClearPoiDraft={onClearPoiDraft}
          onCancelPlaceBuilding={onCancelPlaceBuilding}
          onClearBuildingDraft={onClearBuildingDraft}
          onSavePoi={onSavePoi}
        />
      ) : null}

      {tool === "streets" ? (
        <StreetsToolBody
          streets={streets}
          editingStreetId={editingStreetId}
          drawingStreet={drawingStreet}
          draftPointCount={draftPointCount}
          activeStreet={activeStreet}
          streetEffective={streetEffective}
          linkDraft={linkDraft}
          linkError={linkError}
          linkDirty={linkDirty}
          draftConnectionError={draftConnectionError}
          connectCandidates={connectCandidates}
          confirmRemoveId={confirmRemoveId}
          dayWeather={dayWeather}
          viewedDay={viewedDay}
          setConfirmRemoveId={setConfirmRemoveId}
          setLinkDraft={setLinkDraft}
          setLinkError={setLinkError}
          selectStreet={selectStreet}
          changeDraftCategory={changeDraftCategory}
          toggleConnect={toggleConnect}
          saveStreetLinks={saveStreetLinks}
          setWorksKind={setWorksKind}
          onStartDrawStreet={onStartDrawStreet}
          onFinishDrawStreet={onFinishDrawStreet}
          onCancelDrawStreet={onCancelDrawStreet}
          onUpdateStreet={onUpdateStreet}
          onRemoveStreet={onRemoveStreet}
          onSelectStreet={onSelectStreet}
        />
      ) : null}
    </motion.aside>
  );
}

function DistrictsToolBody({
  polygons,
  editingDistrictId,
  active,
  activeDistrict,
  districtBboxHint,
  sectorsLocked,
  sectorCount,
  sectorWidth,
  sectorHeight,
  sectorBusy,
  sectorConfirmPending,
  sectorPreview,
  lastDivideResult,
  setSectorWidth,
  setSectorHeight,
  setSectorConfirmPending,
  setSectorBusy,
  setLastDivideResult,
  onSelectDistrict,
  onColorChange,
  onHoverOpacityChange,
  onDivideSectors,
}: {
  polygons: DistrictPolygons;
  editingDistrictId: CityDistrictId | null;
  active: DistrictPolygons[CityDistrictId] | null;
  activeDistrict: CityDistrict | null;
  districtBboxHint: { width: number; height: number } | null;
  sectorsLocked: boolean;
  sectorCount: number;
  sectorWidth: number;
  sectorHeight: number;
  sectorBusy: boolean;
  sectorConfirmPending: boolean;
  sectorPreview: DivideDistrictResult | null;
  lastDivideResult: DivideDistrictResult | null;
  setSectorWidth: Dispatch<SetStateAction<number>>;
  setSectorHeight: Dispatch<SetStateAction<number>>;
  setSectorConfirmPending: Dispatch<SetStateAction<boolean>>;
  setSectorBusy: Dispatch<SetStateAction<boolean>>;
  setLastDivideResult: Dispatch<SetStateAction<DivideDistrictResult | null>>;
  onSelectDistrict: (id: CityDistrictId | null) => void;
  onColorChange: (id: CityDistrictId, color: string) => void;
  onHoverOpacityChange: (id: CityDistrictId, opacity: number) => void;
  onDivideSectors: (cellSize: SectorCellSize) => DivideDistrictResult | null;
}) {
  return (
    <>
      <p className="mb-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
        Viertel wählen
      </p>
      <ul className="mb-4 max-h-36 space-y-1 overflow-y-auto">
        {AURENFURT_DISTRICTS.map((district) => {
          const selected = editingDistrictId === district.id;
          return (
            <li key={district.id}>
              <button
                type="button"
                onClick={() => onSelectDistrict(selected ? null : district.id)}
                className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                  selected
                    ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                    : "border-hero-dark/60 bg-slate-900/40 text-gray-200 hover:border-hero-border"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-hero-border/50"
                  style={{ backgroundColor: polygons[district.id].color }}
                  aria-hidden
                />
                <span className="font-barlow text-xs font-bold uppercase tracking-wide">{district.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {active && activeDistrict ? (
        <div className="mb-4 space-y-3 border-t border-hero-border/60 pt-3">
          <p className="font-cinzel text-sm font-bold text-accent-gold">{activeDistrict.name}</p>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Farbe der Fläche
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeColorInput(active.color)}
                onChange={(event) => onColorChange(activeDistrict.id, event.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-hero-dark bg-slate-900 p-1"
                aria-label="Flächenfarbe"
              />
              <div className="flex flex-wrap gap-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    title={preset}
                    onClick={() => onColorChange(activeDistrict.id, preset)}
                    className={`h-5 w-5 rounded-sm border transition-transform ${
                      active.color.toLowerCase() === preset.toLowerCase()
                        ? "border-accent-gold scale-110"
                        : "border-hero-dark/70 hover:border-hero-border"
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Transparenz beim Hover
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(active.hoverOpacity * 100)}
                onChange={(event) =>
                  onHoverOpacityChange(activeDistrict.id, Number(event.target.value) / 100)
                }
                className="h-2 w-full accent-hero-vibrant"
              />
              <span className="w-10 shrink-0 text-right font-libre text-xs text-gray-300">
                {Math.round(active.hoverOpacity * 100)}%
              </span>
            </div>
            <p className="font-libre text-[11px] text-gray-500">0 % unsichtbar · 100 % voll sichtbar</p>
          </label>

          <div className="space-y-2 border-t border-hero-border/40 pt-3">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Sektoren
            </p>
            <p className="font-libre text-[11px] text-gray-500">
              Feste Rechtecke in Karten-Einheiten (UV, wie die Viertel-Polygone). Adresse z.&nbsp;B.{" "}
              <span className="text-accent-gold">{activeDistrict.name} E19</span>.
            </p>
            {districtBboxHint ? (
              <p className="font-libre text-[11px] text-gray-500">
                Dieses Viertel misst ca. {districtBboxHint.width.toFixed(3)} ×{" "}
                {districtBboxHint.height.toFixed(3)} Karten-Einheiten — Werte wie 20 wären größer als
                die Stadt; sinnvoll sind eher 0,02–0,08.
              </p>
            ) : null}
            {!sectorsLocked ? (
              <p className="rounded border border-amber-500/50 bg-amber-950/40 px-2 py-1.5 font-libre text-[11px] leading-snug text-amber-200">
                Einmal gespeichert, lassen sich Größe und Einteilung nicht mehr ändern oder löschen.
              </p>
            ) : (
              <p className="rounded border border-hero-border/50 bg-slate-900/50 px-2 py-1.5 font-libre text-[11px] leading-snug text-gray-300">
                Gespeichert und gesperrt: {sectorCount} Sektoren. Größe und Einteilung lassen sich
                nicht mehr ändern oder löschen.
              </p>
            )}
            <SectorSizeField
              label="Breite (Karten-Einheiten)"
              value={sectorWidth}
              disabled={sectorsLocked || sectorBusy}
              onChange={(next) => {
                const clamped = clampSectorSize(next);
                setSectorWidth(clamped);
                setSectorHeight((prev) =>
                  Math.abs(prev - sectorWidth) < SECTOR_SIZE_STEP / 2 ? clamped : prev,
                );
                setSectorConfirmPending(false);
              }}
            />
            <SectorSizeField
              label="Höhe (Karten-Einheiten)"
              value={sectorHeight}
              disabled={sectorsLocked || sectorBusy}
              onChange={(next) => {
                setSectorHeight(clampSectorSize(next));
                setSectorConfirmPending(false);
              }}
            />
            {!sectorsLocked && sectorPreview ? (
              <p className="font-libre text-[11px] text-accent-gold" role="status">
                Vorschau: {sectorPreview.actual} Sektoren
                {" · "}
                Raster {sectorPreview.cols}×{sectorPreview.rows}
                {sectorPreview.truncated ? " · Limit erreicht, vergrößere die Zellen" : ""}
                {" · noch nicht gespeichert"}
              </p>
            ) : null}
            {lastDivideResult ? (
              <p className="font-libre text-[11px] text-accent-gold" role="status">
                Gespeichert: {lastDivideResult.actual} Sektoren · Zellen{" "}
                {lastDivideResult.cellWidth.toFixed(3)}×{lastDivideResult.cellHeight.toFixed(3)}.
              </p>
            ) : null}
            {!sectorsLocked ? (
              sectorConfirmPending ? (
                <div className="space-y-2">
                  <p className="font-libre text-[11px] leading-snug text-amber-200">
                    Endgültig speichern? Danach sind Größe und Einteilung für dieses Viertel
                    unveränderlich.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={sectorBusy || !sectorPreview || sectorPreview.actual === 0}
                      onClick={() => {
                        setSectorBusy(true);
                        window.setTimeout(() => {
                          try {
                            const result = onDivideSectors({
                              width: sectorWidth,
                              height: sectorHeight,
                            });
                            if (result) setLastDivideResult(result);
                            setSectorConfirmPending(false);
                          } finally {
                            setSectorBusy(false);
                          }
                        }, 0);
                      }}
                      className="flex-1 rounded border border-accent-gold bg-accent-gold/20 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
                    >
                      {sectorBusy ? "Speichere…" : "Endgültig speichern"}
                    </button>
                    <button
                      type="button"
                      disabled={sectorBusy}
                      onClick={() => setSectorConfirmPending(false)}
                      className="rounded border border-hero-dark px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-gray-400"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={sectorBusy || !sectorPreview || sectorPreview.actual === 0}
                  onClick={() => setSectorConfirmPending(true)}
                  className="w-full rounded border border-accent-gold/70 bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-40"
                >
                  Endgültig speichern
                </button>
              )
            ) : null}
          </div>

          <p className="font-libre text-xs text-gray-400">
            Ziehpunkte nur an diesem Viertel. Orbit ist beim Ziehen aus.
          </p>
        </div>
      ) : null}
    </>
  );
}

function BuildingsToolBody({
  polygons,
  buildingsByDistrict,
  orphanBuildings,
  buildings,
  buildingPositions,
  landmarkScales,
  landmarkRotations,
  sectorsByDistrict,
  editingDistrictId,
  selectedBuildingId,
  placingBuilding,
  buildingDraftUv,
  buildingSaveError,
  categorySaveNote,
  savingBuilding,
  savingCategory,
  createOpen,
  newName,
  newSummary,
  newCategory,
  newStreetId,
  nearbyStreets,
  setCreateOpen,
  setNewName,
  setNewSummary,
  setNewCategory,
  setNewStreetId,
  onSelectBuilding,
  onSelectDistrict,
  onLandmarkScaleChange,
  onLandmarkRotationChange,
  onStartPlaceBuilding,
  onCancelPlaceBuilding,
  onClearBuildingDraft,
  onCancelPlacePoi,
  onClearPoiDraft,
  onSaveBuilding,
  onUpdateBuildingCategory,
}: {
  polygons: DistrictPolygons;
  buildingsByDistrict: { district: CityDistrict; buildings: CityBuilding[] }[];
  orphanBuildings: CityBuilding[];
  buildings: CityBuilding[];
  buildingPositions: BuildingPositions;
  landmarkScales: LandmarkScales;
  landmarkRotations: LandmarkRotations;
  sectorsByDistrict: DistrictSectorsByDistrict;
  editingDistrictId: CityDistrictId | null;
  selectedBuildingId: string | null;
  placingBuilding: boolean;
  buildingDraftUv: UvPoint | null;
  buildingSaveError: string | null;
  categorySaveNote: string | null;
  savingBuilding: boolean;
  savingCategory: boolean;
  createOpen: boolean;
  newName: string;
  newSummary: string;
  newCategory: BuildingCategory;
  newStreetId: string;
  nearbyStreets: AurenfurtStreet[];
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  setNewName: Dispatch<SetStateAction<string>>;
  setNewSummary: Dispatch<SetStateAction<string>>;
  setNewCategory: Dispatch<SetStateAction<BuildingCategory>>;
  setNewStreetId: Dispatch<SetStateAction<string>>;
  onSelectBuilding: (id: string | null) => void;
  onSelectDistrict: (id: CityDistrictId | null) => void;
  onLandmarkScaleChange: (buildingId: string, scale: number) => void;
  onLandmarkRotationChange: (buildingId: string, degrees: number) => void;
  onStartPlaceBuilding: () => void;
  onCancelPlaceBuilding: () => void;
  onClearBuildingDraft: () => void;
  onCancelPlacePoi: () => void;
  onClearPoiDraft: () => void;
  onSaveBuilding: (input: {
    name: string;
    summary: string;
    category: BuildingCategory;
    streetId: string | null;
  }) => void;
  onUpdateBuildingCategory: (buildingId: string, category: BuildingCategory) => void;
}) {
  const selectedBuilding = useMemo(
    () => (selectedBuildingId ? buildings.find((b) => b.id === selectedBuildingId) ?? null : null),
    [buildings, selectedBuildingId],
  );
  const selectedCategory = selectedBuilding
    ? buildingCategoryForId(selectedBuilding.id, selectedBuilding.category)
    : null;
  const selectedReach = useMemo(() => {
    if (!selectedBuilding) return null;
    const uv = resolveBuildingUv(selectedBuilding, buildingPositions);
    const staff = allAurenfurtNpcs()
      .filter((npc) => npc.forCitySimulation && npc.locationId === selectedBuilding.id)
      .map((npc) => ({
        locationId: npc.locationId,
        tier: npc.cityInfluenceTier,
        influence: npc.influenceAndLoyalty.influence,
        loyalCriminal: npc.cityAxisLoyalCriminal,
      }));
    return reportBuildingReach(
      {
        id: selectedBuilding.id,
        name: selectedBuilding.name,
        districtId: selectedBuilding.districtId,
        category: buildingCategoryForId(selectedBuilding.id, selectedBuilding.category),
        hotspot: selectedBuilding.isHotspot,
        u: uv.u,
        v: uv.v,
      },
      staff,
      sectorsByDistrict,
      polygons,
    );
  }, [selectedBuilding, buildingPositions, sectorsByDistrict, polygons]);

  function renderBuildingRow(building: CityBuilding) {
    const uv = resolveBuildingUv(building, buildingPositions);
    const poly = polygons[building.districtId]?.points ?? [];
    const outside = !pointInPolygon(uv, poly);
    const inactive = !isCityBuildingActive(building);
    const landmarkScale = building.landmark
      ? resolveLandmarkScale(building.id, landmarkScales)
      : LANDMARK_SCALE_DEFAULT;
    const landmarkRotation = building.landmark ? resolveLandmarkRotation(building.id, landmarkRotations) : 0;
    const selected = selectedBuildingId === building.id;
    return (
      <li key={building.id}>
        <button
          type="button"
          onClick={() => onSelectBuilding(selected ? null : building.id)}
          className={`flex w-full items-start gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
            outside
              ? "border-red-500/70 bg-red-950/40"
              : selected
                ? "border-accent-gold bg-accent-gold/10"
                : "border-hero-dark/50 bg-slate-900/30 hover:border-hero-border"
          }`}
        >
          {outside ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
          ) : (
            <span className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`font-barlow text-xs font-bold uppercase tracking-wide ${
                selected ? "text-accent-gold" : "text-gray-100"
              }`}
            >
              {building.name}
              {inactive ? <span className="ml-1 text-[10px] text-amber-400">· inaktiv</span> : null}
            </p>
            {outside ? (
              <p className="font-libre text-[11px] leading-snug text-red-400">
                Gebäude befindet sich außerhalb seines Viertels
              </p>
            ) : null}
            {building.landmark ? (
              <>
              <label
                className="mt-1.5 block space-y-1"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  3D-Größe · {landmarkScale.toFixed(2)}×
                </span>
                <input
                  type="range"
                  min={LANDMARK_SCALE_MIN}
                  max={LANDMARK_SCALE_MAX}
                  step={LANDMARK_SCALE_STEP}
                  value={landmarkScale}
                  onChange={(e) => onLandmarkScaleChange(building.id, Number(e.target.value))}
                  className="w-full accent-hero-vibrant"
                  aria-label={`3D-Größe für ${building.name}`}
                />
              </label>
              <label
                className="mt-1.5 block space-y-1"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Ausrichtung · {Math.round(landmarkRotation)}°
                </span>
                <input
                  type="range"
                  min={LANDMARK_ROTATION_MIN}
                  max={LANDMARK_ROTATION_MAX}
                  step={LANDMARK_ROTATION_STEP}
                  value={landmarkRotation}
                  onChange={(e) => onLandmarkRotationChange(building.id, Number(e.target.value))}
                  className="w-full accent-hero-vibrant"
                  aria-label={`Ausrichtung für ${building.name}`}
                />
              </label>
              </>
            ) : null}
          </div>
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
        Alle Gebäude
      </p>
      <p className="font-libre text-[11px] text-gray-500">
        Goldener Würfel am Pin zieht das Gebäude. Orbit ist beim Ziehen aus.
      </p>

      {selectedBuilding && selectedCategory ? (
        <div className="space-y-2 rounded border border-accent-gold/50 bg-accent-gold/5 p-2">
          <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
            {selectedBuilding.name}
          </p>
          {selectedReach && selectedReach.occupied.length > 0 ? (
            <p className="font-libre text-[11px] leading-snug text-gray-300">
              {selectedReach.occupied.length > 1 ? "Sektoren" : "Sektor"}: {selectedReach.occupied.join(", ")}
              {selectedReach.kind === "wache"
                ? `. Wache senkt die Kriminalität im Umkreis von ${selectedReach.radius} Sektoren.`
                : selectedReach.kind === "kriminell"
                  ? `. Krimineller Einfluss hebt die Kriminalität im Umkreis von ${selectedReach.radius} Sektoren.`
                  : selectedReach.kind === "beides"
                    ? `. Wache und krimineller Einfluss reichen ${selectedReach.radius} Sektoren weit.`
                    : ""}
            </p>
          ) : null}
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Kategorie
            </span>
            <select
              value={selectedCategory}
              disabled={savingCategory}
              onChange={(e) =>
                onUpdateBuildingCategory(selectedBuilding.id, e.target.value as BuildingCategory)
              }
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-xs uppercase text-white outline-none focus:border-hero-vibrant disabled:opacity-60"
            >
              {BUILDING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          {categorySaveNote ? (
            <p className="font-libre text-[11px] text-amber-300/90">{categorySaveNote}</p>
          ) : null}
          {buildingSaveError && !createOpen ? (
            <p className="font-libre text-[11px] text-red-400">{buildingSaveError}</p>
          ) : null}
        </div>
      ) : null}

      {buildingsByDistrict.length === 0 && orphanBuildings.length === 0 ? (
        <p className="font-libre text-xs text-gray-500">Noch keine Gebäude.</p>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {buildingsByDistrict.map(({ district, buildings: group }) => (
            <div key={district.id} className="space-y-1">
              <p className="font-cinzel text-xs font-bold text-accent-gold">{district.name}</p>
              <ul className="space-y-1">{group.map(renderBuildingRow)}</ul>
            </div>
          ))}
          {orphanBuildings.length > 0 ? (
            <div className="space-y-1">
              <p className="font-cinzel text-xs font-bold text-amber-400">Ohne Viertel</p>
              <ul className="space-y-1">{orphanBuildings.map(renderBuildingRow)}</ul>
            </div>
          ) : null}
        </div>
      )}

      {!createOpen ? (
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            onCancelPlacePoi();
            onClearPoiDraft();
            onClearBuildingDraft();
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent-gold/70 bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Gebäude anlegen
        </button>
      ) : (
        <div className="space-y-2 rounded border border-hero-border/50 bg-slate-900/50 p-2">
          <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
            Neues Gebäude
          </p>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Viertel</span>
            <select
              value={editingDistrictId ?? ""}
              onChange={(e) => {
                const id = e.target.value as CityDistrictId | "";
                onSelectDistrict(id || null);
                onClearBuildingDraft();
                onCancelPlaceBuilding();
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-xs uppercase text-white outline-none focus:border-hero-vibrant"
            >
              <option value="">— Viertel wählen —</option>
              {AURENFURT_DISTRICTS.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="z. B. Taverne zum Anker"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Kurzbeschreibung
            </span>
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              rows={2}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="Was macht diesen Ort besonders?"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Kategorie
            </span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as BuildingCategory)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-xs uppercase text-white outline-none focus:border-hero-vibrant"
            >
              {BUILDING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Nahe Straße
            </span>
            <select
              value={newStreetId}
              onChange={(e) => setNewStreetId(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
            >
              <option value="">— Keine (Gebäude inaktiv) —</option>
              {nearbyStreets.map((street) => (
                <option key={street.id} value={street.id}>
                  {street.name || street.id}
                </option>
              ))}
            </select>
            <p className="font-libre text-[10px] text-gray-500">
              Ohne Straße: keine NPCs am Lore-Eintrag.
            </p>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!editingDistrictId}
              onClick={() => {
                if (placingBuilding) onCancelPlaceBuilding();
                else onStartPlaceBuilding();
              }}
              className={`rounded border px-2 py-1 font-barlow text-[11px] font-bold uppercase disabled:opacity-40 ${
                placingBuilding
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-border text-gray-200 hover:border-accent-gold"
              }`}
            >
              {placingBuilding
                ? "Klick auf Karte…"
                : buildingDraftUv
                  ? "Position neu setzen"
                  : "Position setzen"}
            </button>
            {buildingDraftUv ? (
              <span className="self-center font-libre text-[10px] text-hero-vibrant">
                u={buildingDraftUv.u.toFixed(2)} · v={buildingDraftUv.v.toFixed(2)}
              </span>
            ) : null}
          </div>
          {buildingSaveError ? (
            <p className="font-libre text-[11px] text-red-400">{buildingSaveError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                savingBuilding ||
                !editingDistrictId ||
                !buildingDraftUv ||
                !newName.trim() ||
                !newSummary.trim()
              }
              onClick={() =>
                onSaveBuilding({
                  name: newName,
                  summary: newSummary,
                  category: newCategory,
                  streetId: newStreetId || null,
                })
              }
              className="rounded border border-accent-gold bg-accent-gold/10 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              {savingBuilding ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                onCancelPlaceBuilding();
                onClearBuildingDraft();
              }}
              className="rounded border border-hero-dark px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PoisToolBody({
  pois,
  selectedPoiId,
  selectedPoi,
  placingPoi,
  repositioningPoi,
  poiDraftUv,
  poiDraftDistrictId,
  poiDraftDistrictName,
  poiSaveError,
  savingPoi,
  poiCreateOpen,
  poiName,
  poiDescription,
  poiKind,
  poiImageUrl,
  poiImageUploading,
  poiInfluences,
  setPoiCreateOpen,
  setPoiName,
  setPoiDescription,
  setPoiKind,
  setPoiImageUrl,
  setPoiImageUploading,
  setPoiInfluences,
  onSelectPoi,
  onStartPlacePoi,
  onStartRepositionPoi,
  onCancelPlacePoi,
  onClearPoiDraft,
  onCancelPlaceBuilding,
  onClearBuildingDraft,
  onSavePoi,
}: {
  pois: AurenfurtMapPoi[];
  selectedPoiId: string | null;
  selectedPoi: AurenfurtMapPoi | null;
  placingPoi: boolean;
  repositioningPoi: boolean;
  poiDraftUv: UvPoint | null;
  poiDraftDistrictId: CityDistrictId | null;
  poiDraftDistrictName: string | null;
  poiSaveError: string | null;
  savingPoi: boolean;
  poiCreateOpen: boolean;
  poiName: string;
  poiDescription: string;
  poiKind: PoiKind;
  poiImageUrl: string;
  poiImageUploading: boolean;
  poiInfluences: PoiInfluence[];
  setPoiCreateOpen: Dispatch<SetStateAction<boolean>>;
  setPoiName: Dispatch<SetStateAction<string>>;
  setPoiDescription: Dispatch<SetStateAction<string>>;
  setPoiKind: Dispatch<SetStateAction<PoiKind>>;
  setPoiImageUrl: Dispatch<SetStateAction<string>>;
  setPoiImageUploading: Dispatch<SetStateAction<boolean>>;
  setPoiInfluences: Dispatch<SetStateAction<PoiInfluence[]>>;
  onSelectPoi: (id: string | null) => void;
  onStartPlacePoi: () => void;
  onStartRepositionPoi: () => void;
  onCancelPlacePoi: () => void;
  onClearPoiDraft: () => void;
  onCancelPlaceBuilding: () => void;
  onClearBuildingDraft: () => void;
  onSavePoi: (input: {
    name: string;
    description: string;
    kind: PoiKind;
    imageUrl: string | null;
    influences: PoiInfluence[];
  }) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
        Alle besonderen Orte
      </p>

      {pois.length === 0 ? (
        <p className="font-libre text-xs text-gray-500">Noch keine besonderen Orte.</p>
      ) : (
        <ul className="max-h-52 space-y-1 overflow-y-auto">
          {pois.map((poi) => {
            const selected = selectedPoiId === poi.id;
            const districtName =
              AURENFURT_DISTRICTS.find((d) => d.id === poi.districtId)?.name ?? poi.districtId;
            return (
              <li key={poi.id}>
                <button
                  type="button"
                  onClick={() => onSelectPoi(selected ? null : poi.id)}
                  className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10"
                      : "border-accent-gold/40 bg-accent-gold/5 hover:border-accent-gold"
                  }`}
                >
                  <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                    {poi.name}
                  </p>
                  <p className="font-libre text-[11px] text-gray-400">
                    {poi.kind} · {districtName}
                    {poi.influences.length > 0
                      ? ` · ${poi.influences.map(formatInfluenceDelta).join(", ")}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPoi && !poiCreateOpen ? (
        <div className="space-y-2 rounded border border-hero-border/40 bg-slate-900/30 p-2">
          <p className="font-libre text-xs text-gray-300 line-clamp-3">{selectedPoi.description}</p>
          <button
            type="button"
            onClick={() => {
              if (repositioningPoi) onCancelPlacePoi();
              else onStartRepositionPoi();
            }}
            className={`w-full rounded border px-2 py-1.5 font-barlow text-[11px] font-bold uppercase ${
              repositioningPoi
                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                : "border-hero-border text-gray-200 hover:border-accent-gold"
            }`}
          >
            {repositioningPoi ? "Klick auf Karte…" : "Position neu setzen"}
          </button>
          {poiSaveError && repositioningPoi ? (
            <p className="font-libre text-[11px] text-red-400" role="alert">
              {poiSaveError}
            </p>
          ) : null}
        </div>
      ) : null}

      {!poiCreateOpen ? (
        <button
          type="button"
          onClick={() => {
            setPoiCreateOpen(true);
            onCancelPlaceBuilding();
            onClearBuildingDraft();
            onClearPoiDraft();
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent-gold/70 bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Ort anlegen
        </button>
      ) : (
        <div className="space-y-2 rounded border border-hero-border/50 bg-slate-900/50 p-2">
          <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
            Neuer besonderer Ort
          </p>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Name</span>
            <input
              value={poiName}
              onChange={(e) => setPoiName(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="z. B. Brunnen der Silbernen Rose"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Beschreibung
            </span>
            <textarea
              value={poiDescription}
              onChange={(e) => setPoiDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="Für Lore und Karte"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Art</span>
            <select
              value={poiKind}
              onChange={(e) => setPoiKind(e.target.value as PoiKind)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-xs uppercase text-white outline-none focus:border-hero-vibrant"
            >
              {POI_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Bild</span>
            <input
              type="file"
              accept="image/*"
              disabled={poiImageUploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setPoiImageUploading(true);
                try {
                  const result = await uploadLoreImage(file, {
                    worldId: AURENFURT_WORLD_ID,
                  });
                  if ("error" in result) {
                    setPoiImageUrl("");
                    return;
                  }
                  setPoiImageUrl(result.publicUrl);
                } finally {
                  setPoiImageUploading(false);
                }
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-gray-300 file:mr-2 file:rounded file:border-0 file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-[10px] file:font-bold file:uppercase file:text-accent-gold"
            />
            <input
              value={poiImageUrl}
              onChange={(e) => setPoiImageUrl(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder={poiImageUploading ? "Upload läuft…" : "oder Bild-URL · sonst Platzhalter"}
            />
          </label>
          <div className="space-y-1.5">
            <p className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Einflussfaktoren
            </p>
            {poiInfluences.map((entry, index) => (
              <div key={`${entry.aspect}-${index}`} className="flex items-center gap-1.5">
                <select
                  value={entry.aspect}
                  onChange={(e) => {
                    const aspect = e.target.value as PoiInfluenceAspect;
                    setPoiInfluences((rows) =>
                      rows.map((row, i) => (i === index ? { ...row, aspect } : row)),
                    );
                  }}
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-white outline-none focus:border-hero-vibrant"
                >
                  {POI_INFLUENCE_ASPECTS.map((aspect) => (
                    <option key={aspect.key} value={aspect.key}>
                      {aspect.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step={1}
                  value={entry.delta}
                  onChange={(e) => {
                    const delta = Math.trunc(Number(e.target.value) || 0);
                    setPoiInfluences((rows) =>
                      rows.map((row, i) => (i === index ? { ...row, delta } : row)),
                    );
                  }}
                  className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1.5 text-right font-libre text-[11px] text-white outline-none focus:border-hero-vibrant"
                />
                <button
                  type="button"
                  aria-label="Einfluss entfernen"
                  onClick={() => setPoiInfluences((rows) => rows.filter((_, i) => i !== index))}
                  className="rounded border border-hero-dark px-1.5 py-1 font-barlow text-[10px] text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setPoiInfluences((rows) => [...rows, { aspect: "prestige", delta: 1 }])
              }
              className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
            >
              + Einfluss
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (placingPoi && !repositioningPoi) onCancelPlacePoi();
                else onStartPlacePoi();
              }}
              className={`rounded border px-2 py-1 font-barlow text-[11px] font-bold uppercase ${
                placingPoi && !repositioningPoi
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-border text-gray-200 hover:border-accent-gold"
              }`}
            >
              {placingPoi && !repositioningPoi
                ? "Klick auf Karte…"
                : poiDraftUv
                  ? "Position neu setzen"
                  : "Position setzen"}
            </button>
            {poiDraftUv ? (
              <span className="self-center font-libre text-[10px] text-hero-vibrant">
                {poiDraftDistrictName ? `${poiDraftDistrictName} · ` : ""}
                u={poiDraftUv.u.toFixed(2)} · v={poiDraftUv.v.toFixed(2)}
              </span>
            ) : null}
          </div>
          {poiSaveError && !repositioningPoi ? (
            <p className="font-libre text-[11px] text-red-400" role="alert">
              {poiSaveError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                savingPoi ||
                !poiDraftUv ||
                !poiDraftDistrictId ||
                !poiName.trim() ||
                !poiDescription.trim() ||
                poiInfluences.length === 0
              }
              onClick={() =>
                onSavePoi({
                  name: poiName,
                  description: poiDescription,
                  kind: poiKind,
                  imageUrl: poiImageUrl.trim() || null,
                  influences: poiInfluences,
                })
              }
              className="rounded border border-accent-gold bg-accent-gold/10 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              {savingPoi ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPoiCreateOpen(false);
                onCancelPlacePoi();
                onClearPoiDraft();
              }}
              className="rounded border border-hero-dark px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function StreetsToolBody({
  streets,
  editingStreetId,
  drawingStreet,
  draftPointCount,
  activeStreet,
  streetEffective,
  linkDraft,
  linkError,
  linkDirty,
  draftConnectionError,
  connectCandidates,
  confirmRemoveId,
  dayWeather,
  viewedDay,
  setConfirmRemoveId,
  setLinkDraft,
  setLinkError,
  selectStreet,
  changeDraftCategory,
  toggleConnect,
  saveStreetLinks,
  setWorksKind,
  onStartDrawStreet,
  onFinishDrawStreet,
  onCancelDrawStreet,
  onUpdateStreet,
  onRemoveStreet,
  onSelectStreet,
}: {
  streets: AurenfurtStreet[];
  editingStreetId: string | null;
  drawingStreet: boolean;
  draftPointCount: number;
  activeStreet: AurenfurtStreet | null;
  streetEffective: ReturnType<typeof effectiveStreet> | null;
  linkDraft: StreetLinkDraft | null;
  linkError: string | null;
  linkDirty: boolean;
  draftConnectionError: string | null;
  connectCandidates: AurenfurtStreet[];
  confirmRemoveId: string | null;
  dayWeather: DayWeather;
  viewedDay: string;
  setConfirmRemoveId: Dispatch<SetStateAction<string | null>>;
  setLinkDraft: Dispatch<SetStateAction<StreetLinkDraft | null>>;
  setLinkError: Dispatch<SetStateAction<string | null>>;
  selectStreet: (id: string | null) => void;
  changeDraftCategory: (category: StreetCategory) => void;
  toggleConnect: (streetId: string) => void;
  saveStreetLinks: () => void;
  setWorksKind: (kind: StreetWorks["kind"]) => void;
  onStartDrawStreet: () => void;
  onFinishDrawStreet: () => void;
  onCancelDrawStreet: () => void;
  onUpdateStreet: (
    streetId: string,
    patch: Partial<Omit<AurenfurtStreet, "id" | "points" | "districtIds">>,
  ) => void;
  onRemoveStreet: (streetId: string) => void;
  onSelectStreet: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
          Alle Straßen
        </p>
        <Route className="h-3.5 w-3.5 text-accent-gold" aria-hidden />
      </div>

      {drawingStreet ? (
        <div className="space-y-2 rounded border border-hero-border/50 bg-slate-900/50 p-2">
          <p className="font-libre text-xs text-gray-300">
            Klicks setzen Punkte ({draftPointCount}). Doppelklick oder Fertig schließt die Linie (mind.
            2). Kamera bleibt in Draufsicht.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={draftPointCount < 2}
              onClick={onFinishDrawStreet}
              className="rounded border border-accent-gold bg-accent-gold/10 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              Fertig
            </button>
            <button
              type="button"
              onClick={onCancelDrawStreet}
              className="rounded border border-hero-dark px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400 hover:text-accent-gold"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirmRemoveId(null);
            onStartDrawStreet();
          }}
          className="w-full rounded border border-hero-border bg-hero-dark/40 px-2 py-1.5 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold transition-colors hover:bg-background-card"
        >
          Straße zeichnen
        </button>
      )}

      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {streets.length === 0 ? (
          <li className="font-libre text-xs text-gray-500">Noch keine Straßen.</li>
        ) : (
          streets.map((street) => {
            const selected = editingStreetId === street.id;
            const eff = effectiveStreet(street, dayWeather, viewedDay);
            const catColor = STREET_CATEGORY_META[street.category].color;
            return (
              <li key={street.id}>
                <button
                  type="button"
                  onClick={() => selectStreet(selected ? null : street.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-hero-dark/60 bg-slate-900/40 text-gray-200 hover:border-hero-border"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: catColor }}
                      aria-hidden
                    />
                    <span className="truncate font-barlow text-xs font-bold uppercase tracking-wide">
                      {street.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-libre text-[10px] text-gray-400">
                    {eff.passabilityLabel}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {activeStreet && streetEffective && linkDraft && !drawingStreet ? (
        <div className="space-y-3 rounded border border-hero-border/40 bg-slate-900/30 p-2">
          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Name
            </span>
            <input
              type="text"
              value={activeStreet.name}
              onChange={(event) => onUpdateStreet(activeStreet.id, { name: event.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Beschreibung
            </span>
            <textarea
              value={activeStreet.description}
              onChange={(event) =>
                onUpdateStreet(activeStreet.id, { description: event.target.value })
              }
              rows={4}
              placeholder="Lage, Höhenunterschied, Aufgänge, Kontrollen — was eine KI über diese Straße wissen muss."
              className="w-full resize-y rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none placeholder:text-gray-500 focus:border-hero-vibrant"
            />
          </label>

          <div className="space-y-2 rounded border border-hero-dark/50 bg-background-dark/30 p-2">
            <label className="block space-y-1">
              <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Kategorie
              </span>
              <select
                value={linkDraft.category}
                onChange={(event) => changeDraftCategory(event.target.value as StreetCategory)}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {STREET_CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Dicke ({linkDraft.width})
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={STREET_WIDTH_MIN}
                  max={STREET_WIDTH_MAX}
                  step={1}
                  value={linkDraft.width}
                  onChange={(event) => {
                    const width = Number(event.target.value);
                    setLinkDraft((current) => (current ? { ...current, width } : current));
                    setLinkError(null);
                  }}
                  className="h-2 w-full accent-hero-vibrant"
                />
                <input
                  type="number"
                  min={STREET_WIDTH_MIN}
                  max={STREET_WIDTH_MAX}
                  value={linkDraft.width}
                  onChange={(event) => {
                    const width = Math.min(
                      STREET_WIDTH_MAX,
                      Math.max(STREET_WIDTH_MIN, Math.round(Number(event.target.value) || STREET_WIDTH_MIN)),
                    );
                    setLinkDraft((current) => (current ? { ...current, width } : current));
                    setLinkError(null);
                  }}
                  className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </div>
            </label>

            <div className="space-y-1">
              <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
                Verbindungen
              </p>
              {connectCandidates.length === 0 ? (
                <p className="font-libre text-xs text-gray-500">Keine anderen Straßen zum Verbinden.</p>
              ) : (
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {connectCandidates.map((candidate) => {
                    const checked = linkDraft.connectsTo.includes(candidate.id);
                    return (
                      <li key={candidate.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded border border-hero-dark/50 bg-slate-900/40 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleConnect(candidate.id)}
                            className="accent-hero-vibrant"
                          />
                          <span
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: STREET_CATEGORY_META[candidate.category].color }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-barlow text-xs font-bold uppercase tracking-wide text-gray-100">
                            {candidate.name}
                          </span>
                          <span className="shrink-0 font-libre text-[10px] text-gray-400">
                            {streetCategoryLabel(candidate.category)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {linkDraft.category === "side" ? (
                <p className="font-libre text-[10px] text-gray-500">
                  Nebenstraßen brauchen mind. eine Verbindung zu einer Hauptstraße.
                </p>
              ) : null}
              {linkDraft.category === "alley" ? (
                <p className="font-libre text-[10px] text-gray-500">
                  Seitengassen brauchen mind. eine Verbindung zu einer Neben- oder Hauptstraße.
                </p>
              ) : null}
            </div>

            {(linkError || draftConnectionError) && (linkDirty || linkError) ? (
              <p className="flex items-start gap-1.5 font-libre text-xs text-red-400" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{linkError ?? draftConnectionError}</span>
              </p>
            ) : null}

            <button
              type="button"
              disabled={!linkDirty || Boolean(draftConnectionError)}
              onClick={saveStreetLinks}
              className="w-full rounded border border-accent-gold bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kategorie &amp; Verbindungen speichern
            </button>
          </div>

          <div className="space-y-1">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Durchquerte Viertel
            </p>
            {activeStreet.districtIds.length === 0 ? (
              <p className="font-libre text-xs text-gray-500">Keine (Linie außerhalb der Flächen).</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {activeStreet.districtIds.map((id) => {
                  const name = AURENFURT_DISTRICTS.find((d) => d.id === id)?.name ?? id;
                  return (
                    <li
                      key={id}
                      className="rounded border border-hero-dark/60 bg-background-dark/60 px-1.5 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-200"
                    >
                      {name}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ScoreField
            label="Sicherheit"
            value={activeStreet.security}
            onChange={(security) => onUpdateStreet(activeStreet.id, { security })}
          />
          <ScoreField
            label="Kriminalität"
            value={activeStreet.crime}
            onChange={(crime) => onUpdateStreet(activeStreet.id, { crime })}
          />
          <ScoreField
            label="Zustand (Basis)"
            value={activeStreet.condition}
            onChange={(condition) => onUpdateStreet(activeStreet.id, { condition })}
          />
          <ScoreField
            label="Verkehr"
            value={activeStreet.traffic}
            onChange={(traffic) => onUpdateStreet(activeStreet.id, { traffic })}
          />

          <label className="block space-y-1">
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
              Baumaßnahme
            </span>
            <select
              value={activeStreet.works.kind}
              onChange={(event) => setWorksKind(event.target.value as StreetWorks["kind"])}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            >
              {WORKS_OPTIONS.map((opt) => (
                <option key={opt.kind} value={opt.kind}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {(activeStreet.works.kind === "full_closure" ||
            activeStreet.works.kind === "full_closure_detour") && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Start
                </span>
                <input
                  type="date"
                  value={activeStreet.works.closureStart}
                  onChange={(event) => {
                    const works = activeStreet.works;
                    if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return;
                    onUpdateStreet(activeStreet.id, {
                      works: { ...works, closureStart: event.target.value },
                    });
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Tage
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={activeStreet.works.closureDays}
                  onChange={(event) => {
                    const works = activeStreet.works;
                    if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return;
                    const closureDays = Math.max(1, Math.round(Number(event.target.value) || 1));
                    onUpdateStreet(activeStreet.id, { works: { ...works, closureDays } });
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
                />
              </label>
            </div>
          )}

          {activeStreet.works.kind === "full_closure_detour" ? (
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                Umgehungsstraße
              </span>
              <select
                value={activeStreet.works.detourStreetId ?? ""}
                onChange={(event) => {
                  const works = activeStreet.works;
                  if (works.kind !== "full_closure_detour") return;
                  const detourStreetId = event.target.value || undefined;
                  onUpdateStreet(activeStreet.id, {
                    works: { ...works, detourStreetId },
                  });
                }}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
              >
                <option value="">— keine / eigene Polyline —</option>
                {streets
                  .filter((s) => s.id !== activeStreet.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <p className="font-libre text-[10px] text-gray-500">
                Alternativ kurze Umgehungs-Polyline in den Daten; Auswahl hier verknüpft eine andere
                Straße.
              </p>
            </label>
          ) : null}

          <div className="rounded border border-hero-dark/50 bg-background-dark/40 p-2">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
              Heute auf der Karte
            </p>
            {activeStreet.description.trim() ? (
              <p className="mt-1 line-clamp-3 font-libre text-xs text-gray-300">
                {activeStreet.description.trim()}
              </p>
            ) : null}
            <p className="mt-1 font-libre text-xs text-gray-200">
              {streetCategoryLabel(activeStreet.category)} · Dicke {activeStreet.width}
            </p>
            <p className="font-libre text-xs text-gray-200">
              Passierbarkeit: {streetEffective.passabilityLabel}
            </p>
            <p className="font-libre text-xs text-gray-400">
              Effektiver Zustand: {streetEffective.effectiveCondition}
              {streetEffective.weatherPenalty > 0
                ? ` (−${streetEffective.weatherPenalty} Wetter)`
                : ""}
            </p>
            <p className="font-libre text-xs text-gray-500">
              Wetter {dayWeather.label} · {worksKindLabel(activeStreet.works.kind)}
            </p>
            {streetEffective.worksExpired ? (
              <p className="mt-1 font-libre text-xs text-amber-400">
                Sperrfenster abgelaufen — Straße wieder freigegeben.
              </p>
            ) : null}
            {streetEffective.eventText ? (
              <p className="mt-1 font-libre text-xs text-gray-300">{streetEffective.eventText}</p>
            ) : null}
          </div>

          {confirmRemoveId === activeStreet.id ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onRemoveStreet(activeStreet.id);
                  setConfirmRemoveId(null);
                  onSelectStreet(null);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded border border-red-500/70 bg-red-950/40 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Endgültig entfernen
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                className="rounded border border-hero-dark px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-gray-400"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemoveId(activeStreet.id)}
              className="flex w-full items-center justify-center gap-1 rounded border border-red-500/40 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-red-400 hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Entfernen
            </button>
          )}

          <p className="font-libre text-[11px] text-gray-500">
            Straßen bleiben auf der Karte sichtbar. Handles nur bei gewählter Straße im Editor.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SectorSizeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={SECTOR_SIZE_MIN}
          max={SECTOR_SIZE_MAX}
          step={SECTOR_SIZE_STEP}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full accent-hero-vibrant disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="number"
          min={SECTOR_SIZE_MIN}
          max={SECTOR_SIZE_MAX}
          step={SECTOR_SIZE_STEP}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-16 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </label>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full accent-hero-vibrant"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) =>
            onChange(Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))))
          }
          className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1 text-right font-libre text-xs text-white outline-none focus:border-hero-vibrant"
        />
      </div>
    </label>
  );
}

function normalizeColorInput(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#cab926";
}
