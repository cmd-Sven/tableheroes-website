"use client";

import { useMemo } from "react";
import type { CityBuilding, CityDistrictId } from "../aurenfurt-districts";
import {
  findKeyLocation,
  keyLocationsInDistrict,
  type KeyLocation,
} from "../aurenfurt-locations";

export type DistrictKeyLocations = {
  locations: KeyLocation[];
  selected: KeyLocation | null;
};

/**
 * Key-Locations eines Viertels plus optional das aktuell gewählte Gebäude.
 * Statische Standort-Attribute (Gilde, Wohlstand, Hotspot, Bonus) — keine Zeitreihen.
 */
export function useKeyLocations(
  districtId: CityDistrictId | null,
  buildingId: string | null = null,
  buildings?: CityBuilding[],
): DistrictKeyLocations {
  return useMemo(() => {
    if (!districtId) {
      return {
        locations: [],
        selected: buildingId ? findKeyLocation(buildingId, buildings) : null,
      };
    }
    const locations = keyLocationsInDistrict(districtId, buildings);
    const selected = buildingId
      ? locations.find((location) => location.id === buildingId) ??
        findKeyLocation(buildingId, buildings)
      : null;
    return { locations, selected };
  }, [districtId, buildingId, buildings]);
}
