"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clapperboard,
  LayoutGrid,
  Link2,
  LogOut,
  MapPin,
  PanelBottom,
  PawPrint,
  Power,
  ScrollText,
  Sparkles,
  Swords,
  Tv,
  UserRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TopToolbarPanelId } from "@/src/components/session/live-session-side-types";

const PANEL_SLIDE = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

type IconTone = "default" | "gold" | "combat" | "combatOn" | "danger";

type Props = {
  isGM: boolean;
  isPrepMode?: boolean;
  initializing?: boolean;
  panel: TopToolbarPanelId | null;
  onToggle: (id: TopToolbarPanelId) => void;
  onClose: () => void;
  locationLabel: string;
  locationLoreHref?: string | null;
  locationContent: ReactNode;
  fateCount: number;
  fateContent: ReactNode;
  playerFateHud: ReactNode;
  combatActive: boolean;
  onToggleCombat: () => void;
  onOpenNpcs: () => void;
  onOpenBeasts: () => void;
  onOpenQuickRulebook?: () => void;
  stageRosterOpen?: boolean;
  stageRosterCount?: number;
  onToggleStageRoster?: () => void;
  onOpenStageLive: () => void;
  stagePrepHref: string;
  loreHref: string;
  onOpenPlayerMonitor?: () => void;
  onOpenGuestLink?: () => void;
  questCount?: number;
  questsOpen?: boolean;
  onToggleQuests?: () => void;
  onEndSession?: () => void;
  sessionEnding?: boolean;
  onExit: () => void;
  exitLabel: string;
  /** Kompaktes Label links (z. B. „Spieler-Monitor“ / Gast) */
  statusLabel?: string | null;
  statusHint?: string | null;
  /** Zusätzliche Aktionen in der Spieler-Leiste (z. B. Chronist) */
  playerExtra?: ReactNode;
};

function toneClass(tone: IconTone, active?: boolean) {
  if (tone === "combatOn") return "border-red-600 bg-red-950/80 text-red-100";
  if (tone === "combat") {
    return "border-hero-vibrant/70 bg-emerald-950/80 text-hero-vibrant hover:bg-emerald-900";
  }
  if (tone === "gold") {
    return "border-accent-gold/50 text-accent-gold hover:bg-accent-gold/15";
  }
  if (tone === "danger") {
    return "border-red-700/70 bg-red-950/50 text-red-200 hover:bg-red-900/70";
  }
  if (active) return "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant";
  return "border-hero-border/50 bg-background-card/90 text-gray-200 hover:border-hero-vibrant/70 hover:text-hero-vibrant";
}

