/**
 * LiveSessionSidePanelsHost — Right-side panels and GM hand-raise queue/banner.
 */
"use client";

import type { Dispatch, MutableRefObject, SetStateAction, TransitionStartFunction } from "react";
import { toast } from "sonner";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { dismissSessionHand } from "@/src/lib/actions/session-hand-raise-actions";
import { getSessionWorldMaps } from "@/src/lib/actions/world-map-actions";
import {
  LiveSessionHandRaiseQueue,
  LiveSessionUrgentHandBanner,
} from "@/src/components/session/LiveSessionHandRaiseUI";
import { LiveSessionSidePanels } from "@/src/components/session/LiveSessionSidePanels";
import {
  creaturePlacementDraft,
  npcPlacementDraft,
} from "@/src/components/session/LiveSessionTokensPanel";
import type { MainSidePanelId } from "@/src/components/session/live-session-side-types";
import type { SessionBattlemap } from "@/src/lib/session/battlemap-types";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";
import { normalizeLiveRow } from "./live-session-normalize";
import type { CampaignCreature, CampaignNpc, LiveState, PartyCharacter } from "./live-session-types";

export type LiveSessionSidePanelsHostProps = {
  isGuest: boolean;
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  forcePlayerView: boolean;
  isPrepMode: boolean;
  mainSidePanel: MainSidePanelId | null;
  toggleMainSidePanel: (id: MainSidePanelId) => void;
  closeMainSidePanel: () => void;
  handRaises: SessionHandRaise[];
  liveState: LiveState | null;
  systemLogs: NonNullable<LiveState["system_logs"]>;
  activityCharacter: { id: string; name: string } | null | undefined;
  partyCharacters: PartyCharacter[];
  currentPlayerCharacter: PartyCharacter | null | undefined;
  prepTestCharacterId: string | null;
  setPrepTestCharacterId: Dispatch<SetStateAction<string | null>>;
  setLiveState: Dispatch<SetStateAction<LiveState | null>>;
  liveStateRef: MutableRefObject<LiveState | null>;
  userId: string;
  playerColorByCharacterId: Record<string, string>;
  refreshLiveState: () => Promise<void>;
  canEditJournal: boolean;
  allSceneMedia: StageSceneMediaItem[];
  placeOnStage: (kind: "npc" | "faction" | "scene" | "creature", id: string) => void;
  removeFromStage: (kind: "npc" | "faction" | "scene" | "creature", id: string) => void;
  sessionBattlemaps: SessionBattlemap[];
  activeBattlemapId: string | null;
  setSelectedBattlemapTokenId: Dispatch<SetStateAction<string | null>>;
  setSelectedBattlemapPropId: Dispatch<SetStateAction<string | null>>;
  availableWorldMaps: WorldMap[];
  sessionWorldMapLinks: SessionWorldMap[];
  setSessionWorldMapLinks: Dispatch<SetStateAction<SessionWorldMap[]>>;
  battlemapActive: boolean;
  displayPartyCharacters: PartyCharacter[];
  battlemapTrayNpcs: CampaignNpc[];
  battlemapTrayCreatures: CampaignCreature[];
  startCharacterTokenPlacement: (characterId: string, characterName: string) => void;
  setGmTokenPlacement: Dispatch<SetStateAction<import("@/src/lib/session/battlemap-types").GmTokenPlacementDraft | null>>;
  setGmMoveTokenId: Dispatch<SetStateAction<string | null>>;
  setTokenPlacement: Dispatch<SetStateAction<import("@/src/lib/session/battlemap-types").CharacterTokenPlacement | null>>;
  router: AppRouterInstance;
  updateLiveState: (patch: Partial<LiveState>) => void;
  writeSystemLog: (type: string, text: string) => void;
  playerColorByUserId: Record<string, string>;
  urgentHandRaise: SessionHandRaise | null;
  isUpdating: boolean;
  startTransition: TransitionStartFunction;
};

