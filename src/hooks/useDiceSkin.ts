"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DICE_SKIN_CHANGED_EVENT,
  defaultDiceSkinId,
  isDiceSkinId,
  readStoredDiceSkin,
  writeStoredDiceSkin,
  type DiceSkinChangedDetail,
  type DiceSkinId,
} from "@/src/lib/session/dice-skins";

/**
 * Liest/schreibt den Würfel-Skin pro User (localStorage).
 * SL-Default: gm-marble; Spieler-Default: green.
 * Sync über CustomEvent zwischen Dice-Panel und Activity-Chat.
 */
export function useDiceSkin(
  userId: string | null | undefined,
  isGM: boolean,
): {
  skinId: DiceSkinId;
  setSkinId: (id: DiceSkinId) => void;
} {
  const [skinId, setSkinIdState] = useState<DiceSkinId>(() =>
    defaultDiceSkinId(isGM),
  );

  useEffect(() => {
    setSkinIdState(readStoredDiceSkin(userId, isGM));
  }, [userId, isGM]);

  useEffect(() => {
    if (!userId) return;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DiceSkinChangedDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      if (isDiceSkinId(detail.skinId)) setSkinIdState(detail.skinId);
    };
    window.addEventListener(DICE_SKIN_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DICE_SKIN_CHANGED_EVENT, onChange);
  }, [userId]);

  const setSkinId = useCallback(
    (id: DiceSkinId) => {
      setSkinIdState(id);
      writeStoredDiceSkin(userId, id);
    },
    [userId],
  );

  return { skinId, setSkinId };
}
