/**
 * LiveSessionLeftDock — Left rail orchestrator for atmosphere, chronist, table, dice, and battlemap tools.
 */
"use client";

import type { ReactNode } from "react";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
import { SESSION_DAY_PHASE_META } from "@/src/lib/session-day-phase";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
} from "@/src/lib/session/battlemap-types";
import type { MapDrawTool } from "@/src/lib/session/map-draw-types";
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";
import { LiveSessionLeftDockDiceSlot } from "./live-board/left-dock/LiveSessionLeftDockDiceSlot";
import { LiveSessionLeftDockGmRail } from "./live-board/left-dock/LiveSessionLeftDockGmRail";
import { LiveSessionLeftDockPlayerAside } from "./live-board/left-dock/LiveSessionLeftDockPlayerAside";
import { LiveSessionLeftDockSidePanel } from "./live-board/left-dock/LiveSessionLeftDockSidePanel";
import { LiveSessionLeftDockToolFlyoutPortal } from "./live-board/left-dock/LiveSessionLeftDockToolFlyoutPortal";
import { useLiveSessionLeftDockToolFlyout } from "./live-board/left-dock/useLiveSessionLeftDockToolFlyout";

type Props = {
  panel: LeftPanelId | null;
  onToggle: (id: LeftPanelId) => void;
  onClose: () => void;
  isGM: boolean;
  weatherIcon: ReactNode;
  weatherLabel: string;
  dayPhase: SessionDayPhase;
  temperatureValue: number;
  chronistRecording?: boolean;
  tableMarked?: boolean;
  battlemapActive?: boolean;
  mapToolsActive?: boolean;
  fogTool?: BattlemapFogTool;
  selectedFogShapeId?: string | null;
  onFogToolChange?: (tool: BattlemapFogTool) => void;
  onFogDelete?: () => void;
  onFogClearAll?: () => void;
  fogCount?: number;
  effectTool?: BattlemapEffectTool;
  selectedEffectTemplateId?: string | null;
  onEffectToolChange?: (tool: BattlemapEffectTool) => void;
  onEffectDelete?: () => void;
  onEffectClearAll?: () => void;
  effectCount?: number;
  markerTool?: BattlemapMarkerTool;
  selectedMarkerId?: string | null;
  onMarkerToolChange?: (tool: BattlemapMarkerTool) => void;
  onMarkerDelete?: () => void;
  onMarkerClearAll?: () => void;
  markerCount?: number;
  trapTool?: BattlemapTrapTool;
  selectedTrapId?: string | null;
  onTrapToolChange?: (tool: BattlemapTrapTool) => void;
  onTrapDelete?: () => void;
  onTrapClearAll?: () => void;
  trapCount?: number;
  drawTool?: MapDrawTool;
  drawColor?: string;
  drawWidth?: number;
  onDrawToolChange?: (tool: MapDrawTool) => void;
  onDrawColorChange?: (color: string) => void;
  onDrawWidthChange?: (width: number) => void;
  onDrawUndo?: () => void;
  onDrawClearAll?: () => void;
  drawCount?: number;
  atmosphereContent: ReactNode;
  chronistContent?: ReactNode;
  tableContent?: ReactNode;
  partyContent?: ReactNode;
  showDice?: boolean;
  diceOpen?: boolean;
  onToggleDice?: () => void;
  diceContent?: ReactNode;
  onOpenQuickRulebook?: () => void;
};