export function LiveSessionSidePanelsHost(p: LiveSessionSidePanelsHostProps) {
  const {
    isGuest,
    sessionId,
    campaignId,
    isGM,
    forcePlayerView,
    isPrepMode,
    mainSidePanel,
    toggleMainSidePanel,
    closeMainSidePanel,
    handRaises,
    liveState,
    systemLogs,
    activityCharacter,
    partyCharacters,
    currentPlayerCharacter,
    prepTestCharacterId,
    setPrepTestCharacterId,
    setLiveState,
    liveStateRef,
    userId,
    playerColorByCharacterId,
    refreshLiveState,
    canEditJournal,
    allSceneMedia,
    placeOnStage,
    removeFromStage,
    sessionBattlemaps,
    activeBattlemapId,
    setSelectedBattlemapTokenId,
    setSelectedBattlemapPropId,
    availableWorldMaps,
    sessionWorldMapLinks,
    setSessionWorldMapLinks,
    battlemapActive,
    displayPartyCharacters,
    battlemapTrayNpcs,
    battlemapTrayCreatures,
    startCharacterTokenPlacement,
    setGmTokenPlacement,
    setGmMoveTokenId,
    setTokenPlacement,
    router,
    updateLiveState,
    writeSystemLog,
    playerColorByUserId,
    urgentHandRaise,
    isUpdating,
    startTransition,
  } = p;

  return (
    <>
{!isGuest ? (
        <LiveSessionSidePanels
          sessionId={sessionId}
          campaignId={campaignId}
          isGM={isGM && !forcePlayerView}
          isPrepMode={isPrepMode}
          mainPanel={mainSidePanel}
          onToggleMain={toggleMainSidePanel}
          onCloseMain={closeMainSidePanel}
          handRaises={handRaises}
          downtimeActive={!!liveState?.downtime_active}
          lootActive={Boolean(liveState?.current_loot_id)}
          logs={systemLogs as import("@/src/lib/actions/session-activity-actions").SessionActivityEntry[]}
          currentCharacter={activityCharacter ?? null}
          prepTestCharacters={
            isPrepMode && isGM && !forcePlayerView && !currentPlayerCharacter
              ? partyCharacters
                  .filter((pc) => !pc.isSessionDummy)
                  .map((pc) => ({ id: pc.id, name: pc.name }))
              : undefined
          }
          prepTestCharacterId={prepTestCharacterId}
          onPrepTestCharacterChange={setPrepTestCharacterId}
          onActivityPosted={(entry) => {
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
          }}
          onActivityCleared={() => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = { ...prev, system_logs: [] };
              liveStateRef.current = next;
              return next;
            });
          }}
          onActivityDeleted={(entryId) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const logs = Array.isArray(prev.system_logs) ? prev.system_logs : [];
              const next = {
                ...prev,
                system_logs: logs.filter((l) => l.id !== entryId),
              };
              liveStateRef.current = next;
              return next;
            });
          }}
          currentUserId={userId}
          playerColorByCharacterId={playerColorByCharacterId}
          onHandRaisesChanged={(next) => {
            if (next === "refresh") {
              void refreshLiveState();
              return;
            }
            setLiveState((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                hand_raises: next,
              };
              liveStateRef.current = updated;
              return updated;
            });
          }}
          systemLogs={systemLogs as import("@/src/lib/actions/session-activity-actions").SessionActivityEntry[]}
          journalText={liveState?.journal_text ?? null}
          canEditJournal={canEditJournal}
          scribeId={liveState?.scribe_id ?? null}
          onJournalChange={(text) => updateLiveState({ journal_text: text })}
          scenes={allSceneMedia}
          activeSceneId={liveState?.active_scene_media_id ?? null}
          onShowScene={(id) => placeOnStage("scene", id)}
          onRemoveScene={
            isGM && !forcePlayerView
              ? (id) => removeFromStage("scene", id)
              : undefined
          }
          battlemaps={sessionBattlemaps}
          activeBattlemapId={activeBattlemapId}
          battlemapMovementPaused={liveState?.battlemap_movement_paused === true}
          onBattlemapActiveChange={(id) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({ ...prev, active_battlemap_id: id });
              liveStateRef.current = next;
              return next;
            });
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }}
          onBattlemapMovementPausedChange={(paused) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({
                ...prev,
                battlemap_movement_paused: paused,
              });
              liveStateRef.current = next;
              return next;
            });
          }}
          availableWorldMaps={availableWorldMaps}
          sessionWorldMaps={sessionWorldMapLinks}
          activeWorldMapId={liveState?.active_world_map_id ?? null}
          onWorldMapActiveChange={(id) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({
                ...prev,
                active_world_map_id: id,
              });
              liveStateRef.current = next;
              return next;
            });
            void getSessionWorldMaps(sessionId)
              .then(setSessionWorldMapLinks)
              .catch(() => undefined);
          }}
          battlemapActive={battlemapActive}
          tokenPlayers={displayPartyCharacters
            .filter((pc) => !pc.isSessionDummy)
            .map((pc) => ({
              id: pc.id,
              name: pc.name,
              imageUrl: pc.avatar_url,
              tokenUrl: null,
              canPlace:
                isGM ||
                (!!currentPlayerCharacter && currentPlayerCharacter.id === pc.id),
            }))}
          tokenNpcs={battlemapTrayNpcs.map((n) => ({
            id: String(n.id),
            name: n.name,
            title: n.title ?? null,
            imageUrl: n.image_url,
            tokenUrl: n.token_url ?? null,
            sizeCategory: n.token_size_category ?? "medium",
          }))}
          tokenCreatures={battlemapTrayCreatures.map((c) => ({
            id: String(c.id),
            name: c.name,
            creatureType: c.creature_type,
            imageUrl: c.image_url,
          }))}
          onStartPlayerTokenPlacement={(player) => {
            if (!battlemapActive) {
              toast.error("Zuerst eine Battlemap aktivieren.");
              return;
            }
            startCharacterTokenPlacement(player.id, player.name);
            closeMainSidePanel();
          }}
          onStartNpcTokenPlacement={(npc) => {
            if (!isGM || !battlemapActive) return;
            setGmTokenPlacement(npcPlacementDraft(npc));
            setGmMoveTokenId(null);
            setTokenPlacement(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
            closeMainSidePanel();
          }}
          onStartCreatureTokenPlacement={(creature) => {
            if (!isGM || !battlemapActive) return;
            setGmTokenPlacement(creaturePlacementDraft(creature));
            setGmMoveTokenId(null);
            setTokenPlacement(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
            closeMainSidePanel();
          }}
          partyCharacters={partyCharacters.map((pc) => ({
            id: pc.id,
            name: pc.name,
            rations_count: pc.rations_count ?? 0,
            starvation_days: pc.starvation_days ?? 0,
          }))}
          downtimeCurrentDay={liveState?.downtime_current_day ?? 1}
          downtimeTotalDays={liveState?.downtime_total_days ?? 1}
          fapAllocations={liveState?.fap_allocations ?? {}}
          onTravelReload={async () => {
            await refreshLiveState();
            router.refresh();
          }}
          activeLootId={liveState?.current_loot_id ?? null}
          onClearStageLoot={() => {
            updateLiveState({ current_loot_id: null, loot_hide_npcs: false });
            writeSystemLog("loot_clear", "Die Beute-Truhe verschwindet von der Bühne.");
          }}
          onLootPublished={async () => {
            await refreshLiveState();
            router.refresh();
          }}
        />
      ) : null}

      {isGM && !forcePlayerView ? (
        <>
          <LiveSessionHandRaiseQueue
            raises={handRaises}
            playerColorByCharacterId={playerColorByCharacterId}
            playerColorByUserId={playerColorByUserId}
            pending={isUpdating}
            onDismiss={(raiseId) => {
              startTransition(async () => {
                try {
                  await dismissSessionHand(sessionId, raiseId);
                  setLiveState((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      hand_raises: (prev.hand_raises ?? []).filter((r) => r.id !== raiseId),
                    };
                    liveStateRef.current = next;
                    return next;
                  });
                } catch (err) {
                  console.error("[LiveSessionBoard] dismissSessionHand", err);
                  alert(err instanceof Error ? err.message : "Meldung konnte nicht entfernt werden.");
                }
              });
            }}
          />
          <LiveSessionUrgentHandBanner
            raise={urgentHandRaise}
            playerColorByCharacterId={playerColorByCharacterId}
            playerColorByUserId={playerColorByUserId}
            pending={isUpdating}
            onDismiss={(raiseId) => {
              startTransition(async () => {
                try {
                  await dismissSessionHand(sessionId, raiseId);
                  setLiveState((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      hand_raises: (prev.hand_raises ?? []).filter((r) => r.id !== raiseId),
                    };
                    liveStateRef.current = next;
                    return next;
                  });
                } catch (err) {
                  console.error("[LiveSessionBoard] dismissSessionHand urgent", err);
                  alert(err instanceof Error ? err.message : "Meldung konnte nicht entfernt werden.");
                }
              });
            }}
          />
        </>
      ) : null}
    </>
  );
}
