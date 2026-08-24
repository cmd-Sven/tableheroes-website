/**
 * LiveSessionStageRoster — NPC, creature, and faction cards on the live stage roster.
 */
"use client";

import { AnimatePresence } from "framer-motion";
import { Flag } from "lucide-react";
import { StageRosterCollapse } from "@/src/components/session/StageRosterCollapse";
import { StageBeastCard } from "@/src/components/session/StageBeastCard";
import {
  setCreatureDefeated,
  setCreatureDiscovery,
  type CampaignCreatureStateRow,
} from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import type { BeastDiscoveryKey } from "@/src/lib/beast-check-results";
import {
  isCreatureActiveCombatTurn,
  isNpcActiveCombatTurn,
  type ActiveCombatTurnHighlight,
} from "@/src/lib/combat-initiative";
import type { LiveCampaignShopOption } from "@/src/app/session/[sessionId]/StageNpcShopControls";
import { StageNpcCard } from "./StageNpcCard";
import { StageFactionCard } from "./StageFactionCard";
import type {
  ActiveNpcReaction,
  CampaignCreature,
  CampaignFaction,
  CampaignNpc,
  LiveState,
  StagePortraitModal,
} from "./live-session-types";
import type { CombatTokenPayload } from "./live-session-types";
import type { DragEvent } from "react";

type Props = {
  stageRosterOpen: boolean;
  onToggleStageRoster: () => void;
  liveState: LiveState | null;
  sortedActiveNpcs: CampaignNpc[];
  activeCreatures: CampaignCreature[];
  activeFactions: CampaignFaction[];
  stageRosterPreview: Array<{ id: string; name: string; imageUrl: string | null }>;
  npcReactions: ActiveNpcReaction[];
  isGM: boolean;
  isUpdating: boolean;
  combatParticipantNpcIds: Set<string>;
  activeTurnHighlight: ActiveCombatTurnHighlight | null;
  npcReputationScores: Record<string, number>;
  onPortrait: (modal: StagePortraitModal) => void;
  onNpcReaction: (npcId: string, amount: number) => void;
  onRemoveFromStage: (kind: "npc" | "faction" | "creature", id: string) => void;
  onToggleShop: (npc: CampaignNpc) => void;
  onAssignMerchantAndOpen: (npc: CampaignNpc, shopId: string) => void;
  onDragCombatToken: (e: DragEvent<HTMLElement>, token: CombatTokenPayload) => void;
  campaignShops: LiveCampaignShopOption[];
  isShopBusy: boolean;
  activeFactionIds: Set<string>;
  creatureStates: Record<string, CampaignCreatureStateRow>;
  campaignId: string;
  sessionId: string;
  setCreatureStates: React.Dispatch<
    React.SetStateAction<Record<string, CampaignCreatureStateRow>>
  >;
  onSuggestBeastLoot: (creatureId: string) => void;
};

