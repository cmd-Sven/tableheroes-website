/**
 * LiveSessionLeftDockPlayerAside — Player-facing atmosphere strip plus party/webcam rail access.
 */
"use client";

import type { ReactNode } from "react";
import { Dices, Users } from "lucide-react";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
import { SESSION_DAY_PHASE_META } from "@/src/lib/session-day-phase";
import { LIVE_SESSION_PLAYER_ATMOSPHERE_WIDTH_CLASS } from "@/src/components/session/live-session-side-types";

type Props = {
  atmosphereSummary: string;
  weatherIcon: ReactNode;
  weatherLabel: string;
  dayPhase: SessionDayPhase;
  temperatureValue: number;
  showDice: boolean;
  diceOpen: boolean;
  onToggleDice?: () => void;
  partyPanelActive?: boolean;
  onTogglePartyPanel?: () => void;
};

export function LiveSessionLeftDockPlayerAside({
  atmosphereSummary,
  weatherIcon,
  weatherLabel,
  dayPhase,
  temperatureValue,
  showDice,
  diceOpen,
  onToggleDice,
  partyPanelActive = false,
  onTogglePartyPanel,
}: Props) {
  const TimeIcon = SESSION_DAY_PHASE_META[dayPhase].Icon;
  const timeLabel = SESSION_DAY_PHASE_META[dayPhase].label;

  return (
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

      {onTogglePartyPanel || (showDice && onToggleDice) ? (
        <div className="mt-auto mb-2 flex w-full flex-col items-center gap-2">
          {onTogglePartyPanel ? (
            <button
              type="button"
              onClick={onTogglePartyPanel}
              title="Helden: Avatar-Leiste & Webcam"
              aria-label="Helden: Avatar-Leiste & Webcam"
              aria-pressed={partyPanelActive}
              className={`grid h-11 w-11 place-items-center border ${
                partyPanelActive
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-border/50 bg-background-card/95 text-gray-300 hover:border-hero-vibrant/60 hover:text-hero-vibrant"
              }`}
            >
              <Users className="h-5 w-5" />
            </button>
          ) : null}
          {showDice && onToggleDice ? (
            <button
              type="button"
              onClick={onToggleDice}
              title="Würfel"
              aria-label="Würfel"
              aria-pressed={diceOpen}
              className={`grid h-11 w-11 place-items-center border ${
                diceOpen
                  ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  : "border-hero-border/50 bg-background-card/95 text-gray-300"
              }`}
            >
              <Dices className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-auto" />
      )}
    </aside>
  );
}
