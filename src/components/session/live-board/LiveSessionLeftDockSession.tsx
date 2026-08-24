/**
 * LiveSessionLeftDockSession — Left rail wrapper with dice, atmosphere, chronist, and battlemap tools.
 */
"use client";

import type { Dispatch, MutableRefObject, ReactNode, SetStateAction, TransitionStartFunction } from "react";
import { toast } from "sonner";
import { LiveSessionLeftDock } from "@/src/components/session/LiveSessionLeftDock";
import { LiveSessionDicePanel } from "@/src/components/session/LiveSessionDicePanel";
import { LiveSessionAtmospherePanel } from "./LiveSessionAtmospherePanel";
import { LiveSessionLeftDockChronistSlot } from "./left-dock/LiveSessionLeftDockChronistSlot";
import { LiveSessionLeftDockTableSlot } from "./left-dock/LiveSessionLeftDockTableSlot";
import { LiveSessionLeftDockPartySlot } from "./left-dock/LiveSessionLeftDockPartySlot";
import { WeatherPngIcon } from "./WeatherPngIcon";
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";
import type { TopToolbarPanelId } from "@/src/components/session/live-session-side-types";
import type { PartyTrayMode } from "./LiveSessionPartyTray";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  CharacterTokenPlacement,
  GmTokenPlacementDraft,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";
import type { UseSessionChronicleRecorderReturn } from "@/src/hooks/useSessionChronicleRecorder";
import type { MicMonitorApi } from "@/src/hooks/useMicMonitor";
import type { LiveState, PartyCharacter } from "./live-session-types";
import type { getWeatherVisual } from "./live-session-weather";

