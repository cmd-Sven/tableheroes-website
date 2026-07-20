export type MainSidePanelId =
  | "chat"
  | "chronicle"
  | "scenes"
  | "battlemaps"
  | "travel"
  | "loot";

/** Feste Breite wie bisheriges Chat-Panel — kein `w-full` (kollabiert in shrink-wrap Flex). */
export const LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS =
  "w-sm max-w-[min(calc(100vw-2.75rem),24rem)] shrink-0";

/** Quadratische Icon-Leiste am rechten Rand. */
export const LIVE_SESSION_SIDE_RAIL_WIDTH_CLASS = "w-11 shrink-0";

export const LIVE_SESSION_MAIN_PANEL_HEIGHT_CLASS = "h-[66.666%]";

export const LIVE_SESSION_DICE_PANEL_HEIGHT_CLASS = "h-1/4";
