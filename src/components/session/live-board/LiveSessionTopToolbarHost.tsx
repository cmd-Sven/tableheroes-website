/**
 * LiveSessionTopToolbarHost — Top toolbar with location, fate, combat, and session controls.
 */
"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { TranscriptionStatus } from "@/src/lib/session-chronicle/constants";
import { LiveSessionTopToolbar } from "@/src/components/session/LiveSessionTopToolbar";
import { ChronicleRecordingTopBar } from "@/src/components/session/ChronicleRecordingTopBar";
import { FateCoinsPool } from "@/src/components/session/FateCoinsPool";
import type { TopToolbarPanelId } from "@/src/components/session/live-session-side-types";
import { LiveSessionLocationToolbarContent } from "./LiveSessionLocationToolbarContent";
import type { ActiveQuest, LiveState, LoreLocationOption } from "./live-session-types";

export type LiveSessionTopToolbarHostProps = {
  isGM: boolean;
  forcePlayerView: boolean;
  actualUserIsGM: boolean;
  topPanel: TopToolbarPanelId | null;
  toggleTopPanel: (id: TopToolbarPanelId) => void;
  closeTopPanel: () => void;
  liveState: LiveState | null;
  sessionLocationLoreReadable: boolean;
  campaignId: string;
  loreLocationOptions: LoreLocationOption[];
  locationDraft: string;
  setLocationDraft: (value: string) => void;
  changeSessionLocation: (locationId: string) => void;
  updateLiveState: (patch: Partial<LiveState>) => void;
  fateGmSettingsOpen: boolean;
  setFateGmSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  sessionId: string;
  seedCombatParticipantsFromBattlemap: () => void;
  endCombatEncounter: () => void;
  writeSystemLog: (type: string, text: string) => void;
  setNpcSearchModalOpen: (open: boolean) => void;
  setBeastSearchModalOpen: (open: boolean) => void;
  setQuickRulebookModalOpen: (open: boolean) => void;
  stageDeckHandOpen: boolean;
  setStageDeckHandOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  inHandNpcsCount: number;
  inHandFactionsCount: number;
  inHandScenesCount: number;
  setIsStageManagerOpen: (open: boolean) => void;
  stagePrepHref: string;
  guestJoinUrl: string | null;
  activeQuests: ActiveQuest[];
  showQuests: boolean;
  setShowQuests: (open: boolean | ((prev: boolean) => boolean)) => void;
  isPrepMode: boolean;
  setWrapUpOpen: (open: boolean) => void;
  isEnding: boolean;
  router: AppRouterInstance;
  isLiveStateInitializing: boolean;
  isGuest: boolean;
  guestDisplayName: string | null | undefined;
  guestSlotIndex: number | null | undefined;
  sessionStatus: string;
  chronistTableMode: boolean;
  topBarTranscriptionStatus: TranscriptionStatus | null;
  showDnd5eSheet: boolean;
};

