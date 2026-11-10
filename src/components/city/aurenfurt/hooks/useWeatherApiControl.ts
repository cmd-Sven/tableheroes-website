"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "aurenfurt-weather-api:";
const EVENT_NAME = "aurenfurt-weather-api-change";

function storageKey(worldId: string) {
  return `${STORAGE_PREFIX}${worldId}`;
}

function readStored(worldId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(storageKey(worldId));
    if (raw == null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

function writeStored(worldId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(worldId), enabled ? "1" : "0");
  } catch {
    /* private mode */
  }
}

function dispatchChange(worldId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { worldId, enabled },
    }),
  );
}

/**
 * SL-Schalter: Live-Wetter-API für Statistik/Simulation der Stadt.
 * Manuelle Atmosphäre-Buttons bleiben rein optisch.
 */
export function useWeatherApiControl(worldId: string, isGm: boolean) {
  const [enabled, setEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabledState(readStored(worldId));
    setReady(true);
  }, [worldId]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId: string; enabled: boolean }>).detail;
      if (!detail || detail.worldId !== worldId) return;
      setEnabledState(detail.enabled);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(worldId)) return;
      setEnabledState(event.newValue == null ? true : event.newValue !== "0" && event.newValue !== "false");
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [worldId]);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (!isGm) return;
      setEnabledState(next);
      writeStored(worldId, next);
      dispatchChange(worldId, next);
    },
    [isGm, worldId],
  );

  return { enabled, setEnabled, ready, canToggle: isGm };
}
