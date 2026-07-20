"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Dices,
  Gift,
  ImageIcon,
  Map,
  MessageSquare,
  Route,
} from "lucide-react";
import type { MainSidePanelId } from "@/src/components/session/live-session-side-types";
import {
  LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS,
} from "@/src/components/session/live-session-side-types";

type RailItem = {
  id: MainSidePanelId | "dice";
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  badge?: number;
  dot?: boolean;
  gmOnly?: boolean;
};

type Props = {
  mainPanel: MainSidePanelId | null;
  diceOpen: boolean;
  isGM: boolean;
  handRaiseCount?: number;
  downtimeActive?: boolean;
  lootActive?: boolean;
  onToggleMain: (id: MainSidePanelId) => void;
  onToggleDice: () => void;
};

function SideRailButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
  dot,
}: Omit<RailItem, "id" | "gmOnly">) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`group relative grid h-11 w-11 place-items-center border transition-colors ${
        active
          ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
          : "border-hero-border/50 bg-background-card/95 text-gray-300 hover:border-hero-vibrant/70 hover:bg-emerald-950 hover:text-hero-vibrant"
      }`}
    >
      <span
        className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      >
        {label}
      </span>
      <Icon className="h-5 w-5" aria-hidden />
      {badge != null && badge > 0 ? (
        <span className="absolute -left-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent-gold px-1 font-barlow text-[9px] font-bold text-black">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {dot ? (
        <span
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-hero-vibrant ring-2 ring-background-card"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

export function LiveSessionSideRail({
  mainPanel,
  diceOpen,
  isGM,
  handRaiseCount = 0,
  downtimeActive = false,
  lootActive = false,
  onToggleMain,
  onToggleDice,
}: Props) {
  const mainItems: RailItem[] = [
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      active: mainPanel === "chat",
      onClick: () => onToggleMain("chat"),
      badge: handRaiseCount,
    },
    ...(isGM
      ? ([
          {
            id: "chronicle",
            label: "Chronik",
            icon: BookOpen,
            active: mainPanel === "chronicle",
            onClick: () => onToggleMain("chronicle"),
            gmOnly: true,
          },
          {
            id: "scenes",
            label: "Szenen",
            icon: ImageIcon,
            active: mainPanel === "scenes",
            onClick: () => onToggleMain("scenes"),
            gmOnly: true,
          },
          {
            id: "battlemaps",
            label: "Battlemaps",
            icon: Map,
            active: mainPanel === "battlemaps",
            onClick: () => onToggleMain("battlemaps"),
            gmOnly: true,
          },
          {
            id: "travel",
            label: "Reise & FAP",
            icon: Route,
            active: mainPanel === "travel",
            onClick: () => onToggleMain("travel"),
            dot: downtimeActive,
            gmOnly: true,
          },
          {
            id: "loot",
            label: "Loot-Gun",
            icon: Gift,
            active: mainPanel === "loot",
            onClick: () => onToggleMain("loot"),
            dot: lootActive,
            gmOnly: true,
          },
        ] satisfies RailItem[])
      : []),
  ];

  return (
    <nav
      className={`${LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS} flex flex-col border-l border-hero-border/60 bg-background-dark/95 shadow-2xl backdrop-blur-md`}
      aria-label="Session-Werkzeuge"
    >
      {mainItems.map((item) => (
        <SideRailButton key={item.id} {...item} />
      ))}
      <SideRailButton
        label="Würfel"
        icon={Dices}
        active={diceOpen}
        onClick={onToggleDice}
      />
    </nav>
  );
}
