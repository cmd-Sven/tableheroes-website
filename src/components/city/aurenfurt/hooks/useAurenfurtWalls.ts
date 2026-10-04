"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WALLS_STORAGE_KEY,
  defaultWall,
  parseStoredWalls,
  serializeWalls,
  type AurenfurtWall,
} from "../aurenfurt-walls";
import { clampUvPoint, type UvPoint } from "../aurenfurt-district-polygons";

export function useAurenfurtWalls() {
  const [walls, setWalls] = useState<AurenfurtWall[]>([]);
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const stored = parseStoredWalls(window.localStorage.getItem(WALLS_STORAGE_KEY));
    if (stored) {
      setWalls(stored);
      setSavedLocally(true);
    }
  }, []);

  const persist = useCallback((next: AurenfurtWall[]) => {
    try {
      window.localStorage.setItem(WALLS_STORAGE_KEY, serializeWalls(next));
      setSavedLocally(true);
    } catch {
      // Quota / privater Modus
    }
  }, []);

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

  return { walls, savedLocally, addWall, updateWall, movePoint, removeWall };
}
