"use client";

import { useCallback, useRef, useTransition, type Dispatch, type SetStateAction } from "react";
import { findBuilding, type CityBuilding } from "../aurenfurt-districts";
import { pointInPolygon, type DistrictPolygons, type UvPoint } from "../aurenfurt-district-polygons";
import type { AurenfurtPlaceLore } from "../aurenfurt-lore";
import {
  createAurenfurtMapBuilding,
  updateAurenfurtMapBuildingCategory,
} from "../aurenfurt-map-building-actions";
import {
  buildingCategoryForId,
  categoryToBuildingKind,
  isBuildingCategory,
  type BuildingCategory,
} from "../aurenfurt-building-categories";
import { LORE_PLACEHOLDER_IMAGE } from "../aurenfurt-district-lore-ids";
import { createAurenfurtMapPoi, updateAurenfurtMapPoiPosition } from "../aurenfurt-map-poi-actions";
import {
  districtIdAtUv,
  type AurenfurtMapPoi,
  type PoiInfluence,
  type PoiKind,
} from "../aurenfurt-map-pois";
import type { MapEditorSession } from "./useMapEditorSession";
import type { useBuildingPositions } from "./useBuildingPositions";

type Params = {
  worldId: string;
  session: MapEditorSession;
  polygons: DistrictPolygons;
  buildings: CityBuilding[];
  categoryOverrides: Record<string, BuildingCategory>;
  pois: AurenfurtMapPoi[];
  buildingPositions: ReturnType<typeof useBuildingPositions>;
  setEditorBuildings: Dispatch<SetStateAction<CityBuilding[]>>;
  setCategoryOverrides: Dispatch<SetStateAction<Record<string, BuildingCategory>>>;
  setPois: Dispatch<SetStateAction<AurenfurtMapPoi[]>>;
  setPlaces: Dispatch<SetStateAction<AurenfurtPlaceLore[]>>;
};

/** Speichern von Gebäuden/POIs sowie Verschieben und Commit von POI-Positionen. */
export function useMapEditorMutations({
  worldId,
  session,
  polygons,
  buildings,
  categoryOverrides,
  pois,
  buildingPositions,
  setEditorBuildings,
  setCategoryOverrides,
  setPois,
  setPlaces,
}: Params) {
  const {
    editingDistrictId,
    selectedPoiId,
    repositioningPoi,
    buildingDraftUv,
    poiDraftUv,
    poiDraftDistrictId,
    setBuildingSaveError,
    setCategorySaveNote,
    setBuildingDraftUv,
    setPlacingBuilding,
    setBuildingFormKey,
    setPoiSaveError,
    setPoiDraftUv,
    setPoiDraftDistrictId,
    setPlacingPoi,
    setRepositioningPoi,
    setPoiFormKey,
  } = session;
  const poisRef = useRef(pois);
  poisRef.current = pois;
  const [savingBuilding, startSaveBuilding] = useTransition();
  const [savingCategory, startSaveCategory] = useTransition();
  const [savingPoi, startSavePoi] = useTransition();

  const placeBuildingPoint = useCallback(
    (point: UvPoint) => {
      if (!editingDistrictId) return;
      const poly = polygons[editingDistrictId]?.points ?? [];
      if (!pointInPolygon(point, poly)) {
        setBuildingSaveError("Gebäude nur innerhalb des Viertel-Polygons platzieren.");
        return;
      }
      setBuildingSaveError(null);
      setBuildingDraftUv(point);
      setPlacingBuilding(false);
    },
    [editingDistrictId, polygons, setBuildingDraftUv, setBuildingSaveError, setPlacingBuilding],
  );

  const placePoiPoint = useCallback(
    (point: UvPoint) => {
      const districtId = districtIdAtUv(point, polygons);
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
        // Sofort lokal setzen — freie UV, Sektoren folgen später aus der Position.
        setPois((current) =>
          current.map((poi) =>
            poi.id === selectedPoiId ? { ...poi, u: point.u, v: point.v, districtId } : poi,
          ),
        );
        startSavePoi(async () => {
          const result = await updateAurenfurtMapPoiPosition({
            worldId,
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
    [
      polygons,
      repositioningPoi,
      worldId,
      selectedPoiId,
      setPlacingPoi,
      setPoiDraftDistrictId,
      setPoiDraftUv,
      setPoiSaveError,
      setPois,
      setRepositioningPoi,
    ],
  );

  const movePoiPoint = useCallback(
    (poiId: string, point: UvPoint) => {
      const districtId = districtIdAtUv(point, polygons);
      if (!districtId) return;
      setPoiSaveError(null);
      setPois((current) =>
        current.map((poi) =>
          poi.id === poiId ? { ...poi, u: point.u, v: point.v, districtId } : poi,
        ),
      );
    },
    [polygons, setPoiSaveError, setPois],
  );

  const commitPoiPoint = useCallback(
    (poiId: string) => {
      const poi = poisRef.current.find((entry) => entry.id === poiId);
      if (!poi) return;
      startSavePoi(async () => {
        const result = await updateAurenfurtMapPoiPosition({
          worldId,
          poiId: poi.id,
          districtId: poi.districtId,
          u: poi.u,
          v: poi.v,
        });
        if (!result.ok) {
          setPoiSaveError(result.error);
          return;
        }
        setPois((current) => [
          ...current.filter((entry) => entry.id !== result.poi.id),
          result.poi,
        ]);
      });
    },
    [setPoiSaveError, setPois, worldId],
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
        worldId,
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
      buildingPositions.placeAndCommit(
        result.building.id,
        {
          u: result.building.u,
          v: result.building.v,
        },
        {
          name: result.building.name,
          districtId: result.building.districtId,
          buildingType: result.building.category,
          streetId: result.building.streetId,
        },
      );
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
        worldId,
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
        worldId,
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

  return {
    savingBuilding,
    savingCategory,
    savingPoi,
    placeBuildingPoint,
    placePoiPoint,
    movePoiPoint,
    commitPoiPoint,
    saveNewBuilding,
    saveBuildingCategory,
    saveNewPoi,
  };
}
