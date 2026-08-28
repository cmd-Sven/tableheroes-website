"use client";

import { ScrollText, X } from "lucide-react";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import type { BackgroundDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import {
  buildBackgroundHelpSections,
  getBackgroundDisplayName,
} from "@/src/lib/characters/dnd5e/progression/background-display";

type Props = {
  background: BackgroundDefinition;
  onClose: () => void;
};

/** Hilfe-Dialog für D&D-2024-Hintergründe (Boni, Merkmal, Ausrüstung). */
export function BackgroundHelpModal({ background, onClose }: Props) {
  const { t, locale, skillLabel, abilityLabel } = useCharacterSheetLocale();
  const title = getBackgroundDisplayName(background, locale);
  const sections = buildBackgroundHelpSections(background, {
    locale,
    t,
    skillLabel,
    abilityLabel,
  });

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-help-title"
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hero-border/60 bg-hero-dark/50 text-accent-gold">
              <ScrollText className="h-5 w-5" aria-hidden />
            </span>
            <h3
              id="background-help-title"
              className="font-cinzel truncate text-lg font-bold text-accent-gold"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
            aria-label={t("sheet.closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.labelKey}>
                <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t(section.labelKey)}
                </p>
                <p className="font-libre text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-libre text-sm text-gray-200 leading-relaxed">
            {t("features.help.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
