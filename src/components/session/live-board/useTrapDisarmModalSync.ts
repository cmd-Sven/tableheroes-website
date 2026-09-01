/**
 * Synchronisiert Trap-Disarm-Modal mit Realtime-Trap-State.
 * Öffnet das Modal nur für SL + betroffenen Spieler.
 */
"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  SessionBattlemapTrap,
  TrapDisarmTarget,
} from "@/src/lib/session/battlemap-types";
import {
  canViewTrapDisarmModal,
  trapDisarmActive,
} from "@/src/lib/session/battlemap-trap-model";

type Options = {
  battlemapTraps: SessionBattlemapTrap[];
  trapDisarmTarget: TrapDisarmTarget | null;
  setTrapDisarmTarget: Dispatch<SetStateAction<TrapDisarmTarget | null>>;
  isGM: boolean;
  ownCharacterId: string | null | undefined;
};

export function useTrapDisarmModalSync({
  battlemapTraps,
  trapDisarmTarget,
  setTrapDisarmTarget,
  isGM,
  ownCharacterId,
}: Options) {
  useEffect(() => {
    if (trapDisarmTarget) {
      const freshTrap =
        battlemapTraps.find((t) => t.id === trapDisarmTarget.trap.id) ?? null;
      if (!freshTrap) {
        setTrapDisarmTarget(null);
        return;
      }
      const pending = trapDisarmActive(freshTrap);
      if (!pending || !canViewTrapDisarmModal(pending, isGM, ownCharacterId)) {
        setTrapDisarmTarget(null);
        return;
      }
      if (freshTrap !== trapDisarmTarget.trap) {
        setTrapDisarmTarget({
          trap: freshTrap,
          characterId: trapDisarmTarget.characterId,
        });
      }
      return;
    }

    for (const trap of battlemapTraps) {
      const pending = trapDisarmActive(trap);
      if (!pending) continue;
      if (!canViewTrapDisarmModal(pending, isGM, ownCharacterId)) continue;
      setTrapDisarmTarget({ trap, characterId: pending.characterId });
      return;
    }
  }, [
    battlemapTraps,
    trapDisarmTarget,
    setTrapDisarmTarget,
    isGM,
    ownCharacterId,
  ]);
}

export function canOpenTrapDisarmModal(
  isGM: boolean,
  ownCharacterId: string | null | undefined,
  characterId: string,
): boolean {
  return isGM || ownCharacterId === characterId;
}