function IconButton({
  label,
  active,
  onClick,
  href,
  external,
  tone = "default",
  badge,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  tone?: IconTone;
  badge?: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className = `relative grid h-11 w-11 shrink-0 place-items-center border transition-colors ${toneClass(
    tone,
    active,
  )} ${disabled ? "cursor-not-allowed opacity-50" : ""}`;

  const inner = (
    <>
      {children}
      {badge != null && badge > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent-gold px-1 font-barlow text-[9px] font-bold text-black">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          className={className}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={className}
    >
      {inner}
    </button>
  );
}

export function LiveSessionTopToolbar({
  isGM,
  isPrepMode = false,
  initializing = false,
  panel,
  onToggle,
  onClose,
  locationLabel,
  locationLoreHref,
  locationContent,
  fateCount,
  fateContent,
  playerFateHud,
  combatActive,
  onToggleCombat,
  onOpenNpcs,
  onOpenBeasts,
  onOpenQuickRulebook,
  stageRosterOpen = false,
  stageRosterCount = 0,
  onToggleStageRoster,
  onOpenStageLive,
  stagePrepHref,
  loreHref,
  onOpenPlayerMonitor,
  onOpenGuestLink,
  questCount = 0,
  questsOpen = false,
  onToggleQuests,
  onEndSession,
  sessionEnding = false,
  onExit,
  exitLabel,
  statusLabel = null,
  statusHint = null,
  playerExtra = null,
}: Props) {
  const flyout =
    panel === "location" ? locationContent : panel === "fate" ? fateContent : null;
  const flyoutTitle = panel === "location" ? "Ort aus Lore" : "Schicksalsmünzen";

  return (
    <div className="relative z-30 border-b border-amber-900/50 bg-linear-to-r from-background-card/90 via-emerald-950/80 to-background-dark/90">
      <div
        className={`flex items-center gap-2 px-2 ${
          isGM ? "h-12" : "min-h-12 py-1.5"
        }`}
      >
        {isGM ? (
          <IconButton
            label={`Ort: ${locationLabel}`}
            active={panel === "location"}
            onClick={() => onToggle("location")}
          >
            <MapPin className="h-5 w-5 text-accent-gold" />
          </IconButton>
        ) : (
          <>
            {statusLabel ? (
              <div className="hidden min-w-0 max-w-[9.5rem] shrink-0 sm:block">
                <p className="truncate font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {statusLabel}
                </p>
                {statusHint ? (
                  <p className="truncate font-libre text-[10px] text-gray-500" title={statusHint}>
                    {statusHint}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex min-w-0 max-w-[min(100%,16rem)] items-center gap-2 rounded border border-amber-900/50 bg-background-dark/70 px-2 py-1">
              <MapPin className="h-4 w-4 shrink-0 text-accent-gold" />
              <div className="min-w-0">
                <p className="font-barlow text-[8px] font-bold uppercase tracking-wide text-gray-500">
                  Ort
                </p>
                {locationLoreHref ? (
                  <a
                    href={locationLoreHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-libre text-sm leading-tight text-gray-100 hover:text-accent-gold"
                  >
                    {locationLabel}
                  </a>
                ) : (
                  <p className="truncate font-libre text-sm leading-tight text-gray-100">
                    {locationLabel}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {isGM ? (
          <IconButton
            label="Schicksalsmünzen"
            active={panel === "fate"}
            onClick={() => onToggle("fate")}
            tone="gold"
            badge={fateCount}
          >
            <Sparkles className="h-5 w-5" />
          </IconButton>
        ) : (
          <div className="min-w-0 flex-1">{playerFateHud}</div>
        )}

        {isGM ? (
          <>
            {initializing ? (
              <span className="hidden rounded border border-gray-500/40 bg-gray-900/50 px-2 py-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-300 sm:inline">
                Initialisiert…
              </span>
            ) : isPrepMode ? (
              <span className="hidden rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold sm:inline">
                Vorbereitung
              </span>
            ) : (
              <span className="hidden rounded border border-hero-vibrant/40 bg-hero-vibrant/10 px-2 py-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-hero-vibrant sm:inline">
                Live
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {onToggleStageRoster ? (
                <IconButton
                  label={
                    stageRosterOpen
                      ? "Hand ausblenden"
                      : "Hand einblenden"
                  }
                  active={stageRosterOpen}
                  onClick={onToggleStageRoster}
                  tone="gold"
                  badge={stageRosterCount}
                >
                  <PanelBottom className="h-5 w-5" />
                </IconButton>
              ) : null}
              <IconButton label="NPCs auf die Bühne" onClick={onOpenNpcs} tone="gold">
                <UserRound className="h-5 w-5" />
              </IconButton>
              <IconButton label="Biester auf die Bühne" onClick={onOpenBeasts}>
                <PawPrint className="h-5 w-5 text-emerald-300" />
              </IconButton>
              {onOpenQuickRulebook ? (
                <IconButton
                  label="Schnell-Regelwerk (D&D 2024)"
                  onClick={onOpenQuickRulebook}
                  tone="gold"
                >
                  <BookOpen className="h-5 w-5" />
                </IconButton>
              ) : null}
              <IconButton
                label={combatActive ? "Combat beenden" : "Combat starten"}
                onClick={onToggleCombat}
                tone={combatActive ? "combatOn" : "combat"}
              >
                <Swords className="h-5 w-5" />
              </IconButton>
              <IconButton label="Stage live" onClick={onOpenStageLive}>
                <Clapperboard className="h-5 w-5" />
              </IconButton>
              <IconButton label="Bühne vorbereiten" href={stagePrepHref} tone="gold">
                <LayoutGrid className="h-5 w-5" />
              </IconButton>
              <div className="mx-1 h-7 w-px bg-hero-border/40" />
              {onOpenGuestLink ? (
                <IconButton
                  label="Gäste-Link kopieren und öffnen"
                  onClick={onOpenGuestLink}
                >
                  <Link2 className="h-5 w-5" />
                </IconButton>
              ) : null}
              {onOpenPlayerMonitor ? (
                <IconButton
                  label="Spielermonitor anzeigen"
                  onClick={onOpenPlayerMonitor}
                  tone="gold"
                >
                  <Tv className="h-5 w-5" />
                </IconButton>
              ) : null}
              <IconButton label="Lore öffnen" href={loreHref} external>
                <ScrollText className="h-5 w-5" />
              </IconButton>
              {questCount > 0 && onToggleQuests ? (
                <IconButton
                  label="Quests"
                  active={questsOpen}
                  onClick={onToggleQuests}
                  badge={questCount}
                >
                  <BookOpen className="h-5 w-5" />
                </IconButton>
              ) : null}
              {onEndSession ? (
                <IconButton
                  label="Session beenden"
                  onClick={onEndSession}
                  tone="danger"
                  disabled={sessionEnding}
                >
                  <Power className="h-5 w-5" />
                </IconButton>
              ) : null}
              <IconButton label={exitLabel} onClick={onExit} tone="danger">
                <LogOut className="h-5 w-5" />
              </IconButton>
            </div>
          </>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {playerExtra}
            <IconButton label="Lore öffnen" href={loreHref} external>
              <ScrollText className="h-5 w-5" />
            </IconButton>
            {questCount > 0 && onToggleQuests ? (
              <IconButton
                label="Quests"
                active={questsOpen}
                onClick={onToggleQuests}
                badge={questCount}
              >
                <BookOpen className="h-5 w-5" />
              </IconButton>
            ) : null}
            <IconButton label={exitLabel} onClick={onExit} tone="danger">
              <LogOut className="h-5 w-5" />
            </IconButton>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isGM && flyout ? (
          <motion.div
            key={`top-${panel}`}
            initial={PANEL_SLIDE.initial}
            animate={PANEL_SLIDE.animate}
            exit={PANEL_SLIDE.exit}
            transition={PANEL_SLIDE.transition}
            className="absolute left-2 right-2 top-full z-40 max-w-lg rounded-b-xl border border-t-0 border-amber-900/60 bg-background-card/98 p-3 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
                {flyoutTitle}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-400 hover:text-white"
                aria-label={`${flyoutTitle} schließen`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {flyout}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
