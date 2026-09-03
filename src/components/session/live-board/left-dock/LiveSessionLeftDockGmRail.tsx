/**
 * LiveSessionLeftDockGmRail — GM left rail: atmosphere/chronist/table panels and map tool anchors.
 */
"use client";

import type { ReactNode, RefObject } from "react";
import {
  Armchair,
  BookOpen,
  Bomb,
  Box,
  Cloud,
  Dices,
  MapPin,
  Mic,
  Pencil,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
import { SESSION_DAY_PHASE_META } from "@/src/lib/session-day-phase";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  BattlemapContainerTool,
} from "@/src/lib/session/battlemap-types";
import type { MapDrawTool } from "@/src/lib/session/map-draw-types";
import type { WorldMapPoiTool } from "@/src/lib/world-maps/types";
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";
import { LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS } from "@/src/components/session/live-session-side-types";
import type { ToolFlyoutId } from "./left-dock-constants";
import type { LeftDockToolAnchorRefs } from "./useLiveSessionLeftDockToolFlyout";
import { RailButton } from "./left-dock-ui";

type Props = {
  panel: LeftPanelId | null;
  onToggle: (id: LeftPanelId) => void;
  atmosphereSummary: string;
  weatherIcon: ReactNode;
  dayPhase: SessionDayPhase;
  temperatureValue: number;
  chronistRecording: boolean;
  tableMarked: boolean;
  /** Battlemap aktiv und keine Weltkarte darüber — Fog/Effekte/Marker/Fallen/Behälter */
  battlemapToolsActive: boolean;
  /** Weltkarte aktiv — Zeichnen + POI */
  worldMapActive: boolean;
  /** Battlemap oder Weltkarte — Zeichnen */
  mapToolsActive: boolean;
  toolFlyout: ToolFlyoutId | null;
  onToggleToolFlyout: (id: ToolFlyoutId) => void;
  fogTool: BattlemapFogTool;
  effectTool: BattlemapEffectTool;
  markerTool: BattlemapMarkerTool;
  trapTool: BattlemapTrapTool;
  containerTool: BattlemapContainerTool;
  drawTool: MapDrawTool;
  poiTool: WorldMapPoiTool;
  onFogToolChange?: (tool: BattlemapFogTool) => void;
  onEffectToolChange?: (tool: BattlemapEffectTool) => void;
  onMarkerToolChange?: (tool: BattlemapMarkerTool) => void;
  onTrapToolChange?: (tool: BattlemapTrapTool) => void;
  onContainerToolChange?: (tool: BattlemapContainerTool) => void;
  onDrawToolChange?: (tool: MapDrawTool) => void;
  onPoiToolChange?: (tool: WorldMapPoiTool) => void;
  showDice: boolean;
  diceOpen: boolean;
  onToggleDice?: () => void;
  onOpenQuickRulebook?: () => void;
  anchorRefs: LeftDockToolAnchorRefs;
};