export function LiveSessionTopToolbarHost({
  isGM,
  forcePlayerView,
  actualUserIsGM,
  topPanel,
  toggleTopPanel,
  closeTopPanel,
  liveState,
  sessionLocationLoreReadable,
  campaignId,
  loreLocationOptions,
  locationDraft,
  setLocationDraft,
  changeSessionLocation,
  updateLiveState,
  fateGmSettingsOpen,
  setFateGmSettingsOpen,
  sessionId,
  seedCombatParticipantsFromBattlemap,
  endCombatEncounter,
  writeSystemLog,
  setNpcSearchModalOpen,
  setBeastSearchModalOpen,
  setQuickRulebookModalOpen,
  stageDeckHandOpen,
  setStageDeckHandOpen,
  inHandNpcsCount,
  inHandFactionsCount,
  inHandScenesCount,
  setIsStageManagerOpen,
  stagePrepHref,
  guestJoinUrl,
  activeQuests,
  showQuests,
  setShowQuests,
  isPrepMode,
  setWrapUpOpen,
  isEnding,
  router,
  isLiveStateInitializing,
  isGuest,
  guestDisplayName,
  guestSlotIndex,
  sessionStatus,
  chronistTableMode,
  topBarTranscriptionStatus,
  showDnd5eSheet,
}: LiveSessionTopToolbarHostProps) {
  return (
    <LiveSessionTopToolbar
      isGM={isGM && !forcePlayerView}
      panel={topPanel}
      onToggle={toggleTopPanel}
      onClose={closeTopPanel}
      locationLabel={liveState?.current_location || "Unbekannter Ort"}
      locationLoreHref={
        sessionLocationLoreReadable && liveState?.current_location_lore_id
          ? `/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`
          : null
      }
      locationContent={
        <LiveSessionLocationToolbarContent
          liveState={liveState}
          loreLocationOptions={loreLocationOptions}
          locationDraft={locationDraft}
          setLocationDraft={setLocationDraft}
          changeSessionLocation={changeSessionLocation}
          updateLiveState={updateLiveState}
          campaignId={campaignId}
        />
      }
      fateCount={(liveState?.fate_coins ?? []).length}
      fateContent={
        <FateCoinsPool
          sessionId={sessionId}
          coins={liveState?.fate_coins ?? []}
          destroyedCount={liveState?.destroyed_fate_coins ?? 0}
          isGM
          showControls
          compact
          inlineHeader
          collapsibleGmSettings
          gmSettingsOpen={fateGmSettingsOpen}
          onGmSettingsToggle={() => setFateGmSettingsOpen((v) => !v)}
        />
      }
      playerFateHud={
        <FateCoinsPool
          sessionId={sessionId}
          coins={liveState?.fate_coins ?? []}
          destroyedCount={liveState?.destroyed_fate_coins ?? 0}
          variant="hud"
        />
      }
      combatActive={!!liveState?.is_combat_mode}
      onToggleCombat={() => {
        const starting = !liveState?.is_combat_mode;
        if (starting) {
          updateLiveState({
            is_combat_mode: true,
            combat_started: false,
            current_turn_index: 0,
            combat_round: 1,
          });
          writeSystemLog(
            "combat_start",
            "Der Spielleiter leitet einen Kampf ein — Initiative würfeln!",
          );
          void seedCombatParticipantsFromBattlemap();
        } else {
          endCombatEncounter();
        }
      }}
      onOpenNpcs={() => setNpcSearchModalOpen(true)}
      onOpenBeasts={() => setBeastSearchModalOpen(true)}
      onOpenQuickRulebook={
        showDnd5eSheet ? () => setQuickRulebookModalOpen(true) : undefined
      }
      stageRosterOpen={stageDeckHandOpen}
      stageRosterCount={inHandNpcsCount + inHandFactionsCount + inHandScenesCount}
      onToggleStageRoster={() => setStageDeckHandOpen((v) => !v)}
      onOpenStageLive={() => setIsStageManagerOpen(true)}
      stagePrepHref={stagePrepHref}
      loreHref={`/dashboard/campaigns/${campaignId}?tab=lore`}
      onOpenPlayerMonitor={
        actualUserIsGM && !forcePlayerView
          ? () => window.open(`${window.location.pathname}?mode=player`, "_blank")
          : undefined
      }
      onOpenGuestLink={
        actualUserIsGM && !forcePlayerView && guestJoinUrl
          ? () => {
              void navigator.clipboard?.writeText(guestJoinUrl);
              window.open(guestJoinUrl, "_blank", "noopener,noreferrer");
            }
          : undefined
      }
      questCount={activeQuests.length}
      questsOpen={showQuests}
      onToggleQuests={
        activeQuests.length > 0 ? () => setShowQuests((prev) => !prev) : undefined
      }
      onEndSession={isGM && !isPrepMode ? () => setWrapUpOpen(true) : undefined}
      sessionEnding={isEnding}
      onExit={() =>
        router.push(
          isPrepMode
            ? `/dashboard/campaigns/${campaignId}?tab=sessions`
            : "/dashboard",
        )
      }
      exitLabel={isPrepMode ? "Zurück zur Kampagne" : "Session verlassen"}
      isPrepMode={isPrepMode}
      initializing={isLiveStateInitializing}
      statusLabel={
        isGuest
          ? `Gast · ${guestDisplayName ?? "Zuschauer"}`
          : forcePlayerView
            ? "Spieler-Monitor"
            : !(isGM && !forcePlayerView)
              ? "Live Session"
              : null
      }
      statusHint={
        isGuest ? `Platzhalter-Slot ${guestSlotIndex ?? "—"} — nur Anschauen` : null
      }
      playerExtra={
        !isGM && sessionStatus === "Live" && chronistTableMode ? (
          <ChronicleRecordingTopBar
            role="player"
            transcriptionStatus={topBarTranscriptionStatus}
          />
        ) : null
      }
    />
  );
}
