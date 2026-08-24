"use client";

/**
 * LiveSessionBoard — Top-level orchestrator for the live TTRPG session UI.
 * Composes battlemap, stage roster, side panels, combat, chronicle, and realtime sync.
 */

import type { LiveSessionBoardProps } from "@/src/components/session/live-board/live-session-types";
import { LiveSessionBoardProvider } from "@/src/components/session/live-board/LiveSessionBoardContext";
import { LiveSessionBoardView } from "@/src/components/session/live-board/LiveSessionBoardView";
import { useLiveSessionBoardOrchestration } from "@/src/components/session/live-board/useLiveSessionBoardOrchestration";

export function LiveSessionBoard(props: LiveSessionBoardProps) {
  const value = useLiveSessionBoardOrchestration(props);

  return (
    <LiveSessionBoardProvider value={value}>
      <LiveSessionBoardView />
    </LiveSessionBoardProvider>
  );
}
