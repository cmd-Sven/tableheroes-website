/**
 * LiveSessionBoardStageHost — Main scrollable stage grid (toolbar, battlemap, party tray, deck hand).
 */
"use client";

import { LiveSessionTopToolbarHost } from "./LiveSessionTopToolbarHost";
import { LiveSessionBattlemapPane } from "./LiveSessionBattlemapPane";
import {
  LiveSessionStageViewportContent,
  LiveSessionStagePartyTraySection,
  LiveSessionStageDeckHandSection,
} from "./LiveSessionStageViewport";
import { useLiveSessionBoardContext } from "./LiveSessionBoardContext";

export function LiveSessionBoardStageHost() {
  const {
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
      loreLocationOptions,
      sessionLocationLoreReadable,
      campaignShops,
      guestJoinUrl,
      activeQuests,
    },
    router,
    isGM,
    isUpdating,
    startTransition,
    bootstrap: { liveState, setLiveState, liveStateRef, isLiveStateInitializing, backgroundUrl },
    chronicle: { isPrepMode, chronistTableMode, topBarTranscriptionStatus },
    ui: {
      fateGmSettingsOpen,
      setFateGmSettingsOpen,
      topPanel,
      toggleTopPanel,
      closeTopPanel,
      stageRosterOpen,
      setStageRosterOpen,
      stageDeckHandOpen,
      setStageDeckHandOpen,
      isShopBusy,
      setIsStageManagerOpen,
      showQuests,
      setShowQuests,
      setWrapUpOpen,
      isEnding,
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
      setStagePortrait,
      npcReactions,
      npcReputationScores,
      rollingInitiativeId,
      lightningPulseKey,
      locationDraft,
      setLocationDraft,
      partyTrayMode,
      setPartyTrayMode,
      weatherCondition,
      setInventoryCharacter,
      showDnd5eSheet,
    },
    battlemap: {
      battlemapTokens,
      setBattlemapTokens,
      battlemapFogShapes,
      setBattlemapFogShapes,
      battlemapEffectTemplates,
      setBattlemapEffectTemplates,
      battlemapMarkers,
      setBattlemapMarkers,
      battlemapTraps,
      fogTool,
      setFogTool,
      effectTool,
      setEffectTool,
      markerTool,
      setMarkerTool,
      trapTool,
      setTrapTool,
      drawTool,
      drawColor,
      drawWidth,
      setWorldMapFogCount,
      setWorldMapEffectCount,
      setWorldMapMarkerCount,
      setDrawStrokeCount,
      worldMapFogClearReq,
      worldMapEffectClearReq,
      worldMapMarkerClearReq,
      drawUndoReq,
      drawClearReq,
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
      handleBattlemapPropDrop,
      handleBattlemapPropResize,
      visibleBattlemapTokens,
      visibleBattlemapProps,
      battlemapTokenHpByRef,
      characterDisplayUrlById,
      characterConditionsById,
    },
    derived: {
      showGmDeckHand,
      inHandNpcs,
      inHandFactions,
      inHandScenes,
      stagePrepHref,
      displayPartyCharacters,
      playerColorByCharacterId,
      physicallyPresentIdSet,
      handRaises,
      weatherVisual,
      currentPlayerCharacter,
      activeSceneMedia,
      stageHasDeckContent,
      sortedActiveNpcs,
      activeCreatures,
      activeFactions,
      stageRosterPreview,
      activeFactionIds,
      battlemapTrayScenes,
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
      endCombatEncounter,
      dragCombatToken,
      addCombatToken,
      handleRollInitiative,
      beginCombatEncounter,
      nextCombatTurn,
      prevCombatTurn,
      handlePlayerEndTurn,
    },
    stageActions: {
      placeOnStage,
      removeFromStage,
      handleNpcReaction,
      toggleShopForNpc,
      assignMerchantAndOpenShop,
      assignScribe,
    },
    location: { changeSessionLocation },
    updateLiveState,
    writeSystemLog,
    presentUserIds,
  } = useLiveSessionBoardContext();

  return (
    <div
      className={`relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 pt-3 md:px-5 md:pt-5 ${
        showGmDeckHand ? (stageDeckHandOpen ? "pb-64" : "pb-20") : "pb-3 md:pb-5"
      }`}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-visible rounded-2xl border border-amber-900/60 bg-linear-to-b from-background-card/95 via-emerald-950/90 to-background-dark/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        <LiveSessionTopToolbarHost
          isGM={isGM}
          forcePlayerView={forcePlayerView}
          actualUserIsGM={actualUserIsGM}
          topPanel={topPanel}
          toggleTopPanel={toggleTopPanel}
          closeTopPanel={closeTopPanel}
          liveState={liveState}
          sessionLocationLoreReadable={sessionLocationLoreReadable}
          campaignId={campaignId}
          loreLocationOptions={loreLocationOptions}
          locationDraft={locationDraft}
          setLocationDraft={setLocationDraft}
          changeSessionLocation={changeSessionLocation}
          updateLiveState={updateLiveState}
          fateGmSettingsOpen={fateGmSettingsOpen}
          setFateGmSettingsOpen={setFateGmSettingsOpen}
          sessionId={sessionId}
          seedCombatParticipantsFromBattlemap={seedCombatParticipantsFromBattlemap}
          endCombatEncounter={endCombatEncounter}
          writeSystemLog={writeSystemLog}
          setNpcSearchModalOpen={setNpcSearchModalOpen}
          setBeastSearchModalOpen={setBeastSearchModalOpen}
          setQuickRulebookModalOpen={setQuickRulebookModalOpen}
          stageDeckHandOpen={stageDeckHandOpen}
          setStageDeckHandOpen={setStageDeckHandOpen}
          inHandNpcsCount={inHandNpcs.length}
          inHandFactionsCount={inHandFactions.length}
          inHandScenesCount={inHandScenes.length}
          setIsStageManagerOpen={setIsStageManagerOpen}
          stagePrepHref={stagePrepHref}
          guestJoinUrl={guestJoinUrl}
          activeQuests={activeQuests}
          showQuests={showQuests}
          setShowQuests={setShowQuests}
          isPrepMode={isPrepMode}
          setWrapUpOpen={setWrapUpOpen}
          isEnding={isEnding}
          router={router}
          isLiveStateInitializing={isLiveStateInitializing}
          isGuest={isGuest}
          guestDisplayName={guestDisplayName}
          guestSlotIndex={guestSlotIndex}
          sessionStatus={sessionStatus}
          chronistTableMode={chronistTableMode}
          topBarTranscriptionStatus={topBarTranscriptionStatus}
          showDnd5eSheet={showDnd5eSheet}
        />

        <div className="relative min-h-0 h-full overflow-visible">
          <div
            className={`relative h-full min-h-0 overflow-x-hidden bg-slate-950 bg-cover bg-center transition-shadow duration-200 ${
              battlemapActive ? "overflow-hidden" : "overflow-y-auto"
            } ${stageDropHighlight ? "ring-2 ring-accent-gold ring-inset" : ""}`}
            style={
              !battlemapActive && backgroundUrl
                ? { backgroundImage: `url(${backgroundUrl})` }
                : undefined
            }
            onDragOver={(e) => {
              if (!isGM) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setStageDropHighlight(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setStageDropHighlight(false);
              }
            }}
            onDrop={(e) => {
              if (!isGM) return;
              e.preventDefault();
              setStageDropHighlight(false);
              try {
                const raw = e.dataTransfer.getData("application/json");
                if (!raw) return;
                const data = JSON.parse(raw) as { kind?: string; id?: string };
                if (data.kind === "npc" && data.id) placeOnStage("npc", data.id);
                if (data.kind === "faction" && data.id) placeOnStage("faction", data.id);
                if (data.kind === "scene" && data.id) placeOnStage("scene", data.id);
              } catch {
                /* ignore invalid payload */
              }
            }}
          >
            <LiveSessionBattlemapPane
              activeBattlemap={activeBattlemap}
              visibleBattlemapTokens={visibleBattlemapTokens}
              visibleBattlemapProps={visibleBattlemapProps}
              battlemapFogShapes={battlemapFogShapes}
              battlemapEffectTemplates={battlemapEffectTemplates}
              battlemapMarkers={battlemapMarkers}
              battlemapTraps={battlemapTraps}
              battlemapTokens={battlemapTokens}
              isGM={isGM}
              tokenPlacement={tokenPlacement}
              setTokenPlacement={setTokenPlacement}
              gmTokenPlacement={gmTokenPlacement}
              setGmTokenPlacement={setGmTokenPlacement}
              gmMoveTokenId={gmMoveTokenId}
              setGmMoveTokenId={setGmMoveTokenId}
              selectedBattlemapTokenId={selectedBattlemapTokenId}
              setSelectedBattlemapTokenId={setSelectedBattlemapTokenId}
              selectedBattlemapPropId={selectedBattlemapPropId}
              setSelectedBattlemapPropId={setSelectedBattlemapPropId}
              selectedFogShapeId={selectedFogShapeId}
              setSelectedFogShapeId={setSelectedFogShapeId}
              fogTool={fogTool}
              setFogTool={setFogTool}
              effectTool={effectTool}
              setEffectTool={setEffectTool}
              markerTool={markerTool}
              setMarkerTool={setMarkerTool}
              trapTool={trapTool}
              setTrapTool={setTrapTool}
              drawTool={drawTool}
              drawColor={drawColor}
              drawWidth={drawWidth}
              setWorldMapFogCount={setWorldMapFogCount}
              setWorldMapEffectCount={setWorldMapEffectCount}
              setWorldMapMarkerCount={setWorldMapMarkerCount}
              setDrawStrokeCount={setDrawStrokeCount}
              worldMapFogClearReq={worldMapFogClearReq}
              worldMapEffectClearReq={worldMapEffectClearReq}
              worldMapMarkerClearReq={worldMapMarkerClearReq}
              drawUndoReq={drawUndoReq}
              drawClearReq={drawClearReq}
              trapWizardCell={trapWizardCell}
              setTrapWizardCell={setTrapWizardCell}
              selectedEffectTemplateId={selectedEffectTemplateId}
              setSelectedEffectTemplateId={setSelectedEffectTemplateId}
              selectedMarkerId={selectedMarkerId}
              setSelectedMarkerId={setSelectedMarkerId}
              selectedTrapId={selectedTrapId}
              setSelectedTrapId={setSelectedTrapId}
              activeBattlemapId={activeBattlemapId}
              sessionId={sessionId}
              campaignId={campaignId}
              worldId={worldId}
              activeWorldMapId={activeWorldMapId}
              battlemapActive={battlemapActive}
              battlemapTrayScenes={battlemapTrayScenes}
              startTransition={startTransition}
              setBattlemapFogShapes={setBattlemapFogShapes}
              setBattlemapEffectTemplates={setBattlemapEffectTemplates}
              setBattlemapMarkers={setBattlemapMarkers}
              setBattlemapTokens={setBattlemapTokens}
              notifyBattlemapFogChanged={notifyBattlemapFogChanged}
              notifyBattlemapEffectChanged={notifyBattlemapEffectChanged}
              notifyBattlemapTokensChanged={notifyBattlemapTokensChanged}
              handleFogShapeDelete={handleFogShapeDelete}
              handleEffectTemplateDelete={handleEffectTemplateDelete}
              handleMarkerDelete={handleMarkerDelete}
              handleBattlemapCellClick={handleBattlemapCellClick}
              handleBattlemapTokenMove={handleBattlemapTokenMove}
              handleBattlemapPropDrop={handleBattlemapPropDrop}
              handleBattlemapPropResize={handleBattlemapPropResize}
              battlemapTokenHpByRef={battlemapTokenHpByRef}
              activeTurnHighlight={activeTurnHighlight}
              currentPlayerCharacterId={currentPlayerCharacter?.id ?? null}
              characterDisplayUrlById={characterDisplayUrlById}
              characterConditionsById={characterConditionsById}
              setTokenRadial={setTokenRadial}
              setLiveState={setLiveState}
              liveStateRef={liveStateRef}
            />
            <LiveSessionStageViewportContent
              weatherCondition={weatherCondition}
              lightningPulseKey={lightningPulseKey}
              liveState={liveState}
              sortedCombatParticipants={sortedCombatParticipants}
              combatStarted={combatStarted}
              activeCombatParticipant={activeCombatParticipant}
              isGM={isGM}
              isGuest={isGuest}
              currentPlayerCharacter={currentPlayerCharacter}
              rollingInitiativeId={rollingInitiativeId}
              sessionId={sessionId}
              setCombatParticipants={setCombatParticipants}
              handleRollInitiative={handleRollInitiative}
              beginCombatEncounter={beginCombatEncounter}
              endCombatEncounter={endCombatEncounter}
              handlePlayerEndTurn={handlePlayerEndTurn}
              prevCombatTurn={prevCombatTurn}
              nextCombatTurn={nextCombatTurn}
              battlemapActive={battlemapActive}
              stageHasDeckContent={stageHasDeckContent}
              partyTrayMode={partyTrayMode}
              campaignId={campaignId}
              displayPartyCharacters={displayPartyCharacters}
              updateLiveState={updateLiveState}
              activeSceneMedia={activeSceneMedia}
              setStagePortrait={setStagePortrait}
              removeFromStage={removeFromStage}
              stageRosterOpen={stageRosterOpen}
              setStageRosterOpen={setStageRosterOpen}
              sortedActiveNpcs={sortedActiveNpcs}
              activeCreatures={activeCreatures}
              activeFactions={activeFactions}
              stageRosterPreview={stageRosterPreview}
              npcReactions={npcReactions}
              isUpdating={isUpdating}
              combatParticipantNpcIds={combatParticipantNpcIds}
              activeTurnHighlight={activeTurnHighlight}
              npcReputationScores={npcReputationScores}
              handleNpcReaction={handleNpcReaction}
              toggleShopForNpc={toggleShopForNpc}
              assignMerchantAndOpenShop={assignMerchantAndOpenShop}
              dragCombatToken={dragCombatToken}
              campaignShops={campaignShops}
              isShopBusy={isShopBusy}
              activeFactionIds={activeFactionIds}
              creatureStates={creatureStates}
              setCreatureStates={setCreatureStates}
              setBeastLootCreatureId={setBeastLootCreatureId}
            />
          </div>

          <LiveSessionStagePartyTraySection
            partyTrayMode={partyTrayMode}
            setPartyTrayMode={setPartyTrayMode}
            displayPartyCharacters={displayPartyCharacters}
            userId={userId}
            isGuest={isGuest}
            isGM={isGM}
            presentUserIds={presentUserIds}
            physicallyPresentIdSet={physicallyPresentIdSet}
            liveState={liveState}
            handRaises={handRaises}
            playerColorByCharacterId={playerColorByCharacterId}
            combatStarted={combatStarted}
            activeCombatParticipant={activeCombatParticipant}
            currentPlayerCharacter={currentPlayerCharacter}
            showDnd5eSheet={showDnd5eSheet}
            battlemapActive={battlemapActive}
            battlemapTokens={battlemapTokens}
            combatParticipantNames={combatParticipantNames}
            sessionId={sessionId}
            campaignId={campaignId}
            assignScribe={assignScribe}
            setInventoryCharacter={setInventoryCharacter}
            startCharacterTokenPlacement={startCharacterTokenPlacement}
            setBattlemapTokens={setBattlemapTokens}
            notifyBattlemapTokensChanged={notifyBattlemapTokensChanged}
            addCombatToken={addCombatToken}
          />
        </div>
      </div>

      <LiveSessionStageDeckHandSection
        showGmDeckHand={showGmDeckHand}
        stageDeckHandOpen={stageDeckHandOpen}
        setStageDeckHandOpen={setStageDeckHandOpen}
        inHandNpcs={inHandNpcs}
        inHandFactions={inHandFactions}
        inHandScenes={inHandScenes}
        placeOnStage={placeOnStage}
      />
    </div>
  );
}
