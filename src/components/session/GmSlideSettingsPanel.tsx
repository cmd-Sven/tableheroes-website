"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";

export type GmSlideDirection = "down" | "left";

type Props = {
  /** Nur GM: außerhalb optional nicht rendern */
  isGM: boolean;
  open: boolean;
  onToggle: () => void;
  /** Immer sichtbarer Inhalt (Icon, Visualisierung, …) */
  preview: ReactNode;
  /** Einstellungen — nur lokal ein-/ausgeblendet */
  children: ReactNode;
  /** below: Panel unter der Preview-Zeile | beside: Panel rechts in einer Zeile (z. B. Thermometer) */
  variant?: "below" | "beside";
  settingsLabel: string;
  className?: string;
  previewClassName?: string;
};

/**
 * GM: Zahnrad toggelt Panel nur im Client-State.
 * Inhalte (Wetter, Münzen, …) weiter über updateLiveState / Actions → Realtime.
 */
export function GmSlideSettingsPanel({
  isGM,
  open,
  onToggle,
  preview,
  children,
  variant = "below",
  settingsLabel,
  className = "",
  previewClassName = "",
}: Props) {
  const slide = variant === "beside" ? "left" : "down";
  const initial =
    slide === "left"
      ? { opacity: 0, x: -14 }
      : { opacity: 0, y: -10 };
  const animate = { opacity: 1, x: 0, y: 0 };
  const exit =
    slide === "left"
      ? { opacity: 0, x: -10 }
      : { opacity: 0, y: -8 };

  if (!isGM) {
    return <div className={className}>{preview}</div>;
  }

  if (variant === "beside") {
    return (
      <div className={`relative flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
        <div className={`min-w-0 shrink-0 ${previewClassName}`}>{preview}</div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={settingsLabel}
          title={settingsLabel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-gray-200 backdrop-blur-md transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
        >
          <Settings className="h-4 w-4" />
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="gm-settings-panel"
              initial={initial}
              animate={animate}
              exit={exit}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 p-3 shadow-lg backdrop-blur-md"
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-start gap-2 ${previewClassName}`}>
        <div className="min-w-0 flex-1">{preview}</div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={settingsLabel}
          title={settingsLabel}
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-gray-200 backdrop-blur-md transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="gm-settings-panel"
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