export function LiveSessionStageRoster({
  stageRosterOpen,
  onToggleStageRoster,
  liveState,
  sortedActiveNpcs,
  activeCreatures,
  activeFactions,
  stageRosterPreview,
  npcReactions,
  isGM,
  isUpdating,
  combatParticipantNpcIds,
  activeTurnHighlight,
  npcReputationScores,
  onPortrait,
  onNpcReaction,
  onRemoveFromStage,
  onToggleShop,
  onAssignMerchantAndOpen,
  onDragCombatToken,
  campaignShops,
  isShopBusy,
  activeFactionIds,
  creatureStates,
  campaignId,
  sessionId,
  setCreatureStates,
  onSuggestBeastLoot,
}: Props) {
  return (
      <StageRosterCollapse
        open={stageRosterOpen}
        onToggle={() => onToggleStageRoster()}
        npcCount={liveState?.loot_hide_npcs ? 0 : sortedActiveNpcs.length}
        creatureCount={activeCreatures.length}
        factionCount={activeFactions.length}
        previewItems={stageRosterPreview}
      >
      {sortedActiveNpcs.length > 0 && !liveState?.loot_hide_npcs ? (
        <div
          className={
            sortedActiveNpcs.length === 1
              ? "flex justify-center"
              : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          }
        >
          <AnimatePresence mode="popLayout">
            {sortedActiveNpcs.map((npc) => {
              const reactionsForNpc = npcReactions.filter(
                (reaction) => reaction.npcId === String(npc.id),
              );
              return (
                <StageNpcCard
                  key={npc.id}
                  npc={npc}
                  isSingle={sortedActiveNpcs.length === 1}
                  isGM={isGM}
                  isCombatMode={!!liveState?.is_combat_mode}
                  isInInitiative={combatParticipantNpcIds.has(String(npc.id))}
                  isActiveTurn={isNpcActiveCombatTurn(String(npc.id), activeTurnHighlight)}
                  isUpdating={isUpdating}
                  reputationScore={npcReputationScores[String(npc.id)] ?? 0}
                  reactions={reactionsForNpc}
                  onPortrait={onPortrait}
                  onReaction={onNpcReaction}
                  onRemove={(npcId) => onRemoveFromStage("npc", npcId)}
                  onToggleShop={onToggleShop}
                  onAssignMerchantAndOpen={onAssignMerchantAndOpen}
                  onDragCombatToken={onDragCombatToken}
                  campaignShops={campaignShops}
                  isShopOpen={
                    liveState?.active_shop_id === npc.shop_id &&
                    liveState?.active_merchant_npc_id === String(npc.id)
                  }
                  isShopBusy={isShopBusy}
                  linkedToStageFaction={
                    Boolean(npc.faction_id) && activeFactionIds.has(String(npc.faction_id))
                  }
                />
              );
            })}
          </AnimatePresence>
        </div>
      ) : null}

      {activeCreatures.length > 0 ? (
        <div
          className={
            activeCreatures.length === 1
              ? "flex justify-center mb-6"
              : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mb-6"
          }
        >
          <AnimatePresence mode="popLayout">
            {activeCreatures.map((creature) => {
              const state = creatureStates[String(creature.id)];
              const discoveries = state?.discoveries ?? {};
              return (
                <StageBeastCard
                  key={creature.id}
                  creature={creature}
                  isSingle={activeCreatures.length === 1}
                  isGM={isGM}
                  isActiveTurn={isCreatureActiveCombatTurn(creature.name, activeTurnHighlight)}
                  isUpdating={isUpdating}
                  discoveries={isGM ? discoveries : discoveries}
                  creatureState={state}
                  onPortrait={onPortrait}
                  onRemove={(creatureId) => onRemoveFromStage("creature", creatureId)}
                  onToggleDiscovery={
                    isGM
                      ? (key: BeastDiscoveryKey, value: boolean) => {
                          void (async () => {
                            try {
                              await setCreatureDiscovery(
                                campaignId,
                                String(creature.id),
                                key,
                                value,
                              );
                              setCreatureStates((prev) => ({
                                ...prev,
                                [String(creature.id)]: {
                                  creature_id: String(creature.id),
                                  discoveries: {
                                    ...(prev[String(creature.id)]?.discoveries ?? {}),
                                    [key]: value,
                                  },
                                  is_defeated:
                                    prev[String(creature.id)]?.is_defeated ?? false,
                                  defeated_at:
                                    prev[String(creature.id)]?.defeated_at ?? null,
                                },
                              }));
                            } catch (err) {
                              console.error(err);
                            }
                          })();
                        }
                      : undefined
                  }
                  onMarkDefeated={
                    isGM
                      ? () => {
                          void (async () => {
                            try {
                              await setCreatureDefeated(
                                campaignId,
                                String(creature.id),
                                sessionId,
                                true,
                              );
                              setCreatureStates((prev) => ({
                                ...prev,
                                [String(creature.id)]: {
                                  creature_id: String(creature.id),
                                  discoveries: prev[String(creature.id)]?.discoveries ?? {},
                                  is_defeated: true,
                                  defeated_at: new Date().toISOString(),
                                },
                              }));
                            } catch (err) {
                              console.error(err);
                            }
                          })();
                        }
                      : undefined
                  }
                  onSuggestLoot={
                    isGM && state?.is_defeated
                      ? () => onSuggestBeastLoot(String(creature.id))
                      : undefined
                  }
                />
              );
            })}
          </AnimatePresence>
        </div>
      ) : null}

      {activeFactions.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-black/35 p-4 backdrop-blur-sm">
          <h3 className="font-barlow font-bold text-xs uppercase text-gray-300 mb-3 flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-accent-gold" />
            Aktive Fraktionen
          </h3>
          <div
            className={
              activeFactions.length === 1
                ? "flex justify-center"
                : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            <AnimatePresence mode="popLayout">
              {activeFactions.map((fac) => {
                return (
                  <StageFactionCard
                    key={fac.id}
                    faction={fac}
                    isSingle={activeFactions.length === 1}
                    isGM={isGM}
                    isCombatMode={!!liveState?.is_combat_mode}
                    campaignId={campaignId}
                    onPortrait={onPortrait}
                    onRemove={(factionId) => onRemoveFromStage("faction", factionId)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
      </StageRosterCollapse>
  );
}
