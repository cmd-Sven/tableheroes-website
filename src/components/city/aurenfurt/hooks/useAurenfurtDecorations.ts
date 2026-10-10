"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DECO_ROTATION_DEFAULT,
  DECO_SCALE_DEFAULT,
  clampDecoPoint,
  clampDecoRotation,
  clampDecoScale,
  decoModelByKey,
  type CityMapDecoration,
  type DecoModelKey,
} from "../aurenfurt-deco-catalog";
import type { UvPoint } from "../aurenfurt-district-polygons";
import {
  deleteCityMapDecoration,
  insertCityMapDecoration,
  loadCityMapDecorations,
  updateCityMapDecoration,
} from "@/src/lib/city-map-decorations";

export function useAurenfurtDecorations(worldId: string, isGm: boolean) {
  const [items, setItems] = useState<CityMapDecoration[]>([]);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const itemsRef = useRef<CityMapDecoration[]>([]);
  const queueRef = useRef(Promise.resolve());
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let active = true;
    setReady(false);
    loadCityMapDecorations(worldId)
      .then((result) => {
        if (!active) return;
        itemsRef.current = result.data;
        setItems(result.data);
        setSaveError(result.error);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        itemsRef.current = [];
        setItems([]);
        setSaveError("Die Deko konnte nicht aus der Datenbank geladen werden.");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [worldId]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task, task);
  }, []);

  const writeItems = useCallback((next: CityMapDecoration[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patchItem = useCallback(
    (id: string, patch: Partial<CityMapDecoration>) => {
      const next = itemsRef.current.map((item) => {
        if (item.id !== id) return item;
        const point = clampDecoPoint({
          u: patch.u ?? item.u,
          v: patch.v ?? item.v,
        });
        return {
          ...item,
          ...patch,
          u: point.u,
          v: point.v,
          scale: clampDecoScale(patch.scale ?? item.scale),
          rotation: clampDecoRotation(patch.rotation ?? item.rotation),
        };
      });
      writeItems(next);
    },
    [writeItems],
  );

  const place = useCallback(
    (modelKey: DecoModelKey, point: UvPoint) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Deko setzen.");
        return null;
      }
      const model = decoModelByKey(modelKey);
      if (!model) {
        setSaveError("Dieses Deko-Modell ist nicht verfügbar.");
        return null;
      }
      const uv = clampDecoPoint(point);
      const item: CityMapDecoration = {
        id: crypto.randomUUID(),
        modelKey: model.key,
        name: model.name,
        u: uv.u,
        v: uv.v,
        scale: DECO_SCALE_DEFAULT,
        rotation: DECO_ROTATION_DEFAULT,
      };
      writeItems([...itemsRef.current, item]);
      enqueue(async () => {
        const error = await insertCityMapDecoration(worldId, item);
        if (error) {
          setSaveError(error);
          writeItems(itemsRef.current.filter((entry) => entry.id !== item.id));
          return;
        }
        setSaveError(null);
      });
      return item;
    },
    [enqueue, isGm, worldId, writeItems],
  );

  const save = useCallback(
    (id: string) => {
      const pending = saveTimers.current.get(id);
      if (pending) {
        clearTimeout(pending);
        saveTimers.current.delete(id);
      }
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Deko ändern.");
        return;
      }
      enqueue(async () => {
        const item = itemsRef.current.find((entry) => entry.id === id);
        if (!item) return;
        const error = await updateCityMapDecoration(worldId, item);
        setSaveError(error);
        if (error) {
          const fresh = await loadCityMapDecorations(worldId);
          if (!fresh.error) {
            itemsRef.current = fresh.data;
            setItems(fresh.data);
          }
        }
      });
    },
    [enqueue, isGm, worldId],
  );

  const scheduleSave = useCallback(
    (id: string) => {
      const pending = saveTimers.current.get(id);
      if (pending) clearTimeout(pending);
      saveTimers.current.set(
        id,
        setTimeout(() => {
          saveTimers.current.delete(id);
          save(id);
        }, 160),
      );
    },
    [save],
  );

  const move = useCallback(
    (id: string, point: UvPoint) => {
      patchItem(id, point);
    },
    [patchItem],
  );

  const setScale = useCallback(
    (id: string, scale: number) => {
      patchItem(id, { scale });
      scheduleSave(id);
    },
    [patchItem, scheduleSave],
  );

  const setRotation = useCallback(
    (id: string, rotation: number) => {
      patchItem(id, { rotation });
      scheduleSave(id);
    },
    [patchItem, scheduleSave],
  );

  const remove = useCallback(
    (id: string) => {
      if (!isGm) {
        setSaveError("Nur der Spielleiter kann Deko löschen.");
        return;
      }
      const previous = itemsRef.current;
      writeItems(previous.filter((item) => item.id !== id));
      enqueue(async () => {
        const error = await deleteCityMapDecoration(worldId, id);
        if (error) {
          setSaveError(error);
          writeItems(previous);
          return;
        }
        setSaveError(null);
      });
    },
    [enqueue, isGm, worldId, writeItems],
  );

  return {
    items,
    ready,
    saveError,
    place,
    move,
    save,
    setScale,
    setRotation,
    remove,
  };
}
