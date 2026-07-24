"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift, Map, X } from "lucide-react";
import { LiveSessionActivityPanel } from "@/src/components/session/LiveSessionActivityPanel";
import { LiveSessionBattlemapsPanel } from "@/src/components/session/LiveSessionBattlemapsPanel";
import { LiveSessionChroniclePanel } from "@/src/components/session/LiveSessionChroniclePanel";
import { LiveSessionDicePanel } from "@/src/components/session/LiveSessionDicePanel";
import { LootDraftPanel } from "@/src/components/session/LootDraftPanel";
import type { MainSidePanelId } from "@/src/components/session/live-session-side-types";
import {
  LIVE_SESSION_DICE_PANEL_HEIGHT_CLASS,
  LIVE_SESSION_MAIN_PANEL_HEIGHT_CLASS,
  LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS,
} from "@/src/components/session/live-session-side-types";
import {
  LiveSessionMonstersPanel,
  type LiveSessionMonsterItem,
} from "@/src/components/session/LiveSessionMonstersPanel";
import { LiveSessionScenesPanel } from "@/src/components/session/LiveSessionScenesPanel";
import { LiveSessionSideRail } from "@/src/components/session/LiveSessionSideRail";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import { TravelDowntimeGmPanel } from "@/src/components/session/TravelDowntimeGmPanel";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import type { SessionBattlemap } from "@/src/lib/session/battlemap-types";

