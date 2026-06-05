import type { LucideIcon } from "lucide-react";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";

export type SessionDayPhase = "night" | "sunrise" | "day" | "sunset";

export const SESSION_DAY_PHASE_ORDER: SessionDayPhase[] = [
  "night",
  "sunrise",
  "day",
  "sunset",
];

export const SESSION_DAY_PHASE_META: Record<
  SessionDayPhase,
  { label: string; Icon: LucideIcon; iconClassName: string }
> = {
  night: {
    label: "Nacht",
    Icon: Moon,
    iconClassName: "text-indigo-200",
  },
  sunrise: {
    label: "Sonnenaufgang",
    Icon: Sunrise,
    iconClassName: "text-orange-300",
  },
  day: {
    label: "Tag",
    Icon: Sun,
    iconClassName: "text-amber-300",
  },
  sunset: {
    label: "Sonnenuntergang",
    Icon: Sunset,
    iconClassName: "text-orange-400",
  },
};

export function sessionDayPhaseLabel(phase: SessionDayPhase): string {
  return SESSION_DAY_PHASE_META[phase].label;
}

/** Mappt gespeicherten Freitext / Legacy-Werte auf eine Tageszeit-Phase. */
export function resolveSessionDayPhase(
  raw: string | null | undefined,
): SessionDayPhase {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();

  if (!value) return "day";
  if (value === "nacht" || value.includes("nacht")) return "night";
  if (value === "sonnenaufgang" || value.includes("aufgang")) return "sunrise";
  if (value === "sonnenuntergang" || value.includes("untergang")) return "sunset";
  if (value === "tag" || value === "tagsüber" || value.includes("tag")) return "day";

  return "day";
}
