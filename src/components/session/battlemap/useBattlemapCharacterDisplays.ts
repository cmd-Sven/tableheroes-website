"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { getLiveSessionAvatarStatus } from "@/src/lib/actions/live-session-avatar-actions";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import { parseActiveConditions } from "@/src/lib/characters/condition-tokens";
import type { MoodStateKey } from "@/src/lib/characters/mood-states";
import {
  AVATAR_ROLL_FX_DURATION_MS,
  AVATAR_ROLL_FX_EVENT,
  moodKeyForRollFx,
  type AvatarRollFxDetail,
} from "@/src/lib/session/avatar-roll-fx";
import {
  CHARACTER_DISPLAY_CHANGED_EVENT,
  type CharacterDisplayChangedDetail,
  type CharacterDisplaySnapshot,
} from "@/src/lib/session/character-radial-bridge";

export type CharacterTokenDisplay = {
  url: string | null;
  moodTokenUrls: Partial<Record<MoodStateKey, string>>;
  activeConditions: CharacterConditionKey[];
  hpCurrent: number;
  hpMax: number;
};

function applySnapshot(
  prev: CharacterTokenDisplay | undefined,
  snapshot: CharacterDisplaySnapshot,
): CharacterTokenDisplay {
  const moodTokenUrls: Partial<Record<MoodStateKey, string>> = {
    ...(prev?.moodTokenUrls ?? {}),
  };
  if (snapshot.moodTokenUrls) {
    for (const [k, v] of Object.entries(snapshot.moodTokenUrls)) {
      if (v?.trim()) moodTokenUrls[k as MoodStateKey] = v.trim();
    }
  }
  return {
    url: snapshot.url,
    moodTokenUrls,
    activeConditions: parseActiveConditions(snapshot.activeConditions),
    hpCurrent: Math.max(0, Math.round(Number(snapshot.hpCurrent) || 0)),
    hpMax: Math.max(0, Math.round(Number(snapshot.hpMax) || 0)),
  };
}

/**
 * Liefert Anzeige-URLs (Gemüt / SL-Zustand / Basis) + HP für Charakter-Tokens.
 * Sync: JIT-Snapshot (Broadcast/Window), Characters-Realtime, Polling-Fallback.
 */
export function useBattlemapCharacterDisplays(
  characterIds: string[],
  options?: {
    campaignId?: string | null;
    enabled?: boolean;
  },
): {
  displays: Record<string, CharacterTokenDisplay>;
  rollFxUrlByCharacterId: Record<string, string>;
  reload: () => Promise<void>;
} {
  const enabled = options?.enabled !== false;
  const campaignId = options?.campaignId ?? null;

  const idsKey = useMemo(
    () => [...new Set(characterIds.filter(Boolean))].sort().join(","),
    [characterIds],
  );
  const ids = useMemo(
    () => (idsKey ? idsKey.split(",") : []),
    [idsKey],
  );
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const [displays, setDisplays] = useState<Record<string, CharacterTokenDisplay>>({});
  const [rollFxUrlByCharacterId, setRollFxUrlByCharacterId] = useState<
    Record<string, string>
  >({});

  const reload = useCallback(async () => {
    if (!enabled || ids.length === 0) {
      setDisplays({});
      return;
    }
    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const status = await getLiveSessionAvatarStatus(id);
          return [
            id,
            {
              url: status.displayAvatarUrl,
              moodTokenUrls: status.moodTokenUrls ?? {},
              activeConditions: status.activeConditions ?? [],
              hpCurrent: status.hpCurrent,
              hpMax: status.hpMax,
            } satisfies CharacterTokenDisplay,
          ] as const;
        } catch {
          return [
            id,
            {
              url: null,
              moodTokenUrls: {},
              activeConditions: [],
              hpCurrent: 0,
              hpMax: 0,
            } satisfies CharacterTokenDisplay,
          ] as const;
        }
      }),
    );
    setDisplays(Object.fromEntries(entries));
  }, [enabled, ids]);

  useEffect(() => {
    if (!enabled) {
      setDisplays({});
      return;
    }
    void reload();
    const timer = window.setInterval(() => void reload(), 30000);
    return () => window.clearInterval(timer);
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<CharacterDisplayChangedDetail>).detail;
      if (!detail?.characterId || !idsRef.current.includes(detail.characterId)) return;
      if (detail.snapshot) {
        setDisplays((prev) => ({
          ...prev,
          [detail.characterId]: applySnapshot(prev[detail.characterId], detail.snapshot!),
        }));
        // Vollständige moodTokenUrls nachziehen (ohne UI zu blockieren)
        void reload();
        return;
      }
      void reload();
    }
    window.addEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onChanged);
  }, [enabled, reload]);

  // Postgres Realtime: mood_state / active_conditions / sheet_data (HP)
  useEffect(() => {
    if (!enabled || !campaignId || ids.length === 0) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`battlemap_characters_${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "characters",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const id =
            payload.new && typeof payload.new === "object" && "id" in payload.new
              ? String((payload.new as { id: unknown }).id)
              : "";
          if (!id || !idsRef.current.includes(id)) return;
          void reload();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, enabled, ids.length, reload]);

  useEffect(() => {
    if (!enabled) return;
    const timers = new Map<string, number>();
    const seen = new Set<string>();

    function onRollFx(e: Event) {
      const detail = (e as CustomEvent<AvatarRollFxDetail>).detail;
      if (!detail?.characterId || !idsRef.current.includes(detail.characterId)) return;
      if (detail.sourceId) {
        if (seen.has(detail.sourceId)) return;
        seen.add(detail.sourceId);
        if (seen.size > 40) {
          const oldest = seen.values().next().value;
          if (oldest) seen.delete(oldest);
        }
      }
      const moodKey = moodKeyForRollFx(detail.kind);
      const url = displays[detail.characterId]?.moodTokenUrls?.[moodKey]?.trim();
      if (!url) return;
      const duration = detail.durationMs ?? AVATAR_ROLL_FX_DURATION_MS;
      setRollFxUrlByCharacterId((prev) => ({ ...prev, [detail.characterId]: url }));
      const prevTimer = timers.get(detail.characterId);
      if (prevTimer != null) window.clearTimeout(prevTimer);
      timers.set(
        detail.characterId,
        window.setTimeout(() => {
          setRollFxUrlByCharacterId((prev) => {
            const next = { ...prev };
            delete next[detail.characterId];
            return next;
          });
          timers.delete(detail.characterId);
        }, duration),
      );
    }

    window.addEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
    return () => {
      window.removeEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
      for (const t of timers.values()) window.clearTimeout(t);
    };
  }, [displays, enabled]);

  return { displays, rollFxUrlByCharacterId, reload };
}
