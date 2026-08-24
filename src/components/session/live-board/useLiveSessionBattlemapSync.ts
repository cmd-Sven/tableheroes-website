/**
 * useLiveSessionBattlemapSync — Loads battlemap tokens/maps and broadcast notify helpers.
 */
"use client";

import { useCallback, useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionBattlemaps } from "@/src/lib/actions/battlemap-actions";
import { getSessionWorldMaps, getWorldMaps } from "@/src/lib/actions/world-map-actions";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import {
  BATTLEMAP_EFFECT_CHANGED_BROADCAST,
  BATTLEMAP_FOG_CHANGED_BROADCAST,
  BATTLEMAP_TOKENS_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_EVENT,
  type BattlemapEffectChangedDetail,
  type BattlemapFogChangedDetail,
  type BattlemapTokensChangedDetail,
  type CharacterDisplayChangedDetail,
} from "@/src/lib/session/character-radial-bridge";
import { mapBattlemapTokenRow, upsertBattlemapToken } from "@/src/lib/session/battlemap-realtime-map";
import type {
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  sessionId: string;
  worldId: string | null;
  isGuest: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  bm: LiveSessionBattlemapState;
};

export function useLiveSessionBattlemapSync({
  sessionId,
  worldId,
  isGuest,
  userId,
  supabase,
  liveChannelRef,
  bm,
}: Params) {
  const {
    activeBattlemapId,
    setSessionBattlemaps,
    setAvailableWorldMaps,
    setSessionWorldMapLinks,
    setBattlemapTokens,
  } = bm;

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void getSessionBattlemaps(sessionId)
      .then((maps) => {
        if (!cancelled) setSessionBattlemaps(maps);
      })
      .catch(() => {
        /* optional: maps not migrated yet */
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, isGuest, setSessionBattlemaps]);

  useEffect(() => {
    if (isGuest || !worldId) {
      setAvailableWorldMaps([]);
      setSessionWorldMapLinks([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getWorldMaps(worldId).catch(() => [] as WorldMap[]),
      getSessionWorldMaps(sessionId).catch(() => [] as SessionWorldMap[]),
    ]).then(([maps, links]) => {
      if (cancelled) return;
      setAvailableWorldMaps(maps);
      setSessionWorldMapLinks(links);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, worldId, isGuest, setAvailableWorldMaps, setSessionWorldMapLinks]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapTokens([]);
      return;
    }
    let cancelled = false;

    async function loadTokens() {
      const { data, error } = await (supabase as any)
        .from("session_battlemap_tokens")
        .select("*")
        .eq("battlemap_id", activeBattlemapId)
        .order("created_at", { ascending: true });
      if (!cancelled && !error) {
        setBattlemapTokens(
          (data ?? []).map((row: Record<string, unknown>) => mapBattlemapTokenRow(row)),
        );
      }
    }

    void loadTokens();

    const channel = supabase
      .channel(`session_battlemap_tokens_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_tokens",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapTokens((prev) => prev.filter((t) => t.id !== oldId));
            } else {
              void loadTokens();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadTokens();
            return;
          }
          const token = mapBattlemapTokenRow(row);
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, token));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, supabase, setBattlemapTokens]);

  useEffect(() => {
    if (isGuest) return;
    function onLocalCharacterDisplay(e: Event) {
      const detail = (e as CustomEvent<CharacterDisplayChangedDetail>).detail;
      if (!detail?.characterId || detail.remote) return;
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: CHARACTER_DISPLAY_CHANGED_BROADCAST,
        payload: {
          characterId: detail.characterId,
          snapshot: detail.snapshot ?? null,
          senderId: userId,
        },
      });
    }
    window.addEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onLocalCharacterDisplay);
    return () => {
      window.removeEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onLocalCharacterDisplay);
    };
  }, [isGuest, userId, liveChannelRef]);

  const notifyBattlemapTokensChanged = useCallback(
    (detail?: {
      op?: BattlemapTokensChangedDetail["op"];
      token?: SessionBattlemapToken | null;
      tokenId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.token ? "upsert" : detail?.tokenId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_TOKENS_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          token: detail?.token
            ? ({ ...detail.token } as unknown as Record<string, unknown>)
            : null,
          tokenId: detail?.tokenId ?? detail?.token?.id ?? null,
          senderId: userId,
        } satisfies BattlemapTokensChangedDetail,
      });
    },
    [activeBattlemapId, userId, liveChannelRef],
  );

  const notifyBattlemapFogChanged = useCallback(
    (detail?: {
      op?: BattlemapFogChangedDetail["op"];
      shape?: SessionBattlemapFogShape | null;
      shapeId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.shape ? "upsert" : detail?.shapeId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_FOG_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          shape: detail?.shape
            ? ({ ...detail.shape } as unknown as Record<string, unknown>)
            : null,
          shapeId: detail?.shapeId ?? detail?.shape?.id ?? null,
          senderId: userId,
        } satisfies BattlemapFogChangedDetail,
      });
    },
    [activeBattlemapId, userId, liveChannelRef],
  );

  const notifyBattlemapEffectChanged = useCallback(
    (detail?: {
      op?: BattlemapEffectChangedDetail["op"];
      template?: SessionBattlemapEffectTemplate | null;
      templateId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.template ? "upsert" : detail?.templateId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_EFFECT_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          template: detail?.template
            ? ({ ...detail.template } as unknown as Record<string, unknown>)
            : null,
          templateId: detail?.templateId ?? detail?.template?.id ?? null,
          senderId: userId,
        } satisfies BattlemapEffectChangedDetail,
      });
    },
    [activeBattlemapId, userId, liveChannelRef],
  );

  return {
    notifyBattlemapTokensChanged,
    notifyBattlemapFogChanged,
    notifyBattlemapEffectChanged,
  };
}
