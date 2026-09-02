/**
 * left-dock-constants — Shared animation and panel metadata for the live-session left dock.
 */
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";

export const PANEL_SLIDE = {
  initial: { opacity: 0, x: -48 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -48 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export const FLYOUT_SLIDE = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

export const PANEL_META: Record<LeftPanelId, { title: string; subtitle: string }> = {
  atmosphere: { title: "Atmosphäre", subtitle: "Wetter, Tageszeit, Temperatur" },
  chronist: { title: "Chronist", subtitle: "Aufnahme & Inbox" },
  table: { title: "Tisch", subtitle: "Anwesenheit & Platzhalter" },
  party: { title: "Helden", subtitle: "Avatar-Leiste & Webcam" },
};

export type ToolFlyoutId =
  | "fog"
  | "effect"
  | "marker"
  | "trap"
  | "container"
  | "draw"
  | "poi";
