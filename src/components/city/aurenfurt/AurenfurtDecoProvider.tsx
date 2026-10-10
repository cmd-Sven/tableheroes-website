"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type CityMapDecoration,
  type DecoModelKey,
} from "./aurenfurt-deco-catalog";
import type { UvPoint } from "./aurenfurt-district-polygons";
import { useAurenfurtDecorations } from "./hooks/useAurenfurtDecorations";

type AurenfurtDecoApi = {
  isGm: boolean;
  ready: boolean;
  saveError: string | null;
  modelError: string | null;
  reportModelError: (message: string) => void;
  items: CityMapDecoration[];
  panelOpen: boolean;
  placingKey: DecoModelKey | null;
  selectedId: string | null;
  togglePanel: () => void;
  startPlace: (key: DecoModelKey) => void;
  select: (id: string | null) => void;
  placeAt: (point: UvPoint) => void;
  move: (id: string, point: UvPoint) => void;
  commitMove: (id: string) => void;
  setScale: (id: string, scale: number) => void;
  setRotation: (id: string, rotation: number) => void;
  remove: (id: string) => void;
};

const AurenfurtDecoContext = createContext<AurenfurtDecoApi | null>(null);

export function useAurenfurtDeco(): AurenfurtDecoApi {
  const value = useContext(AurenfurtDecoContext);
  if (!value) {
    throw new Error("Die Deko-Schicht ist nicht eingebunden.");
  }
  return value;
}

export function AurenfurtDecoProvider({
  worldId,
  isGm,
  children,
}: {
  worldId: string;
  isGm: boolean;
  children: ReactNode;
}) {
  const deco = useAurenfurtDecorations(worldId, isGm);
  const [modelError, setModelError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [placingKey, setPlacingKey] = useState<DecoModelKey | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      if (open) {
        setPlacingKey(null);
        setSelectedId(null);
      }
      return !open;
    });
  }, []);

  const startPlace = useCallback((key: DecoModelKey) => {
    setPanelOpen(true);
    setSelectedId(null);
    setPlacingKey((current) => (current === key ? null : key));
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setPlacingKey(null);
  }, []);

  const placeAt = useCallback(
    (point: UvPoint) => {
      if (!placingKey) return;
      const created = deco.place(placingKey, point);
      setPlacingKey(null);
      if (created) setSelectedId(created.id);
    },
    [deco.place, placingKey],
  );

  const remove = useCallback(
    (id: string) => {
      deco.remove(id);
      setSelectedId((current) => (current === id ? null : current));
    },
    [deco.remove],
  );

  const value = useMemo<AurenfurtDecoApi>(
    () => ({
      isGm,
      ready: deco.ready,
      saveError: deco.saveError,
      modelError,
      reportModelError: setModelError,
      items: deco.items,
      panelOpen,
      placingKey,
      selectedId,
      togglePanel,
      startPlace,
      select,
      placeAt,
      move: deco.move,
      commitMove: deco.save,
      setScale: deco.setScale,
      setRotation: deco.setRotation,
      remove,
    }),
    [
      deco.items,
      deco.move,
      deco.ready,
      deco.save,
      modelError,
      deco.saveError,
      deco.setRotation,
      deco.setScale,
      isGm,
      panelOpen,
      placeAt,
      placingKey,
      remove,
      select,
      selectedId,
      startPlace,
      togglePanel,
    ],
  );

  return <AurenfurtDecoContext.Provider value={value}>{children}</AurenfurtDecoContext.Provider>;
}
