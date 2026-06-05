"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Skull, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { generateShopItemsWithAI } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { bulkInsertCampaignShopItems } from "@/src/app/dashboard/campaigns/[id]/shop-actions";

type GeneratedShopItem = {
  name: string;
  description: string;
  base_price_gp: number;
  is_magical: boolean;
  is_legal: boolean;
  rarity: "common" | "uncommon" | "rare" | "very rare" | "legendary";
  item_type: "weapon" | "armor" | "potion" | "gear" | "material" | "service" | "quest";
  is_ration_package?: boolean;
};

type Props = {
  campaignId: string;
  shopId: string;
  shopName: string;
  npcContext: string;
  onClose: () => void;
};

const RARITY_CLASSES: Record<GeneratedShopItem["rarity"], string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

const LEGALITY_OPTIONS = [
  "Nur legal",
  "Gemischt",
  "Nur Schwarzmarkt/Illegal",
];

function LoadingSparkles() {
  return (
    <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-accent-gold/30 bg-slate-950/80">
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-accent-gold"
          style={{
            left: `${10 + ((index * 23) % 80)}%`,
            top: `${15 + ((index * 31) % 70)}%`,
            animationDelay: `${index * 0.12}s`,
            animationDuration: `${1.2 + (index % 4) * 0.25}s`,
          }}
        />
      ))}
      <div className="relative z-10 flex items-center gap-3 font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
        <Loader2 className="h-5 w-5 animate-spin" />
        KI sortiert Regale und Preisschilder...
      </div>
    </div>
  );
}

