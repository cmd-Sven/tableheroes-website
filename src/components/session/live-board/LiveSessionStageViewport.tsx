/**
 * LiveSessionStageViewport — Stage overlay (combat HUD, roster, shop), party tray, and GM deck hand.
 */
"use client";

import type { Dispatch, DragEvent, ReactNode, SetStateAction, TransitionStartFunction } from "react";
import { toast } from "sonner";
import { setCombatInitiative } from "@/src/lib/actions/combat-initiative-actions";
import { parseInitiativeLabel } from "@/src/lib/combat-initiative";
import type { ActiveCombatTurnHighlight } from "@/src/lib/combat-initiative";
import { CombatInitiativeHud } from "@/src/components/session/CombatInitiativeHud";
import { LiveStageShopOverlay } from "@/src/app/session/[sessionId]/LiveStageShopOverlay";
import { StageLootItemCards } from "@/src/components/session/StageLootItemCards";
import { StageSceneCard, type StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import { StageDeckHand } from "@/src/app/session/[sessionId]/StageDeckHand";
import type { LiveCampaignShopOption } from "@/src/app/session/[sessionId]/StageNpcShopControls";
import type { CampaignCreatureStateRow } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import { LiveSessionWeatherEffects } from "./LiveSessionWeatherEffects";
import { LiveSessionStageRoster } from "./LiveSessionStageRoster";
import { LiveSessionPartyTray, type PartyTrayMode } from "./LiveSessionPartyTray";
import type {
  ActiveNpcReaction,
  CampaignCreature,
  CampaignFaction,
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
  LiveState,
  PartyCharacter,
  StagePortraitModal,
} from "./live-session-types";
import type { WeatherPresetId } from "@/src/lib/session-weather";

type WeatherVisual = {
  id: WeatherPresetId;
  label: string;
  src: string;
  className: string;
};

export type LiveSessionStageViewportContentProps = {
  weatherCondition: ReturnType<typeof import("./live-session-weather").getWeatherCondition>;
  lightningPulseKey: number;
  liveState: LiveState | null;
  sortedCombatParticipants: CombatParticipant[];
  combatStarted: boolean;
  activeCombatParticipant: CombatParticipant | null | undefined;
  isGM: boolean;
  isGuest: boolean;
  currentPlayerCharacter: PartyCharacter | null | undefined;
  rollingInitiativeId: string | null;
  sessionId: string;
  setCombatParticipants: Dispatch<SetStateAction<CombatParticipant[]>>;
  handleRollInitiative: (participantId: string) => void;
  beginCombatEncounter: () => void;
  endCombatEncounter: () => void;
  handlePlayerEndTurn: () => void;
  prevCombatTurn: () => void;
  nextCombatTurn: () => void;
  battlemapActive: boolean;
  stageHasDeckContent: boolean;
  partyTrayMode: PartyTrayMode;
  campaignId: string;
  displayPartyCharacters: PartyCharacter[];
  updateLiveState: (patch: Partial<LiveState>) => void;
  activeSceneMedia: StageSceneMediaItem | null | undefined;
  setStagePortrait: Dispatch<SetStateAction<StagePortraitModal | null>>;
  removeFromStage: (kind: "npc" | "faction" | "scene" | "creature", id: string) => void;
  stageRosterOpen: boolean;
  setStageRosterOpen: Dispatch<SetStateAction<boolean>>;
  sortedActiveNpcs: CampaignNpc[];
  activeCreatures: CampaignCreature[];
  activeFactions: CampaignFaction[];
  stageRosterPreview: Array<{ id: string; name: string; imageUrl: string | null }>;
  npcReactions: ActiveNpcReaction[];
  isUpdating: boolean;
  combatParticipantNpcIds: Set<string>;
  activeTurnHighlight: ActiveCombatTurnHighlight | null;
  npcReputationScores: Record<string, number>;
  handleNpcReaction: (npcId: string, amount: number) => void;
  toggleShopForNpc: (npc: CampaignNpc) => void;
  assignMerchantAndOpenShop: (npc: CampaignNpc, shopId: string) => void;
  dragCombatToken: (e: DragEvent<HTMLElement>, payload: CombatTokenPayload) => void;
  campaignShops: LiveCampaignShopOption[];
  isShopBusy: boolean;
  activeFactionIds: Set<string>;
  creatureStates: Record<string, CampaignCreatureStateRow>;
  setCreatureStates: Dispatch<SetStateAction<Record<string, CampaignCreatureStateRow>>>;
  setBeastLootCreatureId: (id: string | null) => void;
};

export function LiveSessionStageViewportContent(props: LiveSessionStageViewportContentProps) {
  const {
    weatherCondition,
    lightningPulseKey,
    liveState,
    sortedCombatParticipants,
    combatStarted,
    activeCombatParticipant,
    isGM,
    isGuest,
    currentPlayerCharacter,
    rollingInitiativeId,
    sessionId,
    setCombatParticipants,
    handleRollInitiative,
    beginCombatEncounter,
    endCombatEncounter,
    handlePlayerEndTurn,
    prevCombatTurn,
    nextCombatTurn,
    battlemapActive,
    stageHasDeckContent,
    partyTrayMode,
    campaignId,
    displayPartyCharacters,
    updateLiveState,
    activeSceneMedia,
    setStagePortrait,
    removeFromStage,
    stageRosterOpen,
    setStageRosterOpen,
    sortedActiveNpcs,
    activeCreatures,
    activeFactions,
    stageRosterPreview,
    npcReactions,
    isUpdating,
    combatParticipantNpcIds,
    activeTurnHighlight,
    npcReputationScores,
    handleNpcReaction,
    toggleShopForNpc,
    assignMerchantAndOpenShop,
    dragCombatToken,
    campaignShops,
    isShopBusy,
    activeFactionIds,
    creatureStates,
    setCreatureStates,
    setBeastLootCreatureId,
  } = props;

  return (
<>
            <div className="pointer-events-none absolute inset-0 bg-radial-[ellipse_at_center] from-black/10 via-black/30 to-black/70" />
            <LiveSessionWeatherEffects
              weatherCondition={weatherCondition}
              lightningPulseKey={lightningPulseKey}
            />
            {liveState?.is_combat_mode ? (
              <div className="absolute inset-x-0 top-3 z-20 flex justify-center px-3">
                <CombatInitiativeHud
                  participants={sortedCombatParticipants}
                  combatStarted={combatStarted}
                  combatRound={Math.max(1, Number(liveState?.combat_round ?? 1) || 1)}
                  currentTurnIndex={Math.max(
                    0,
                    Number(liveState?.current_turn_index ?? 0) || 0,
                  )}
                  activeParticipantId={activeCombatParticipant?.id ?? null}
                  isGM={isGM}
                  ownCharacterName={currentPlayerCharacter?.name ?? null}
                  rollingParticipantId={rollingInitiativeId}
                  onRollInitiative={handleRollInitiative}
                  onStartCombat={beginCombatEncounter}
                  onEndCombat={endCombatEncounter}
                  onEndTurn={handlePlayerEndTurn}
                  onPrevTurn={prevCombatTurn}
                  onNextTurn={nextCombatTurn}
                  onUpdateInitiative={async (participantId, label) => {
                    try {
                      await setCombatInitiative({
                        sessionId,
                        participantId,
                        initiativeLabel: label,
                      });
                      const parsed = parseInitiativeLabel(label);
                      setCombatParticipants((prev) =>
                        prev.map((p) =>
                          p.id === participantId
                            ? {
                                ...p,
                                initiative_value: parsed.base,
                                initiative_label: parsed.display,
                              }
                            : p,
                        ),
                      );
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Initiative konnte nicht gespeichert werden.",
                      );
                    }
                  }}
                />
              </div>
            ) : null}
            {/* Battlemap owns the viewport — stage deck UI must not sit on top and steal clicks. */}
            {battlemapActive ? null : !stageHasDeckContent ? (
              <div className="pointer-events-none relative z-[1] flex h-full min-h-[calc(48vh+120px)] items-center justify-center px-4 text-center">
                <p className="max-w-md rounded-lg border border-white/10 bg-black/45 px-5 py-4 font-libre text-sm text-gray-300 backdrop-blur-sm">
                  {isGM
                    ? "Noch nichts auf der Bühne. Ziehe Karten aus dem Deck unten hierher oder nutze Stage live."
                    : "Noch nichts auf der Bühne. Der Spielleiter kann NPCs und Fraktionen aktivieren."}
                </p>
              </div>
            ) : (
              <div
                className={`relative z-10 flex min-h-full flex-col justify-start gap-8 px-5 md:px-8 ${
                  partyTrayMode === "hidden"
                    ? "pb-10 md:pb-12"
                    : partyTrayMode === "compact"
                      ? "pb-40 md:pb-44"
                      : "pb-72 md:pb-80"
                } ${
                  liveState?.is_combat_mode ? "pt-44" : "pt-[60px]"
                }`}
              >
                {!isGuest && liveState?.active_shop_id ? (
                  <LiveStageShopOverlay
                    campaignId={campaignId}
                    shopId={liveState.active_shop_id}
                    merchantNpcId={liveState.active_merchant_npc_id ?? null}
                    characterId={currentPlayerCharacter?.id ?? null}
                    isGM={isGM}
                    partyCharacters={displayPartyCharacters
                      .filter((pc) => !pc.isSessionDummy && pc.id)
                      .map((pc) => ({
                        id: pc.id,
                        name: pc.name,
                        playerUserId: pc.playerUserId ?? null,
                      }))}
                    onClose={
                      isGM
                        ? () =>
                            updateLiveState({
                              active_shop_id: null,
                              active_merchant_npc_id: null,
                            })
                        : undefined
                    }
                  />
                ) : null}
                {liveState?.current_loot_id ? (
                  <div className="relative z-20 w-full shrink-0 overflow-x-visible overflow-y-visible py-1">
                    <StageLootItemCards
                      sessionId={sessionId}
                      campaignId={campaignId}
                      containerId={liveState.current_loot_id}
                      characterId={currentPlayerCharacter?.id ?? null}
                      isGM={isGM}
                      isCombatMode={!!liveState?.is_combat_mode}
                    />
                  </div>
                ) : null}
                {activeSceneMedia ? (
                  <div className="mb-6 flex justify-center px-2">
                    <StageSceneCard
                      scene={activeSceneMedia}
                      isGM={isGM}
                      onPortrait={setStagePortrait}
                      onRemove={
                        isGM
                          ? () => removeFromStage("scene", String(activeSceneMedia.id))
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                <LiveSessionStageRoster
                  stageRosterOpen={stageRosterOpen}
                  onToggleStageRoster={() => setStageRosterOpen((v) => !v)}
                  liveState={liveState}
                  sortedActiveNpcs={sortedActiveNpcs}
                  activeCreatures={activeCreatures}
                  activeFactions={activeFactions}
                  stageRosterPreview={stageRosterPreview}
                  npcReactions={npcReactions}
                  isGM={isGM}
                  isUpdating={isUpdating}
                  combatParticipantNpcIds={combatParticipantNpcIds}
                  activeTurnHighlight={activeTurnHighlight}
                  npcReputationScores={npcReputationScores}
                  onPortrait={setStagePortrait}
                  onNpcReaction={handleNpcReaction}
                  onRemoveFromStage={removeFromStage}
                  onToggleShop={toggleShopForNpc}
                  onAssignMerchantAndOpen={assignMerchantAndOpenShop}
                  onDragCombatToken={dragCombatToken}
                  campaignShops={campaignShops}
                  isShopBusy={isShopBusy}
                  activeFactionIds={activeFactionIds}
                  creatureStates={creatureStates}
                  campaignId={campaignId}
                  sessionId={sessionId}
                  setCreatureStates={setCreatureStates}
                  onSuggestBeastLoot={(creatureId) => setBeastLootCreatureId(creatureId)}
                />

              </div>
            )}
</>
  );
}

export type LiveSessionStagePartyTraySectionProps = {
  partyTrayMode: PartyTrayMode;
  setPartyTrayMode: Dispatch<SetStateAction<PartyTrayMode>>;
  displayPartyCharacters: PartyCharacter[];
  userId: string;
  isGuest: boolean;
  isGM: boolean;
  presentUserIds: Set<string>;
  physicallyPresentIdSet: Set<string>;
  liveState: LiveState | null;
  handRaises: SessionHandRaise[];
  playerColorByCharacterId: Record<string, string>;
  combatStarted: boolean;
  activeCombatParticipant: CombatParticipant | null | undefined;
  currentPlayerCharacter: PartyCharacter | null | undefined;
  showDnd5eSheet: boolean;
  battlemapActive: boolean;
  battlemapTokens: SessionBattlemapToken[];
  combatParticipantNames: Set<string>;
  sessionId: string;
  campaignId: string;
  assignScribe: (nextScribeId: string | null) => void;
  setInventoryCharacter: (pc: PartyCharacter | null) => void;
  startCharacterTokenPlacement: (characterId: string, characterName: string) => void;
  setBattlemapTokens: Dispatch<SetStateAction<SessionBattlemapToken[]>>;
  notifyBattlemapTokensChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    token?: SessionBattlemapToken | null;
    tokenId?: string | null;
  }) => void;
  addCombatToken: (payload: CombatTokenPayload) => Promise<void> | void;
};

export function LiveSessionStagePartyTraySection(p: LiveSessionStagePartyTraySectionProps) {
  const {
    partyTrayMode,
    setPartyTrayMode,
    displayPartyCharacters,
    userId,
    isGuest,
    isGM,
    presentUserIds,
    physicallyPresentIdSet,
    liveState,
    handRaises,
    playerColorByCharacterId,
    combatStarted,
    activeCombatParticipant,
    currentPlayerCharacter,
    showDnd5eSheet,
    battlemapActive,
    battlemapTokens,
    combatParticipantNames,
    sessionId,
    campaignId,
    assignScribe,
    setInventoryCharacter,
    startCharacterTokenPlacement,
    setBattlemapTokens,
    notifyBattlemapTokensChanged,
    addCombatToken,
  } = p;

  return (
<LiveSessionPartyTray
            partyTrayMode={partyTrayMode}
            displayPartyCharacters={displayPartyCharacters}
            userId={userId}
            isGuest={isGuest}
            isGM={isGM}
            presentUserIds={presentUserIds}
            physicallyPresentIdSet={physicallyPresentIdSet}
            scribeId={liveState?.scribe_id}
            handRaises={handRaises}
            playerColorByCharacterId={playerColorByCharacterId}
            combatStarted={combatStarted}
            activeCombatParticipant={activeCombatParticipant}
            currentPlayerCharacterId={currentPlayerCharacter?.id}
            showDnd5eSheet={showDnd5eSheet}
            battlemapActive={battlemapActive}
            battlemapMovementPaused={liveState?.battlemap_movement_paused}
            battlemapTokens={battlemapTokens}
            isCombatMode={!!liveState?.is_combat_mode}
            combatParticipantNames={combatParticipantNames}
            sessionId={sessionId}
            campaignId={campaignId}
            onAssignScribe={assignScribe}
            onOpenInventory={setInventoryCharacter}
            onStartTokenPlacement={startCharacterTokenPlacement}
            onBattlemapTokensChanged={(updated) => {
              setBattlemapTokens((prev) =>
                prev.map((tok) => (tok.id === updated.id ? { ...tok, ...updated } : tok)),
              );
              notifyBattlemapTokensChanged({ op: "upsert", token: updated });
            }}
            onJoinCombat={(pc) => {
              void addCombatToken({
                type: "player",
                name: pc.name,
                image_url: pc.avatar_url,
              });
            }}
          />
  );
}

export type LiveSessionStageDeckHandSectionProps = {
  showGmDeckHand: boolean;
  stageDeckHandOpen: boolean;
  setStageDeckHandOpen: Dispatch<SetStateAction<boolean>>;
  inHandNpcs: CampaignNpc[];
  inHandFactions: CampaignFaction[];
  inHandScenes: StageSceneMediaItem[];
  placeOnStage: (kind: "npc" | "faction" | "scene" | "creature", id: string) => void;
};

export function LiveSessionStageDeckHandSection({
  showGmDeckHand,
  stageDeckHandOpen,
  setStageDeckHandOpen,
  inHandNpcs,
  inHandFactions,
  inHandScenes,
  placeOnStage,
}: LiveSessionStageDeckHandSectionProps) {
  return (
    <>
{showGmDeckHand ? (
          <StageDeckHand
            open={stageDeckHandOpen}
            onToggle={() => setStageDeckHandOpen((v) => !v)}
            npcs={inHandNpcs}
            factions={inHandFactions}
            scenes={inHandScenes}
            onPlace={placeOnStage}
          />
        ) : null}
    </>
  );
}
