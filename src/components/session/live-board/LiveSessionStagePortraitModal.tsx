/**
 * LiveSessionStagePortraitModal — Fullscreen portrait lightbox for stage NPC/creature/scene images.
 */
"use client";

import { X } from "lucide-react";
import type { StagePortraitModal } from "./live-session-types";

type Props = {
  portrait: StagePortraitModal | null;
  onClose: () => void;
};

export function LiveSessionStagePortraitModal({ portrait, onClose }: Props) {
  if (!portrait) return null;

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-portrait-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-[min(96vw,52rem)] rounded-lg border border-hero-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full border border-hero-border bg-background-dark/95 p-2 text-gray-300 hover:border-accent-gold hover:text-white transition-colors"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-3 p-4 pt-12 sm:p-6 sm:pt-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portrait.imageUrl}
            alt={portrait.name}
            className="max-h-[min(78vh,720px)] w-auto max-w-full rounded-md object-contain shadow-lg"
          />
          <div className="max-w-full px-2 text-center">
            <p
              id="stage-portrait-title"
              className="font-cinzel text-lg font-bold text-white"
            >
              {portrait.name}
            </p>
            {portrait.subtitle ? (
              <p className="mt-1 font-libre text-sm text-accent-gold">
                {portrait.subtitle}
              </p>
            ) : null}
            <p className="mt-2 font-libre text-xs text-gray-500">
              Klick außerhalb oder Esc zum Schließen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