export function LiveSessionLeftDock({
  panel,
  onToggle,
  onClose,
  isGM,
  weatherIcon,
  weatherLabel,
  dayPhase,
  temperatureValue,
  chronistRecording = false,
  tableMarked = false,
  battlemapActive = false,
  mapToolsActive = false,
  fogTool = null,
  selectedFogShapeId = null,
  onFogToolChange,
  onFogDelete,
  onFogClearAll,
  fogCount = 0,
  effectTool = null,
  selectedEffectTemplateId = null,
  onEffectToolChange,
  onEffectDelete,
  onEffectClearAll,
  effectCount = 0,
  markerTool = null,
  selectedMarkerId = null,
  onMarkerToolChange,
  onMarkerDelete,
  onMarkerClearAll,
  markerCount = 0,
  trapTool = null,
  selectedTrapId = null,
  onTrapToolChange,
  onTrapDelete,
  onTrapClearAll,
  trapCount = 0,
  drawTool = null,
  drawColor = "#cab926",
  drawWidth = 4,
  onDrawToolChange,
  onDrawColorChange,
  onDrawWidthChange,
  onDrawUndo,
  onDrawClearAll,
  drawCount = 0,
  atmosphereContent,
  chronistContent,
  tableContent,
  partyContent,
  showDice = false,
  diceOpen = false,
  onToggleDice,
  diceContent,
  onOpenQuickRulebook,
}: Props) {
  const timeLabel = SESSION_DAY_PHASE_META[dayPhase].label;
  const showPanel =
    panel != null && (isGM || panel === "party");
  const {
    toolFlyout,
    flyoutPos,
    portalReady,
    anchorRefs,
    toggleToolFlyout,
  } = useLiveSessionLeftDockToolFlyout(mapToolsActive || battlemapActive);

  const panelBody =
    panel === "atmosphere"
      ? atmosphereContent
      : panel === "chronist"
        ? chronistContent
        : panel === "table"
          ? tableContent
          : panel === "party"
            ? partyContent
            : null;

  const atmosphereSummary = `${weatherLabel} · ${timeLabel} · ${temperatureValue} °C`;

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-[80] flex overflow-visible">
      {isGM ? (
        <LiveSessionLeftDockGmRail
          panel={panel}
          onToggle={onToggle}
          atmosphereSummary={atmosphereSummary}
          weatherIcon={weatherIcon}
          dayPhase={dayPhase}
          temperatureValue={temperatureValue}
          chronistRecording={chronistRecording}
          tableMarked={tableMarked}
          mapToolsActive={mapToolsActive || battlemapActive}
          battlemapActive={battlemapActive}
          toolFlyout={toolFlyout}
          onToggleToolFlyout={toggleToolFlyout}
          fogTool={fogTool}
          effectTool={effectTool}
          markerTool={markerTool}
          trapTool={trapTool}
          drawTool={drawTool}
          onFogToolChange={onFogToolChange}
          onEffectToolChange={onEffectToolChange}
          onMarkerToolChange={onMarkerToolChange}
          onTrapToolChange={onTrapToolChange}
          onDrawToolChange={onDrawToolChange}
          showDice={showDice}
          diceOpen={diceOpen}
          onToggleDice={onToggleDice}
          onOpenQuickRulebook={onOpenQuickRulebook}
          anchorRefs={anchorRefs}
        />
      ) : (
        <LiveSessionLeftDockPlayerAside
          atmosphereSummary={atmosphereSummary}
          weatherIcon={weatherIcon}
          weatherLabel={weatherLabel}
          dayPhase={dayPhase}
          temperatureValue={temperatureValue}
          showDice={showDice}
          diceOpen={diceOpen}
          onToggleDice={onToggleDice}
          partyPanelActive={panel === "party"}
          onTogglePartyPanel={() => onToggle("party")}
        />
      )}

      <LiveSessionLeftDockSidePanel
        panel={panel}
        visible={showPanel}
        onClose={onClose}
      >
        {panelBody}
      </LiveSessionLeftDockSidePanel>

      <LiveSessionLeftDockDiceSlot showDice={showDice} diceOpen={diceOpen}>
        {diceContent}
      </LiveSessionLeftDockDiceSlot>

      <LiveSessionLeftDockToolFlyoutPortal
        portalReady={portalReady}
        toolFlyout={toolFlyout}
        flyoutPos={flyoutPos}
        fogTool={fogTool}
        selectedFogShapeId={selectedFogShapeId}
        onFogToolChange={onFogToolChange}
        onFogDelete={onFogDelete}
        onFogClearAll={onFogClearAll}
        fogCount={fogCount}
        effectTool={effectTool}
        selectedEffectTemplateId={selectedEffectTemplateId}
        onEffectToolChange={onEffectToolChange}
        onEffectDelete={onEffectDelete}
        onEffectClearAll={onEffectClearAll}
        effectCount={effectCount}
        markerTool={markerTool}
        selectedMarkerId={selectedMarkerId}
        onMarkerToolChange={onMarkerToolChange}
        onMarkerDelete={onMarkerDelete}
        onMarkerClearAll={onMarkerClearAll}
        markerCount={markerCount}
        trapTool={trapTool}
        selectedTrapId={selectedTrapId}
        onTrapToolChange={onTrapToolChange}
        onTrapDelete={onTrapDelete}
        onTrapClearAll={onTrapClearAll}
        trapCount={trapCount}
        drawTool={drawTool}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawToolChange={onDrawToolChange}
        onDrawColorChange={onDrawColorChange}
        onDrawWidthChange={onDrawWidthChange}
        onDrawUndo={onDrawUndo}
        onDrawClearAll={onDrawClearAll}
        drawCount={drawCount}
      />
    </div>
  );
}
