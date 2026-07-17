"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Package, Search, X } from "lucide-react";
import { createCharacterItem } from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem } from "@/src/types/inventory";
import {
  buildInventoryPayloadFromCatalog,
  getShopCatalogEntry,
  listShopCatalogOptions,
} from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  characterId: string;
  onClose: () => void;
  onSaved: (item: CharacterItem) => void;
};

export function ItemCatalogPickerModal({ characterId, onClose, onSaved }: Props) {
  const { t } = useCharacterSheetLocale();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => listShopCatalogOptions(), []);
  const kinds = useMemo(
    () => [...new Set(options.map((o) => o.kind))].sort(),
    [options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (kindFilter !== "all" && o.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.catalogId.includes(q) ||
        o.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [options, query, kindFilter]);

  function addEntry(archetypeKey: Parameters<typeof getShopCatalogEntry>[0], catalogId: string) {
    const entry = getShopCatalogEntry(archetypeKey, catalogId);
    if (!entry) return;
    setError(null);
    startTransition(async () => {
      try {
        const payload = buildInventoryPayloadFromCatalog(archetypeKey, entry);
        const saved = await createCharacterItem({
          characterId,
          name: payload.name,
          description: payload.description,
          category: payload.category,
          iconType: entry.kind,
        });
        onSaved(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("itemCatalog.saveError"));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hero-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              <Package className="h-5 w-5" />
              {t("itemCatalog.title")}
            </h2>
            <p className="mt-1 font-libre text-xs text-gray-400">
              {t("itemCatalog.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("itemCatalog.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-hero-dark px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("itemCatalog.search")}
              className="w-full rounded border border-hero-dark bg-slate-900 py-2 pl-9 pr-3 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setKindFilter("all")}
              className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                kindFilter === "all"
                  ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  : "border-hero-border text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("itemCatalog.allKinds")}
            </button>
            {kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setKindFilter(kind)}
                className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                  kindFilter === kind
                    ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                    : "border-hero-border text-gray-500 hover:text-gray-300"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
          {error ? (
            <p className="font-libre text-xs text-accent-blood">{error}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="font-libre text-sm text-gray-500">{t("itemCatalog.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((opt) => (
                <li
                  key={`${opt.archetypeKey}:${opt.catalogId}`}
                  className="flex items-start justify-between gap-3 rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-barlow text-sm font-bold text-white">{opt.name}</p>
                    <p className="font-libre text-[11px] text-gray-500">
                      {opt.categoryLabel}
                      {opt.damage
                        ? ` · ${opt.damage}${opt.damageType ? ` ${opt.damageType}` : ""}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => addEntry(opt.archetypeKey, opt.catalogId)}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {t("itemCatalog.add")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
