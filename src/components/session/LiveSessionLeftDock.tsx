"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  Armchair,
  Circle,
  Cloud,
  Dices,
  Mic,
  MousePointer2,
  Sparkles,
  Square,
  Trash2,
  Triangle,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
import { SESSION_DAY_PHASE_META } from "@/src/lib/session-day-phase";
import type { BattlemapEffectTool, BattlemapFogTool } from "@/src/lib/session/battlemap-types";
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";
import {
  LIVE_SESSION_PLAYER_ATMOSPHERE_WIDTH_CLASS,
  LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS,
  LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS,
} from "@/src/components/session/live-session-side-types";

const PANEL_SLIDE = {
  initial: { opacity: 0, x: -48 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -48 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const FLYOUT_SLIDE = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

const PANEL_META: Record<LeftPanelId, { title: string; subtitle: string }> = {
  atmosphere: { title: "Atmosphäre", subtitle: "Wetter, Tageszeit, Temperatur" },
  chronist: { title: "Chronist", subtitle: "Aufnahme & Inbox" },
  table: { title: "Tisch", subtitle: "Anwesenheit & Platzhalter" },
};

type ToolFlyoutId = "fog" | "effect";

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
  fogTool?: BattlemapFogTool;
  selectedFogShapeId?: string | null;
  onFogToolChange?: (tool: BattlemapFogTool) => void;
  onFogDelete?: () => void;
  effectTool?: BattlemapEffectTool;
  selectedEffectTemplateId?: string | null;
  onEffectToolChange?: (tool: BattlemapEffectTool) => void;
  onEffectDelete?: () => void;
  atmosphereContent: ReactNode;
  chronistContent?: ReactNode;
  tableContent?: ReactNode;
  showDice?: boolean;
  diceOpen?: boolean;
  onToggleDice?: () => void;
  diceContent?: ReactNode;
};

function RailButton({
  label,
  active,
  onClick,
  badgeDot,
  className = "",
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badgeDot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`group relative grid w-11 place-items-center border transition-colors ${
        active
          ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
          : "border-hero-border/50 bg-background-card/95 text-gray-300 hover:border-hero-vibrant/70 hover:bg-emerald-950 hover:text-hero-vibrant"
      } ${className}`}
    >
      <span
        className="pointer-events-none absolute left-full ml-2 z-20 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      >
        {label}
      </span>
      {children}
      {badgeDot ? (
        <span
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-hero-vibrant ring-2 ring-background-card"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

function ToolFlyoutButton({
  label,
  active,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "effect" | "danger";
  children: ReactNode;
}) {
  const toneActive =
    tone === "effect"
      ? "border-red-400 bg-red-950/70 text-red-200"
      : tone === "danger"
        ? "border-red-600 bg-red-950/80 text-red-100"
        : "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant";
  const toneIdle =
    tone === "effect"
      ? "border-red-900/60 bg-background-card/95 text-red-300 hover:border-red-400/70 hover:bg-red-950/50"
      : tone === "danger"
        ? "border-red-900/50 bg-background-card/95 text-red-300/70 hover:border-red-500 hover:text-red-200"
        : "border-hero-border/50 bg-background-card/95 text-gray-300 hover:border-hero-vibrant/70 hover:text-hero-vibrant";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-10 w-10 place-items-center rounded border transition-colors ${
        active ? toneActive : toneIdle
      }`}
    >
      {children}
    </button>
  );
}

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
  fogTool = null,
  selectedFogShapeId = null,
  onFogToolChange,
  onFogDelete,
  effectTool = null,
  selectedEffectTemplateId = null,
  onEffectToolChange,
  onEffectDelete,
  atmosphereContent,
  chronistContent,
  tableContent,
  showDice = false,
  diceOpen = false,
  onToggleDice,
  diceContent,
}: Props) {
  const TimeIcon = SESSION_DAY_PHASE_META[dayPhase].Icon;
  const timeLabel = SESSION_DAY_PHASE_META[dayPhase].label;
  const showPanel = isGM && panel != null;
  const meta = panel ? PANEL_META[panel] : null;
  const [toolFlyout, setToolFlyout] = useState<ToolFlyoutId | null>(null);

  useEffect(() => {
    if (!battlemapActive) setToolFlyout(null);
  }, [battlemapActive]);

  const panelBody =
    panel === "atmosphere"
      ? atmosphereContent
      : panel === "chronist"
        ? chronistContent
        : panel === "table"
          ? tableContent
          : null;

  const atmosphereSummary = `${weatherLabel} · ${timeLabel} · ${temperatureValue} °C`;

  function toggleToolFlyout(id: ToolFlyoutId) {
    setToolFlyout((prev) => (prev === id ? null : id));
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-[80] flex">
      {isGM ? (
        <nav
          className={`pointer-events-auto ${LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS} flex h-dvh flex-col overflow-hidden border-r border-hero-border/60 bg-background-dark/95 shadow-2xl backdrop-blur-md`}
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

          {battlemapActive && onFogToolChange ? (
            <div className="relative">
              <div className="mx-2 my-1 h-px bg-hero-border/40" />
              <RailButton
                label="Fog of War"
                active={toolFlyout === "fog" || fogTool != null}
                onClick={() => toggleToolFlyout("fog")}
                className="h-11"
              >
                <Cloud className="h-5 w-5" />
              </RailButton>
              <AnimatePresence>
                {toolFlyout === "fog" ? (
                  <motion.div
                    key="fog-flyout"
                    initial={FLYOUT_SLIDE.initial}
                    animate={FLYOUT_SLIDE.animate}
                    exit={FLYOUT_SLIDE.exit}
                    transition={FLYOUT_SLIDE.transition}
                    className="pointer-events-auto absolute left-full top-2 z-[90] ml-2 flex items-center gap-1.5 rounded-xl border border-amber-900/60 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
                    role="toolbar"
                    aria-label="Fog-of-War-Werkzeuge"
                  >
                    <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
                      Nebel
                    </span>
                    <ToolFlyoutButton
                      label="Nebel: Auswählen"
                      active={fogTool === "select"}
                      onClick={() =>
                        onFogToolChange(fogTool === "select" ? null : "select")
                      }
                    >
                      <MousePointer2 className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Nebel: Rechteck"
                      active={fogTool === "rect"}
                      onClick={() =>
                        onFogToolChange(fogTool === "rect" ? null : "rect")
                      }
                    >
                      <Square className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Nebel: Kreis"
                      active={fogTool === "circle"}
                      onClick={() =>
                        onFogToolChange(fogTool === "circle" ? null : "circle")
                      }
                    >
                      <Circle className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Nebel: Fläche löschen (Entf)"
                      active={false}
                      tone="danger"
                      onClick={() => onFogDelete?.()}
                    >
                      <Trash2
                        className={`h-4 w-4 ${selectedFogShapeId ? "text-red-300" : "opacity-40"}`}
                      />
                    </ToolFlyoutButton>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {battlemapActive && onEffectToolChange ? (
            <div className="relative">
              <div className="mx-2 my-1 h-px bg-hero-border/40" />
              <RailButton
                label="Effekt-Schablonen"
                active={toolFlyout === "effect" || effectTool != null}
                onClick={() => toggleToolFlyout("effect")}
                className="h-11"
              >
                <Sparkles className="h-5 w-5 text-red-300" />
              </RailButton>
              <AnimatePresence>
                {toolFlyout === "effect" ? (
                  <motion.div
                    key="effect-flyout"
                    initial={FLYOUT_SLIDE.initial}
                    animate={FLYOUT_SLIDE.animate}
                    exit={FLYOUT_SLIDE.exit}
                    transition={FLYOUT_SLIDE.transition}
                    className="pointer-events-auto absolute left-full top-2 z-[90] ml-2 flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
                    role="toolbar"
                    aria-label="Effekt-Schablonen-Werkzeuge"
                  >
                    <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-red-300/80">
                      Effekt
                    </span>
                    <ToolFlyoutButton
                      label="Effekt: Auswählen"
                      active={effectTool === "select"}
                      tone="effect"
                      onClick={() =>
                        onEffectToolChange(effectTool === "select" ? null : "select")
                      }
                    >
                      <MousePointer2 className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Effekt: Rechteck"
                      active={effectTool === "rect"}
                      tone="effect"
                      onClick={() =>
                        onEffectToolChange(effectTool === "rect" ? null : "rect")
                      }
                    >
                      <Square className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Effekt: Kreis"
                      active={effectTool === "circle"}
                      tone="effect"
                      onClick={() =>
                        onEffectToolChange(effectTool === "circle" ? null : "circle")
                      }
                    >
                      <Circle className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Effekt: Kegel"
                      active={effectTool === "cone"}
                      tone="effect"
                      onClick={() =>
                        onEffectToolChange(effectTool === "cone" ? null : "cone")
                      }
                    >
                      <Triangle className="h-4 w-4" />
                    </ToolFlyoutButton>
                    <ToolFlyoutButton
                      label="Effekt: Schablone löschen (Entf)"
                      active={false}
                      tone="danger"
                      onClick={() => onEffectDelete?.()}
                    >
                      <Trash2
                        className={`h-4 w-4 ${selectedEffectTemplateId ? "text-red-300" : "opacity-40"}`}
                      />
                    </ToolFlyoutButton>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {showDice && onToggleDice ? (
            <RailButton
              label="Würfel"
              active={diceOpen}
              onClick={onToggleDice}
              className="mt-auto h-11"
            >
              <Dices className="h-5 w-5" />
            </RailButton>
          ) : null}
        </nav>
      ) : (
        <aside
          className={`pointer-events-auto ${LIVE_SESSION_PLAYER_ATMOSPHERE_WIDTH_CLASS} flex h-dvh flex-col items-center gap-4 overflow-hidden border-r border-hero-border/60 bg-background-dark/95 px-1.5 py-4 shadow-2xl backdrop-blur-md`}
          aria-label={atmosphereSummary}
        >
          <div className="flex w-full flex-col items-center gap-1">
            <span className="relative block h-14 w-14 drop-shadow-[0_0_16px_rgba(202,185,38,0.35)]">
              {weatherIcon}
            </span>
            <span className="text-center font-barlow text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-100">
              {weatherLabel}
            </span>
          </div>
          <div className="flex w-full flex-col items-center gap-1">
            <TimeIcon
              className={`h-10 w-10 drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] ${SESSION_DAY_PHASE_META[dayPhase].iconClassName}`}
              strokeWidth={1.7}
              aria-hidden
            />
            <span className="text-center font-barlow text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-200">
              {timeLabel}
            </span>
          </div>
          <div className="flex w-full flex-col items-center rounded-md border border-accent-gold/40 bg-accent-gold/10 px-1 py-2">
            <span className="font-barlow text-[8px] font-bold uppercase tracking-wide text-gray-400">
              Temp
            </span>
            <span className="font-barlow text-2xl font-extrabold leading-none tabular-nums text-accent-gold">
              {temperatureValue}°
            </span>
            <span className="font-barlow text-[8px] font-bold uppercase text-accent-gold/80">
              C
            </span>
          </div>
          {showDice && onToggleDice ? (
            <button
              type="button"
              onClick={onToggleDice}
              title="Würfel"
              aria-label="Würfel"
              aria-pressed={diceOpen}
              className={`mt-auto mb-2 grid h-11 w-11 place-items-center border ${
                diceOpen
                  ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  : "border-hero-border/50 bg-background-card/95 text-gray-300"
              }`}
            >
              <Dices className="h-5 w-5" />
            </button>
          ) : null}
        </aside>
      )}

      <AnimatePresence>
        {showPanel && meta ? (
          <motion.div
            key={`left-${panel}`}
            initial={PANEL_SLIDE.initial}
            animate={PANEL_SLIDE.animate}
            exit={PANEL_SLIDE.exit}
            transition={PANEL_SLIDE.transition}
            className={`pointer-events-auto relative ${LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS} h-dvh overflow-hidden border-r border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
                <div className="min-w-0">
                  <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
                    {meta.title}
                  </h2>
                  <p className="font-libre text-[10px] text-gray-500">{meta.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                  aria-label={`${meta.title}-Panel schließen`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">{panelBody}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showDice && diceOpen && diceContent ? (
          <motion.div
            key="left-dice"
            initial={PANEL_SLIDE.initial}
            animate={PANEL_SLIDE.animate}
            exit={PANEL_SLIDE.exit}
            transition={PANEL_SLIDE.transition}
            className={`pointer-events-auto relative top-0 max-h-[calc(100dvh-var(--th-hand-dock-h,0px))] overflow-hidden ${LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS}`}
          >
            {diceContent}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
