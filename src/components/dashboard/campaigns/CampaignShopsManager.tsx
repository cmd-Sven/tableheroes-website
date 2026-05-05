"use client";

import { useState } from "react";
import {
  createCampaignShop,
  deleteCampaignShop,
} from "@/src/app/dashboard/campaigns/[id]/shop-actions";
import type { CampaignShopRow } from "@/src/app/dashboard/campaigns/[id]/shop-queries";
import { AIShopGeneratorModal } from "@/src/components/dashboard/campaigns/shops/AIShopGeneratorModal";
import {
  SHOP_ARCHETYPES,
  shopArchetypeLabel,
} from "@/src/lib/shop-archetypes";
import { getCatalogEntryCount } from "@/src/lib/shop-catalog";

type Props = {
  campaignId: string;
  shops: CampaignShopRow[];
};

export function CampaignShopsManager({ campaignId, shops }: Props) {
  const [shopMode, setShopMode] = useState<"archetype" | "unique">(
    "archetype",
  );
  const [aiShop, setAiShop] = useState<CampaignShopRow | null>(null);

  const buildNpcContext = (shop: CampaignShopRow) => {
    const merchantContext =
      shop.merchant_npcs.length > 0
        ? shop.merchant_npcs
            .map((npc) => {
              const parts = [
                `Name: ${npc.name}`,
                npc.role ? `Rolle: ${npc.role}` : null,
                npc.description ? `Beschreibung: ${npc.description}` : null,
              ].filter(Boolean);
              return parts.join(". ");
            })
            .join("\n\n")
        : "Kein NPC ist direkt mit diesem Shop verknuepft.";

    return `Shop: ${shop.name}. Modus: ${shop.shop_mode}. Notizen: ${shop.notes || "Keine"}.\n\n${merchantContext}`;
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Neue Shops
        </h2>
        <form action={createCampaignShop} className="max-w-xl space-y-4">
          <input type="hidden" name="campaign_id" value={campaignId} />
          <input type="hidden" name="shop_mode" value={shopMode} />

          <div>
            <label
              htmlFor="shop-name"
              className="mb-2 block font-barlow font-bold uppercase text-xs text-gray-300"
            >
              Name
            </label>
            <input
              id="shop-name"
              name="name"
              required
              placeholder="z. B. Taverne zum goldenen Huf"
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
              Modus
            </legend>
            <label className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-200">
              <input
                type="radio"
                name="shop_mode_ui"
                checked={shopMode === "archetype"}
                onChange={() => setShopMode("archetype")}
                className="border-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
              />
              Archetyp (Standardliste + Preismodifikator)
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-200">
              <input
                type="radio"
                name="shop_mode_ui"
                checked={shopMode === "unique"}
                onChange={() => setShopMode("unique")}
                className="border-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
              />
              Unique (eigener Katalog, später)
            </label>
          </fieldset>

          {shopMode === "archetype" ? (
            <div>
              <label
                htmlFor="archetype_key"
                className="mb-2 block font-barlow font-bold uppercase text-xs text-gray-300"
              >
                Shop-Typ
              </label>
              <select
                id="archetype_key"
                name="archetype_key"
                required
                className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
              >
                {SHOP_ARCHETYPES.map((a) => {
                  const n = getCatalogEntryCount(a.key);
                  return (
                    <option key={a.key} value={a.key}>
                      {a.label}
                      {n > 0 ? ` (${n} im Katalog)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}

          {shopMode === "archetype" ? (
            <div>
              <label
                htmlFor="price_modifier_percent"
                className="mb-2 block font-barlow font-bold uppercase text-xs text-gray-300"
              >
                Preismodifikator (%)
              </label>
              <input
                id="price_modifier_percent"
                name="price_modifier_percent"
                type="number"
                defaultValue={0}
                step={1}
                className="w-full max-w-xs rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
              />
              <p className="mt-1 font-libre text-xs text-gray-500">
                Positiv = teurer, negativ = günstiger (Basispreise aus Vorlage).
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="shop-notes"
              className="mb-2 block font-barlow font-bold uppercase text-xs text-gray-300"
            >
              Notizen (optional)
            </label>
            <textarea
              id="shop-notes"
              name="notes"
              rows={2}
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            className="rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
          >
            Shop anlegen
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Deine Shops
        </h2>
        {shops.length === 0 ? (
          <p className="font-libre text-gray-400">
            Noch keine Shops. Lege oben den ersten an.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-libre text-sm text-gray-200">
              <thead>
                <tr className="border-b border-hero-border/60 font-barlow text-xs font-bold uppercase text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Modus</th>
                  <th className="py-2 pr-4">Typ / Preis %</th>
                  <th className="py-2 pr-4">Händler</th>
                  <th className="py-2 w-40" />
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-hero-border/30 align-top"
                  >
                    <td className="py-3 pr-4 font-medium text-white">
                      {s.name}
                    </td>
                    <td className="py-3 pr-4 capitalize">
                      {s.shop_mode === "archetype" ? "Archetyp" : "Unique"}
                    </td>
                    <td className="py-3 pr-4">
                      {s.shop_mode === "archetype" ? (
                        <>
                          {shopArchetypeLabel(s.archetype_key)}
                          <span className="text-gray-500">
                            {" "}
                            ({s.price_modifier_percent > 0 ? "+" : ""}
                            {s.price_modifier_percent}%)
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {s.merchant_npcs.length > 0 ? (
                        <div className="space-y-1">
                          {s.merchant_npcs.map((npc) => (
                            <span
                              key={npc.id}
                              className="block rounded border border-accent-gold/30 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold"
                            >
                              {npc.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Kein Händler-NPC
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => setAiShop(s)}
                        className="mb-2 block rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold transition-colors hover:bg-accent-gold hover:text-black"
                      >
                        KI-Inventar
                      </button>
                      <form action={deleteCampaignShop}>
                        <input
                          type="hidden"
                          name="campaign_id"
                          value={campaignId}
                        />
                        <input type="hidden" name="shop_id" value={s.id} />
                        <button
                          type="submit"
                          className="font-barlow text-xs font-bold uppercase text-red-400 hover:text-red-300"
                        >
                          Löschen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {aiShop ? (
        <AIShopGeneratorModal
          campaignId={campaignId}
          shopId={aiShop.id}
          shopName={aiShop.name}
          npcContext={buildNpcContext(aiShop)}
          onClose={() => setAiShop(null)}
        />
      ) : null}
    </div>
  );
}
