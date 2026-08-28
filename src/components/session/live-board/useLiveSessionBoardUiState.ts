/**
 * useLiveSessionBoardUiState — Ephemeral UI state, panel toggles, and local draft sync for LiveSessionBoard.
 */
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { CampaignCreatureStateRow } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";
import type {
  LeftPanelId,
  MainSidePanelId,
  TopToolbarPanelId,
} from "@/src/components/session/live-session-side-types";
import {
  getWeatherCondition,
  normalizeTemperatureValue,
} from "./live-session-weather";
import type { PartyTrayMode } from "./LiveSessionPartyTray";
import type {
  ActiveNpcReaction,
  LiveState,
  PartyCharacter,
  StagePortraitModal,
} from "./live-session-types";

type Params = {
  viableInitial: boolean;
  initialLiveState: LiveState | null | undefined;
  initialCreatureStates: Record<string, CampaignCreatureStateRow>;
  campaignSystem: string | null | undefined;
  liveState: LiveState | null;
  isGM: boolean;
  forcePlayerView: boolean;
  isPrepMode: boolean;
  partyCharacters: PartyCharacter[];
  userId: string;
};

export function useLiveSessionBoardUiState({
  viableInitial,
  initialLiveState,
  initialCreatureStates,
  campaignSystem,
  liveState,
  isGM,
  forcePlayerView,
  isPrepMode,
  partyCharacters,
  userId,
}: Params) {
  const [inventoryCharacter, setInventoryCharacter] =
    useState<PartyCharacter | null>(null);
  const [sheetCharacter, setSheetCharacter] = useState<PartyCharacter | null>(null);
  const showDnd5eSheet = isDnd5eCampaignSystem(campaignSystem);
  const [fateGmSettingsOpen, setFateGmSettingsOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanelId | null>(null);
  const [topPanel, setTopPanel] = useState<TopToolbarPanelId | null>(null);
  const [stageRosterOpen, setStageRosterOpen] = useState(true);
  const [stageDeckHandOpen, setStageDeckHandOpen] = useState(true);
  const [npcMerchantOverrides, setNpcMerchantOverrides] = useState<
    Record<string, { is_merchant: boolean; shop_id: string | null }>
  >({});
  const [isShopBusy, startShopTransition] = useTransition();
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState("");
  const [showQuests, setShowQuests] = useState(false);
  const [downtimePlayerDismissed, setDowntimePlayerDismissed] = useState(false);
  const [mainSidePanel, setMainSidePanel] = useState<MainSidePanelId | null>(null);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [prepTestCharacterId, setPrepTestCharacterId] = useState<string | null>(null);
  const [isEnding, startEndTransition] = useTransition();
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const [stageFactionSearch, setStageFactionSearch] = useState("");
  const [npcSearchModalOpen, setNpcSearchModalOpen] = useState(false);
  const [beastSearchModalOpen, setBeastSearchModalOpen] = useState(false);
  const [quickRulebookModalOpen, setQuickRulebookModalOpen] = useState(false);
  const [creatureStates, setCreatureStates] =
    useState<Record<string, CampaignCreatureStateRow>>(initialCreatureStates);
  const [beastLootCreatureId, setBeastLootCreatureId] = useState<string | null>(null);
  const [stageDropHighlight, setStageDropHighlight] = useState(false);
  const [stagePortrait, setStagePortrait] = useState<StagePortraitModal | null>(null);
  const [npcReactions, setNpcReactions] = useState<ActiveNpcReaction[]>([]);
  const [npcReputationScores, setNpcReputationScores] = useState<Record<string, number>>({});
  const [rollingInitiativeId, setRollingInitiativeId] = useState<string | null>(null);
  const [lightningPulseKey, setLightningPulseKey] = useState(0);
  const [locationDraft, setLocationDraft] = useState(
    () => (viableInitial ? initialLiveState?.current_location : null) ?? "",
  );
  const [temperatureDraft, setTemperatureDraft] = useState(() =>
    normalizeTemperatureValue(
      viableInitial ? initialLiveState?.temperature_value : null,
    ),
  );
  const [partyTrayMode, setPartyTrayMode] = useState<PartyTrayMode>("full");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("th:party-tray-mode");
      if (raw === "full" || raw === "compact" || raw === "hidden") {
        setPartyTrayMode(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("th:party-tray-mode", partyTrayMode);
    } catch {
      /* ignore */
    }
  }, [partyTrayMode]);

  useEffect(() => {
    setLocationDraft(liveState?.current_location ?? "");
  }, [liveState?.current_location]);

  useEffect(() => {
    setTemperatureDraft(normalizeTemperatureValue(liveState?.temperature_value));
  }, [liveState?.temperature_value]);

  useEffect(() => {
    if (!stagePortrait) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStagePortrait(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stagePortrait]);

  const weatherCondition = getWeatherCondition(liveState);

  useEffect(() => {
    if (weatherCondition !== "storm") return;
    let timeout: number | null = null;
    let cancelled = false;

    function scheduleLightning() {
      timeout = window.setTimeout(
        () => {
          if (cancelled) return;
          setLightningPulseKey((current) => current + 1);
          scheduleLightning();
        },
        10000 + Math.random() * 15000,
      );
    }

    scheduleLightning();
    return () => {
      cancelled = true;
      if (timeout != null) window.clearTimeout(timeout);
    };
  }, [weatherCondition]);

  useEffect(() => {
    const currentPlayerCharacter =
      partyCharacters.find((pc) => pc.playerUserId === userId) ?? null;
    if (!isPrepMode || !isGM || forcePlayerView || currentPlayerCharacter) return;
    if (prepTestCharacterId) return;
    const first = partyCharacters.find((pc) => !pc.isSessionDummy);
    if (first) setPrepTestCharacterId(first.id);
  }, [
    isPrepMode,
    isGM,
    forcePlayerView,
    prepTestCharacterId,
    partyCharacters,
    userId,
  ]);

  useEffect(() => {
    setDowntimePlayerDismissed(false);
  }, [liveState?.downtime_current_day, liveState?.downtime_active]);

  const toggleMainSidePanel = useCallback((id: MainSidePanelId) => {
    setMainSidePanel((prev) => (prev === id ? null : id));
    setLeftPanel(null);
    setTopPanel(null);
  }, []);

  const closeMainSidePanel = useCallback(() => {
    setMainSidePanel(null);
  }, []);

  const toggleLeftPanel = useCallback((id: LeftPanelId) => {
    setLeftPanel((prev) => (prev === id ? null : id));
    setMainSidePanel(null);
    setTopPanel(null);
    setIsDiceOpen(false);
  }, []);

  const closeLeftPanel = useCallback(() => {
    setLeftPanel(null);
  }, []);

  const toggleTopPanel = useCallback((id: TopToolbarPanelId) => {
    setTopPanel((prev) => (prev === id ? null : id));
    setLeftPanel(null);
    setMainSidePanel(null);
    setIsDiceOpen(false);
  }, []);

  const closeTopPanel = useCallback(() => {
    setTopPanel(null);
  }, []);

  const showNpcReaction = useCallback((npcId: string, emoji: string) => {
    const id = `${npcId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNpcReactions((prev) => [...prev, { id, npcId, emoji }]);
    window.setTimeout(() => {
      setNpcReactions((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const temperatureValue = isGM
    ? temperatureDraft
    : normalizeTemperatureValue(liveState?.temperature_value);

  return {
    inventoryCharacter,
    setInventoryCharacter,
    sheetCharacter,
    setSheetCharacter,
    showDnd5eSheet,
    fateGmSettingsOpen,
    setFateGmSettingsOpen,
    leftPanel,
    setLeftPanel,
    topPanel,
    setTopPanel,
    stageRosterOpen,
    setStageRosterOpen,
    stageDeckHandOpen,
    setStageDeckHandOpen,
    npcMerchantOverrides,
    setNpcMerchantOverrides,
    isShopBusy,
    startShopTransition,
    isStageManagerOpen,
    setIsStageManagerOpen,
    stageSearch,
    setStageSearch,
    showQuests,
    setShowQuests,
    downtimePlayerDismissed,
    setDowntimePlayerDismissed,
    mainSidePanel,
    setMainSidePanel,
    isDiceOpen,
    setIsDiceOpen,
    prepTestCharacterId,
    setPrepTestCharacterId,
    isEnding,
    startEndTransition,
    wrapUpOpen,
    setWrapUpOpen,
    stageFactionSearch,
    setStageFactionSearch,
    npcSearchModalOpen,
    setNpcSearchModalOpen,
    beastSearchModalOpen,
    setBeastSearchModalOpen,
    quickRulebookModalOpen,
    setQuickRulebookModalOpen,
    creatureStates,
    setCreatureStates,
    beastLootCreatureId,
    setBeastLootCreatureId,
    stageDropHighlight,
    setStageDropHighlight,
    stagePortrait,
    setStagePortrait,
    npcReactions,
    setNpcReactions,
    npcReputationScores,
    setNpcReputationScores,
    rollingInitiativeId,
    setRollingInitiativeId,
    lightningPulseKey,
    locationDraft,
    setLocationDraft,
    temperatureDraft,
    setTemperatureDraft,
    temperatureValue,
    partyTrayMode,
    setPartyTrayMode,
    weatherCondition,
    toggleMainSidePanel,
    closeMainSidePanel,
    toggleLeftPanel,
    closeLeftPanel,
    toggleTopPanel,
    closeTopPanel,
    showNpcReaction,
  };
}
