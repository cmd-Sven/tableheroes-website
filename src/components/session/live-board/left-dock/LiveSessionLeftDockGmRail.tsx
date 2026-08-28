/**
 * LiveSessionLeftDockGmRail — GM left rail: atmosphere/chronist/table panels and battlemap tool anchors.
 */
"use client";

import type { ReactNode, RefObject } from "react";
import {
  Armchair,
  BookOpen,
  Bomb,
  Cloud,
  Dices,
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
} from "@/src/lib/session/battlemap-types";
import type { MapDrawTool } from "@/src/lib/session/map-draw-types";
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
  /** Battlemap oder Weltkarte aktiv — Fog/Effekte/Marker/Zeichnen */
  mapToolsActive: boolean;
  /** Fallen nur auf Battlemap */
  battlemapActive: boolean;
  toolFlyout: ToolFlyoutId | null;
  onToggleToolFlyout: (id: ToolFlyoutId) => void;
  fogTool: BattlemapFogTool;
  effectTool: BattlemapEffectTool;
  markerTool: BattlemapMarkerTool;
  trapTool: BattlemapTrapTool;
  drawTool: MapDrawTool;
  onFogToolChange?: (tool: BattlemapFogTool) => void;
  onEffectToolChange?: (tool: BattlemapEffectTool) => void;
  onMarkerToolChange?: (tool: BattlemapMarkerTool) => void;
  onTrapToolChange?: (tool: BattlemapTrapTool) => void;
  onDrawToolChange?: (tool: MapDrawTool) => void;
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
  mapToolsActive,
  battlemapActive,
  toolFlyout,
  onToggleToolFlyout,
  fogTool,
  effectTool,
  markerTool,
  trapTool,
  drawTool,
  onFogToolChange,
  onEffectToolChange,
  onMarkerToolChange,
  onTrapToolChange,
  onDrawToolChange,
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
          <span className="relative block h-7 w-7">{weatherIcon}</span>
          <TimeIcon
            className={`h-3.5 w-3.5 ${SESSION_DAY_PHASE_META[dayPhase].iconClassName}`}
          />
          <span className="font-barlow text-[8px] font-bold tabular-nums text-accent-gold">
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

      {/* Battlemap-Tools scrollbar — Helden/Würfel bleiben unten in der Leiste. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mapToolsActive && onFogToolChange ? (
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

        {mapToolsActive && onEffectToolChange ? (
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

        {mapToolsActive && onMarkerToolChange ? (
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

        {battlemapActive && onTrapToolChange ? (
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
