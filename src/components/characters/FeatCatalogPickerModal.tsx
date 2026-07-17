"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { FeatDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import {
  featDefinitionToFeatureEntry,
  getFeats,
} from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  onClose: () => void;
  onPick: (entry: ReturnType<typeof featDefinitionToFeatureEntry>) => void;
  /** Optional: bereits gewählte Feat-IDs ausblenden */
  excludeIds?: string[];
};

export function FeatCatalogPickerModal({ onClose, onPick, excludeIds = [] }: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const [query, setQuery] = useState("");
  const exclude = useMemo(
    () => new Set(excludeIds.map((id) => id.replace(/^feat-/, ""))),
    [excludeIds],
  );

  const feats = useMemo(() => getFeats(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feats.filter((f) => {
      if (exclude.has(f.id)) return false;
      if (!q) return true;
      return (
        f.nameDe.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.id.includes(q)
      );
    });
  }, [feats, query, exclude]);

  function pick(feat: FeatDefinition) {
    onPick(featDefinitionToFeatureEntry(feat));
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hero-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              <Sparkles className="h-5 w-5" />
              {t("featCatalog.title")}
            </h2>
            <p className="mt-1 font-libre text-xs text-gray-400">
              {t("featCatalog.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("featCatalog.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-hero-dark px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("featCatalog.search")}
              className="w-full rounded border border-hero-dark bg-slate-900 py-2 pl-9 pr-3 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="font-libre text-sm text-gray-500">{t("featCatalog.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((feat) => {
                const name = locale === "de" ? feat.nameDe || feat.nameEn : feat.nameEn;
                const desc =
                  locale === "de"
                    ? feat.descriptionDe || feat.descriptionEn
                    : feat.descriptionEn || feat.descriptionDe;
                const prereq =
                  locale === "de"
                    ? feat.prerequisiteDe || feat.prerequisiteEn
                    : feat.prerequisiteEn || feat.prerequisiteDe;
                return (
                  <li
                    key={feat.id}
                    className="flex items-start justify-between gap-3 rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-barlow text-sm font-bold text-white">{name}</p>
                      {prereq ? (
                        <p className="font-libre text-[10px] text-accent-gold">{prereq}</p>
                      ) : null}
                      {desc ? (
                        <p className="mt-1 line-clamp-3 font-libre text-[11px] text-gray-400">
                          {desc}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => pick(feat)}
                      className="shrink-0 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20"
                    >
                      {t("featCatalog.add")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
