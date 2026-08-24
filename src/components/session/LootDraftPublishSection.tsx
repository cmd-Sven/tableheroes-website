/** Publish section: stack name, coins, item list, and stage publish button. */
import { Gift, Loader2, Trash2 } from "lucide-react";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  STANDARD_INVENTORY_CATEGORIES,
} from "@/src/lib/characters/dnd5e/inventory-categories";
import type { DraftItem } from "./loot-draft-panel.utils";

type Props = {
  isModal: boolean;
  labelSm: string;
  name: string;
  setName: (v: string) => void;
  gp: number;
  setGp: (v: number) => void;
  sp: number;
  setSp: (v: number) => void;
  items: DraftItem[];
  updateItem: (id: string, patch: Partial<Omit<DraftItem, "id">>) => void;
  removeItem: (id: string) => void;
  isPublishing: boolean;
  activeLootId: string | null;
  onPublish: () => void;
};

export function LootDraftPublishSection({
  isModal,
  labelSm,
  name,
  setName,
  gp,
  setGp,
  sp,
  setSp,
  items,
  updateItem,
  removeItem,
  isPublishing,
  activeLootId,
  onPublish,
}: Props) {
  return (
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
        onClick={onPublish}
        className={`flex w-full items-center justify-center gap-2 rounded border border-emerald-700/70 bg-emerald-950/50 py-2 font-barlow font-extrabold uppercase text-hero-vibrant hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-45 ${
          isModal ? "py-3 text-sm" : "text-[10px]"
        }`}
      >
        {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
        Auf die Bühne werfen
      </button>
    </div>
  );
}
