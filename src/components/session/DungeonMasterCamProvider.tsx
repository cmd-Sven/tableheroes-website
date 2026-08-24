/**
 * DungeonMasterCamProvider — Board-level MediaStream owner for Overlord-Cam.
 * Mount once under LiveSessionBoard so Battlemap/Scene/Stage switches do not remount the stream.
 */
"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useDungeonMasterCam,
  type DungeonMasterCamApi,
  type UseDungeonMasterCamOptions,
} from "./useDungeonMasterCam";

const DungeonMasterCamContext = createContext<DungeonMasterCamApi | null>(null);

export function DungeonMasterCamProvider({
  enabled,
  userId,
  children,
}: UseDungeonMasterCamOptions & { children: ReactNode }) {
  const api = useDungeonMasterCam({ enabled, userId });

  return (
    <DungeonMasterCamContext.Provider value={api}>
      {children}
    </DungeonMasterCamContext.Provider>
  );
}

export function useDungeonMasterCamContext(): DungeonMasterCamApi {
  const ctx = useContext(DungeonMasterCamContext);
  if (!ctx) {
    throw new Error(
      "useDungeonMasterCamContext must be used within DungeonMasterCamProvider",
    );
  }
  return ctx;
}

export function useDungeonMasterCamContextOptional(): DungeonMasterCamApi | null {
  return useContext(DungeonMasterCamContext);
}
