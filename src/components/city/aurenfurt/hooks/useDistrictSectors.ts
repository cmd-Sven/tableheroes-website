"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import { AURENFURT_DISTRICTS } from "../aurenfurt-districts";
import type { UvPoint } from "../aurenfurt-district-polygons";
import { loadCityMapSectors, saveCityMapSectors } from "../aurenfurt-city-map-db";
import {
  divideDistrictIntoSectors,
  registerDistrictSectorsForLookup,
  type DistrictSector,
  type DistrictSectorsByDistrict,
  type DivideDistrictResult,
  type SectorCellSize,
} from "../aurenfurt-sectors";

export function useDistrictSectors(worldId: string, isGm: boolean) {
  const [sectorsByDistrict, setSectorsByDistrict] = useState<DistrictSectorsByDistrict>({});
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapSectors(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setSectorsByDistrict(result.data);
        registerDistrictSectorsForLookup(result.data);
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Sektoren konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  useEffect(() => {
    registerDistrictSectorsForLookup(sectorsByDistrict);
  }, [sectorsByDistrict]);

  const persist = useCallback(
    (next: DistrictSectorsByDistrict) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Sektoren speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapSectors(worldId, next).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  const sectorsFor = useCallback(
    (districtId: CityDistrictId | null | undefined): DistrictSector[] => {
      if (!districtId) return [];
      return sectorsByDistrict[districtId] ?? [];
    },
    [sectorsByDistrict],
  );

  const divideDistrict = useCallback(
    (
      districtId: CityDistrictId,
      polygon: UvPoint[],
      cellSize: SectorCellSize,
    ): DivideDistrictResult | null => {
      const existing = sectorsByDistrict[districtId];
      if (existing && existing.length > 0) {
        return null;
      }

      const district = AURENFURT_DISTRICTS.find((d) => d.id === districtId);
      const name = district?.name ?? districtId;
      const result = divideDistrictIntoSectors(districtId, name, polygon, cellSize);
      if (result.sectors.length === 0) {
        return result;
      }

      setSectorsByDistrict((current) => {
        if (current[districtId] && current[districtId]!.length > 0) {
          return current;
        }
        const next: DistrictSectorsByDistrict = {
          ...current,
          [districtId]: result.sectors,
        };
        persist(next);
        registerDistrictSectorsForLookup(next);
        return next;
      });
      return result;
    },
    [persist, sectorsByDistrict],
  );

  return {
    sectorsByDistrict,
    sectorsFor,
    divideDistrict,
    saved,
    ready,
    saveError,
  };
}