export function AIShopGeneratorModal({
  campaignId,
  shopId,
  shopName,
  npcContext,
  onClose,
}: Props) {
  const [itemCount, setItemCount] = useState(12);
  const [itemDirection, setItemDirection] = useState("Einfache Waffen, Ausruestung und ein paar regionale Besonderheiten.");
  const [magicItemCount, setMagicItemCount] = useState(1);
  const [legality, setLegality] = useState("Gemischt");
  const [includeServices, setIncludeServices] = useState(true);
  const [items, setItems] = useState<GeneratedShopItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const hasItems = items.length > 0;

  const updateItem = (
    index: number,
    patch: Partial<
      Pick<GeneratedShopItem, "base_price_gp" | "name" | "description" | "is_ration_package">
    >,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleGenerate = () => {
    setError(null);
    startGenerateTransition(async () => {
      try {
        const result = await generateShopItemsWithAI({
          npcContext,
          itemCount,
          legality,
          itemDirection,
          magicItemCount,
          includeServices,
        });
        setItems(result.items as GeneratedShopItem[]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Inventar konnte nicht generiert werden.");
      }
    });
  };

  const handleSave = () => {
    setError(null);
    if (items.length === 0) {
      setError("Es gibt keine Items zum Speichern.");
      return;
    }

    startSaveTransition(async () => {
      try {
        await bulkInsertCampaignShopItems(campaignId, shopId, items);
        onClose();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Inventar konnte nicht gespeichert werden.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4 border-b border-hero-border/40 bg-slate-950/70 p-5">
          <div>
            <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
              KI-Shop-Generator
            </p>
            <h2 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
              {shopName}
            </h2>
            <p className="mt-1 max-w-2xl font-libre text-sm text-gray-300">
              Erzeuge ein D&amp;D-5e-Inventar, pruefe Preise und uebernimm nur die passenden Waren.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border/40 p-2 text-gray-300 transition-colors hover:border-accent-gold hover:text-white"
            aria-label="Modal schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-96px)] overflow-y-auto lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5 border-b border-hero-border/30 bg-background-dark/80 p-5 lg:border-b-0 lg:border-r">
            <div>
              <label className="mb-2 block font-barlow text-xs font-bold uppercase text-gray-400">
                Verknuepfter NPC-Kontext
              </label>
              <div className="rounded border border-hero-dark bg-slate-950/70 p-3 font-libre text-sm leading-relaxed text-gray-200">
                {npcContext}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block font-barlow text-xs font-bold uppercase text-gray-400">
                  Gesamt-Items
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={itemCount}
                  onChange={(event) => setItemCount(Number(event.target.value))}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                />
              </div>
              <div>
                <label className="mb-2 block font-barlow text-xs font-bold uppercase text-gray-400">
                  Magische Items
                </label>
                <input
                  type="number"
                  min={0}
                  max={itemCount}
                  value={magicItemCount}
                  onChange={(event) => setMagicItemCount(Number(event.target.value))}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block font-barlow text-xs font-bold uppercase text-gray-400">
                Fokus der Waren
              </label>
              <textarea
                value={itemDirection}
                onChange={(event) => setItemDirection(event.target.value)}
                rows={4}
                className="w-full resize-none rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
                placeholder="z.B. einfache Waffen und Ruestungen"
              />
            </div>

            <div>
              <label className="mb-2 block font-barlow text-xs font-bold uppercase text-gray-400">
                Legalitaet
              </label>
              <select
                value={legality}
                onChange={(event) => setLegality(event.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
              >
                {LEGALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded border border-hero-dark bg-slate-900/70 p-3 font-libre text-sm text-gray-200">
              <input
                type="checkbox"
                checked={includeServices}
                onChange={(event) => setIncludeServices(event.target.checked)}
                className="mt-1 rounded border-hero-dark bg-slate-800 text-accent-gold focus:ring-accent-gold"
              />
              Dienstleistungen, Rohstoffe &amp; Quests anbieten?
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              className="flex w-full items-center justify-center gap-2 rounded border border-accent-gold bg-accent-gold px-4 py-3 font-barlow text-sm font-bold uppercase text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generieren
            </button>
          </aside>

          <main className="space-y-4 p-5">
            {error ? (
              <div className="rounded border border-red-500/50 bg-red-950/40 p-3 font-libre text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {isGenerating ? <LoadingSparkles /> : null}

            {!isGenerating && !hasItems ? (
              <div className="rounded-lg border border-dashed border-hero-border/50 bg-slate-950/40 p-8 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-accent-gold" />
                <p className="font-libre text-gray-300">
                  Noch kein Inventar generiert. Beschreibe den Warenfokus und starte die KI.
                </p>
              </div>
            ) : null}

            {hasItems ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-barlow text-xl font-bold uppercase text-accent-gold">
                    Review ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isGenerating}
                    className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition-colors hover:bg-hero-vibrant disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Inventar uebernehmen
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <article
                      key={`${item.name}-${index}`}
                      className="rounded-lg border border-hero-dark bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <input
                            value={item.name}
                            onChange={(event) => updateItem(index, { name: event.target.value })}
                            className="w-full rounded border border-transparent bg-transparent font-barlow text-lg font-bold uppercase text-white outline-none focus:border-hero-border focus:bg-slate-900"
                          />
                          <textarea
                            value={item.description}
                            onChange={(event) => updateItem(index, { description: event.target.value })}
                            rows={2}
                            className="mt-2 w-full resize-none rounded border border-transparent bg-transparent font-libre text-sm leading-relaxed text-gray-300 outline-none focus:border-hero-border focus:bg-slate-900"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="sr-only" htmlFor={`price-${index}`}>
                            Preis in Gold
                          </label>
                          <input
                            id={`price-${index}`}
                            type="number"
                            min={0}
                            value={item.base_price_gp}
                            onChange={(event) =>
                              updateItem(index, {
                                base_price_gp: Math.max(0, Math.round(Number(event.target.value) || 0)),
                              })
                            }
                            className="w-24 rounded border border-hero-dark bg-slate-900 p-2 text-right font-libre text-white outline-none focus:border-accent-gold"
                            title="Basispreis in Goldmuenzen (gp)"
                          />
                          <span className="font-barlow text-xs font-bold uppercase text-accent-gold">GM</span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded border border-red-500/40 p-2 text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-100"
                            title="Item entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${RARITY_CLASSES[item.rarity]}`}
                          title={`Seltenheit: ${item.rarity}`}
                        >
                          {item.rarity}
                        </span>
                        <span
                          className="rounded-full border border-hero-border/50 bg-background-dark px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-300"
                          title="Item-Kategorie"
                        >
                          {item.item_type}
                        </span>
                        {item.is_ration_package ? (
                          <span
                            className="rounded-full border border-hero-vibrant/50 bg-hero-vibrant/15 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant"
                            title="Beim Kauf +2 Rationen (max. 10)"
                          >
                            Proviant +2
                          </span>
                        ) : null}
                        {item.is_magical ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold"
                            title="Magischer oder besonderer Gegenstand"
                          >
                            <Star className="h-3 w-3" />
                            Magisch
                          </span>
                        ) : null}
                        {!item.is_legal ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/60 bg-red-950/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-red-200"
                            title="Illegaler oder Schwarzmarkt-Gegenstand"
                          >
                            <Skull className="h-3 w-3" />
                            Illegal
                          </span>
                        ) : (
                          <span
                            className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-emerald-200"
                            title="Legal handelbar"
                          >
                            Legal
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
