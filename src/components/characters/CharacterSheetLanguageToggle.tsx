"use client";

import { Loader2 } from "lucide-react";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";

export function CharacterSheetLanguageToggle() {
  const { locale, setLocale, isLocalePending, t } = useCharacterSheetLocale();

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={t("sheet.languageLabel")}
    >
      <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {t("sheet.languageLabel")}
      </span>
      <div className="inline-flex rounded-md border border-hero-border bg-hero-dark/60 p-0.5">
        {(["de", "en"] as CharacterSheetLocale[]).map((code) => {
          const active = locale === code;
          const label = code === "de" ? t("sheet.languageDe") : t("sheet.languageEn");
          return (
            <button
              key={code}
              type="button"
              disabled={isLocalePending}
              aria-pressed={active}
              onClick={() => setLocale(code)}
              className={`rounded px-2.5 py-1 font-barlow text-[10px] font-bold uppercase transition-colors disabled:opacity-60 ${
                active
                  ? "bg-hero-vibrant text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {isLocalePending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" aria-hidden />
      ) : null}
    </div>
  );
}
