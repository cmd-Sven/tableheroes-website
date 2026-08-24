/**
 * LiveSessionBoardContext — Shared orchestration state for live-board view hosts.
 */
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LiveSessionBoardOrchestration } from "./useLiveSessionBoardOrchestration";

const LiveSessionBoardContext = createContext<LiveSessionBoardOrchestration | null>(null);

export function LiveSessionBoardProvider({
  value,
  children,
}: {
  value: LiveSessionBoardOrchestration;
  children: ReactNode;
}) {
  return (
    <LiveSessionBoardContext.Provider value={value}>{children}</LiveSessionBoardContext.Provider>
  );
}

export function useLiveSessionBoardContext(): LiveSessionBoardOrchestration {
  const ctx = useContext(LiveSessionBoardContext);
  if (!ctx) {
    throw new Error("useLiveSessionBoardContext must be used within LiveSessionBoardProvider");
  }
  return ctx;
}
