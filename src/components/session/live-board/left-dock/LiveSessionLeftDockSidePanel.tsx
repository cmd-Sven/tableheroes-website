/**
 * LiveSessionLeftDockSidePanel — Animated shell for atmosphere / chronist / table left panels.
 */
"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { LeftPanelId } from "@/src/components/session/live-session-side-types";
import { LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS } from "@/src/components/session/live-session-side-types";
import { PANEL_META, PANEL_SLIDE } from "./left-dock-constants";

type Props = {
  panel: LeftPanelId | null;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function LiveSessionLeftDockSidePanel({
  panel,
  visible,
  onClose,
  children,
}: Props) {
  const meta = panel ? PANEL_META[panel] : null;

  return (
    <AnimatePresence>
      {visible && meta ? (
        <motion.div
          key={`left-${panel}`}
          initial={PANEL_SLIDE.initial}
          animate={PANEL_SLIDE.animate}
          exit={PANEL_SLIDE.exit}
          transition={PANEL_SLIDE.transition}
          className={`pointer-events-auto relative ${LIVE_SESSION_SIDE_PANEL_WIDTH_CLASS} h-dvh overflow-hidden border-r border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
              <div className="min-w-0">
                <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
                  {meta.title}
                </h2>
                <p className="font-libre text-[10px] text-gray-500">{meta.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                aria-label={`${meta.title}-Panel schließen`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
