"use client";

import { useEffect, useMemo, useState } from "react";
import { CITY_BUILDINGS, findBuilding, type CityBuilding } from "../aurenfurt-districts";
import { resolveBuildingUv, type BuildingPositions } from "../aurenfurt-building-positions";
import { buildingCategoryForId } from "../aurenfurt-building-categories";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import type { DistrictSector } from "../aurenfurt-sectors";
import {
  sectorsInBuildingInfluence,
  sectorsInPoiInfluence,
  type ReachNpc,
} from "../aurenfurt-sector-reach";
import { allAurenfurtNpcs, operatorForLocation } from "../aurenfurt-npcs";
import { findPoi, poisInDistrict, type AurenfurtMapPoi } from "../aurenfurt-map-pois";
import {
  loadLeadingNpcForMapLocation,
  type MapLocationLeadNpc,
} from "../aurenfurt-map-poi-actions";
import type { useHoloCityView } from "./useHoloCityView";

type Params = {
  worldId: string;
  subject: ReturnType<typeof useHoloCityView>["subject"];
  buildings: CityBuilding[];
  pois: AurenfurtMapPoi[];
  buildingPositions: BuildingPositions;
  buildingLocationIds: Record<string, string>;
  sectorsByDistrict: Record<string, DistrictSector[]>;
  polygons: DistrictPolygons;
};

/** Einflussbereich (Sektoren) und Lead-NPC für ausgewählte POIs/Gebäude. */
export function useMapSelectionReach({
  worldId,
  subject,
  buildings,
  pois,
  buildingPositions,
  buildingLocationIds,
  sectorsByDistrict,
  polygons,
}: Params) {
  const [poiReachVisible, setPoiReachVisible] = useState(false);
  const [poiLeadNpc, setPoiLeadNpc] = useState<MapLocationLeadNpc | null>(null);

  const selectedPoi = subject?.type === "poi" ? findPoi(pois, subject.id) : null;
  const districtPoiInfluences = useMemo(() => {
    if (subject?.type !== "district") return [];
    return poisInDistrict(pois, subject.districtId);
  }, [pois, subject]);

  useEffect(() => {
    if (subject?.type !== "poi" && subject?.type !== "building") {
      setPoiReachVisible(false);
    }
  }, [subject]);

  const mapBuildings = buildings.length > 0 ? buildings : CITY_BUILDINGS;
  const selectedBuilding =
    subject?.type === "building" ? findBuilding(subject.id, mapBuildings) : null;
  const selectedBuildingLocationId = selectedBuilding
    ? buildingLocationIds[selectedBuilding.id] ??
      (selectedBuilding.fromEditor ? selectedBuilding.id : null)
    : null;

  /**
   * Kein Nähe-Fallback mehr: öffentliche POIs (Platz, Brunnen, …) bekommen Fraktionen,
   * nicht den nächsten Tavernen-/Tor-Betreiber (z. B. Rhessa am Marktplatz).
   * Laden/Geschäft: nur DB-Zuordnung (home/current_location) — kein Katalog-Ersatz.
   */
  const poiOperatorFallbackCatalogId = useMemo(() => {
    if (!selectedPoi) return null;
    if (selectedPoi.kind !== "Laden/Geschäft") return null;
    // Nur exakter Namens-Match zu einem Gebäude-Betreiber (Salon ↔ Salon-Betreiber).
    const poiName = selectedPoi.name.trim().toLowerCase();
    for (const building of mapBuildings) {
      const buildingName = building.name.trim().toLowerCase();
      if (!buildingName || buildingName !== poiName) continue;
      const operator = operatorForLocation(building.id);
      if (operator) return operator.id;
    }
    return null;
  }, [mapBuildings, selectedPoi]);

  const buildingOperatorFallbackCatalogId = useMemo(() => {
    if (!selectedBuilding) return null;
    return operatorForLocation(selectedBuilding.id)?.id ?? null;
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedPoi) {
      let active = true;
      setPoiLeadNpc(null);
      void loadLeadingNpcForMapLocation(worldId, selectedPoi.id, {
        fallbackCatalogId: poiOperatorFallbackCatalogId,
      }).then((npc) => {
        if (active) setPoiLeadNpc(npc);
      });
      return () => {
        active = false;
      };
    }
    if (selectedBuilding) {
      let active = true;
      setPoiLeadNpc(null);
      const locationId = selectedBuildingLocationId ?? selectedBuilding.id;
      void loadLeadingNpcForMapLocation(worldId, locationId, {
        fallbackCatalogId: buildingOperatorFallbackCatalogId,
      }).then((npc) => {
        if (active) setPoiLeadNpc(npc);
      });
      return () => {
        active = false;
      };
    }
    setPoiLeadNpc(null);
    return undefined;
  }, [
    buildingOperatorFallbackCatalogId,
    poiOperatorFallbackCatalogId,
    worldId,
    selectedBuilding,
    selectedBuildingLocationId,
    selectedPoi,
  ]);

  const buildingReachStaff = useMemo((): ReachNpc[] => {
    if (!selectedBuilding) return [];
    return allAurenfurtNpcs()
      .filter((npc) => npc.forCitySimulation && npc.locationId === selectedBuilding.id)
      .map((npc) => ({
        locationId: npc.locationId,
        tier: npc.cityInfluenceTier,
        influence: npc.influenceAndLoyalty.influence,
        loyalCriminal: npc.cityAxisLoyalCriminal,
        greedyAltruist: npc.cityAxisGreedyAltruist,
      }));
  }, [selectedBuilding]);

  const buildingReachHint = useMemo(() => {
    if (!selectedBuilding) return null;
    const staff = buildingReachStaff;
    const radius = staff.reduce((max, npc) => {
      const step = npc.tier === "apex_global" ? 4 : npc.tier === "authority_faction" ? 3 : npc.tier === "regional_economy" ? 2 : 1;
      return Math.max(max, step);
    }, 0);
    const category = buildingCategoryForId(selectedBuilding.id, selectedBuilding.category);
    if (radius <= 0) return `Standort · ${category}`;
    return `${radius} Sektor${radius === 1 ? "" : "en"} · ${category}`;
  }, [buildingReachStaff, selectedBuilding]);

  const poiReachCells = useMemo(() => {
    if (!poiReachVisible) return [];
    if (selectedPoi) {
      return sectorsInPoiInfluence(selectedPoi, sectorsByDistrict, polygons);
    }
    if (selectedBuilding) {
      const uv = resolveBuildingUv(selectedBuilding, buildingPositions);
      return sectorsInBuildingInfluence(
        {
          id: selectedBuilding.id,
          districtId: selectedBuilding.districtId,
          category: buildingCategoryForId(selectedBuilding.id, selectedBuilding.category),
          hotspot: selectedBuilding.isHotspot,
          u: uv.u,
          v: uv.v,
        },
        buildingReachStaff,
        sectorsByDistrict,
        polygons,
      );
    }
    return [];
  }, [
    buildingPositions,
    buildingReachStaff,
    poiReachVisible,
    polygons,
    sectorsByDistrict,
    selectedBuilding,
    selectedPoi,
  ]);

  return {
    poiReachVisible,
    setPoiReachVisible,
    poiLeadNpc,
    poiReachCells,
    selectedPoi,
    districtPoiInfluences,
    selectedBuilding,
    selectedBuildingLocationId,
    buildingReachHint,
  };
}