const PANEL_SLIDE = {
  initial: { opacity: 0, x: 48 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 48 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

type PartyCharacter = {
  id: string;
  name: string;
  rations_count: number;
  starvation_days: number;
};

type Props = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  isPrepMode: boolean;
  mainPanel: MainSidePanelId | null;
  diceOpen: boolean;
  onToggleMain: (id: MainSidePanelId) => void;
  onToggleDice: () => void;
  onCloseMain: () => void;
  handRaises: SessionHandRaise[];
  downtimeActive: boolean;
  lootActive: boolean;
  logs: SessionActivityEntry[];
  currentCharacter: { id: string; name: string } | null;
  prepTestCharacters?: { id: string; name: string }[];
  prepTestCharacterId?: string | null;
  onPrepTestCharacterChange?: (id: string) => void;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
  onActivityCleared?: () => void;
  onActivityDeleted?: (entryId: string) => void;
  currentUserId?: string | null;
  playerColorByCharacterId?: Record<string, string>;
  onHandRaisesChanged?: (raises: SessionHandRaise[] | "refresh") => void;
  systemLogs: SessionActivityEntry[];
  journalText: string | null;
  canEditJournal: boolean;
  scribeId: string | null;
  onJournalChange: (text: string | null) => void;
  scenes: StageSceneMediaItem[];
  activeSceneId: string | null;
  onShowScene: (id: string) => void;
  onRemoveScene?: (id: string) => void;
  creatures?: LiveSessionMonsterItem[];
  activeCreatureIds?: Set<string>;
  onPlaceCreature?: (id: string) => void;
  onRemoveCreature?: (id: string) => void;
  battlemaps: SessionBattlemap[];
  activeBattlemapId: string | null;
  battlemapMovementPaused?: boolean;
  onBattlemapActiveChange?: (id: string | null) => void;
  onBattlemapMovementPausedChange?: (paused: boolean) => void;
  partyCharacters: PartyCharacter[];
  downtimeCurrentDay: number;
  downtimeTotalDays: number;
  fapAllocations: FapAllocationsMap;
  onTravelReload: () => void | Promise<void>;
  activeLootId: string | null;
  onClearStageLoot: () => void;
  onLootPublished: () => void | Promise<void>;
};

export function LiveSessionSidePanels({
  sessionId,
  campaignId,
  isGM,
  isPrepMode,
  mainPanel,
  diceOpen,
  onToggleMain,
  onToggleDice,
  onCloseMain,
  handRaises,
  downtimeActive,
  lootActive,
  logs,
  currentCharacter,
  prepTestCharacters,
  prepTestCharacterId,
  onPrepTestCharacterChange,
  onActivityPosted,
  onActivityCleared,
  onActivityDeleted,
  currentUserId,
  playerColorByCharacterId,
  onHandRaisesChanged,
  systemLogs,
  journalText,
  canEditJournal,
  scribeId,
  onJournalChange,
  scenes,
  activeSceneId,
  onShowScene,
  onRemoveScene,
  creatures = [],
  activeCreatureIds,
  onPlaceCreature,
  onRemoveCreature,
  battlemaps,
  activeBattlemapId,
  battlemapMovementPaused,
  onBattlemapActiveChange,
  onBattlemapMovementPausedChange,
  partyCharacters,
  downtimeCurrentDay,
  downtimeTotalDays,
  fapAllocations,
  onTravelReload,
  activeLootId,
  onClearStageLoot,
  onLootPublished,
}: Props) {
  const showMain = mainPanel != null;
  const showDice = diceOpen;
  const showPanelStack = showMain || showDice;

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-[55] flex">
      <AnimatePresence>
        {showPanelStack ? (
          <motion.div
            key="side-panel-stack"
            initial={PANEL_SLIDE.initial}
            animate={PANEL_SLIDE.animate}
            exit={PANEL_SLIDE.exit}
            transition={PANEL_SLIDE.transition}
            className={`pointer-events-auto relative ${LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS} h-dvh overflow-hidden`}
          >
            <AnimatePresence mode="wait">
              {showMain && mainPanel ? (
                <motion.div
                  key={`main-${mainPanel}`}
                  initial={PANEL_SLIDE.initial}
                  animate={PANEL_SLIDE.animate}
                  exit={PANEL_SLIDE.exit}
                  transition={PANEL_SLIDE.transition}
                  className={`absolute inset-x-0 top-0 ${LIVE_SESSION_MAIN_PANEL_HEIGHT_CLASS} overflow-hidden`}
                >
                  {mainPanel === "chat" ? (
                    <LiveSessionActivityPanel
                      embedded
                      sessionId={sessionId}
                      campaignId={campaignId}
                      isGM={isGM}
                      isPrepMode={isPrepMode}
                      open
                      onClose={onCloseMain}
                      logs={logs}
                      currentCharacter={currentCharacter}
                      prepTestCharacters={prepTestCharacters}
                      prepTestCharacterId={prepTestCharacterId}
                      onPrepTestCharacterChange={onPrepTestCharacterChange}
                      onActivityPosted={onActivityPosted}
                      onActivityCleared={onActivityCleared}
                      onActivityDeleted={onActivityDeleted}
                      handRaises={handRaises}
                      currentUserId={currentUserId}
                      playerColorByCharacterId={playerColorByCharacterId}
                      onHandRaisesChanged={onHandRaisesChanged}
                    />
                  ) : null}

                  {mainPanel === "chronicle" ? (
                    <LiveSessionChroniclePanel
                      onClose={onCloseMain}
                      systemLogs={systemLogs}
                      journalText={journalText}
                      canEditJournal={canEditJournal}
                      sessionId={sessionId}
                      scribeId={scribeId}
                      onJournalChange={onJournalChange}
                    />
                  ) : null}

                  {mainPanel === "scenes" ? (
                    <LiveSessionScenesPanel
                      onClose={onCloseMain}
                      scenes={scenes}
                      activeSceneId={activeSceneId}
                      isGM={isGM}
                      onShowScene={onShowScene}
                      onRemoveScene={onRemoveScene}
                    />
                  ) : null}

                  {mainPanel === "monsters" ? (
                    <LiveSessionMonstersPanel
                      onClose={onCloseMain}
                      creatures={creatures}
                      activeCreatureIds={activeCreatureIds ?? new Set()}
                      isGM={isGM}
                      onPlaceCreature={onPlaceCreature ?? (() => undefined)}
                      onRemoveCreature={onRemoveCreature}
                    />
                  ) : null}

                  {mainPanel === "battlemaps" ? (
                    <LiveSessionBattlemapsPanel
                      onClose={onCloseMain}
                      sessionId={sessionId}
                      isGM={isGM}
                      battlemaps={battlemaps}
                      activeBattlemapId={activeBattlemapId}
                      movementPaused={battlemapMovementPaused}
                      onActiveChange={onBattlemapActiveChange}
                      onMovementPausedChange={onBattlemapMovementPausedChange}
                    />
                  ) : null}

                  {mainPanel === "travel" && isGM ? (
                    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
                      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Map className="h-4 w-4 shrink-0 text-accent-gold" />
                          <div>
                            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
                              Reise &amp; FAP
                            </h2>
                            <p className="font-libre text-[10px] text-gray-500">
                              Reisetage, Gruppe, Rationen
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onCloseMain}
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                          aria-label="Reise-Panel schließen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <TravelDowntimeGmPanel
                          sessionId={sessionId}
                          partyCharacters={partyCharacters}
                          downtimeActive={downtimeActive}
                          downtimeCurrentDay={downtimeCurrentDay}
                          downtimeTotalDays={downtimeTotalDays}
                          fapAllocations={fapAllocations}
                          onReload={onTravelReload}
                          layout="sidebar"
                        />
                      </div>
                    </div>
                  ) : null}

                  {mainPanel === "loot" && isGM ? (
                    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
                      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Gift className="h-4 w-4 shrink-0 text-accent-gold" />
                          <div>
                            <h2 className="font-barlow text-sm font-bold uppercase text-accent-gold">
                              Loot-Gun
                            </h2>
                            <p className="font-libre text-[10px] text-gray-500">
                              Beute erzeugen &amp; auf die Bühne geben
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onCloseMain}
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                          aria-label="Loot-Panel schließen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <LootDraftPanel
                          sessionId={sessionId}
                          campaignId={campaignId}
                          activeLootId={activeLootId}
                          onClearStageLoot={onClearStageLoot}
                          onPublished={onLootPublished}
                          variant="compact"
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showDice ? (
                <motion.div
                  key="dice-panel"
                  initial={PANEL_SLIDE.initial}
                  animate={PANEL_SLIDE.animate}
                  exit={PANEL_SLIDE.exit}
                  transition={PANEL_SLIDE.transition}
                  className={`absolute inset-x-0 bottom-0 ${LIVE_SESSION_DICE_PANEL_HEIGHT_CLASS} overflow-hidden`}
                >
                  <LiveSessionDicePanel
                    embedded
                    sessionId={sessionId}
                    campaignId={campaignId}
                    open
                    onClose={onToggleDice}
                    currentCharacter={currentCharacter}
                    isPrepMode={isPrepMode}
                    prepTestCharacters={prepTestCharacters}
                    prepTestCharacterId={prepTestCharacterId}
                    onPrepTestCharacterChange={onPrepTestCharacterChange}
                    onActivityPosted={onActivityPosted}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto flex h-dvh shrink-0">
        <LiveSessionSideRail
          mainPanel={mainPanel}
          diceOpen={diceOpen}
          isGM={isGM}
          handRaiseCount={handRaises.length}
          downtimeActive={downtimeActive}
          lootActive={lootActive}
          onToggleMain={onToggleMain}
          onToggleDice={onToggleDice}
        />
      </div>
    </div>
  );
}
