"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AURENFURT_DISTRICTS,
  buildingsInDistrict,
  type CityBuilding,
  type CityDistrictId,
} from "./aurenfurt-districts";
import type { BuildingCategory } from "./aurenfurt-building-categories";
import type { BuildingPositions } from "./aurenfurt-building-positions";
import type { DistrictSectorsByDistrict } from "./aurenfurt-sectors";
import type { LandmarkScales } from "./aurenfurt-landmark-scales";
import type { LandmarkRotations } from "./aurenfurt-landmark-rotations";
import type { DistrictPolygons, UvPoint } from "./aurenfurt-district-polygons";
import { nearbyStreetsForBuilding } from "./aurenfurt-map-buildings";
import type { AurenfurtMapPoi, PoiInfluence, PoiKind } from "./aurenfurt-map-pois";
import { effectiveStreet, type AurenfurtStreet, type StreetWorks } from "./aurenfurt-streets";
import type { DayWeather } from "./aurenfurt-weather";
import {
  SECTOR_SIZE_DEFAULT,
  divideDistrictIntoSectors,
  type DistrictSector,
  type DivideDistrictResult,
  type SectorCellSize,
} from "./aurenfurt-sectors";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";
import { useStreetLinkDraft } from "./hooks/useStreetLinkDraft";
import { DistrictsToolBody } from "./editor/DistrictsToolBody";
import { BuildingsToolBody } from "./editor/BuildingsToolBody";
import { PoisToolBody } from "./editor/PoisToolBody";
import { StreetsToolBody } from "./editor/StreetsToolBody";

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
  streets: "StraÃŸen",
  buildings: "GebÃ¤ude",
  pois: "Orte",
  walls: "Mauern",
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

  const {
    linkDraft,
    setLinkDraft,
    linkError,
    setLinkError,
    linkDirty,
    draftConnectionError,
    connectCandidates,
    changeDraftCategory,
    toggleConnect,
    saveStreetLinks,
  } = useStreetLinkDraft(activeStreet, streets, onUpdateStreet);

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
          SchlieÃŸen
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
