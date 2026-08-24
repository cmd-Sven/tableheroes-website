/**
 * LiveSessionLeftDockDiceSlot — Animated slot that hosts the embedded dice panel beside the left rail.
 */
"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS } from "@/src/components/session/live-session-side-types";
import { PANEL_SLIDE } from "./left-dock-constants";

type Props = {
  showDice: boolean;
  diceOpen: boolean;
  children: ReactNode;
};

export function LiveSessionLeftDockDiceSlot({
  showDice,
  diceOpen,
  children,
}: Props) {
  return (
    <AnimatePresence>
      {showDice && diceOpen && children ? (
        <motion.div
          key="left-dice"
          initial={PANEL_SLIDE.initial}
          animate={PANEL_SLIDE.animate}
          exit={PANEL_SLIDE.exit}
          transition={PANEL_SLIDE.transition}
          className={`pointer-events-auto relative top-0 max-h-[calc(100dvh-var(--th-hand-dock-h,0px))] overflow-hidden ${LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS}`}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
