"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STREETS_VISIBLE_GM_KEY,
  STREETS_VISIBLE_PLAYER_KEY,
} from "../aurenfurt-streets";

function storageKey(isGm: boolean) {
  return isGm ? STREETS_VISIBLE_GM_KEY : STREETS_VISIBLE_PLAYER_KEY;
}

/** Default: sichtbar — gespeicherte Straßen sollen nicht plötzlich verschwinden. */
function readVisible(isGm: boolean): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(storageKey(isGm));
    if (raw === null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function useStreetsVisibility(isGm: boolean) {
  const [streetsVisible, setStreetsVisibleState] = useState(true);

  useEffect(() => {
    setStreetsVisibleState(readVisible(isGm));
  }, [isGm]);

  const setStreetsVisible = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setStreetsVisibleState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        try {
          window.localStorage.setItem(storageKey(isGm), value ? "1" : "0");
        } catch {
          // private mode / quota — Preference nur im Session-State halten
        }
        return value;
      });
    },
    [isGm],
  );

  const toggleStreetsVisible = useCallback(() => {
    setStreetsVisible((prev) => !prev);
  }, [setStreetsVisible]);

  return { streetsVisible, setStreetsVisible, toggleStreetsVisible };
}