export function LiveSessionLeftDockGmRail({
  panel,
  onToggle,
  atmosphereSummary,
  weatherIcon,
  dayPhase,
  temperatureValue,
  chronistRecording,
  tableMarked,
  battlemapToolsActive,
  worldMapActive,
  mapToolsActive,
  toolFlyout,
  onToggleToolFlyout,
  fogTool,
  effectTool,
  markerTool,
  trapTool,
  containerTool,
  drawTool,
  poiTool,
  onFogToolChange,
  onEffectToolChange,
  onMarkerToolChange,
  onTrapToolChange,
  onContainerToolChange,
  onDrawToolChange,
  onPoiToolChange,
  showDice,
  diceOpen,
  onToggleDice,
  onOpenQuickRulebook,
  anchorRefs,
}: Props) {
  const TimeIcon = SESSION_DAY_PHASE_META[dayPhase].Icon;

  return (
    <nav
      className={`pointer-events-auto ${LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS} relative z-[81] flex h-dvh min-h-0 flex-col overflow-hidden border-r border-hero-border/60 bg-background-dark/95 shadow-2xl backdrop-blur-md`}
      aria-label="Tisch-Atmosphäre"
    >
      <RailButton
        label={`Atmosphäre: ${atmosphereSummary}`}
        active={panel === "atmosphere"}
        onClick={() => onToggle("atmosphere")}
        className="h-auto min-h-11 py-1.5"
      >
        <span className="flex flex-col items-center gap-0.5">
          <span
            className={`relative block ${
              worldMapActive ? "h-9 w-9" : "h-7 w-7"
            }`}
          >
            {weatherIcon}
          </span>
          <TimeIcon
            className={`${worldMapActive ? "h-4 w-4" : "h-3.5 w-3.5"} ${SESSION_DAY_PHASE_META[dayPhase].iconClassName}`}
          />
          <span
            className={`font-barlow font-bold tabular-nums text-accent-gold ${
              worldMapActive ? "text-[11px]" : "text-[8px]"
            }`}
          >
            {temperatureValue}°
          </span>
        </span>
      </RailButton>
      <RailButton
        label="Chronist"
        active={panel === "chronist"}
        onClick={() => onToggle("chronist")}
        badgeDot={chronistRecording}
        className="h-11"
      >
        <Mic className="h-5 w-5" />
      </RailButton>
      <RailButton
        label="Tisch"
        active={panel === "table"}
        onClick={() => onToggle("table")}
        badgeDot={tableMarked}
        className="h-11"
      >
        <Armchair className="h-5 w-5" />
      </RailButton>

      {/* Map-Tools scrollbar — Helden/Würfel bleiben unten in der Leiste. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {battlemapToolsActive && onFogToolChange ? (
          <div ref={anchorRefs.fog as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Fog of War"
              active={toolFlyout === "fog" || fogTool != null}
              hideLabel={toolFlyout === "fog"}
              onClick={() => onToggleToolFlyout("fog")}
              className="h-11"
            >
              <Cloud className="h-5 w-5" />
            </RailButton>
          </div>
        ) : null}

        {battlemapToolsActive && onEffectToolChange ? (
          <div ref={anchorRefs.effect as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Effekt-Schablonen"
              active={toolFlyout === "effect" || effectTool != null}
              hideLabel={toolFlyout === "effect"}
              onClick={() => onToggleToolFlyout("effect")}
              className="h-11"
            >
              <Sparkles className="h-5 w-5 text-red-300" />
            </RailButton>
          </div>
        ) : null}

        {battlemapToolsActive && onMarkerToolChange ? (
          <div ref={anchorRefs.marker as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Spezialeffekte"
              active={toolFlyout === "marker" || markerTool != null}
              hideLabel={toolFlyout === "marker"}
              onClick={() => onToggleToolFlyout("marker")}
              className="h-11"
            >
              <Wand2 className="h-5 w-5 text-accent-gold" />
            </RailButton>
          </div>
        ) : null}

        {mapToolsActive && onDrawToolChange ? (
          <div ref={anchorRefs.draw as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Zeichnen"
              active={toolFlyout === "draw" || drawTool != null}
              hideLabel={toolFlyout === "draw"}
              onClick={() => onToggleToolFlyout("draw")}
              className="h-11"
            >
              <Pencil className="h-5 w-5 text-accent-gold" />
            </RailButton>
          </div>
        ) : null}

        {worldMapActive && onPoiToolChange ? (
          <div ref={anchorRefs.poi as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Points of Interest"
              active={toolFlyout === "poi" || poiTool != null}
              hideLabel={toolFlyout === "poi"}
              onClick={() => onToggleToolFlyout("poi")}
              className="h-11"
            >
              <MapPin className="h-5 w-5 text-accent-gold" />
            </RailButton>
          </div>
        ) : null}

        {battlemapToolsActive && onTrapToolChange ? (
          <div ref={anchorRefs.trap as RefObject<HTMLDivElement>} className="relative shrink-0">
            <div className="mx-2 my-1 h-px bg-hero-border/40" />
            <RailButton
              label="Fallen (Trap-Wizard)"
              active={toolFlyout === "trap" || trapTool != null}
              hideLabel={toolFlyout === "trap"}
              onClick={() => onToggleToolFlyout("trap")}
              className="h-11"
            >
              <Bomb className="h-5 w-5 text-red-300" />
            </RailButton>
          </div>
        ) : null}

        {battlemapToolsActive && onContainerToolChange ? (
          <div ref={anchorRefs.container as RefObject<HTMLDivElement>} className="relative shrink-0">
            <RailButton
              label="Behälter (Container-Wizard)"
              active={toolFlyout === "container" || containerTool != null}
              hideLabel={toolFlyout === "container"}
              onClick={() => onToggleToolFlyout("container")}
              className="h-11"
            >
              <Box className="h-5 w-5 text-amber-200" />
            </RailButton>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex shrink-0 flex-col">
        <div className="mx-2 my-1 h-px bg-hero-border/40" />
        <RailButton
          label="Helden: Avatar-Leiste & Webcam"
          active={panel === "party"}
          onClick={() => onToggle("party")}
          className="h-11"
        >
          <Users className="h-5 w-5" />
        </RailButton>
        {showDice && onToggleDice ? (
          <RailButton
            label="Würfel"
            active={diceOpen}
            onClick={onToggleDice}
            className="h-11"
          >
            <Dices className="h-5 w-5" />
          </RailButton>
        ) : null}
        {onOpenQuickRulebook ? (
          <RailButton
            label="Schnell-Regelwerk (D&D 2024)"
            active={false}
            onClick={onOpenQuickRulebook}
            className="h-11"
          >
            <BookOpen className="h-5 w-5 text-accent-gold" />
          </RailButton>
        ) : null}
      </div>
    </nav>
  );
}
