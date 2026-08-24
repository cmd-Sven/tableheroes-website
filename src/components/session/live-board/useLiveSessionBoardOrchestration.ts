/**
 * useLiveSessionBoardOrchestration — Wires all live-board hooks and derived state for the session UI.
 */
"use client";

import { useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createBrowserSupabase } from "@/src/lib/supabase/client";
import type { LiveSessionBoardProps } from "./live-session-types";
import { useLiveSessionDerivedState } from "./useLiveSessionDerivedState";
import { useLiveSessionDiceFx } from "./useLiveSessionDiceFx";
import { useLiveSessionBattlemap } from "./useLiveSessionBattlemap";
import { useLiveSessionCombat } from "./useLiveSessionCombat";
import { useLiveSessionRealtime } from "./useLiveSessionRealtime";
import { useLiveSessionStageActions } from "./useLiveSessionStageActions";
import { useLiveSessionLocation } from "./useLiveSessionLocation";
import { useLiveSessionLiveStateBootstrap } from "./useLiveSessionLiveStateBootstrap";
import { useLiveSessionBoardUiState } from "./useLiveSessionBoardUiState";
import { useLiveSessionChronicleUi } from "./useLiveSessionChronicleUi";
import { useLiveSessionLiveStateMutations } from "./useLiveSessionLiveStateMutations";
import { useLiveSessionPreload } from "./useLiveSessionPreload";

