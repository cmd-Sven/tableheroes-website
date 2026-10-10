"use client";

import { useCallback, useEffect, useState } from "react";
import type { DistrictPolygons, UvPoint } from "../aurenfurt-district-polygons";
import { clampUvPoint } from "../aurenfurt-district-polygons";
import { loadCityMapStreets, saveCityMapStreets } from "../aurenfurt-city-map-db";
import {
  defaultStreet,
  syncStreetDistricts,
  type AurenfurtStreet,
  type StreetWorks,
} from "../aurenfurt-streets";

export function useAurenfurtStreets(polygons: DistrictPolygons, worldId: string, isGm: boolean) {
  const [streets, setStreets] = useState<AurenfurtStreet[]>([]);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapStreets(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setStreets(result.data.map((street) => syncStreetDistricts(street, polygons)));
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Straßen konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
    // Polygone beim ersten Laden; spätere Änderungen zieht der Effekt darunter nach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGm, worldId]);

  useEffect(() => {
    setStreets((current) => {
      if (current.length === 0) return current;
      let changed = false;
      const synced = current.map((street) => {
        const next = syncStreetDistricts(street, polygons);
        if (
          next.districtIds.length !== street.districtIds.length ||
          next.districtIds.some((id, i) => id !== street.districtIds[i])
        ) {
          changed = true;
        }
        return next;
      });
      return changed ? synced : current;
    });
  }, [polygons]);

  const persist = useCallback(
    (next: AurenfurtStreet[]) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Straßen speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapStreets(worldId, next).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  const commit = useCallback(() => {
    setStreets((current) => {
      const synced = current.map((street) => syncStreetDistricts(street, polygons));
      persist(synced);
      return synced;
    });
  }, [persist, polygons]);

  const addStreet = useCallback(
    (points: UvPoint[], name?: string) => {
      if (points.length < 2) return null;
      const street = syncStreetDistricts(
        defaultStreet({
          name: name ?? "Neue Straße",
          points: points.map((p) => clampUvPoint(p)),
        }),
        polygons,
      );
      setStreets((current) => {
        const next = [...current, street];
        persist(next);
        return next;
      });
      return street.id;
    },
    [persist, polygons],
  );

  const removeStreet = useCallback(
    (streetId: string) => {
      setStreets((current) => {
        const next = current
          .filter((street) => street.id !== streetId)
          .map((street) => ({
            ...street,
            connectsTo: street.connectsTo.filter((id) => id !== streetId),
          }));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateStreet = useCallback(
    (streetId: string, patch: Partial<Omit<AurenfurtStreet, "id" | "points" | "districtIds">>) => {
      setStreets((current) => {
        const next = current.map((street) => {
          if (street.id !== streetId) return street;
          const category = patch.category ?? street.category;
          const width =
            typeof patch.width === "number"
              ? Math.min(12, Math.max(1, Math.round(patch.width)))
              : street.width;
          const connectsTo = Array.isArray(patch.connectsTo)
            ? patch.connectsTo.filter((id): id is string => typeof id === "string" && id.length > 0)
            : street.connectsTo;
          return {
            ...street,
            ...patch,
            name: typeof patch.name === "string" ? patch.name : street.name,
            description: typeof patch.description === "string" ? patch.description : street.description,
            category,
            width,
            connectsTo,
            security:
              typeof patch.security === "number" ? Math.min(100, Math.max(0, Math.round(patch.security))) : street.security,
            crime: typeof patch.crime === "number" ? Math.min(100, Math.max(0, Math.round(patch.crime))) : street.crime,
            condition:
              typeof patch.condition === "number"
                ? Math.min(100, Math.max(0, Math.round(patch.condition)))
                : street.condition,
            traffic:
              typeof patch.traffic === "number" ? Math.min(100, Math.max(0, Math.round(patch.traffic))) : street.traffic,
            works: patch.works ?? street.works,
          };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setStreetWorks = useCallback(
    (streetId: string, works: StreetWorks) => {
      updateStreet(streetId, { works });
    },
    [updateStreet],
  );

  const moveStreetPoint = useCallback((streetId: string, index: number, point: UvPoint) => {
    setStreets((current) =>
      current.map((street) => {
        if (street.id !== streetId) return street;
        if (index < 0 || index >= street.points.length) return street;
        const points = street.points.slice();
        points[index] = clampUvPoint(point);
        return { ...street, points };
      }),
    );
  }, []);

  const refreshDistrictIds = useCallback(() => {
    setStreets((current) => {
      const synced = current.map((street) => syncStreetDistricts(street, polygons));
      persist(synced);
      return synced;
    });
  }, [persist, polygons]);

  return {
    streets,
    saved,
    ready,
    saveError,
    addStreet,
    removeStreet,
    updateStreet,
    setStreetWorks,
    moveStreetPoint,
    commit,
    refreshDistrictIds,
  };
}
