"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import {
  AURENFURT_DISTRICTS,
  type CityBuilding,
  type CityDistrict,
  type CityDistrictId,
} from "../aurenfurt-districts";
import {
  BUILDING_CATEGORIES,
  buildingCategoryForId,
  type BuildingCategory,
} from "../aurenfurt-building-categories";
import { resolveBuildingUv, type BuildingPositions } from "../aurenfurt-building-positions";
import { allAurenfurtNpcs } from "../aurenfurt-npcs";
import { reportBuildingReach } from "../aurenfurt-sector-reach";
import type { DistrictSectorsByDistrict } from "../aurenfurt-sectors";
import {
  LANDMARK_SCALE_DEFAULT,
  LANDMARK_SCALE_MAX,
  LANDMARK_SCALE_MIN,
  LANDMARK_SCALE_STEP,
  resolveLandmarkScale,
  type LandmarkScales,
} from "../aurenfurt-landmark-scales";
import {
  LANDMARK_ROTATION_MAX,
  LANDMARK_ROTATION_MIN,
  LANDMARK_ROTATION_STEP,
  resolveLandmarkRotation,
  type LandmarkRotations,
} from "../aurenfurt-landmark-rotations";
import {
  pointInPolygon,
  type DistrictPolygons,
  type UvPoint,
} from "../aurenfurt-district-polygons";
import { isCityBuildingActive } from "../aurenfurt-map-buildings";
import type { AurenfurtStreet } from "../aurenfurt-streets";

export function BuildingsToolBody({
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
