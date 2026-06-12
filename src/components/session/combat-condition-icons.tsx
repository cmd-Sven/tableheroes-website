"use client";

import {
  AlertTriangle,
  Ban,
  EyeOff,
  EarOff,
  FlaskConical,
  Ghost,
  Grip,
  Heart,
  Lock,
  MessageCircleOff,
  Minimize2,
  Moon,
  Mountain,
  Skull,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getCombatConditionDef,
  type CombatConditionId,
} from "@/src/lib/combat-initiative";

export const COMBAT_CONDITION_ICONS: Record<CombatConditionId, LucideIcon> = {
  concentration: Sparkles,
  blinded: EyeOff,
  deafened: EarOff,
  silenced: MessageCircleOff,
  stunned: Zap,
  prone: Minimize2,
  dead: Skull,
  frightened: AlertTriangle,
  poisoned: FlaskConical,
  grappled: Grip,
  restrained: Lock,
  paralyzed: Ban,
  unconscious: Moon,
  invisible: Ghost,
  charmed: Heart,
  incapacitated: Ban,
  petrified: Mountain,
};

export function getCombatConditionIcon(id: CombatConditionId): LucideIcon {
  return COMBAT_CONDITION_ICONS[id];
}

function conditionBadgeClasses(id: CombatConditionId): string {
  if (id === "dead") {
    return "border-red-700 bg-red-950 text-red-200";
  }
  if (id === "concentration") {
    return "border-violet-500/70 bg-violet-950/90 text-violet-200";
  }
  return "border-amber-700/60 bg-amber-950/80 text-amber-100";
}

type ConditionIconBadgeProps = {
  id: CombatConditionId;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
} as const;

const BADGE_SIZES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

export function ConditionIconBadge({
  id,
  size = "sm",
  className = "",
}: ConditionIconBadgeProps) {
  const def = getCombatConditionDef(id);
  const Icon = COMBAT_CONDITION_ICONS[id];
  if (!def) return null;

  return (
    <span
      title={def.label}
      aria-label={def.label}
      className={`inline-grid shrink-0 place-items-center rounded-full border ${BADGE_SIZES[size]} ${conditionBadgeClasses(id)} ${className}`}
    >
      <Icon className={`${ICON_SIZES[size]} shrink-0`} aria-hidden />
    </span>
  );
}