export type LiveSessionLeftDockSessionProps = {
  leftPanel: LeftPanelId | null;
  toggleLeftPanel: (id: LeftPanelId) => void;
  closeLeftPanel: () => void;
  isGM: boolean;
  forcePlayerView: boolean;
  isGuest: boolean;
  isDiceOpen: boolean;
  setIsDiceOpen: Dispatch<SetStateAction<boolean>>;
  setLeftPanel: Dispatch<SetStateAction<LeftPanelId | null>>;
  setTopPanel: Dispatch<SetStateAction<TopToolbarPanelId | null>>;
  partyTrayMode: PartyTrayMode;
  setPartyTrayMode: Dispatch<SetStateAction<PartyTrayMode>>;
  sessionId: string;
  campaignId: string;
  activityCharacter: { id: string; name: string } | null | undefined;
  userId: string;
  isPrepMode: boolean;
  partyCharacters: PartyCharacter[];
  currentPlayerCharacter: PartyCharacter | null | undefined;
  prepTestCharacterId: string | null;
  setPrepTestCharacterId: Dispatch<SetStateAction<string | null>>;
  setLiveState: Dispatch<SetStateAction<LiveState | null>>;
  liveStateRef: MutableRefObject<LiveState | null>;
  weatherVisual: ReturnType<typeof getWeatherVisual>;
  dayPhase: SessionDayPhase;
  temperatureValue: number;
  chronicleRecorder: UseSessionChronicleRecorderReturn;
  physicallyPresentIdSet: Set<string>;
  dummyPlayerCountLive: number;
  battlemapActive: boolean;
  mapToolsActive: boolean;
  worldMapActive: boolean;
  fogTool: BattlemapFogTool;
  setFogTool: Dispatch<SetStateAction<BattlemapFogTool>>;
  selectedFogShapeId: string | null;
  setSelectedFogShapeId: Dispatch<SetStateAction<string | null>>;
  effectTool: BattlemapEffectTool;
  setEffectTool: Dispatch<SetStateAction<BattlemapEffectTool>>;
  selectedEffectTemplateId: string | null;
  setSelectedEffectTemplateId: Dispatch<SetStateAction<string | null>>;
  markerTool: BattlemapMarkerTool;
  setMarkerTool: Dispatch<SetStateAction<BattlemapMarkerTool>>;
  selectedMarkerId: string | null;
  setSelectedMarkerId: Dispatch<SetStateAction<string | null>>;
  trapTool: BattlemapTrapTool;
  setTrapTool: Dispatch<SetStateAction<BattlemapTrapTool>>;
  selectedTrapId: string | null;
  setSelectedTrapId: Dispatch<SetStateAction<string | null>>;
  drawTool: "draw" | null;
  setDrawTool: Dispatch<SetStateAction<"draw" | null>>;
  drawColor: string;
  setDrawColor: Dispatch<SetStateAction<string>>;
  drawWidth: number;
  setDrawWidth: Dispatch<SetStateAction<number>>;
  drawStrokeCount: number;
  onDrawUndo: () => void;
  onDrawClearAll: () => void;
  worldMapFogCount: number;
  worldMapEffectCount: number;
  worldMapMarkerCount: number;
  onWorldMapFogClearAll: () => void;
  onWorldMapEffectClearAll: () => void;
  onWorldMapMarkerClearAll: () => void;
  setTokenPlacement: Dispatch<SetStateAction<CharacterTokenPlacement | null>>;
  setGmTokenPlacement: Dispatch<SetStateAction<GmTokenPlacementDraft | null>>;
  setGmMoveTokenId: Dispatch<SetStateAction<string | null>>;
  setSelectedBattlemapTokenId: Dispatch<SetStateAction<string | null>>;
  setSelectedBattlemapPropId: Dispatch<SetStateAction<string | null>>;
  battlemapMarkers: SessionBattlemapMarker[];
  handleMarkerDelete: (markerId: string) => void;
  handleMarkerClearAll: () => void;
  battlemapTraps: SessionBattlemapTrap[];
  handleTrapDelete: (trapId: string) => void;
  handleTrapClearAll: () => void;
  battlemapEffectTemplates: SessionBattlemapEffectTemplate[];
  handleEffectTemplateDelete: (templateId: string) => void;
  handleEffectClearAll: () => void;
  battlemapFogShapes: SessionBattlemapFogShape[];
  handleFogShapeDelete: (shapeId: string) => void;
  handleFogClearAll: () => void;
  liveState: LiveState | null;
  temperatureDraft: number;
  setTemperatureDraft: Dispatch<SetStateAction<number>>;
  commitTemperatureValue: (value?: number) => void;
  updateLiveState: (patch: Partial<LiveState>) => void;
  writeSystemLog: (type: string, text: string) => void;
  sessionStatus: string;
  chronistTableMode: boolean;
  worldId: string | null | undefined;
  activeTranscriptionMode: import("@/src/lib/session-chronicle/constants").TranscriptionMode | null;
  setActiveTranscriptionMode: (mode: import("@/src/lib/session-chronicle/constants").TranscriptionMode) => void;
  prepMicTest: MicMonitorApi;
  chronistPanelOpen: boolean;
  setChronistPanelOpen: Dispatch<SetStateAction<boolean>>;
  chronistStartFlowRef: MutableRefObject<(() => void) | null>;
  chronistStopFlowRef: MutableRefObject<(() => void) | null>;
  chronistSettingsFlowRef: MutableRefObject<(() => void) | null>;
  allCampaignNpcs: import("./live-session-types").CampaignNpc[];
  isUpdating: boolean;
};

