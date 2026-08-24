"use client";

import {
  clampExhaustionLevel,
  exhaustionBadgeColors,
  formatExhaustionTooltipDe,
} from "@/src/lib/characters/dnd5e/exhaustion";

type Props = {
  level: number | null | undefined;
  /** compact = party-tray klein; md = groß / Menü */
  size?: "sm" | "md";
  /** absolute = Position via className; static = Inline in Menüs */
  position?: "absolute" | "static";
  className?: string;
};

/**
 * Erschöpfungs-Badge (2024) — außerhalb des runden Avatars (nicht abschneiden).
 * Zahl + Farbskala (mild → bedrohlich); Mouseover erklärt Malus.
 */
export function ExhaustionBadge({
  level,
  size = "md",
  position = "absolute",
  className = "",
}: Props) {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0) return null;

  const colors = exhaustionBadgeColors(lvl);
  const dim =
    size === "sm"
      ? "h-5 min-w-[1.25rem] px-1 text-[10px]"
      : "h-7 min-w-[1.75rem] px-1.5 text-[12px]";
  const posClass =
    position === "static"
      ? "relative"
      : "pointer-events-auto absolute z-40";

  return (
    <span
      className={`${posClass} flex items-center justify-center rounded-full border-2 font-barlow font-extrabold tabular-nums ring-1 ring-black/50 ${dim} ${className}`}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        boxShadow: `0 0 12px ${colors.glow}, 0 2px 6px rgba(0,0,0,0.75)`,
      }}
      title={formatExhaustionTooltipDe(lvl)}
      aria-label={formatExhaustionTooltipDe(lvl).replace(/\n/g, " — ")}
    >
      {lvl}
    </span>
  );
}
