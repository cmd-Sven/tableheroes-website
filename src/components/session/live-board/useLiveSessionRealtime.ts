/**
 * useLiveSessionRealtime — Der unsichtbare Bote zwischen den Plätzen am Tisch.
 * Presence, Broadcasts und Guest-Polling halten Tokens, Fog und Webcam-Signale in Sync —
 * ohne dass jede Atembewegung die ganze Tafel neu zeichnet.
 */
"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerSessionOnlinePresence } from "@/src/lib/actions/session-presence-actions";
import {
  listBattlemapFogShapes,
  listBattlemapEffectTemplates,
} from "@/src/lib/actions/battlemap-actions";
import {
  BATTLEMAP_EFFECT_CHANGED_BROADCAST,
  BATTLEMAP_FOG_CHANGED_BROADCAST,
  BATTLEMAP_TOKENS_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_BROADCAST,
  dispatchCharacterDisplayChanged,
  type BattlemapEffectChangedDetail,
  type BattlemapFogChangedDetail,
  type BattlemapTokensChangedDetail,
  type CharacterDisplaySnapshot,
} from "@/src/lib/session/character-radial-bridge";
import {
  AVATAR_WEBCAM_MASTER_BROADCAST,
  AVATAR_WEBCAM_MASTER_EVENT,
  AVATAR_WEBCAM_MODE_BROADCAST,
  AVATAR_WEBCAM_MODE_EVENT,
  dispatchAvatarWebcamMaster,
  dispatchAvatarWebcamMode,
  type AvatarWebcamMasterDetail,
  type AvatarWebcamModeDetail,
} from "@/src/lib/session/avatar-webcam-bridge";
import {
  WEBCAM_PUBLISH_BROADCAST,
  WEBCAM_PULL_BROADCAST,
  WEBCAM_SIGNAL_BROADCAST,
  WEBCAM_UNPUBLISH_BROADCAST,
  dispatchWebcamPublish,
  dispatchWebcamPull,
  dispatchWebcamSignal,
  dispatchWebcamUnpublish,
  type WebcamPublishDetail,
  type WebcamPullDetail,
  type WebcamSignalDetail,
} from "@/src/lib/session/avatar-webcam-webrtc";
import {
  applyBattlemapTokenUpdate,
  applyPreviewBattlemapTokenMove,
  mapBattlemapTokenRow,
  mergeBattlemapTokenLists,
} from "@/src/lib/session/battlemap-realtime-map";
import { npcReputationSmileyFromScore } from "@/src/lib/npc-reputation-smiley";
import type {
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
} from "@/src/lib/session/battlemap-types";
import type { LiveState } from "./live-session-types";
import { normalizeLiveRow, normalizeStageVisibilityPatch, liveStatePollFingerprint, mergeSystemLogs } from "./live-session-normalize";
import {
  applySessionLivePatch,
  LOOT_STAGE_CHANGED_BROADCAST,
  LOOT_STAGE_CHANGED_EVENT,
  mergeLiveStateRow,
  SESSION_LIVE_PATCH_BROADCAST,
  SESSION_LIVE_PATCH_EVENT,
  type LootStageChangedDetail,
  type SessionLivePatchDetail,
} from "@/src/lib/session/live-state-patch";
import { markSessionBroadcastReady, sendSessionBroadcast } from "@/src/lib/session/realtime-outbox";
import {
  SESSION_ACTIVITY_POSTED_BROADCAST,
  SESSION_ACTIVITY_POSTED_EVENT,
  isSessionActivityEntry,
  type SessionActivityPostedDetail,
} from "@/src/lib/session/session-activity-bridge";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  sessionId: string;
  isGuest: boolean;
  isGM: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  setBackgroundUrl: React.Dispatch<React.SetStateAction<string | null>>;
  showNpcReaction: (npcId: string, emoji: string) => void;
  liveChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  bm: Pick<
    LiveSessionBattlemapState,
    | "setBattlemapTokens"
    | "setBattlemapFogShapes"
    | "setSelectedFogShapeId"
    | "setBattlemapEffectTemplates"
    | "setSelectedEffectTemplateId"
  >;
};

