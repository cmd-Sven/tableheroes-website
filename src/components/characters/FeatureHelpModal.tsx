"use client";

import { X } from "lucide-react";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  title: string;
  description: string | null;
  onClose: () => void;
};

/** Hilfe-Dialog für Klassen-/Unterklassenmerkmale (Blatt + Charakter-TÜV). */
export function FeatureHelpModal({ title, description, onClose }: Props) {
  const { t } = useCharacterSheetLocale();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-help-title"
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id="feature-help-title"
            className="font-cinzel text-lg font-bold text-accent-gold"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
            aria-label={t("sheet.closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {description?.trim() ? description : t("features.help.empty")}
        </p>
      </div>
    </div>
  );
}
