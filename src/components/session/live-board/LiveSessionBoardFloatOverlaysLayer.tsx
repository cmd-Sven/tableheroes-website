/**
 * LiveSessionBoardFloatOverlaysLayer — Stage manager, downtime, quest, portrait, chronicle.
 */
"use client";

import { DowntimePlayerOverlay } from "@/src/components/session/DowntimePlayerOverlay";
import { ChronicleLiveMarkerBar } from "@/src/components/session/ChronicleLiveMarkerBar";
import { ChronicleMicMonitor } from "@/src/components/session/ChronicleMicMonitor";
import { LiveSessionStageManager } from "./LiveSessionStageManager";
import { LiveSessionQuestOverlay } from "./LiveSessionQuestOverlay";
import { LiveSessionStagePortraitModal } from "./LiveSessionStagePortraitModal";
import { useLiveSessionBoardContext } from "./LiveSessionBoardContext";

export function LiveSessionBoardFloatOverlaysLayer() {
  const {    props: {
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
      stageDeckNpcIds,
      stageDeckCreatureIds,
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
    bootstrap: {
      liveState,
      setLiveState,
      liveStateRef,
      isLiveStateInitializing,
      liveStateLoadError,
      backgroundUrl,
      resolveLiveStateBase,
      refreshLiveState,
    },
    chronicle: {
      activeTranscriptionMode,
      setActiveTranscriptionMode,
      chronistPanelOpen,
      setChronistPanelOpen,
      chronistStartFlowRef,
      chronistStopFlowRef,
      chronistSettingsFlowRef,
      recordingNoticeModalOpen,
      dismissChronistRecordingReminder,
      dismissJitsiChronistReminder,
      dismissRecordingNotice,
      isPrepMode,
      chronistTableMode,
      prepMicTest,
      chronicleRecorder,
      liveTranscriptionStatus,
      topBarTranscriptionStatus,
      recordingNoticeStatus,
      showChronistHealthBanner,
      chronistHealthBannerVariant,
      showChronistNotRecordingReminder,
      showJitsiChronistReminder,
    },
    ui: {
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
      toggleTopPanel,
      closeTopPanel,
      stageRosterOpen,
      setStageRosterOpen,
      stageDeckHandOpen,
      setStageDeckHandOpen,
      isShopBusy,
      isStageManagerOpen,
      setIsStageManagerOpen,
      stageSearch,
      setStageSearch,
      showQuests,
      setShowQuests,
      downtimePlayerDismissed,
      setDowntimePlayerDismissed,
      mainSidePanel,
      toggleMainSidePanel,
      closeMainSidePanel,
      toggleLeftPanel,
      closeLeftPanel,
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
      creatureStates,
      setCreatureStates,
      beastLootCreatureId,
      setBeastLootCreatureId,
      stageDropHighlight,
      setStageDropHighlight,
      stagePortrait,
      setStagePortrait,
      npcReactions,
      npcReputationScores,
      rollingInitiativeId,
      lightningPulseKey,
      locationDraft,
      setLocationDraft,
      temperatureDraft,
      setTemperatureDraft,
      temperatureValue,
      partyTrayMode,
      setPartyTrayMode,
      weatherCondition,
    },
    battlemap: {
      sessionBattlemaps,
      setSessionWorldMapLinks,
      availableWorldMaps,
      sessionWorldMapLinks,
      battlemapTokens,
      setBattlemapTokens,
      battlemapFogShapes,
      setBattlemapFogShapes,
      battlemapEffectTemplates,
      setBattlemapEffectTemplates,
      battlemapMarkers,
      setBattlemapMarkers,
      battlemapTraps,
      setBattlemapTraps,
      fogTool,
      setFogTool,
      effectTool,
      setEffectTool,
      markerTool,
      setMarkerTool,
      trapTool,
      setTrapTool,
      selectedFogShapeId,
      setSelectedFogShapeId,
      selectedEffectTemplateId,
      setSelectedEffectTemplateId,
      selectedMarkerId,
      setSelectedMarkerId,
      selectedTrapId,
      setSelectedTrapId,
      trapWizardCell,
      setTrapWizardCell,
      trapTriggerEvent,
      setTrapTriggerEvent,
      tokenPlacement,
      setTokenPlacement,
      gmTokenPlacement,
      setGmTokenPlacement,
      gmMoveTokenId,
      setGmMoveTokenId,
      selectedBattlemapTokenId,
      setSelectedBattlemapTokenId,
      selectedBattlemapPropId,
      setSelectedBattlemapPropId,
      tokenRadial,
      setTokenRadial,
      activeBattlemapId,
      activeWorldMapId,
      activeBattlemap,
      battlemapActive,
      notifyBattlemapTokensChanged,
      notifyBattlemapFogChanged,
      notifyBattlemapEffectChanged,
      startCharacterTokenPlacement,
      handleBattlemapCellClick,
      handleBattlemapTokenMove,
      handleFogShapeDelete,
      handleEffectTemplateDelete,
      handleMarkerDelete,
      handleFogClearAll,
      handleEffectClearAll,
      handleMarkerClearAll,
      handleTrapDelete,
      handleTrapClearAll,
      handleBattlemapPropDrop,
      handleBattlemapPropResize,
      visibleBattlemapTokens,
      visibleBattlemapProps,
      battlemapTokenHpByRef,
      characterDisplayUrlById,
      characterConditionsById,
    },
    preload,
    showLoadingScreen,
    derived: {
      dayPhase,
      canEditJournal,
      systemLogs,
      combatStartFxActive,
      combatStartFxKey,
      dismissCombatStartFx,
      handRaises,
      urgentHandRaise,
      physicallyPresentIdSet,
      dummyPlayerCountLive,
      displayPartyCharacters,
      playerColorByCharacterId,
      playerColorByUserId,
      weatherVisual,
      currentPlayerCharacter,
      activityCharacter,
      activeNpcIds,
      sortedActiveNpcs,
      activeCreatures,
      gmBeastSearchRows,
      gmNpcSearchRows,
      activeCreatureIds,
      activeSceneMedia,
      activeFactionIds,
      activeFactions,
      stageRosterPreview,
      stageHasDeckContent,
      filteredNpcsForStageManager,
      filteredFactionsForStageManager,
      inHandNpcs,
      inHandFactions,
      inHandScenes,
      showGmDeckHand,
      battlemapTrayNpcs,
      battlemapTrayCreatures,
      battlemapTrayScenes,
      stagePrepHref,
    },
    combat: {
      setCombatParticipants,
      sortedCombatParticipants,
      combatStarted,
      activeCombatParticipant,
      activeTurnHighlight,
      combatParticipantNames,
      combatParticipantNpcIds,
      seedCombatParticipantsFromBattlemap,
      dragCombatToken,
      addCombatToken,
      battlemapTokenToCombatPayload,
      handleRollInitiative,
      beginCombatEncounter,
      endCombatEncounter,
      nextCombatTurn,
      prevCombatTurn,
      handlePlayerEndTurn,
    },
    stageActions: {
      revealNpcOnCampaignIfNeeded,
      placeOnStage,
      removeFromStage,
      handleNpcReaction,
      toggleShopForNpc,
      assignMerchantAndOpenShop,
      assignScribe,
      commitTemperatureValue,
    },
    location: { changeSessionLocation, resetBackgroundToLocationDefault },
    updateLiveState,
    writeSystemLog,
    presentUserIds,
  } = useLiveSessionBoardContext();
  return (
    <>
      <LiveSessionStageManager
        open={isGM && isStageManagerOpen}
        campaignId={campaignId}
        stagePrepHref={stagePrepHref}
        liveState={liveState}
        stageSearch={stageSearch}
        stageFactionSearch={stageFactionSearch}
        filteredNpcs={filteredNpcsForStageManager}
        filteredFactions={filteredFactionsForStageManager}
        activeNpcIds={activeNpcIds}
        activeFactionIds={activeFactionIds}
        onClose={() => setIsStageManagerOpen(false)}
        onStageSearchChange={setStageSearch}
        onStageFactionSearchChange={setStageFactionSearch}
        onOpenNpcSearch={() => setNpcSearchModalOpen(true)}
        onToggleNpcOnStage={(npcId, onStage) => {
          const currentIds = new Set(liveState?.visible_npc_ids || []);
          if (onStage) {
            currentIds.add(npcId);
            updateLiveState({ visible_npc_ids: Array.from(currentIds) });
            void revealNpcOnCampaignIfNeeded(npcId);
          } else {
            currentIds.delete(npcId);
            updateLiveState({ visible_npc_ids: Array.from(currentIds) });
          }
        }}
        onToggleFactionOnStage={(factionId, onStage) => {
          const currentIds = new Set(liveState?.visible_faction_ids || []);
          if (onStage) currentIds.add(factionId);
          else currentIds.delete(factionId);
          updateLiveState({ visible_faction_ids: Array.from(currentIds) });
        }}
        onBackgroundUrlBlur={(nextBackground) => {
          updateLiveState({
            background_url: nextBackground,
            is_background_manual_override: !!nextBackground,
          });
          if (nextBackground) {
            writeSystemLog(
              "background_manual",
              `Die Gruppe erreicht einen neuen Ort: ${liveState?.current_location || "eine neue Szene"}.`,
            );
          }
        }}
        onResetBackground={resetBackgroundToLocationDefault}
      />

      {!isGM &&
        liveState?.downtime_active &&
        currentPlayerCharacter &&
        liveState.fap_allocations?.[currentPlayerCharacter.id]?.status === "planning" &&
        downtimePlayerDismissed && (
          <button
            type="button"
            onClick={() => setDowntimePlayerDismissed(false)}
            className="fixed bottom-6 left-1/2 z-95 -translate-x-1/2 rounded-full border border-accent-gold bg-background-card/95 px-5 py-2.5 font-barlow text-xs font-extrabold uppercase text-accent-gold shadow-xl backdrop-blur hover:bg-accent-gold/20"
          >
            FAP / Reisetag planen
          </button>
        )}

      {!isGM &&
        liveState?.downtime_active &&
        currentPlayerCharacter &&
        liveState.fap_allocations?.[currentPlayerCharacter.id]?.status === "planning" &&
        !downtimePlayerDismissed && (
          <DowntimePlayerOverlay
            sessionId={sessionId}
            characterId={currentPlayerCharacter.id}
            characterName={currentPlayerCharacter.name}
            downtimeActive={!!liveState.downtime_active}
            downtimeConfig={liveState.downtime_config ?? null}
            downtimeCurrentDay={liveState.downtime_current_day ?? 1}
            planningStatus={liveState.fap_allocations[currentPlayerCharacter.id]?.status ?? null}
            onClose={() => setDowntimePlayerDismissed(true)}
            onSubmitted={async () => {
              await refreshLiveState();
              setDowntimePlayerDismissed(true);
            }}
          />
        )}

      <LiveSessionQuestOverlay
        open={showQuests}
        quests={activeQuests}
        onClose={() => setShowQuests(false)}
      />

      <LiveSessionStagePortraitModal
        portrait={stagePortrait}
        onClose={() => setStagePortrait(null)}
      />
      {isGM && sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleMicMonitor
          recorder={chronicleRecorder}
          onOpenSettings={() => chronistSettingsFlowRef.current?.()}
        />
      ) : null}
      {isGM && sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleLiveMarkerBar recorder={chronicleRecorder} />
      ) : null}

      <style>{`
        @keyframes npc-reaction-float {
          0% {
            opacity: 0;
            transform: translate(-50%, 18px) scale(0.78);
          }
          14% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -72px) scale(1);
          }
        }
      `}</style>
    </>
  );
}