export function LiveSessionLeftDockSession(p: LiveSessionLeftDockSessionProps) {
  const {
    leftPanel,
    toggleLeftPanel,
    closeLeftPanel,
    isGM,
    forcePlayerView,
    isGuest,
    isDiceOpen,
    setIsDiceOpen,
    setLeftPanel,
    setTopPanel,
    partyTrayMode,
    setPartyTrayMode,
    sessionId,
    campaignId,
    activityCharacter,
    userId,
    isPrepMode,
    partyCharacters,
    currentPlayerCharacter,
    prepTestCharacterId,
    setPrepTestCharacterId,
    setLiveState,
    liveStateRef,
    weatherVisual,
    dayPhase,
    temperatureValue,
    chronicleRecorder,
    physicallyPresentIdSet,
    dummyPlayerCountLive,
    battlemapActive,
    mapToolsActive,
    worldMapActive,
    fogTool,
    setFogTool,
    selectedFogShapeId,
    setSelectedFogShapeId,
    effectTool,
    setEffectTool,
    selectedEffectTemplateId,
    setSelectedEffectTemplateId,
    markerTool,
    setMarkerTool,
    selectedMarkerId,
    setSelectedMarkerId,
    trapTool,
    setTrapTool,
    selectedTrapId,
    setSelectedTrapId,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawStrokeCount,
    onDrawUndo,
    onDrawClearAll,
    worldMapFogCount,
    worldMapEffectCount,
    worldMapMarkerCount,
    onWorldMapFogClearAll,
    onWorldMapEffectClearAll,
    onWorldMapMarkerClearAll,
    setTokenPlacement,
    setGmTokenPlacement,
    setGmMoveTokenId,
    setSelectedBattlemapTokenId,
    setSelectedBattlemapPropId,
    battlemapMarkers,
    handleMarkerDelete,
    handleMarkerClearAll,
    battlemapTraps,
    handleTrapDelete,
    handleTrapClearAll,
    battlemapEffectTemplates,
    handleEffectTemplateDelete,
    handleEffectClearAll,
    battlemapFogShapes,
    handleFogShapeDelete,
    handleFogClearAll,
    liveState,
    temperatureDraft,
    setTemperatureDraft,
    commitTemperatureValue,
    updateLiveState,
    writeSystemLog,
    sessionStatus,
    chronistTableMode,
    worldId,
    activeTranscriptionMode,
    setActiveTranscriptionMode,
    prepMicTest,
    chronistPanelOpen,
    setChronistPanelOpen,
    chronistStartFlowRef,
    chronistStopFlowRef,
    chronistSettingsFlowRef,
    allCampaignNpcs,
    isUpdating,
  } = p;

  return (
<LiveSessionLeftDock
        panel={leftPanel}
        onToggle={toggleLeftPanel}
        onClose={closeLeftPanel}
        isGM={isGM && !forcePlayerView}
        showDice={!isGuest}
        diceOpen={isDiceOpen}
        onToggleDice={() => {
          setIsDiceOpen((v) => !v);
          setLeftPanel(null);
          setTopPanel(null);
        }}
        diceContent={
          !isGuest ? (
            <LiveSessionDicePanel
              embedded
              sessionId={sessionId}
              campaignId={campaignId}
              open={isDiceOpen}
              onClose={() => setIsDiceOpen(false)}
              currentCharacter={activityCharacter ?? null}
              userId={userId}
              isGM={isGM && !forcePlayerView}
              isPrepMode={isPrepMode}
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
            />
          ) : null
        }
        weatherIcon={
          <WeatherPngIcon option={weatherVisual} sizeClassName="h-full w-full" />
        }
        weatherLabel={weatherVisual.label}
        dayPhase={dayPhase}
        temperatureValue={temperatureValue}
        chronistRecording={chronicleRecorder.phase === "recording"}
        tableMarked={physicallyPresentIdSet.size > 0 || dummyPlayerCountLive > 0}
        battlemapActive={battlemapActive}
        mapToolsActive={mapToolsActive}
        fogTool={fogTool}
        selectedFogShapeId={selectedFogShapeId}
        onFogToolChange={(tool) => {
          setFogTool(tool);
          if (tool) {
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setDrawTool(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedFogShapeId(null);
        }}
        effectTool={effectTool}
        selectedEffectTemplateId={selectedEffectTemplateId}
        onEffectToolChange={(tool) => {
          setEffectTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setDrawTool(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedEffectTemplateId(null);
        }}
        markerTool={markerTool}
        selectedMarkerId={selectedMarkerId}
        onMarkerToolChange={(tool) => {
          setMarkerTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setDrawTool(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedMarkerId(null);
        }}
        onMarkerDelete={() => {
          if (worldMapActive) {
            toast.message("Spezialeffekt auf der Weltkarte anklicken, um zu löschen.");
            return;
          }
          const fallbackId =
            selectedMarkerId ??
            (battlemapMarkers.length > 0
              ? battlemapMarkers[battlemapMarkers.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Marker auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleMarkerDelete(fallbackId);
        }}
        onMarkerClearAll={
          worldMapActive ? onWorldMapMarkerClearAll : handleMarkerClearAll
        }
        markerCount={
          worldMapActive ? worldMapMarkerCount : battlemapMarkers.length
        }
        trapTool={trapTool}
        selectedTrapId={selectedTrapId}
        onTrapToolChange={(tool) => {
          setTrapTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setDrawTool(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedTrapId(null);
        }}
        onTrapDelete={() => {
          const fallbackId =
            selectedTrapId ??
            (battlemapTraps.length > 0
              ? battlemapTraps[battlemapTraps.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Falle auf der Karte auswählen, dann löschen.");
            return;
          }
          handleTrapDelete(fallbackId);
        }}
        onTrapClearAll={handleTrapClearAll}
        trapCount={battlemapTraps.length}
        drawTool={drawTool}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawToolChange={(tool) => {
          setDrawTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
        }}
        onDrawColorChange={setDrawColor}
        onDrawWidthChange={setDrawWidth}
        onDrawUndo={onDrawUndo}
        onDrawClearAll={onDrawClearAll}
        drawCount={drawStrokeCount}
        onEffectDelete={() => {
          if (worldMapActive) {
            toast.message("Effekt-Schablone auf der Weltkarte anklicken, um zu löschen.");
            return;
          }
          const fallbackId =
            selectedEffectTemplateId ??
            (battlemapEffectTemplates.length > 0
              ? battlemapEffectTemplates[battlemapEffectTemplates.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Effekt-Schablone auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleEffectTemplateDelete(fallbackId);
        }}
        onEffectClearAll={
          worldMapActive ? onWorldMapEffectClearAll : handleEffectClearAll
        }
        effectCount={
          worldMapActive ? worldMapEffectCount : battlemapEffectTemplates.length
        }
        onFogDelete={() => {
          if (worldMapActive) {
            toast.message("Fog-Fläche auf der Weltkarte anklicken, um zu löschen.");
            return;
          }
          const fallbackShapeId =
            selectedFogShapeId ??
            (battlemapFogShapes.length > 0
              ? battlemapFogShapes[battlemapFogShapes.length - 1]?.id
              : null);
          if (!fallbackShapeId) {
            toast.message("Fog-Fläche auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleFogShapeDelete(fallbackShapeId);
        }}
        onFogClearAll={worldMapActive ? onWorldMapFogClearAll : handleFogClearAll}
        fogCount={worldMapActive ? worldMapFogCount : battlemapFogShapes.length}
        atmosphereContent={
          <LiveSessionAtmospherePanel
            liveState={liveState}
            weatherVisual={weatherVisual}
            dayPhase={dayPhase}
            temperatureValue={temperatureValue}
            temperatureDraft={temperatureDraft}
            onTemperatureDraftChange={setTemperatureDraft}
            onCommitTemperature={commitTemperatureValue}
            onUpdateLiveState={updateLiveState}
            onWeatherSystemLog={(message) => writeSystemLog("weather_change", message)}
          />
        }
        chronistContent={
          <LiveSessionLeftDockChronistSlot
            isPrepMode={isPrepMode}
            sessionStatus={sessionStatus}
            chronistTableMode={chronistTableMode}
            sessionId={sessionId}
            campaignId={campaignId}
            worldId={worldId}
            activeTranscriptionMode={activeTranscriptionMode}
            setActiveTranscriptionMode={setActiveTranscriptionMode}
            prepMicTest={prepMicTest}
            chronicleRecorder={chronicleRecorder}
            chronistPanelOpen={chronistPanelOpen}
            setChronistPanelOpen={setChronistPanelOpen}
            chronistStartFlowRef={chronistStartFlowRef}
            chronistStopFlowRef={chronistStopFlowRef}
            chronistSettingsFlowRef={chronistSettingsFlowRef}
            npcNames={allCampaignNpcs.map((n) => ({
              id: n.id,
              name: n.name,
            }))}
          />
        }
        tableContent={
          <LiveSessionLeftDockTableSlot
            partyCharacters={partyCharacters}
            physicallyPresentIdSet={physicallyPresentIdSet}
            liveStateRef={liveStateRef}
            updateLiveState={updateLiveState}
            dummyPlayerCountLive={dummyPlayerCountLive}
            isUpdating={isUpdating}
          />
        }
        partyContent={
          <LiveSessionLeftDockPartySlot
            partyTrayMode={partyTrayMode}
            onPartyTrayModeChange={setPartyTrayMode}
            isGM={isGM && !forcePlayerView}
            userId={userId}
            partyCharacters={partyCharacters}
          />
        }
      />
  );
}
