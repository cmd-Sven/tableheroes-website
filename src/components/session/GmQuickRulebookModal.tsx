"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookMarked, Search, X } from "lucide-react";
import {
  createQuickRulebookT,
  getQuickRuleCategoryLabel,
  normalizeQuickRulebookLocale,
  type QuickRulebookLocale,
} from "@/src/lib/i18n/quick-rulebook";
import { searchQuickRules } from "@/src/lib/rules/dnd2024/search-quick-rules";
import type { QuickRuleSearchResult } from "@/src/lib/rules/dnd2024/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

function detectInitialLocale(): QuickRulebookLocale {
  if (typeof navigator === "undefined") return "de";
  return normalizeQuickRulebookLocale(navigator.language.slice(0, 2));
}

export function GmQuickRulebookModal({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const [locale, setLocale] = useState<QuickRulebookLocale>("de");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setLocale(detectInitialLocale());
  }, [open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const t = useMemo(() => createQuickRulebookT(locale), [locale]);

  const results: QuickRuleSearchResult[] = useMemo(() => searchQuickRules(q), [q]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="gm-quick-rulebook"
          className="fixed inset-0 z-[113] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label={t("modal.close")}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gm-quick-rulebook-title"
            className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-background-card/98 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hero-border/50 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <BookMarked className="h-5 w-5 shrink-0 text-accent-gold" aria-hidden />
                  <h2
                    id="gm-quick-rulebook-title"
                    className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant sm:text-xl"
                  >
                    {t("modal.title")}
                  </h2>
                  <span className="rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-hero-vibrant">
                    {t("edition.badge")}
                  </span>
                </div>
                <p className="mt-1 font-libre text-xs text-gray-400 sm:text-sm">{t("modal.subtitle")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className="flex rounded border border-hero-border/50 bg-background-dark/80 p-0.5"
                  role="group"
                  aria-label="Sprache"
                >
                  {(["de", "en"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                        locale === code
                          ? "bg-hero-vibrant/25 text-hero-vibrant"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {t(code === "de" ? "locale.de" : "locale.en")}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 text-gray-200 hover:border-accent-gold/50 hover:text-accent-gold"
                  aria-label={t("modal.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="shrink-0 space-y-2 border-b border-hero-border/40 px-5 py-4">
              <div className="flex items-center gap-2 rounded border border-hero-dark bg-slate-900/90 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  ref={inputRef}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("search.placeholder")}
                  className="min-w-0 flex-1 bg-transparent font-libre text-sm text-white outline-none placeholder:text-gray-500"
                />
              </div>
              {!q.trim() ? (
                <p className="font-libre text-[11px] text-gray-500">{t("search.hint")}</p>
              ) : (
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {t("search.resultsCount", { count: results.length })}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {!q.trim() ? null : results.length === 0 ? (
                <p className="font-libre text-sm text-gray-500">{t("search.noResults")}</p>
              ) : (
                <ul className="space-y-3">
                  {results.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-hero-border/40 bg-background-dark/70 px-4 py-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-cinzel text-base font-bold text-accent-gold">
                          {locale === "en" ? entry.titleEn : entry.titleDe}
                        </h3>
                        <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-gray-400">
                          {getQuickRuleCategoryLabel(locale, entry.category)}
                        </span>
                      </div>
                      <p className="font-libre text-sm leading-relaxed text-gray-200">
                        {locale === "en" ? entry.summaryEn : entry.summaryDe}
                      </p>
                      <p className="mt-2 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500">
                        {entry.source}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
