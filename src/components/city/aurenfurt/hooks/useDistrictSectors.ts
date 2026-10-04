"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import { AURENFURT_DISTRICTS } from "../aurenfurt-districts";
import type { UvPoint } from "../aurenfurt-district-polygons";
import {
  DISTRICT_SECTORS_STORAGE_KEY,
  divideDistrictIntoSectors,
  parseStoredDistrictSectors,
  registerDistrictSectorsForLookup,
  serializeDistrictSectors,
  type DistrictSector,
  type DistrictSectorsByDistrict,
  type DivideDistrictResult,
  type SectorCellSize,
} from "../aurenfurt-sectors";

export function useDistrictSectors() {
  const [sectorsByDistrict, setSectorsByDistrict] = useState<DistrictSectorsByDistrict>({});
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const stored = parseStoredDistrictSectors(
      window.localStorage.getItem(DISTRICT_SECTORS_STORAGE_KEY),
    );
    if (stored) {
      setSectorsByDistrict(stored);
      registerDistrictSectorsForLookup(stored);
      setSavedLocally(true);
    }
  }, []);

  useEffect(() => {
    registerDistrictSectorsForLookup(sectorsByDistrict);
  }, [sectorsByDistrict]);

  const persist = useCallback((next: DistrictSectorsByDistrict) => {
    try {
      window.localStorage.setItem(DISTRICT_SECTORS_STORAGE_KEY, serializeDistrictSectors(next));
      setSavedLocally(true);
    } catch {
      // Quota / private mode
    }
  }, []);

  const sectorsFor = useCallback(
    (districtId: CityDistrictId | null | undefined): DistrictSector[] => {
      if (!districtId) return [];
      return sectorsByDistrict[districtId] ?? [];
    },
    [sectorsByDistrict],
  );

  /**
   * Teilt ein Viertel einmalig mit fester Zellengröße ein und persistiert.
   * Hat das Viertel bereits Sektoren, bleibt der Bestand unverändert (kein Überschreiben).
   */
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
        // Nochmal prüfen: Race / Doppelklick – bestehende Einteilung nie überschreiben.
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
    savedLocally,
  };
}
