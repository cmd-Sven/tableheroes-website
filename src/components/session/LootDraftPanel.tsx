"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Gift, Loader2, Plus, Sparkles, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  requestLootSuggestion,
  type LootAiQuantityParams,
  type LootSuggestion,
  type LootSuggestionItem,
} from "@/src/lib/actions/ai-loot-actions";
import {
  listCampaignShopItemsForLootDraft,
  publishLootToSession,
  type CampaignShopLootPickRow,
  type LootDraftPayload,
  type LootItemRow,
} from "@/src/lib/actions/loot-actions";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  STANDARD_INVENTORY_CATEGORIES,
  type InventoryDisplayCategory,
} from "@/src/lib/characters/dnd5e/inventory-categories";
import {
  inferLootInventoryCategory,
  itemTypeToDisplayCategory,
} from "@/src/lib/characters/dnd5e/loot-to-inventory";
import { enrichLootMechanics } from "@/src/lib/characters/dnd5e/loot-mechanics";

type DraftItem = LootItemRow;

function suggestionToDraftItems(items: LootSuggestionItem[]): DraftItem[] {
  return items.map((it) => ({
    id: crypto.randomUUID(),
    name: it.name,
    desc: it.desc,
    mundaneName: it.mundaneName,
    mundaneDesc: it.mundaneDesc,
    rarity: it.rarity,
    price: it.price,
    isMagical: it.isMagical,
    inventoryCategory:
      it.inventoryCategory ??
      inferLootInventoryCategory(it.name, it.desc, it.isMagical, it.kind),
    kind: it.kind,
    weightLb: it.weightLb,
    referenceId: it.referenceId,
    attunement: it.attunement,
    damage: it.damage,
    damageType: it.damageType,
    properties: it.properties,
    rangeMeters: it.rangeMeters,
    acFormula: it.acFormula,
    strRequirement: it.strRequirement,
    isShield: it.isShield,
    effect: it.effect,
  }));
}

function shopRowToDraftItem(row: CampaignShopLootPickRow): DraftItem {
  const isMagical = row.is_magical;
  const base: DraftItem = {
    id: crypto.randomUUID(),
    name: row.name.trim() || "Gegenstand",
    desc: (row.description ?? "").trim(),
    rarity: row.rarity.trim().toLowerCase() || "common",
    price: Math.max(0, Math.round(row.base_price_gp)),
    isMagical,
    inventoryCategory: itemTypeToDisplayCategory(row.item_type),
    kind: row.item_type,
    mundaneName: isMagical ? undefined : undefined,
    mundaneDesc: isMagical ? undefined : undefined,
  };
  return enrichLootMechanics(base);
}

type Props = {
  sessionId: string;
  campaignId: string;
  /** Aktuell auf der Bühne verknüpfte Truhe (session_live_states.current_loot_id) */
  activeLootId: string | null;
  onClearStageLoot: () => void;
  onPublished: () => void | Promise<void>;
  /** compact = schmale Leiste | modal = breites Layout ohne äußeren Rahmen */
  variant?: "compact" | "modal";
};

