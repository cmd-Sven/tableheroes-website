"use client";

import { useCallback, useEffect, useState } from "react";
import { getLiveSessionAvatarStatus } from "@/src/lib/actions/live-session-avatar-actions";
import { clampExhaustionLevel } from "@/src/lib/characters/dnd5e/exhaustion";
import {
  CHARACTER_DISPLAY_CHANGED_EVENT,
  type CharacterDisplayChangedDetail,
} from "@/src/lib/session/character-radial-bridge";
import { ExhaustionBadge } from "@/src/components/session/ExhaustionBadge";

type Props = {
  characterId: string;
  compact: boolean;
};

/**
 * Erschöpfung in der Party-Leiste: oben zwischen Rucksack und Avatar
 * (nicht im runden Portrait, damit nichts abgeschnitten wird).
 */
export function PartyTrayExhaustionBadge({ characterId, compact }: Props) {
  const [level, setLevel] = useState(0);

  const reload = useCallback(async () => {
    try {
      const status = await getLiveSessionAvatarStatus(characterId);
      setLevel(clampExhaustionLevel(status.exhaustionLevel));
    } catch {
      setLevel(0);
    }
  }, [characterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<CharacterDisplayChangedDetail>).detail;
      if (!detail?.characterId || detail.characterId !== characterId) return;
      if (detail.snapshot?.exhaustionLevel != null) {
        setLevel(clampExhaustionLevel(detail.snapshot.exhaustionLevel));
        return;
      }
      void reload();
    }
    window.addEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onChanged);
  }, [characterId, reload]);

  if (level <= 0) return null;

  return (
    <div
      className={`pointer-events-auto absolute z-40 ${
        compact ? "left-0 top-[34px]" : "left-1 top-[64px]"
      }`}
      aria-hidden={false}
    >
      <ExhaustionBadge level={level} size={compact ? "sm" : "md"} position="static" />
    </div>
  );
}
