/**
 * LiveSessionBoardOverlaysHost — Composes modals, dock panels, and floating overlay layers.
 */
"use client";

import { LiveSessionBoardModalsLayer } from "./LiveSessionBoardModalsLayer";
import { LiveSessionBoardDockPanelsLayer } from "./LiveSessionBoardDockPanelsLayer";
import { LiveSessionBoardFloatOverlaysLayer } from "./LiveSessionBoardFloatOverlaysLayer";

export function LiveSessionBoardOverlaysHost() {
  return (
    <>
      <LiveSessionBoardModalsLayer />
      <LiveSessionBoardDockPanelsLayer />
      <LiveSessionBoardFloatOverlaysLayer />
    </>
  );
}
