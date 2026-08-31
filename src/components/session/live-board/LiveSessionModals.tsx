/**
 * LiveSessionModals — Search, inventory, character sheet, trap, and session wrap-up modals.
 */
"use client";

import dynamic from "next/dynamic";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { TransitionStartFunction } from "react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { GmNpcSearchModal, type GmNpcSearchRow } from "@/src/components/session/GmNpcSearchModal";
import { GmBeastSearchModal, type GmBeastSearchRow } from "@/src/components/session/GmBeastSearchModal";
import { GmQuickRulebookModal } from "@/src/components/session/GmQuickRulebookModal";
import { BeastDefeatLootModal } from "@/src/components/session/BeastDefeatLootModal";
import { SessionEndWrapUpModal } from "@/src/components/session/SessionEndWrapUpModal";
import { TrapWizardModal } from "@/src/components/session/battlemap/TrapWizardModal";
import { TrapTriggerModal } from "@/src/components/session/battlemap/TrapTriggerModal";
import { listBattlemapTraps } from "@/src/lib/actions/battlemap-trap-actions";
import type {
  BattlemapTrapTool,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import type { UseSessionChronicleRecorderReturn } from "@/src/hooks/useSessionChronicleRecorder";
import type { CampaignCreature, LiveState, PartyCharacter } from "./live-session-types";

const CombatStartVideoModal = dynamic(
  () =>
    import("@/src/components/session/CombatStartVideoModal").then((m) => ({
      default: m.CombatStartVideoModal,
    })),
  { ssr: false },
);

const PrivateInventoryModal = dynamic(
  () =>
    import("@/src/components/inventory/PrivateInventoryModal").then((m) => ({
      default: m.PrivateInventoryModal,
    })),
  { ssr: false },
);

const Dnd5eCharacterSheetModalWithLocale = dynamic(
  () =>
    import("@/src/components/characters/Dnd5eCharacterSheetModal").then((m) => ({
      default: m.Dnd5eCharacterSheetModalWithLocale,
    })),
  { ssr: false },
);

type TrapTriggerEvent = {
  trap: SessionBattlemapTrap;
  characterName: string;
  characterId: string;
  passivePerception: number;
} | null;

export type LiveSessionModalsProps = {
  isGM: boolean;
  sessionId: string;
  campaignId: string;
  showLoadingScreen: boolean;
  combatStartFxActive: boolean;
  combatStartFxKey: string | number;
  dismissCombatStartFx: () => void;
  npcSearchModalOpen: boolean;
  setNpcSearchModalOpen: (open: boolean) => void;
  gmNpcSearchRows: GmNpcSearchRow[];
  stageDeckNpcIds: string[] | null;
  currentLocationLoreId: string | null;
  activeNpcIds: Set<string>;
  onPlaceNpc: (id: string) => void;
  beastSearchModalOpen: boolean;
  setBeastSearchModalOpen: (open: boolean) => void;
  quickRulebookModalOpen: boolean;
  setQuickRulebookModalOpen: (open: boolean) => void;
  gmBeastSearchRows: GmBeastSearchRow[];
  stageDeckCreatureIds: string[] | null;
  activeCreatureIds: Set<string>;
  onPlaceCreature: (id: string) => void;
  beastLootCreatureId: string | null;
  setBeastLootCreatureId: (id: string | null) => void;
  allCampaignCreatures: CampaignCreature[];
  writeSystemLog: (type: string, text: string) => void;
  inventoryCharacter: PartyCharacter | null;
  setInventoryCharacter: (pc: PartyCharacter | null) => void;
  partyCharacters: PartyCharacter[];
  refreshLiveState: () => Promise<void>;
  router: AppRouterInstance;
  sheetCharacter: PartyCharacter | null;
  setSheetCharacter: (pc: PartyCharacter | null) => void;
  showDnd5eSheet: boolean;
  liveState: LiveState | null;
  trapWizardCell: { gridX: number; gridY: number } | null;
  setTrapWizardCell: (cell: { gridX: number; gridY: number } | null) => void;
  setTrapTool: (tool: BattlemapTrapTool) => void;
  activeBattlemapId: string | null;
  currentLocationName: string | null | undefined;
  setSelectedTrapId: (id: string | null) => void;
  setBattlemapTraps: (traps: SessionBattlemapTrap[]) => void;
  trapTriggerEvent: TrapTriggerEvent;
  setTrapTriggerEvent: (event: TrapTriggerEvent) => void;
  wrapUpOpen: boolean;
  setWrapUpOpen: (open: boolean) => void;
  chronicleRecorder: UseSessionChronicleRecorderReturn;
  liveTranscriptionStatus: string | null | undefined;
  startEndTransition: TransitionStartFunction;
};

export function LiveSessionModals({
  isGM,
  sessionId,
  campaignId,
  showLoadingScreen,
  combatStartFxActive,
  combatStartFxKey,
  dismissCombatStartFx,
  npcSearchModalOpen,
  setNpcSearchModalOpen,
  gmNpcSearchRows,
  stageDeckNpcIds,
  currentLocationLoreId,
  activeNpcIds,
  onPlaceNpc,
  beastSearchModalOpen,
  setBeastSearchModalOpen,
  quickRulebookModalOpen,
  setQuickRulebookModalOpen,
  gmBeastSearchRows,
  stageDeckCreatureIds,
  activeCreatureIds,
  onPlaceCreature,
  beastLootCreatureId,
  setBeastLootCreatureId,
  allCampaignCreatures,
  writeSystemLog,
  inventoryCharacter,
  setInventoryCharacter,
  partyCharacters,
  refreshLiveState,
  router,
  sheetCharacter,
  setSheetCharacter,
  showDnd5eSheet,
  liveState,
  trapWizardCell,
  setTrapWizardCell,
  setTrapTool,
  activeBattlemapId,
  currentLocationName,
  setSelectedTrapId,
  setBattlemapTraps,
  trapTriggerEvent,
  setTrapTriggerEvent,
  wrapUpOpen,
  setWrapUpOpen,
  chronicleRecorder,
  liveTranscriptionStatus,
  startEndTransition,
}: LiveSessionModalsProps) {
  return (
    <>
      <AnimatePresence>
        {combatStartFxActive && !showLoadingScreen ? (
          <CombatStartVideoModal key={combatStartFxKey} onComplete={dismissCombatStartFx} />
        ) : null}
      </AnimatePresence>

      {isGM ? (
        <GmNpcSearchModal
          open={npcSearchModalOpen}
          onClose={() => setNpcSearchModalOpen(false)}
          npcs={gmNpcSearchRows}
          stageDeckNpcIds={stageDeckNpcIds}
          currentLocationLoreId={currentLocationLoreId}
          activeNpcIds={activeNpcIds}
          onPlaceOnStage={(id) => {
            onPlaceNpc(id);
          }}
        />
      ) : null}

      {isGM ? (
        <GmBeastSearchModal
          open={beastSearchModalOpen}
          onClose={() => setBeastSearchModalOpen(false)}
          creatures={gmBeastSearchRows}
          stageDeckCreatureIds={stageDeckCreatureIds}
          activeCreatureIds={activeCreatureIds}
          onPlaceOnStage={(id) => {
            onPlaceCreature(id);
            setBeastSearchModalOpen(false);
          }}
        />
      ) : null}

      {isGM && showDnd5eSheet ? (
        <GmQuickRulebookModal
          open={quickRulebookModalOpen}
          onClose={() => setQuickRulebookModalOpen(false)}
        />
      ) : null}

      {isGM && beastLootCreatureId ? (
        <BeastDefeatLootModal
          open
          creatureName={
            allCampaignCreatures.find((c) => String(c.id) === beastLootCreatureId)?.name ??
            "Kreatur"
          }
          onClose={() => setBeastLootCreatureId(null)}
          onAccept={(suggestion) => {
            writeSystemLog(
              "loot_suggestion",
              `Loot-Vorschlag für besiegte Kreatur: ${suggestion.name} (${suggestion.items.length} Gegenstände).`,
            );
            setBeastLootCreatureId(null);
          }}
        />
      ) : null}

      {inventoryCharacter ? (
        <PrivateInventoryModal
          character={{
            id: inventoryCharacter.id,
            name: inventoryCharacter.name,
            class: inventoryCharacter.class,
            level: inventoryCharacter.level,
            avatar_url: inventoryCharacter.avatar_url,
          }}
          onClose={() => setInventoryCharacter(null)}
          gmRationsDistribution={
            isGM
              ? {
                  sessionId,
                  partyCharacters: partyCharacters.map((pc) => ({
                    id: pc.id,
                    name: pc.name,
                    rations_count: pc.rations_count ?? 0,
                    starvation_days: pc.starvation_days ?? 0,
                  })),
                  onDistributed: async () => {
                    await refreshLiveState();
                    router.refresh();
                  },
                }
              : undefined
          }
        />
      ) : null}

      {sheetCharacter && showDnd5eSheet ? (
        <Dnd5eCharacterSheetModalWithLocale
          campaignId={campaignId}
          character={{
            id: sheetCharacter.id,
            name: sheetCharacter.name,
            class: sheetCharacter.class,
            level: sheetCharacter.level,
          }}
          liveSessionMode
          downtimeContext={
            liveState?.downtime_active
              ? {
                  config: liveState.downtime_config ?? null,
                  currentDay: liveState.downtime_current_day ?? 1,
                  totalDays: liveState.downtime_total_days ?? 1,
                  allocations:
                    liveState.fap_allocations?.[sheetCharacter.id]?.allocations ?? [],
                }
              : null
          }
          onSaved={() => {
            void refreshLiveState();
            router.refresh();
          }}
          onClose={() => setSheetCharacter(null)}
        />
      ) : null}

      <TrapWizardModal
        open={Boolean(isGM && trapWizardCell && activeBattlemapId)}
        onClose={() => {
          setTrapWizardCell(null);
          setTrapTool(null);
        }}
        sessionId={sessionId}
        campaignId={campaignId}
        battlemapId={activeBattlemapId ?? ""}
        gridX={trapWizardCell?.gridX ?? 0}
        gridY={trapWizardCell?.gridY ?? 0}
        locationLoreContext={
          currentLocationName
            ? `Aktueller Ort: ${currentLocationName}`
            : ""
        }
        targetLevel={3}
        onCreated={(trapId) => {
          setSelectedTrapId(trapId);
          setTrapTool("select");
          void listBattlemapTraps(activeBattlemapId!, sessionId)
            .then((list) => setBattlemapTraps(list))
            .catch(() => undefined);
        }}
      />

      <TrapTriggerModal
        open={Boolean(trapTriggerEvent)}
        trap={trapTriggerEvent?.trap ?? null}
        characterName={trapTriggerEvent?.characterName ?? ""}
        characterId={trapTriggerEvent?.characterId ?? ""}
        campaignId={campaignId}
        passivePerception={trapTriggerEvent?.passivePerception ?? 10}
        isGm={isGM}
        sessionId={sessionId}
        onClose={() => setTrapTriggerEvent(null)}
        onRequestSaveRoll={(ability, dc) => {
          toast.message(
            `Rettungswurf ${ability.toUpperCase()} gegen DC ${dc} — bitte über das Würfelpanel würfeln.`,
          );
        }}
        onRequestDamageRoll={(formula, damageType) => {
          toast.message(`Schaden: ${formula} ${damageType} — bitte über das Würfelpanel würfeln.`);
        }}
      />

      <SessionEndWrapUpModal
        open={wrapUpOpen}
        onClose={() => setWrapUpOpen(false)}
        sessionId={sessionId}
        campaignId={campaignId}
        isRecordingActive={
          chronicleRecorder.phase === "recording" ||
          chronicleRecorder.phase === "paused" ||
          liveTranscriptionStatus === "recording" ||
          liveTranscriptionStatus === "paused"
        }
        onStopRecording={() => chronicleRecorder.stopRecording()}
        onComplete={(path) => {
          setWrapUpOpen(false);
          startEndTransition(() => {
            router.push(path);
          });
        }}
      />
    </>
  );
}
