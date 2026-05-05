"use client";

import { useCallback, useState, useTransition } from "react";
import { Gift, Loader2, Sparkles, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  requestLootSuggestion,
  type LootSuggestion,
  type LootSuggestionItem,
} from "@/src/lib/actions/ai-loot-actions";
import {
  publishLootToSession,
  type LootDraftPayload,
  type LootItemRow,
} from "@/src/lib/actions/loot-actions";

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
  }));
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
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isGenerating, startGenerating] = useTransition();
  const [isPublishing, startPublishing] = useTransition();

  const applySuggestion = useCallback((s: LootSuggestion) => {
    setName(s.name);
    setGp(s.gp);
    setSp(s.sp);
    setItems(suggestionToDraftItems(s.items));
  }, []);

  function updateItem(id: string, patch: Partial<Omit<DraftItem, "id">>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleGenerate() {
    startGenerating(async () => {
      try {
        const suggestion = await requestLootSuggestion(context, isCritical);
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
            Eine Truhe ist mit der Session verknüpft. Münzen nimmst du über die Truhe unten; Gegenstände
            liegen als Karten auf der Bühne.
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

      <label
        className={`mb-1 block font-barlow font-bold uppercase text-gray-500 ${
          isModal ? "text-xs" : "text-[9px]"
        }`}
      >
        Szene / Kontext
      </label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={isModal ? 4 : 2}
        placeholder="z. B. Goblin-Lager nach dem Kampf, Schatzkammer des Magiers …"
        className={`mb-2 w-full resize-none rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-gray-200 outline-none focus:border-accent-gold ${
          isModal ? "min-h-[6rem] text-sm" : "text-xs"
        }`}
      />

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

      {items.length > 0 || name ? (
        <div className="space-y-3 border-t border-amber-900/40 pt-3">
          <label
            className={`block font-barlow font-bold uppercase text-gray-500 ${
              isModal ? "text-xs" : "text-[9px]"
            }`}
          >
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
              <span
                className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${
                  isModal ? "text-xs" : "text-[9px]"
                }`}
              >
                GP
              </span>
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
              <span
                className={`mb-0.5 block font-barlow font-bold uppercase text-gray-500 ${
                  isModal ? "text-xs" : "text-[9px]"
                }`}
              >
                SP
              </span>
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

          <p
            className={`font-barlow font-bold uppercase text-gray-500 ${
              isModal ? "text-xs" : "text-[9px]"
            }`}
          >
            Gegenstände
          </p>
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
            Loot freigeben
          </button>
        </div>
      ) : null}
    </div>
  );
}
