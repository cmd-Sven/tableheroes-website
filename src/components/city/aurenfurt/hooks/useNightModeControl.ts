"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "aurenfurt-night-mode:";

function storageKey(worldId: string) {
  return `${STORAGE_PREFIX}${worldId}`;
}

function readStored(worldId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(worldId)) === "1";
  } catch {
    return false;
  }
}

function writeStored(worldId: string, night: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(worldId), night ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/**
 * SL-Nachtmodus für die Stadtkarte (lokal persistiert je Welt).
 * Session-Tagesphase kann den Zustand für alle Clients setzen.
 */
export function useNightModeControl(worldId: string, isGm: boolean) {
  const [night, setNightState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setNightState(readStored(worldId));
    setReady(true);
  }, [worldId]);

  const setNight = useCallback(
    (next: boolean, options?: { persist?: boolean; force?: boolean }) => {
      const force = options?.force === true;
      const persist = options?.persist !== false;
      if (!isGm && !force) return;
      setNightState(next);
      if (persist && (isGm || force)) writeStored(worldId, next);
    },
    [isGm, worldId],
  );

  const toggleNight = useCallback(() => {
    setNight(!night);
  }, [night, setNight]);

  return { night, setNight, toggleNight, ready, canToggle: isGm };
}