export function LootDraftPanel({
  sessionId,
  campaignId,
  activeLootId,
  onClearStageLoot,
  onPublished,
  variant = "compact",
}: Props) {
  const isModal = variant === "modal";
  const [context, setContext] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [name, setName] = useState("");
  const [gp, setGp] = useState(0);
  const [sp, setSp] = useState(0);
  const [countMagical, setCountMagical] = useState(1);
  const [countMundane, setCountMundane] = useState(2);
  const [goldGp, setGoldGp] = useState(40);
  const [goldSp, setGoldSp] = useState(10);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isGenerating, startGenerating] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [catalogItems, setCatalogItems] = useState<CampaignShopLootPickRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customMagical, setCustomMagical] = useState(false);
  const [customCategory, setCustomCategory] = useState<InventoryDisplayCategory>("gear");

  const applySuggestion = useCallback((s: LootSuggestion) => {
    setName(s.name);
    setGp(s.gp);
    setSp(s.sp);
    setItems(suggestionToDraftItems(s.items));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      const res = await listCampaignShopItemsForLootDraft(campaignId);
      if (cancelled) return;
      setCatalogLoading(false);
      if (!res.ok) {
        setCatalogItems([]);
        return;
      }
      setCatalogItems(res.items);
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  function updateItem(id: string, patch: Partial<Omit<DraftItem, "id">>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addCustomItem() {
    const n = customName.trim();
    if (!n) {
      toast.error("Bitte einen Namen für den Gegenstand eingeben.");
      return;
    }
    const desc = customDesc.trim();
    setItems((prev) => [
      ...prev,
      enrichLootMechanics({
        id: crypto.randomUUID(),
        name: n,
        desc: desc || "—",
        rarity: "common",
        price: 0,
        isMagical: customMagical,
        inventoryCategory:
          customCategory ||
          inferLootInventoryCategory(n, desc, customMagical),
        kind: customCategory === "weapons" ? "weapon" : customCategory === "armor" ? "armor" : customCategory === "potions" ? "consumable" : "gear",
        mundaneName: customMagical ? "" : undefined,
        mundaneDesc: customMagical ? "" : undefined,
      }),
    ]);
    setCustomName("");
    setCustomDesc("");
    setCustomMagical(false);
    setCustomCategory("gear");
    toast.success("Gegenstand zum Pool hinzugefügt.");
  }

  function addFromCatalog() {
    if (!selectedCatalogId) {
      toast.message("Bitte einen Katalog-Eintrag wählen.");
      return;
    }
    const row = catalogItems.find((x) => x.id === selectedCatalogId);
    if (!row) return;
    setItems((prev) => [...prev, shopRowToDraftItem(row)]);
    toast.success(`„${row.name}“ zum Pool hinzugefügt.`);
  }

  function handleGenerate() {
    const quantities: LootAiQuantityParams = {
      magicalCount: Math.max(0, Math.min(12, Math.round(countMagical))),
      mundaneCount: Math.max(0, Math.min(12, Math.round(countMundane))),
      goldGp: Math.max(0, Math.min(5000, Math.round(goldGp))),
      silverSp: Math.max(0, Math.min(2000, Math.round(goldSp))),
    };
    startGenerating(async () => {
      try {
        const suggestion = await requestLootSuggestion(context, isCritical, quantities);
        applySuggestion(suggestion);
        toast.success("Beutevorschlag geladen — bitte prüfen und freigeben.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generierung fehlgeschlagen.";
        toast.error(msg);
      }
    });
  }

  function handlePublish() {
    if (activeLootId) {
      toast.error("Es liegt bereits eine Truhe auf der Bühne. Entferne sie zuerst.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Bitte einen Namen für den Beutestapel setzen.");
      return;
    }
    const draft: LootDraftPayload = {
      name: trimmed,
      gp: Math.max(0, Math.round(gp)),
      sp: Math.max(0, Math.round(sp)),
      items: items.map((it) => ({
        ...it,
        name: it.name.trim() || "Gegenstand",
        desc: it.desc.trim(),
        mundaneName: (it.mundaneName ?? "").trim() || undefined,
        mundaneDesc: (it.mundaneDesc ?? "").trim() || undefined,
        rarity: it.rarity.trim().toLowerCase() || "common",
        price: Math.max(0, Math.round(it.price)),
        isMagical: Boolean(it.isMagical),
      })),
    };

    startPublishing(async () => {
      const res = await publishLootToSession(sessionId, campaignId, draft);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Beute ist auf der Bühne.");
      await onPublished();
    });
  }

  const shell =
    "rounded-2xl border border-amber-900/60 bg-background-card/80 p-3";
  const modalShell = "space-y-4";
  const labelSm = isModal ? "text-xs" : "text-[9px]";
  const inputPad = isModal ? "text-sm py-2" : "text-xs py-1.5";

  return (
    <div className={isModal ? modalShell : shell}>
      {!isModal ? (
        <div className="mb-2 flex items-center gap-2">
          <Gift className="h-4 w-4 text-accent-gold" />
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
            Loot-Gun (KI → Freigabe)
          </span>
        </div>
      ) : null}

      {activeLootId ? (
        <div
          className={`rounded-lg border border-hero-border/40 bg-black/25 ${
            isModal ? "px-4 py-3" : "mb-3 px-2 py-2"
          }`}
        >
          <p
            className={`font-libre leading-relaxed text-gray-300 ${
              isModal ? "text-sm" : "text-[10px]"
            }`}
          >
            Eine Truhe ist mit der Session verknüpft. Münzen und Gegenstände steuerst du über die Truhe auf der Bühne.
          </p>
          <button
            type="button"
            onClick={() => onClearStageLoot()}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded border border-amber-800/70 bg-amber-950/40 font-barlow font-extrabold uppercase text-amber-200 hover:bg-amber-900/50 ${
              isModal ? "py-2.5 text-xs" : "py-1.5 text-[9px]"
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            Truhe von der Bühne nehmen
          </button>
        </div>
      ) : null}

      <label className={`mb-1 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
        Szene / Kontext
      </label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={isModal ? 4 : 2}
        placeholder="z. B. Goblin-Lager nach dem Kampf, Schatzkammer des Magiers …"
        className={`mb-3 w-full resize-none rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-gray-200 outline-none focus:border-accent-gold ${
          isModal ? "min-h-[6rem] text-sm" : "text-xs"
        }`}
      />

      <div
        className={`mb-3 rounded-lg border border-amber-900/45 bg-black/20 ${
          isModal ? "p-4" : "p-2.5"
        }`}
      >
        <p className={`mb-2 font-barlow font-bold uppercase text-accent-gold/90 ${labelSm}`}>
          Beute-Vorgaben (KI)
        </p>
        <div className={`grid gap-2 sm:grid-cols-2 ${isModal ? "sm:grid-cols-4" : ""}`}>
          <div>
            <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
              Magische Items
            </span>
            <input
              type="number"
              min={0}
              max={12}
              value={countMagical}
              onChange={(e) => setCountMagical(Math.max(0, Math.min(12, Math.round(Number(e.target.value) || 0))))}
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-barlow text-white outline-none focus:border-accent-gold ${inputPad}`}
            />
          </div>
          <div>
            <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
              Profane Items
            </span>
            <input
              type="number"
              min={0}
              max={12}
              value={countMundane}
              onChange={(e) => setCountMundane(Math.max(0, Math.min(12, Math.round(Number(e.target.value) || 0))))}
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-barlow text-white outline-none focus:border-accent-gold ${inputPad}`}
            />
          </div>
          <div>
            <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
              Gold (gp)
            </span>
            <input
              type="number"
              min={0}
              value={goldGp}
              onChange={(e) => setGoldGp(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-barlow text-white outline-none focus:border-accent-gold ${inputPad}`}
            />
          </div>
          <div>
            <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
              Silber (sp)
            </span>
            <input
              type="number"
              min={0}
              value={goldSp}
              onChange={(e) => setGoldSp(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-barlow text-white outline-none focus:border-accent-gold ${inputPad}`}
            />
          </div>
        </div>
        <p className={`mt-2 font-libre text-gray-500 ${isModal ? "text-xs" : "text-[10px]"}`}>
          Die KI liefert exakt die gewählten Stückzahlen; Gold- und Silberwerte werden wie oben gesetzt. Bei Lücken
          füllt die App Platzhalter ein, die du vor der Freigabe bearbeiten kannst.
        </p>
      </div>

      <div
        className={`mb-3 rounded-lg border border-hero-border/40 bg-black/25 ${
          isModal ? "p-4" : "p-2.5"
        }`}
      >
        <p className={`mb-2 font-barlow font-bold uppercase text-gray-300 ${labelSm}`}>Eigenen Loot hinzufügen</p>

        <div className={`space-y-2 ${isModal ? "md:grid md:grid-cols-2 md:gap-4 md:space-y-0" : ""}`}>
          <div className="space-y-2">
            <span className={`font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>Manuell</span>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name"
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-barlow text-white outline-none focus:border-accent-gold ${inputPad}`}
            />
            <textarea
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              rows={2}
              placeholder="Beschreibung"
              className={`w-full resize-none rounded border border-hero-dark bg-slate-900 px-2 font-libre text-gray-300 outline-none focus:border-accent-gold ${
                isModal ? "text-sm" : "text-xs"
              }`}
            />
            <label className="flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
              <input
                type="checkbox"
                checked={customMagical}
                onChange={(e) => setCustomMagical(e.target.checked)}
                className="rounded border-hero-dark"
              />
              Magisch
            </label>
            <div className="flex flex-wrap gap-1">
              {STANDARD_INVENTORY_CATEGORIES.filter((c) => c !== "unknown").map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const active = customCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    title={cat}
                    onClick={() => setCustomCategory(cat)}
                    className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                      active ? "ring-1 ring-hero-vibrant border-hero-vibrant" : ""
                    } ${CATEGORY_COLORS[cat]}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addCustomItem}
              className={`flex w-full items-center justify-center gap-2 rounded border border-emerald-800/60 bg-emerald-950/40 py-2 font-barlow font-extrabold uppercase text-hero-vibrant hover:bg-emerald-900/35 ${
                isModal ? "text-xs" : "text-[10px]"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Zum Pool
            </button>
          </div>

          <div className="space-y-2 border-t border-amber-900/30 pt-3 md:border-t-0 md:border-l md:pl-4 md:pt-0">
            <span className={`font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
              Aus Shop-Katalog (Kampagne)
            </span>
            <select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              disabled={catalogLoading || catalogItems.length === 0}
              className={`w-full rounded border border-hero-dark bg-slate-900 px-2 font-libre text-gray-200 outline-none focus:border-accent-gold disabled:opacity-50 ${inputPad}`}
            >
              <option value="">
                {catalogLoading ? "Lade Katalog …" : catalogItems.length === 0 ? "Keine Shop-Items" : "Gegenstand wählen …"}
              </option>
              {catalogItems.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_magical ? " (magisch)" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addFromCatalog}
              disabled={!selectedCatalogId || catalogItems.length === 0}
              className={`flex w-full items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 py-2 font-barlow font-extrabold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-40 ${
                isModal ? "text-xs" : "text-[10px]"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Aus Katalog übernehmen
            </button>
          </div>
        </div>
      </div>

      <label
        className={`mb-2 flex cursor-pointer items-center gap-2 font-barlow font-bold uppercase text-gray-400 ${
          isModal ? "text-xs" : "text-[10px]"
        }`}
      >
        <input
          type="checkbox"
          checked={isCritical}
          onChange={(e) => setIsCritical(e.target.checked)}
          className="rounded border-hero-dark"
        />
        Kritischer Treffer (selteneres Item)
      </label>

      <button
        type="button"
        disabled={isGenerating}
        onClick={handleGenerate}
        className={`mb-3 flex w-full items-center justify-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 py-2 font-barlow font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50 ${
          isModal ? "text-sm" : "text-[10px]"
        }`}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Loot generieren
      </button>

      {items.length > 0 || name.trim() || gp > 0 || sp > 0 ? (
        <div className="space-y-3 border-t border-amber-900/40 pt-3">
          <label className={`block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>
            Name des Stapels
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-white outline-none focus:border-accent-gold ${
              isModal ? "text-base" : "text-sm"
            }`}
          />

          <div className={`grid grid-cols-2 ${isModal ? "gap-3" : "gap-2"}`}>
            <div>
              <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>GP</span>
              <input
                type="number"
                min={0}
                value={gp}
                onChange={(e) => setGp(Number(e.target.value) || 0)}
                className={`w-full rounded border border-hero-dark bg-slate-900 px-2 py-1 font-barlow text-white outline-none focus:border-accent-gold ${
                  isModal ? "text-base" : "text-sm"
                }`}
              />
            </div>
            <div>
              <span className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>SP</span>
              <input
                type="number"
                min={0}
                value={sp}
                onChange={(e) => setSp(Number(e.target.value) || 0)}
                className={`w-full rounded border border-hero-dark bg-slate-900 px-2 py-1 font-barlow text-white outline-none focus:border-accent-gold ${
                  isModal ? "text-base" : "text-sm"
                }`}
              />
            </div>
          </div>

          <p className={`font-barlow font-bold uppercase text-gray-500 ${labelSm}`}>Gegenstände</p>
          <ul
            className={`space-y-2 overflow-y-auto pr-1 ${
              isModal ? "max-h-[min(52vh,28rem)] md:grid md:max-h-none md:grid-cols-2 md:gap-3 md:space-y-0" : "max-h-48"
            }`}
          >
            {items.map((it) => (
              <li
                key={it.id}
                className={`rounded-lg border border-hero-border/35 bg-black/30 ${
                  isModal ? "p-3" : "p-2"
                }`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-hero-dark/80 bg-slate-900 px-1.5 py-0.5 font-barlow text-xs text-white outline-none focus:border-accent-gold"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="shrink-0 rounded border border-red-900/60 p-1 text-red-300 hover:bg-red-950/50"
                    aria-label="Item entfernen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={it.desc}
                  onChange={(e) => updateItem(it.id, { desc: e.target.value })}
                  rows={isModal ? 3 : 2}
                  className={`mb-1 w-full resize-none rounded border border-hero-dark/80 bg-slate-900 px-1.5 py-0.5 font-libre text-gray-300 outline-none focus:border-accent-gold ${
                    isModal ? "text-xs" : "text-[10px]"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={it.rarity}
                    onChange={(e) => updateItem(it.id, { rarity: e.target.value })}
                    className="w-24 rounded border border-hero-dark/80 bg-slate-900 px-1 py-0.5 font-barlow text-[10px] text-gray-200"
                    placeholder="rarity"
                  />
                  <input
                    type="number"
                    min={0}
                    value={it.price}
                    onChange={(e) =>
                      updateItem(it.id, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                    }
                    className="w-20 rounded border border-hero-dark/80 bg-slate-900 px-1 py-0.5 font-barlow text-[10px] text-gray-200"
                    title="gp"
                  />
                  <div className="flex flex-wrap gap-0.5">
                    {STANDARD_INVENTORY_CATEGORIES.filter((c) => c !== "unknown").map((cat) => {
                      const Icon = CATEGORY_ICONS[cat];
                      const active = (it.inventoryCategory ?? "gear") === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          title={cat}
                          onClick={() => updateItem(it.id, { inventoryCategory: cat })}
                          className={`flex h-7 w-7 items-center justify-center rounded border ${
                            active ? "ring-1 ring-accent-gold" : "opacity-60"
                          } ${CATEGORY_COLORS[cat]}`}
                        >
                          <Icon className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-1 font-barlow text-[9px] uppercase text-gray-500">
                    <input
                      type="checkbox"
                      checked={it.isMagical}
                      onChange={(e) => updateItem(it.id, { isMagical: e.target.checked })}
                    />
                    Magisch
                  </label>
                </div>
                {it.isMagical ? (
                  <div className="mt-2 space-y-1.5 rounded border border-accent-gold/25 bg-black/20 p-2">
                    <p className="font-barlow text-[9px] font-bold uppercase text-accent-gold/90">
                      Vor Identifikation (Spieler und Bühne)
                    </p>
                    <input
                      type="text"
                      value={it.mundaneName ?? ""}
                      onChange={(e) => updateItem(it.id, { mundaneName: e.target.value })}
                      placeholder="z. B. Eine dreckige Flasche mit undefinierbarem Inhalt"
                      className="w-full rounded border border-hero-dark/80 bg-slate-900 px-1.5 py-0.5 font-barlow text-[10px] text-white outline-none focus:border-accent-gold"
                    />
                    <textarea
                      value={it.mundaneDesc ?? ""}
                      onChange={(e) => updateItem(it.id, { mundaneDesc: e.target.value })}
                      rows={2}
                      placeholder="Nur Aussehen/Gefühl — kein Itemtyp, keine Wirkung …"
                      className="w-full resize-none rounded border border-hero-dark/80 bg-slate-900 px-1.5 py-0.5 font-libre text-[10px] text-gray-300 outline-none focus:border-accent-gold"
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={isPublishing || Boolean(activeLootId)}
            onClick={handlePublish}
            className={`flex w-full items-center justify-center gap-2 rounded border border-emerald-700/70 bg-emerald-950/50 py-2 font-barlow font-extrabold uppercase text-hero-vibrant hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-45 ${
              isModal ? "py-3 text-sm" : "text-[10px]"
            }`}
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Auf die Bühne werfen
          </button>
        </div>
      ) : null}
    </div>
  );
}
