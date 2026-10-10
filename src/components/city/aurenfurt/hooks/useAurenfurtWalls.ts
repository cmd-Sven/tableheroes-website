"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCityMapWalls, saveCityMapWalls } from "../aurenfurt-city-map-db";
import { defaultWall, type AurenfurtWall } from "../aurenfurt-walls";
import { clampUvPoint, type UvPoint } from "../aurenfurt-district-polygons";

export function useAurenfurtWalls(worldId: string, isGm: boolean) {
  const [walls, setWalls] = useState<AurenfurtWall[]>([]);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapWalls(worldId, isGm)
      .then((result) => {
        if (!active) return;
        setWalls(result.data);
        setSaved(result.saved);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSaveError("Die Mauern konnten nicht aus der Datenbank geladen werden.");
        setSaved(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [isGm, worldId]);

  const persist = useCallback(
    (next: AurenfurtWall[]) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann die Mauer speichern.");
        setSaved(false);
        return;
      }
      void saveCityMapWalls(worldId, next).then((error) => {
        setSaveError(error);
        setSaved(error == null);
      });
    },
    [isGm, worldId],
  );

  const addWall = useCallback(
    (input: Omit<AurenfurtWall, "id"> & { id?: string }) => {
      if (input.points.length < 2) return null;
      const wall = defaultWall({
        ...input,
        points: input.points.map((point) => clampUvPoint(point)),
      });
      setWalls((current) => {
        const next = [...current, wall];
        persist(next);
        return next;
      });
      return wall;
    },
    [persist],
  );

  const updateWall = useCallback(
    (id: string, patch: Partial<Omit<AurenfurtWall, "id" | "points">> & { points?: UvPoint[] }) => {
      setWalls((current) => {
        const next = current.map((wall) => {
          if (wall.id !== id) return wall;
          return defaultWall({
            ...wall,
            ...patch,
            id: wall.id,
            points: patch.points ? patch.points.map((point) => clampUvPoint(point)) : wall.points,
          });
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const movePoint = useCallback(
    (id: string, index: number, point: UvPoint) => {
      setWalls((current) => {
        const next = current.map((wall) => {
          if (wall.id !== id) return wall;
          const points = wall.points.map((entry, i) => (i === index ? clampUvPoint(point) : entry));
          return { ...wall, points };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeWall = useCallback(
    (id: string) => {
      setWalls((current) => {
        const next = current.filter((wall) => wall.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { walls, saved, ready, saveError, addWall, updateWall, movePoint, removeWall };
}
