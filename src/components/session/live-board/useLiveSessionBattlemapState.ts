/**
 * useLiveSessionBattlemapState — Battlemap/world-map React state for the live session board.
 */
"use client";

import { useMemo, useState } from "react";
import type {
  BattlemapContainerTool,
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  CharacterTokenPlacement,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapContainer,
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
  const [sessionBattlemaps, setSessionBattlemaps] = useState<SessionBattlemap[]>([]);
  const [availableWorldMaps, setAvailableWorldMaps] = useState<WorldMap[]>([]);
  const [sessionWorldMapLinks, setSessionWorldMapLinks] = useState<SessionWorldMap[]>([]);
  const [battlemapTokens, setBattlemapTokens] = useState<SessionBattlemapToken[]>([]);
  const [battlemapProps, setBattlemapProps] = useState<SessionBattlemapProp[]>([]);
  const [battlemapFogShapes, setBattlemapFogShapes] = useState<SessionBattlemapFogShape[]>([]);
  const [battlemapEffectTemplates, setBattlemapEffectTemplates] = useState<
    SessionBattlemapEffectTemplate[]
  >([]);
  const [battlemapMarkers, setBattlemapMarkers] = useState<SessionBattlemapMarker[]>([]);
  const [battlemapTraps, setBattlemapTraps] = useState<SessionBattlemapTrap[]>([]);
  const [battlemapContainers, setBattlemapContainers] = useState<SessionBattlemapContainer[]>([]);
  const [fogTool, setFogTool] = useState<BattlemapFogTool>(null);
  const [effectTool, setEffectTool] = useState<BattlemapEffectTool>(null);
  const [markerTool, setMarkerTool] = useState<BattlemapMarkerTool>(null);
  const [trapTool, setTrapTool] = useState<BattlemapTrapTool>(null);
  const [containerTool, setContainerTool] = useState<BattlemapContainerTool>(null);
  const [drawTool, setDrawTool] = useState<"draw" | null>(null);
  const [drawColor, setDrawColor] = useState("#cab926");
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawStrokeCount, setDrawStrokeCount] = useState(0);
  const [worldMapFogCount, setWorldMapFogCount] = useState(0);
  const [worldMapEffectCount, setWorldMapEffectCount] = useState(0);
  const [worldMapMarkerCount, setWorldMapMarkerCount] = useState(0);
  const [worldMapFogClearReq, setWorldMapFogClearReq] = useState(0);
  const [worldMapEffectClearReq, setWorldMapEffectClearReq] = useState(0);
  const [worldMapMarkerClearReq, setWorldMapMarkerClearReq] = useState(0);
  const [drawUndoReq, setDrawUndoReq] = useState(0);
  const [drawClearReq, setDrawClearReq] = useState(0);
  const [selectedFogShapeId, setSelectedFogShapeId] = useState<string | null>(null);
  const [selectedEffectTemplateId, setSelectedEffectTemplateId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [trapWizardCell, setTrapWizardCell] = useState<{
    gridX: number;
    gridY: number;
  } | null>(null);
  const [containerWizardCell, setContainerWizardCell] = useState<{
    gridX: number;
    gridY: number;
  } | null>(null);
  const [trapTriggerEvent, setTrapTriggerEvent] = useState<{
    trap: SessionBattlemapTrap;
    characterName: string;
    characterId: string;
    passivePerception: number;
    sourceContainerId?: string;
  } | null>(null);
  const [trapDisarmTarget, setTrapDisarmTarget] = useState<import("@/src/lib/session/battlemap-types").TrapDisarmTarget | null>(
    null,
  );
  const [tokenPlacement, setTokenPlacement] = useState<CharacterTokenPlacement | null>(null);
  const [gmTokenPlacement, setGmTokenPlacement] = useState<GmTokenPlacementDraft | null>(null);
  const [gmMoveTokenId, setGmMoveTokenId] = useState<string | null>(null);
  const [selectedBattlemapTokenId, setSelectedBattlemapTokenId] = useState<string | null>(null);
  const [selectedBattlemapPropId, setSelectedBattlemapPropId] = useState<string | null>(null);
  const [tokenRadial, setTokenRadial] = useState<{
    token: SessionBattlemapToken;
    x: number;
    y: number;
  } | null>(null);

  const activeBattlemapId = liveState?.active_battlemap_id ?? null;
  const activeWorldMapId = liveState?.active_world_map_id ?? null;
  const activeBattlemap = useMemo(
    () => sessionBattlemaps.find((m) => m.id === activeBattlemapId) ?? null,
    [sessionBattlemaps, activeBattlemapId],
  );
  const battlemapActive = Boolean(activeBattlemap);
  const worldMapActive = Boolean(activeWorldMapId);
  const mapToolsActive = battlemapActive || worldMapActive;

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
    battlemapContainers,
    setBattlemapContainers,
    fogTool,
    setFogTool,
    effectTool,
    setEffectTool,
    markerTool,
    setMarkerTool,
    trapTool,
    setTrapTool,
    containerTool,
    setContainerTool,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawStrokeCount,
    setDrawStrokeCount,
    worldMapFogCount,
    setWorldMapFogCount,
    worldMapEffectCount,
    setWorldMapEffectCount,
    worldMapMarkerCount,
    setWorldMapMarkerCount,
    worldMapFogClearReq,
    setWorldMapFogClearReq,
    worldMapEffectClearReq,
    setWorldMapEffectClearReq,
    worldMapMarkerClearReq,
    setWorldMapMarkerClearReq,
    drawUndoReq,
    setDrawUndoReq,
    drawClearReq,
    setDrawClearReq,
    selectedFogShapeId,
    setSelectedFogShapeId,
    selectedEffectTemplateId,
    setSelectedEffectTemplateId,
    selectedMarkerId,
    setSelectedMarkerId,
    selectedTrapId,
    setSelectedTrapId,
    selectedContainerId,
    setSelectedContainerId,
    trapWizardCell,
    setTrapWizardCell,
    containerWizardCell,
    setContainerWizardCell,
    trapTriggerEvent,
    setTrapTriggerEvent,
    trapDisarmTarget,
    setTrapDisarmTarget,
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
    worldMapActive,
    mapToolsActive,
  };
}

export type LiveSessionBattlemapState = ReturnType<typeof useLiveSessionBattlemapState>;
