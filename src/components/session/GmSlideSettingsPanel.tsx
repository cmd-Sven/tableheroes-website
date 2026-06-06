"use client";

import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { GmBoardSettingsModal } from "@/src/components/session/GmBoardSettingsModal";

export type GmSlideDirection = "down" | "left";

type Props = {
  /** Nur GM: außerhalb optional nicht rendern */
  isGM: boolean;
  open: boolean;
  onToggle: () => void;
  /** Immer sichtbarer Inhalt (Icon, Visualisierung, …) */
  preview: ReactNode;
  /** Einstellungen — im Modal */
  children: ReactNode;
  /** below: Preview mit Zahnrad darunter/rechts | beside: Preview und Zahnrad in einer Zeile */
  variant?: "below" | "beside";
  settingsLabel: string;
  modalSize?: "md" | "lg" | "xl";
  className?: string;
  previewClassName?: string;
};

/**
 * GM: Zahnrad öffnet Einstellungen in einem Modal (kein Layout-Shift in der Sidebar).
 * Inhalte weiter über updateLiveState / Actions → Realtime.
 */
export function GmSlideSettingsPanel({
  isGM,
  open,
  onToggle,
  preview,
  children,
  variant = "below",
  settingsLabel,
  modalSize = "md",
  className = "",
  previewClassName = "",
}: Props) {
  if (!isGM) {
    return <div className={className}>{preview}</div>;
  }

  const settingsButton = (
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
  );

  return (
    <>
      {variant === "beside" ? (
        <div className={`relative flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
          <div className={`min-w-0 shrink-0 ${previewClassName}`}>{preview}</div>
          {settingsButton}
        </div>
      ) : (
        <div className={`relative ${className}`}>
          <div className={`flex items-start gap-2 ${previewClassName}`}>
            <div className="min-w-0 flex-1">{preview}</div>
            {settingsButton}
          </div>
        </div>
      )}

      <GmBoardSettingsModal
        open={open}
        onClose={onToggle}
        title={settingsLabel}
        size={modalSize}
      >
        {children}
      </GmBoardSettingsModal>
    </>
  );
}