export function useLiveSessionBoardOrchestration(props: LiveSessionBoardProps) {
  const {
    sessionId,
    campaignId,
    worldId,
    sessionStatus,
    isGM: actualUserIsGM,
    isGuest = false,
    guestDisplayName,
    guestSlotIndex,
    forcePlayerView = false,
    userId,
    initialLiveState,
    partyCharacters,
    allCampaignNpcs,
    allCampaignCreatures = [],
    allCampaignFactions,
    stageDeckNpcIds,
    stageDeckCreatureIds = null,
    stageDeckFactionIds,
    allSceneMedia = [],
    stageDeckSceneMediaIds = null,
    initialCreatureStates = {},
    activeQuests,
    loreLocationOptions = [],
    sessionLocationLoreReadable = false,
    campaignShops = [],
    transcriptionMode = null,
    guestJoinUrl = null,
    campaignSystem = null,
  } = props;

  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const liveChannelRef = useRef<RealtimeChannel | null>(null);
  const isGM = actualUserIsGM && !forcePlayerView;

  const bootstrap = useLiveSessionLiveStateBootstrap({
    sessionId,
    isGM,
    supabase,
    initialLiveState,
  });

  const {
    liveState,
    setLiveState,
    liveStateRef,
    isLiveStateInitializing,
    liveStateLoadError,
    backgroundUrl,
    setBackgroundUrl,
    resolveLiveStateBase,
    refreshLiveState,
    viableInitial,
  } = bootstrap;

  const chronicle = useLiveSessionChronicleUi({
    sessionId,
    isGM,
    isGuest,
    sessionStatus,
    transcriptionMode,
  });

  const ui = useLiveSessionBoardUiState({
    viableInitial,
    initialLiveState,
    initialCreatureStates,
    campaignSystem,
    liveState,
    isGM,
    forcePlayerView,
    isPrepMode: chronicle.isPrepMode,
    partyCharacters,
    userId,
  });

  const campaignNpcs = useMemo(
    () =>
      allCampaignNpcs.map((npc) => {
        const patch = ui.npcMerchantOverrides[String(npc.id)];
        return patch
          ? {
              ...npc,
              is_merchant: patch.is_merchant,
              shop_id: patch.shop_id,
            }
          : npc;
      }),
    [allCampaignNpcs, ui.npcMerchantOverrides],
  );

  const campaignCreatures = useMemo(() => allCampaignCreatures, [allCampaignCreatures]);

  const [isUpdating, startTransition] = useTransition();

  const battlemap = useLiveSessionBattlemap({
    sessionId,
    campaignId,
    worldId,
    isGuest,
    isGM,
    userId,
    supabase,
    liveState,
    liveStateRef,
    setLiveState,
    liveChannelRef,
    campaignNpcs,
    startTransition,
  });

  const { preload, showLoadingScreen, dismissLoadingScreen } = useLiveSessionPreload({
    liveState,
    activeBattlemap: battlemap.activeBattlemap,
    allCampaignNpcs,
    partyCharacters,
    battlemapTokens: battlemap.battlemapTokens,
  });

  const derived = useLiveSessionDerivedState({
    liveState,
    partyCharacters,
    userId,
    isGM,
    forcePlayerView,
    isPrepMode: chronicle.isPrepMode,
    prepTestCharacterId: ui.prepTestCharacterId,
    campaignId,
    supabase,
    campaignNpcs,
    campaignCreatures,
    allCampaignFactions,
    allSceneMedia,
    stageDeckNpcIds,
    stageDeckCreatureIds,
    stageDeckFactionIds,
    stageDeckSceneMediaIds,
    stageSearch: ui.stageSearch,
    stageFactionSearch: ui.stageFactionSearch,
    setNpcReputationScores: ui.setNpcReputationScores,
    sessionId,
  });

  const { pendingInitiativeToastRef } = useLiveSessionDiceFx({
    systemLogs: derived.systemLogs,
    isGM,
    forcePlayerView,
    setRollingInitiativeId: ui.setRollingInitiativeId,
  });

  const { presentUserIds } = useLiveSessionRealtime({
    sessionId,
    isGuest,
    isGM,
    userId,
    supabase,
    liveStateRef,
    setLiveState,
    setBackgroundUrl,
    showNpcReaction: ui.showNpcReaction,
    liveChannelRef,
    bm: battlemap,
  });

  const { updateLiveState, writeSystemLog } = useLiveSessionLiveStateMutations({
    sessionId,
    isGM,
    supabase,
    liveStateRef,
    setLiveState,
    setBackgroundUrl,
    liveChannelRef,
    resolveLiveStateBase,
    startTransition,
  });

  const combat = useLiveSessionCombat({
    sessionId,
    isGuest,
    isGM,
    supabase,
    liveState,
    liveStateRef,
    setLiveState,
    partyCharacters,
    campaignNpcs,
    sortedActiveNpcs: derived.sortedActiveNpcs,
    battlemapTokens: battlemap.battlemapTokens,
    updateLiveState,
    writeSystemLog,
    pendingInitiativeToastRef,
    setRollingInitiativeId: ui.setRollingInitiativeId,
  });

  const stageActions = useLiveSessionStageActions({
    isGM,
    campaignId,
    sessionId,
    liveStateRef,
    updateLiveState,
    writeSystemLog,
    resolveLiveStateBase,
    allCampaignNpcs,
    allCampaignCreatures,
    allCampaignFactions,
    allSceneMedia,
    showNpcReaction: ui.showNpcReaction,
    setNpcReputationScores: ui.setNpcReputationScores,
    liveChannelRef,
    startTransition,
    startShopTransition: ui.startShopTransition,
    setNpcMerchantOverrides: ui.setNpcMerchantOverrides,
    setStagePortrait: ui.setStagePortrait,
    router,
    temperatureDraft: ui.temperatureDraft,
  });

  const location = useLiveSessionLocation({
    liveState,
    liveStateRef,
    loreLocationOptions,
    allSceneMedia,
    updateLiveState,
    writeSystemLog,
  });

  return {
    props: {
      sessionId,
      campaignId,
      worldId,
      sessionStatus,
      actualUserIsGM,
      isGuest,
      guestDisplayName,
      guestSlotIndex,
      forcePlayerView,
      userId,
      partyCharacters,
      allCampaignNpcs,
      allCampaignCreatures,
      allCampaignFactions,
      stageDeckNpcIds,
      stageDeckCreatureIds,
      stageDeckFactionIds,
      allSceneMedia,
      activeQuests,
      loreLocationOptions,
      sessionLocationLoreReadable,
      campaignShops,
      guestJoinUrl,
    },
    router,
    isGM,
    isUpdating,
    startTransition,
    bootstrap,
    chronicle,
    ui,
    battlemap,
    preload,
    showLoadingScreen,
    dismissLoadingScreen,
    derived,
    combat,
    stageActions,
    location,
    updateLiveState,
    writeSystemLog,
    presentUserIds,
    liveChannelRef,
  };
}

export type LiveSessionBoardOrchestration = ReturnType<typeof useLiveSessionBoardOrchestration>;
