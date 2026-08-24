/**
 * left-dock-ui — Shared rail/flyout button primitives and marker kind icons for the left dock.
 */
"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Eye,
  Flame,
  Mountain,
  Skull,
  Snowflake,
  Split,
} from "lucide-react";
import type { BattlemapMarkerKind } from "@/src/lib/session/battlemap-types";

export function RailButton({
  label,
  active,
  onClick,
  badgeDot,
  hideLabel = false,
  className = "",
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badgeDot?: boolean;
  hideLabel?: boolean;
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
      aria-expanded={hideLabel ? true : undefined}
      className={`group relative grid w-11 place-items-center border transition-colors ${
        active
          ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
          : "border-hero-border/50 bg-background-card/95 text-gray-300 hover:border-hero-vibrant/70 hover:bg-emerald-950 hover:text-hero-vibrant"
      } ${className}`}
    >
      {!hideLabel ? (
        <span
          className="pointer-events-none absolute left-full ml-2 z-20 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          {label}
        </span>
      ) : null}
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

export function ToolFlyoutButton({
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

export function MarkerKindIcon({ kind }: { kind: BattlemapMarkerKind }) {
  const cls = "h-4 w-4";
  switch (kind) {
    case "fire":
      return <Flame className={`${cls} text-orange-400`} />;
    case "ice":
      return <Snowflake className={`${cls} text-sky-300`} />;
    case "debris":
      return <Mountain className={`${cls} text-stone-300`} />;
    case "crack":
      return <Split className={`${cls} text-violet-300`} />;
    case "danger":
      return <AlertTriangle className={`${cls} text-amber-300`} />;
    case "interest":
      return <Eye className={`${cls} text-accent-gold`} />;
    case "trap":
      return <Skull className={`${cls} text-red-300`} />;
  }
}
