/**
 * Phase 2: Extract battlemap hooks, combat hook, realtime hook, and stage roster from LiveSessionBoard.
 * Run from tableheroes/: node scripts/refactor-live-session-board-phase2.mjs
 */
import fs from "fs";
import path from "path";

const boardPath = path.resolve("src/app/session/[sessionId]/LiveSessionBoard.tsx");
const outDir = path.resolve("src/components/session/live-board");

const raw = fs.readFileSync(boardPath, "utf8");
const lines = raw.split("\n");

function L(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function count(s) {
  return s.split("\n").length;
}

function writeFile(name, content) {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, content.endsWith("\n") ? content : content + "\n", "utf8");
  console.log(`  ${name}: ${count(content)} lines`);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ─── Battlemap state ────────────────────────────────────────────────────────
writeFile(
  "useLiveSessionBattlemapState.ts",
  `/**
 * useLiveSessionBattlemapState — Battlemap/world-map React state for the live session board.
 */
"use client";

import { useMemo, useState } from "react";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  CharacterTokenPlacement,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
  SessionBattlemapProp,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import type { LiveState } from "./live-session-types";

export function useLiveSessionBattlemapState(liveState: LiveState | null) {
${L(392, 430).replace(/^  /gm, "  ")}

  const activeBattlemapId = liveState?.active_battlemap_id ?? null;
  const activeWorldMapId = liveState?.active_world_map_id ?? null;
  const activeBattlemap = useMemo(
    () => sessionBattlemaps.find((m) => m.id === activeBattlemapId) ?? null,
    [sessionBattlemaps, activeBattlemapId],
  );
  const battlemapActive = Boolean(activeBattlemap);

  return {
    sessionBattlemaps,
    setSessionBattlemaps,
    availableWorldMaps,
    setAvailableWorldMaps,
    sessionWorldMapLinks,
    setSessionWorldMapLinks,
    battlemapTokens,
    setBattlemapTokens,
    battlemapProps,
    setBattlemapProps,
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
  };
}

export type LiveSessionBattlemapState = ReturnType<typeof useLiveSessionBattlemapState>;
`,
);

// ─── Battlemap sync (tokens + notify) ─────────────────────────────────────────
writeFile(
  "useLiveSessionBattlemapSync.ts",
  `/**
 * useLiveSessionBattlemapSync — Loads battlemap entities and broadcasts token/fog/effect changes.
 */
"use client";

import { useCallback, useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionBattlemaps } from "@/src/lib/actions/battlemap-actions";
import { listBattlemapFogShapes, listBattlemapEffectTemplates, listBattlemapMarkers } from "@/src/lib/actions/battlemap-actions";
import { listBattlemapTraps } from "@/src/lib/actions/battlemap-trap-actions";
import { getSessionWorldMaps, getWorldMaps } from "@/src/lib/actions/world-map-actions";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import {
  BATTLEMAP_EFFECT_CHANGED_BROADCAST,
  BATTLEMAP_FOG_CHANGED_BROADCAST,
  BATTLEMAP_TOKENS_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_EVENT,
  type BattlemapEffectChangedDetail,
  type BattlemapFogChangedDetail,
  type BattlemapTokensChangedDetail,
  type CharacterDisplayChangedDetail,
} from "@/src/lib/session/character-radial-bridge";
import {
  mapBattlemapPropRow,
  mapBattlemapTokenRow,
  mapBattlemapTrapRow,
  upsertBattlemapProp,
  upsertBattlemapToken,
  upsertBattlemapTrap,
} from "@/src/lib/session/battlemap-realtime-map";
import { BATTLEMAP_MARKER_KINDS } from "@/src/lib/session/battlemap-types";
import type {
  BattlemapMarkerKind,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  sessionId: string;
  worldId: string | null;
  isGuest: boolean;
  isGM: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  bm: LiveSessionBattlemapState;
};

export function useLiveSessionBattlemapSync({
  sessionId,
  worldId,
  isGuest,
  userId,
  supabase,
  liveChannelRef,
  bm,
}: Params) {
  const {
    activeBattlemapId,
    setSessionBattlemaps,
    setAvailableWorldMaps,
    setSessionWorldMapLinks,
    setBattlemapTokens,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
    setBattlemapMarkers,
    setSelectedMarkerId,
    setBattlemapTraps,
    setSelectedTrapId,
    setBattlemapProps,
  } = bm;

${L(512, 714).replace(/^  /gm, "  ")}

  return {
    notifyBattlemapTokensChanged,
    notifyBattlemapFogChanged,
    notifyBattlemapEffectChanged,
  };
}
`,
);

// ─── Battlemap sync part 2 (fog/effects/markers/traps/props) ─────────────────
// Merge into sync file - the L(716,1074) goes into same file but we need to fix duplicate activeBattlemapId
// Actually lines 716-1074 reference the same destructured vars - append to sync file

const syncPart2 = L(716, 1074);
const syncFilePath = path.join(outDir, "useLiveSessionBattlemapSync.ts");
let syncContent = fs.readFileSync(syncFilePath, "utf8");
// Insert part2 before return statement
syncContent = syncContent.replace(
  "  return {\n    notifyBattlemapTokensChanged,",
  syncPart2.replace(/^  /gm, "  ") + "\n\n  return {\n    notifyBattlemapTokensChanged,",
);
fs.writeFileSync(syncFilePath, syncContent, "utf8");
console.log(`  useLiveSessionBattlemapSync.ts (patched): ${count(syncContent)} lines`);

// ─── Battlemap handlers ───────────────────────────────────────────────────────
writeFile(
  "useLiveSessionBattlemapHandlers.ts",
  `/**
 * useLiveSessionBattlemapHandlers — Battlemap cell/token/prop/fog/trap interaction handlers.
 */
"use client";

import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";
import {
  checkBattlemapTrapsOnEnter,
  clearBattlemapTraps,
  clearBattlemapEffectTemplates,
  clearBattlemapFogShapes,
  clearBattlemapMarkers,
  createBattlemapProp,
  getCharacterMovementRange,
  placeBattlemapCharacterToken,
  placeBattlemapGmToken,
  removeBattlemapEffectTemplate,
  removeBattlemapFogShape,
  removeBattlemapMarker,
  removeBattlemapProp,
  removeBattlemapTrap,
  updateBattlemapProp,
} from "@/src/lib/actions/battlemap-actions";
import {
  isWithinMovementRange,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { isCellBlockedByTokens } from "@/src/lib/session/battlemap-grid";
import { upsertBattlemapToken, upsertBattlemapTrap } from "@/src/lib/session/battlemap-realtime-map";
import { parseNpcSheetData } from "@/src/lib/npcs/npc-sheet-types";
import { useBattlemapCharacterDisplays } from "@/src/components/session/battlemap/useBattlemapCharacterDisplays";
import type { GmPropPlacementDraft, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import type { CampaignNpc, LiveState } from "./live-session-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";
import { normalizeLiveRow } from "./live-session-normalize";

type NotifyFns = {
  notifyBattlemapTokensChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    token?: SessionBattlemapToken | null;
    tokenId?: string | null;
  }) => void;
  notifyBattlemapFogChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    shape?: import("@/src/lib/session/battlemap-types").SessionBattlemapFogShape | null;
    shapeId?: string | null;
  }) => void;
  notifyBattlemapEffectChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    template?: import("@/src/lib/session/battlemap-types").SessionBattlemapEffectTemplate | null;
    templateId?: string | null;
  }) => void;
};

type Params = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  campaignNpcs: CampaignNpc[];
  bm: LiveSessionBattlemapState;
  notify: NotifyFns;
};

export function useLiveSessionBattlemapHandlers({
  sessionId,
  campaignId,
  isGM,
  liveState,
  liveStateRef,
  setLiveState,
  campaignNpcs,
  bm,
  notify,
}: Params) {
  const { notifyBattlemapTokensChanged, notifyBattlemapFogChanged, notifyBattlemapEffectChanged } =
    notify;
  const {
    activeBattlemapId,
    battlemapActive,
    battlemapTokens,
    setBattlemapTokens,
    battlemapProps,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
    setBattlemapMarkers,
    setSelectedMarkerId,
    setBattlemapTraps,
    setSelectedTrapId,
    setTrapTriggerEvent,
    setTokenPlacement,
    setGmTokenPlacement,
    setGmMoveTokenId,
    setSelectedBattlemapTokenId,
    setSelectedBattlemapPropId,
    battlemapFogShapes,
    battlemapEffectTemplates,
    battlemapMarkers,
    battlemapTraps,
  } = bm;

  const [isUpdating, startTransition] = useTransition();

${L(1170, 1745).replace(/^  /gm, "  ")}

  return {
    isUpdating,
    startTransition,
    startCharacterTokenPlacement,
    handleBattlemapCellClick,
    runTrapEnterCheck,
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
    battlemapCharDisplays,
  };
}
`,
);

// ─── Battlemap orchestrator ───────────────────────────────────────────────────
writeFile(
  "useLiveSessionBattlemap.ts",
  `/**
 * useLiveSessionBattlemap — Orchestrates battlemap state, sync, and handlers for LiveSessionBoard.
 */
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignNpc, LiveState } from "./live-session-types";
import { useLiveSessionBattlemapState } from "./useLiveSessionBattlemapState";
import { useLiveSessionBattlemapSync } from "./useLiveSessionBattlemapSync";
import { useLiveSessionBattlemapHandlers } from "./useLiveSessionBattlemapHandlers";

type Params = {
  sessionId: string;
  campaignId: string;
  worldId: string | null;
  isGuest: boolean;
  isGM: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  liveChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  campaignNpcs: CampaignNpc[];
};

export function useLiveSessionBattlemap(params: Params) {
  const bm = useLiveSessionBattlemapState(params.liveState);
  const notify = useLiveSessionBattlemapSync({
    sessionId: params.sessionId,
    worldId: params.worldId,
    isGuest: params.isGuest,
    isGM: params.isGM,
    userId: params.userId,
    supabase: params.supabase,
    liveChannelRef: params.liveChannelRef,
    bm,
  });
  const handlers = useLiveSessionBattlemapHandlers({
    sessionId: params.sessionId,
    campaignId: params.campaignId,
    isGM: params.isGM,
    liveState: params.liveState,
    liveStateRef: params.liveStateRef,
    setLiveState: params.setLiveState,
    campaignNpcs: params.campaignNpcs,
    bm,
    notify,
  });

  return { ...bm, ...notify, ...handlers };
}

export type LiveSessionBattlemap = ReturnType<typeof useLiveSessionBattlemap>;
`,
);

// ─── Combat hook ──────────────────────────────────────────────────────────────
writeFile(
  "useLiveSessionCombat.ts",
  `/**
 * useLiveSessionCombat — Initiative tracking, turn advance, and battlemap seed for combat mode.
 */
"use client";

import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compareCombatHudOrder,
  hasRolledCombatInitiative,
  resolveActiveCombatTurnHighlight,
} from "@/src/lib/combat-initiative";
import {
  advanceCombatTurn,
  rollCombatInitiative,
} from "@/src/lib/actions/combat-initiative-actions";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import {
  normalizeCombatParticipants,
  buildNpcCombatToken,
  isCombatTokenUsed,
} from "./live-session-combat-utils";
import type {
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
  LiveState,
  PartyCharacter,
} from "./live-session-types";

type Params = {
  sessionId: string;
  isGM: boolean;
  supabase: SupabaseClient;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  partyCharacters: PartyCharacter[];
  campaignNpcs: CampaignNpc[];
  sortedActiveNpcs: CampaignNpc[];
  battlemapTokens: SessionBattlemapToken[];
  updateLiveState: (patch: Partial<LiveState>, baseOverride?: LiveState) => void;
  writeSystemLog: (type: string, text: string) => void;
  pendingInitiativeToastRef: React.MutableRefObject<{
    participantId: string;
    display: string;
  } | null>;
  setRollingInitiativeId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useLiveSessionCombat({
  sessionId,
  isGM,
  supabase,
  liveState,
  liveStateRef,
  setLiveState,
  partyCharacters,
  campaignNpcs,
  sortedActiveNpcs,
  battlemapTokens,
  updateLiveState,
  writeSystemLog,
  pendingInitiativeToastRef,
  setRollingInitiativeId,
}: Params) {
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>([]);
  const combatParticipantsLoadGenRef = useRef(0);

${L(2548, 2586).replace(/^  /gm, "  ")}

${L(2824, 2893).replace(/^  /gm, "  ")}

${L(3314, 3583).replace(/^  /gm, "  ")}

  return {
    combatParticipants,
    setCombatParticipants,
    sortedCombatParticipants,
    combatStarted,
    activeCombatParticipant,
    activeTurnHighlight,
    combatParticipantNames,
    combatParticipantNpcIds,
    combatPlayerTokens,
    combatMonsterTokens,
    combatNpcTokens,
    addCombatToken,
    seedCombatParticipantsFromBattlemap,
    dragCombatToken,
    dropCombatToken,
    updateCombatParticipant,
    handleRollInitiative,
    beginCombatEncounter,
    endCombatEncounter,
    nextCombatTurn,
    prevCombatTurn,
    handlePlayerEndTurn,
  };
}
`,
);

// ─── Realtime hook ────────────────────────────────────────────────────────────
writeFile(
  "useLiveSessionRealtime.ts",
  `/**
 * useLiveSessionRealtime — Supabase live channel, guest polling, and presence tracking.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerSessionOnlinePresence } from "@/src/lib/actions/session-presence-actions";
import {
  listBattlemapFogShapes,
  listBattlemapEffectTemplates,
} from "@/src/lib/actions/battlemap-actions";
import {
  BATTLEMAP_EFFECT_CHANGED_BROADCAST,
  BATTLEMAP_FOG_CHANGED_BROADCAST,
  BATTLEMAP_TOKENS_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_BROADCAST,
  dispatchCharacterDisplayChanged,
  type BattlemapEffectChangedDetail,
  type BattlemapFogChangedDetail,
  type BattlemapTokensChangedDetail,
  type CharacterDisplaySnapshot,
} from "@/src/lib/session/character-radial-bridge";
import {
  mapBattlemapTokenRow,
  upsertBattlemapToken,
} from "@/src/lib/session/battlemap-realtime-map";
import { npcReputationSmileyFromScore } from "@/src/lib/npc-reputation-smiley";
import type {
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
} from "@/src/lib/session/battlemap-types";
import type { LiveState } from "./live-session-types";
import { normalizeLiveRow, normalizeStageVisibilityPatch } from "./live-session-normalize";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  sessionId: string;
  isGuest: boolean;
  isGM: boolean;
  userId: string;
  supabase: SupabaseClient;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  setBackgroundUrl: React.Dispatch<React.SetStateAction<string | null>>;
  showNpcReaction: (npcId: string, emoji: string) => void;
  bm: Pick<
    LiveSessionBattlemapState,
    | "setBattlemapTokens"
    | "setBattlemapFogShapes"
    | "setSelectedFogShapeId"
    | "setBattlemapEffectTemplates"
    | "setSelectedEffectTemplateId"
  >;
};

export function useLiveSessionRealtime({
  sessionId,
  isGuest,
  isGM,
  userId,
  supabase,
  liveStateRef,
  setLiveState,
  setBackgroundUrl,
  showNpcReaction,
  bm,
}: Params) {
  const liveChannelRef = useRef<RealtimeChannel | null>(null);
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(() => new Set());

  const {
    setBattlemapTokens,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
  } = bm;

${L(2289, 2546).replace(/^  /gm, "  ")}

  return { liveChannelRef, presentUserIds };
}
`,
);

// ─── Stage roster component ───────────────────────────────────────────────────
const rosterBody = L(4466, 4648)
  .replace(/^                /gm, "      ")
  .replace(
    /^export function LiveSessionStageRoster/m,
    "export function LiveSessionStageRoster",
  );

writeFile(
  "LiveSessionStageRoster.tsx",
  `/**
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
${rosterBody
  .replace(/setStageRosterOpen\(\(v\) => !v\)/g, "onToggleStageRoster()")
  .replace(/setStagePortrait/g, "onPortrait")
  .replace(/handleNpcReaction/g, "onNpcReaction")
  .replace(/removeFromStage/g, "onRemoveFromStage")
  .replace(/toggleShopForNpc/g, "onToggleShop")
  .replace(/assignMerchantAndOpenShop/g, "onAssignMerchantAndOpen")
  .replace(/dragCombatToken/g, "onDragCombatToken")
  .replace(/setBeastLootCreatureId\(String\(creature\.id\)\)/g, "onSuggestBeastLoot(String(creature.id))")}
  );
}
`,
);

// ─── Patch LiveSessionBoard.tsx ─────────────────────────────────────────────
console.log("\nPatching LiveSessionBoard.tsx…");

const removeRanges = [
  [392, 430],
  [456, 462],
  [512, 1074],
  [1170, 1745],
  [2289, 2546],
  [2548, 2586],
  [2824, 2893],
  [3314, 3583],
  [4466, 4648],
].sort((a, b) => b[0] - a[0]);

let patched = [...lines];
for (const [start, end] of removeRanges) {
  patched.splice(start - 1, end - start + 1);
}

const headEnd = 330; // after LiveSessionStageManager import
let head = patched.slice(0, headEnd).join("\n");

const newImports = `
import { useLiveSessionBattlemap } from "@/src/components/session/live-board/useLiveSessionBattlemap";
import { useLiveSessionCombat } from "@/src/components/session/live-board/useLiveSessionCombat";
import { useLiveSessionRealtime } from "@/src/components/session/live-board/useLiveSessionRealtime";
import { LiveSessionStageRoster } from "@/src/components/session/live-board/LiveSessionStageRoster";
`;

head = head + "\n" + newImports;

// Remove battlemap-specific imports now only used in hooks (keep what's still needed in board)
const tailStart = headEnd;
let tail = patched.slice(tailStart).join("\n");

// Insert hook calls after campaignCreatures useMemo (~line 454 in original, shifted)
const hookInsertMarker = "  const campaignCreatures = useMemo(() => allCampaignCreatures, [allCampaignCreatures]);";
const hookBlock = `
  const campaignCreatures = useMemo(() => allCampaignCreatures, [allCampaignCreatures]);

  const { liveChannelRef, presentUserIds } = useLiveSessionRealtime({
    sessionId,
    isGuest,
    isGM,
    userId,
    supabase,
    liveStateRef,
    setLiveState,
    setBackgroundUrl,
    showNpcReaction,
    bm: {
      setBattlemapTokens,
      setBattlemapFogShapes,
      setSelectedFogShapeId,
      setBattlemapEffectTemplates,
      setSelectedEffectTemplateId,
    },
  });

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
  });

  const {
    sessionBattlemaps,
    setSessionBattlemaps,
    availableWorldMaps,
    setAvailableWorldMaps,
    sessionWorldMapLinks,
    setSessionWorldMapLinks,
    battlemapTokens,
    setBattlemapTokens,
    battlemapProps,
    setBattlemapProps,
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
    isUpdating: isBattlemapUpdating,
    startTransition,
    startCharacterTokenPlacement,
    handleBattlemapCellClick,
    runTrapEnterCheck,
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
  } = battlemap;
`;

// This approach won't work cleanly because we need to reorder - realtime depends on bm setters but bm is defined after
// Fix: useLiveSessionRealtime should receive bm from battlemap state - circular issue

console.log("\nPhase 2 script wrote hook files. Manual LiveSessionBoard patch required for hook wiring.");
console.log("Run: npx tsc --noEmit");