export function useLiveSessionRealtime({
  sessionId,
  isGuest,
  isGM,
  userId,
  supabase,
  liveStateRef,
  setLiveState,
  setBackgroundUrl,
  showNpcReaction,
  liveChannelRef,
  bm,
}: Params) {
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(() => new Set());

  const {
    setBattlemapTokens,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
  } = bm;

  useEffect(() => {
    if (!isGuest) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/session/guest/live-state?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { ok?: boolean; live_state?: unknown };
        if (data.ok && data.live_state) {
          const raw = data.live_state as Record<string, unknown>;
          const normalized = normalizeLiveRow(data.live_state);
          const prev = liveStateRef.current;
          const withLogs = {
            ...normalized,
            system_logs: mergeSystemLogs(
              prev?.system_logs,
              normalized.system_logs ?? [],
              Array.isArray(raw.system_logs),
            ),
          };
          const next = prev ? mergeLiveStateRow(prev, withLogs, raw) : withLogs;
          if (prev && liveStatePollFingerprint(prev) === liveStatePollFingerprint(next)) {
            return;
          }
          liveStateRef.current = next;
          setLiveState(next);
          setBackgroundUrl(next.background_url || null);
        }
      } catch {
        /* Polling-Fehler ignorieren */
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isGuest, sessionId]);

  // ---------------------------------------------------------------------------
  // Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isGuest) return;
    const channel = supabase
      .channel(`session_live_${sessionId}`, {
        config: { presence: { key: userId } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_live_states",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            const raw = payload.new as Record<string, unknown>;
            const normalized = normalizeLiveRow(payload.new);
            setLiveState((prev) => {
              const withLogs = {
                ...normalized,
                system_logs: mergeSystemLogs(
                  prev?.system_logs,
                  normalized.system_logs ?? [],
                  Array.isArray(raw.system_logs),
                ),
              };
              const next = prev ? mergeLiveStateRow(prev, withLogs, raw) : withLogs;
              liveStateRef.current = next;
              return next;
            });
            setBackgroundUrl(normalized.background_url || null);
          }
        },
      )
      .on("broadcast", { event: "stage_visibility_changed" }, (payload) => {
        const patch = normalizeStageVisibilityPatch(payload.payload);
        if (
          !Object.prototype.hasOwnProperty.call(patch, "visible_npc_ids") &&
          !Object.prototype.hasOwnProperty.call(patch, "visible_faction_ids")
        ) {
          return;
        }

        setLiveState((prev) => {
          if (!prev) return prev;
          const next = applySessionLivePatch(prev, {
            patch,
            sentAt: Date.now(),
          });
          liveStateRef.current = next;
          return next;
        });
      })
      .on("broadcast", { event: "npc_reaction" }, (payload) => {
        const reaction = payload.payload as {
          npcId?: unknown;
          scoreAfter?: unknown;
          type?: unknown;
        };
        const npcId =
          reaction.npcId != null ? String(reaction.npcId) : "";
        if (!npcId) return;
        const scoreN =
          reaction.scoreAfter != null ? Number(reaction.scoreAfter) : NaN;
        if (Number.isFinite(scoreN)) {
          showNpcReaction(npcId, npcReputationSmileyFromScore(scoreN));
        } else {
          const legacy = reaction.type === "positive" ? "positive" : "negative";
          showNpcReaction(
            npcId,
            legacy === "positive" ? npcReputationSmileyFromScore(20) : npcReputationSmileyFromScore(-20),
          );
        }
      })
      .on("broadcast", { event: CHARACTER_DISPLAY_CHANGED_BROADCAST }, (payload) => {
        const raw = payload.payload as {
          characterId?: unknown;
          snapshot?: CharacterDisplaySnapshot | null;
          senderId?: unknown;
        } | null;
        const characterId = raw?.characterId != null ? String(raw.characterId) : "";
        if (!characterId) return;
        if (raw?.senderId != null && String(raw.senderId) === userId) return;
        dispatchCharacterDisplayChanged({
          characterId,
          remote: true,
          snapshot: raw?.snapshot ?? undefined,
        });
      })
      .on("broadcast", { event: AVATAR_WEBCAM_MODE_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as AvatarWebcamModeDetail;
        const characterId = raw.characterId != null ? String(raw.characterId) : "";
        if (!characterId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        dispatchAvatarWebcamMode({
          characterId,
          mode: raw.mode === "webcam" ? "webcam" : "avatar",
          senderId: raw.senderId != null ? String(raw.senderId) : null,
          seq: typeof raw.seq === "number" ? raw.seq : undefined,
          remote: true,
        });
      })
      .on("broadcast", { event: AVATAR_WEBCAM_MASTER_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as AvatarWebcamMasterDetail;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        dispatchAvatarWebcamMaster({
          enabled: raw.enabled !== false,
          senderId: raw.senderId != null ? String(raw.senderId) : null,
          seq: typeof raw.seq === "number" ? raw.seq : undefined,
          remote: true,
        });
      })
      .on("broadcast", { event: WEBCAM_SIGNAL_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as WebcamSignalDetail;
        if (!raw.streamKey || !raw.senderId || !raw.targetId) return;
        if (String(raw.senderId) === userId) return;
        if (String(raw.targetId) !== userId) return;
        dispatchWebcamSignal({
          type: raw.type,
          streamKey: String(raw.streamKey),
          senderId: String(raw.senderId),
          targetId: String(raw.targetId),
          sdp: raw.sdp,
          candidate: raw.candidate,
          remote: true,
        });
      })
      .on("broadcast", { event: WEBCAM_PUBLISH_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as WebcamPublishDetail;
        const streamKey = raw.streamKey != null ? String(raw.streamKey) : "";
        if (!streamKey) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        dispatchWebcamPublish({
          streamKey,
          senderId: raw.senderId != null ? String(raw.senderId) : "",
          remote: true,
        });
      })
      .on("broadcast", { event: WEBCAM_PULL_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as WebcamPullDetail;
        const streamKey = raw.streamKey != null ? String(raw.streamKey) : "";
        const requesterId = raw.requesterId != null ? String(raw.requesterId) : "";
        if (!streamKey || !requesterId) return;
        if (requesterId === userId) return;
        dispatchWebcamPull({
          streamKey,
          requesterId,
          remote: true,
        });
      })
      .on("broadcast", { event: WEBCAM_UNPUBLISH_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as WebcamPublishDetail;
        const streamKey = raw.streamKey != null ? String(raw.streamKey) : "";
        if (!streamKey) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        dispatchWebcamUnpublish({
          streamKey,
          senderId: raw.senderId != null ? String(raw.senderId) : "",
          remote: true,
        });
      })
      .on("broadcast", { event: BATTLEMAP_TOKENS_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapTokensChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const tokenId = raw.tokenId != null ? String(raw.tokenId) : "";
          if (tokenId) {
            setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
          }
          return;
        }

        if (op === "upsert" && raw.token && typeof raw.token === "object") {
          const token = mapBattlemapTokenRow(raw.token as Record<string, unknown>);
          if (raw.preview || raw.optimistic) {
            const movedAt = Number(raw.movedAt ?? Date.now());
            setBattlemapTokens((prev) =>
              applyPreviewBattlemapTokenMove(
                prev,
                token.id,
                token.grid_x,
                token.grid_y,
                Number.isFinite(movedAt) ? movedAt : Date.now(),
              ),
            );
            return;
          }
          setBattlemapTokens((prev) => applyBattlemapTokenUpdate(prev, token));
          return;
        }

        void (async () => {
          const { data, error } = await (supabase as any)
            .from("session_battlemap_tokens")
            .select("*")
            .eq("battlemap_id", battlemapId)
            .order("created_at", { ascending: true });
          if (error || !data) return;
          setBattlemapTokens((prev) =>
            mergeBattlemapTokenLists(
              prev,
              (data as Record<string, unknown>[]).map((row) => mapBattlemapTokenRow(row)),
            ),
          );
        })();
      })
      .on("broadcast", { event: BATTLEMAP_FOG_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapFogChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const shapeId = raw.shapeId != null ? String(raw.shapeId) : "";
          if (shapeId) {
            setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== shapeId));
            setSelectedFogShapeId((prev) => (prev === shapeId ? null : prev));
          }
          return;
        }

        if (op === "upsert" && raw.shape && typeof raw.shape === "object") {
          const row = raw.shape as Record<string, unknown>;
          const shape: SessionBattlemapFogShape = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: row.shape === "circle" ? "circle" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapFogShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === shape.id);
            if (idx < 0) return [...prev, shape];
            const next = [...prev];
            next[idx] = shape;
            return next;
          });
          return;
        }

        void listBattlemapFogShapes(battlemapId, sessionId)
          .then((shapes) => setBattlemapFogShapes(shapes))
          .catch(() => undefined);
      })
      .on("broadcast", { event: BATTLEMAP_EFFECT_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapEffectChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const templateId = raw.templateId != null ? String(raw.templateId) : "";
          if (templateId) {
            setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== templateId));
            setSelectedEffectTemplateId((prev) => (prev === templateId ? null : prev));
          }
          return;
        }

        if (op === "upsert" && raw.template && typeof raw.template === "object") {
          const row = raw.template as Record<string, unknown>;
          const shapeRaw = String(row.shape ?? "rect");
          const template: SessionBattlemapEffectTemplate = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: shapeRaw === "circle" ? "circle" : shapeRaw === "cone" ? "cone" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            direction_deg: Math.round(Number(row.direction_deg ?? 0)) % 360,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapEffectTemplates((prev) => {
            const idx = prev.findIndex((t) => t.id === template.id);
            if (idx < 0) return [...prev, template];
            const next = [...prev];
            next[idx] = template;
            return next;
          });
          return;
        }

        void listBattlemapEffectTemplates(battlemapId, sessionId)
          .then((templates) => setBattlemapEffectTemplates(templates))
          .catch(() => undefined);
      })
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState();
        const ids = new Set(Object.keys(st));
        setPresentUserIds((prev) => {
          if (prev.size === ids.size) {
            let same = true;
            for (const id of ids) {
              if (!prev.has(id)) {
                same = false;
                break;
              }
            }
            if (same) return prev;
          }
          return ids;
        });
        if (!isGM && ids.has(userId)) {
          void registerSessionOnlinePresence(sessionId);
        }
      })
      .on("broadcast", { event: SESSION_LIVE_PATCH_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as SessionLivePatchDetail;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        if (!raw.patch || typeof raw.patch !== "object") return;
        setLiveState((prev) => {
          if (!prev) return prev;
          const next = applySessionLivePatch(prev, {
            patch: raw.patch,
            sentAt: Number(raw.sentAt) || Date.now(),
            senderId: raw.senderId != null ? String(raw.senderId) : null,
            remote: true,
          });
          liveStateRef.current = next;
          if (Object.prototype.hasOwnProperty.call(raw.patch, "background_url")) {
            setBackgroundUrl(next.background_url || null);
          }
          return next;
        });
      })
      .on("broadcast", { event: LOOT_STAGE_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as LootStageChangedDetail;
        const containerId = raw.containerId != null ? String(raw.containerId) : "";
        if (!containerId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent(LOOT_STAGE_CHANGED_EVENT, {
            detail: { containerId, senderId: raw.senderId, remote: true } satisfies LootStageChangedDetail,
          }),
        );
      })
      .on("broadcast", { event: SESSION_ACTIVITY_POSTED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as {
          entry?: unknown;
          senderId?: unknown;
        };
        if (raw.senderId != null && String(raw.senderId) === userId) return;
        if (!isSessionActivityEntry(raw.entry)) return;
        const entry = raw.entry;
        setLiveState((prev) => {
          if (!prev) return prev;
          const logs = Array.isArray(prev.system_logs) ? prev.system_logs : [];
          if (logs.some((l) => l.id === entry.id)) return prev;
          const next = {
            ...prev,
            system_logs: [...logs, entry].slice(-120),
          };
          liveStateRef.current = next;
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          markSessionBroadcastReady(channel);
          await channel.track({ user_id: userId });
          if (!isGM) {
            void registerSessionOnlinePresence(sessionId);
          }
        }
      });

    liveChannelRef.current = channel;

    return () => {
      markSessionBroadcastReady(null);
      if (liveChannelRef.current === channel) {
        liveChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [sessionId, showNpcReaction, supabase, userId, isGM, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    function onLocalActivity(e: Event) {
      const detail = (e as CustomEvent<SessionActivityPostedDetail>).detail;
      if (!detail?.entry || detail.remote) return;
      sendSessionBroadcast(SESSION_ACTIVITY_POSTED_BROADCAST, {
        entry: detail.entry,
        senderId: userId,
      });
    }
    function onLocalWebcamMode(e: Event) {
      const detail = (e as CustomEvent<AvatarWebcamModeDetail>).detail;
      if (!detail?.characterId || detail.remote) return;
      sendSessionBroadcast(AVATAR_WEBCAM_MODE_BROADCAST, {
        characterId: detail.characterId,
        mode: detail.mode,
        senderId: userId,
        seq: detail.seq ?? null,
      });
    }
    function onLocalWebcamMaster(e: Event) {
      const detail = (e as CustomEvent<AvatarWebcamMasterDetail>).detail;
      if (!detail || detail.remote) return;
      sendSessionBroadcast(AVATAR_WEBCAM_MASTER_BROADCAST, {
        enabled: detail.enabled !== false,
        senderId: userId,
        seq: detail.seq ?? null,
      });
    }
    function onLocalLivePatch(e: Event) {
      const detail = (e as CustomEvent<SessionLivePatchDetail>).detail;
      if (!detail?.patch || detail.remote) return;
      sendSessionBroadcast(SESSION_LIVE_PATCH_BROADCAST, {
        patch: detail.patch,
        sentAt: detail.sentAt,
        senderId: userId,
      });
    }
    function onLocalLoot(e: Event) {
      const detail = (e as CustomEvent<LootStageChangedDetail>).detail;
      if (!detail?.containerId || detail.remote) return;
      sendSessionBroadcast(LOOT_STAGE_CHANGED_BROADCAST, {
        containerId: detail.containerId,
        senderId: userId,
      });
    }
    window.addEventListener(SESSION_ACTIVITY_POSTED_EVENT, onLocalActivity);
    window.addEventListener(AVATAR_WEBCAM_MODE_EVENT, onLocalWebcamMode);
    window.addEventListener(AVATAR_WEBCAM_MASTER_EVENT, onLocalWebcamMaster);
    window.addEventListener(SESSION_LIVE_PATCH_EVENT, onLocalLivePatch);
    window.addEventListener(LOOT_STAGE_CHANGED_EVENT, onLocalLoot);
    return () => {
      window.removeEventListener(SESSION_ACTIVITY_POSTED_EVENT, onLocalActivity);
      window.removeEventListener(AVATAR_WEBCAM_MODE_EVENT, onLocalWebcamMode);
      window.removeEventListener(AVATAR_WEBCAM_MASTER_EVENT, onLocalWebcamMaster);
      window.removeEventListener(SESSION_LIVE_PATCH_EVENT, onLocalLivePatch);
      window.removeEventListener(LOOT_STAGE_CHANGED_EVENT, onLocalLoot);
    };
  }, [isGuest, userId]);

  return { presentUserIds };
}
