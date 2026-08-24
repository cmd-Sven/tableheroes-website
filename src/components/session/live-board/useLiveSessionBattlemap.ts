/**
 * useLiveSessionBattlemap — Orchestrates battlemap state, sync, and handlers for LiveSessionBoard.
 */
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransitionStartFunction } from "react";
import type { CampaignNpc, LiveState } from "./live-session-types";
import { useLiveSessionBattlemapState } from "./useLiveSessionBattlemapState";
import { useLiveSessionBattlemapSync } from "./useLiveSessionBattlemapSync";
import { useLiveSessionBattlemapEntitySync } from "./useLiveSessionBattlemapEntitySync";
import { useLiveSessionBattlemapHandlers } from "./useLiveSessionBattlemapHandlers";
import { useLiveSessionBattlemapToolHandlers } from "./useLiveSessionBattlemapToolHandlers";
import { useLiveSessionBattlemapDerived } from "./useLiveSessionBattlemapDerived";

type Params = {
  sessionId: string;
  campaignId: string;
  worldId: string | null;
  isGuest: boolean;
  isGM: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  liveChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  campaignNpcs: CampaignNpc[];
  startTransition: TransitionStartFunction;
};

export function useLiveSessionBattlemap(params: Params) {
  const bm = useLiveSessionBattlemapState(params.liveState);
  const notify = useLiveSessionBattlemapSync({
    sessionId: params.sessionId,
    worldId: params.worldId,
    isGuest: params.isGuest,
    userId: params.userId,
    supabase: params.supabase,
    liveChannelRef: params.liveChannelRef,
    bm,
  });
  useLiveSessionBattlemapEntitySync({
    sessionId: params.sessionId,
    isGuest: params.isGuest,
    supabase: params.supabase,
    bm,
  });
  const tokenHandlers = useLiveSessionBattlemapHandlers({
    sessionId: params.sessionId,
    campaignId: params.campaignId,
    isGM: params.isGM,
    liveState: params.liveState,
    liveStateRef: params.liveStateRef,
    setLiveState: params.setLiveState,
    campaignNpcs: params.campaignNpcs,
    bm,
    notify,
    startTransition: params.startTransition,
  });
  const toolHandlers = useLiveSessionBattlemapToolHandlers({
    sessionId: params.sessionId,
    isGM: params.isGM,
    bm,
    notify,
    startTransition: params.startTransition,
  });
  const derived = useLiveSessionBattlemapDerived({
    campaignId: params.campaignId,
    isGM: params.isGM,
    campaignNpcs: params.campaignNpcs,
    bm,
  });

  return { ...bm, ...notify, ...tokenHandlers, ...toolHandlers, ...derived };
}

export type LiveSessionBattlemap = ReturnType<typeof useLiveSessionBattlemap>;
