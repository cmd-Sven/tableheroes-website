"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Feuert bei false → true Wechsel von `combatStarted` (SL klickt „Kampf starten“).
 * Beim ersten Mount mit bereits laufendem Kampf: kein FX.
 */
export function useCombatStartFx(combatStarted: boolean | null | undefined) {
  const prevRef = useRef<boolean | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const current = Boolean(combatStarted);
    const prev = prevRef.current;
    prevRef.current = current;

    if (prev === null) return;
    if (!prev && current) {
      setFxKey((k) => k + 1);
      setActive(true);
    }
    if (!current) {
      setActive(false);
    }
  }, [combatStarted]);

  const dismiss = useCallback(() => setActive(false), []);

  return { active, fxKey, dismiss };
}
