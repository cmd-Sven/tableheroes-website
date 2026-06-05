"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Minus, Plus, ShoppingBag, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import { calculateDynamicPriceCp, calculateSellPriceCp, parsePurchasePriceFromDescription } from "@/src/lib/pricing-engine";
import { CP_PER_GP, formatCopper, type CoinPouch } from "@/src/lib/dnd-currency";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";
import { resolveShopItems, type ResolvedShopItem } from "@/src/lib/shop-resolve-items";
import {
  checkoutShopCart,
  getCharacterShopWealth,
  sellCharacterItemsAtShop,
} from "@/src/lib/actions/shop-checkout-actions";

type PartyCharacterOption = {
  id: string;
  name: string;
  playerUserId?: string | null;
};

type Props = {
  campaignId: string;
  shopId: string;
  merchantNpcId: string | null;
  /** Eigener Charakter des eingeloggten Spielers */
  characterId: string | null;
  isGM?: boolean;
  partyCharacters?: PartyCharacterOption[];
  onClose?: () => void;
};

type SellableItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sellPriceCp: number;
};

const RARITY_CLASS: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

export function LiveStageShopOverlay({
  campaignId,
  shopId,
  merchantNpcId,
  characterId,
  isGM = false,
  partyCharacters = [],
  onClose,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [shopName, setShopName] = useState("Geöffneter Shop");
  const [shopMode, setShopMode] = useState<string>("unique");
  const [shopArchetypeKey, setShopArchetypeKey] = useState<string | null>(null);
  const [shopModifier, setShopModifier] = useState(0);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [locationReputation, setLocationReputation] = useState(0);
  const [npcReputation, setNpcReputation] = useState(0);
  const [items, setItems] = useState<ResolvedShopItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [activeCharacterId, setActiveCharacterId] = useState<string>(
    () => characterId ?? partyCharacters[0]?.id ?? "",
  );
  const [characterWealth, setCharacterWealth] = useState<CoinPouch>({
    gp: 0,
    sp: 0,
    cp: 0,
    ep: 0,
    pp: 0,
  });
  const [sellItems, setSellItems] = useState<SellableItem[]>([]);
  const [sellSelection, setSellSelection] = useState<Set<string>>(() => new Set());

  const tradingCharacterId = activeCharacterId.trim() || null;
  const gmProxy = isGM && tradingCharacterId !== characterId;

  const refreshWealth = useCallback(async (charId: string) => {
    if (!charId) {
      setCharacterWealth({ gp: 0, sp: 0, cp: 0, ep: 0, pp: 0 });
      return;
    }
    const result = await getCharacterShopWealth(charId);
    if (!result.error) {
      setCharacterWealth(result.wealth);
    }
  }, []);

  const loadSellInventory = useCallback(
    async (charId: string) => {
      if (!charId) {
        setSellItems([]);
        return;
      }
      const { data, error: invErr } = await (supabase as any)
        .from("character_items")
        .select("id, name, description, category")
        .eq("character_id", charId)
        .eq("is_deleted", false)
        .order("name");

      if (invErr) {
        setSellItems([]);
        return;
      }

      setSellItems(
        ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
          const category = String(row.category ?? "Equipment");
          const description = row.description != null ? String(row.description) : null;
          const purchasePriceCp = parsePurchasePriceFromDescription(description);
          const baseCp =
            purchasePriceCp ??
            (category === "Consumable"
              ? 8 * CP_PER_GP
              : category === "Weapon"
                ? 25 * CP_PER_GP
                : 12 * CP_PER_GP);
          const sellPriceCp = calculateSellPriceCp(baseCp);
          return {
            id: String(row.id),
            name: String(row.name ?? ""),
            category,
            description,
            sellPriceCp,
          };
        }),
      );
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      setIsLoading(true);
      setError(null);

      const { data: shopRaw, error: shopError } = await supabase
        .from("campaign_shops")
        .select("id, name, shop_mode, archetype_key, price_modifier_percent")
        .eq("id", shopId)
        .maybeSingle();

      if (shopError || !shopRaw) {
        if (!cancelled) {
          setError("Shop konnte nicht geladen werden.");
          setIsLoading(false);
        }
        return;
      }

      const { data: itemRows, error: itemError } = await supabase
        .from("campaign_shop_items")
        .select(
          "id, name, description, base_price_gp, is_magical, is_legal, rarity, item_type, target_fap, is_ration_package",
        )
        .eq("shop_id", shopId)
        .order("sort_order", { ascending: true });

      if (itemError) {
        if (!cancelled) {
          setError("Inventar konnte nicht geladen werden.");
          setIsLoading(false);
        }
        return;
      }

      let merchantLocationId: string | null = null;
      if (merchantNpcId) {
        const { data: merchantRaw } = await supabase
          .from("npcs")
          .select("id, name, current_location_id")
          .eq("id", merchantNpcId)
          .maybeSingle();

        if (merchantRaw) {
          merchantLocationId =
            (merchantRaw as { current_location_id?: string | null }).current_location_id ?? null;
          if (!cancelled) {
            setMerchantName(String((merchantRaw as { name?: string }).name ?? ""));
          }
        }

        const { data: npcRepRaw } = await supabase
          .from("campaign_npc_reputation")
          .select("reputation_score")
          .eq("campaign_id", campaignId)
          .eq("npc_id", merchantNpcId)
          .maybeSingle();

        if (!cancelled) {
          setNpcReputation(
            Number((npcRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0),
          );
        }
      }

      if (merchantLocationId) {
        const { data: locationRepRaw } = await supabase
          .from("campaign_location_reputation")
          .select("reputation_score")
          .eq("campaign_id", campaignId)
          .eq("location_id", merchantLocationId)
          .maybeSingle();

        if (!cancelled) {
          setLocationReputation(
            Number(
              (locationRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0,
            ),
          );
        }
      }

      if (!cancelled) {
        const shopRecord = shopRaw as {
          name?: string;
          shop_mode?: string;
          archetype_key?: string | null;
          price_modifier_percent?: number;
        };
        setShopName(String(shopRecord.name ?? "Geöffneter Shop"));
        setShopMode(String(shopRecord.shop_mode ?? "unique"));
        setShopArchetypeKey(shopRecord.archetype_key ?? null);
        setShopModifier(Number(shopRecord.price_modifier_percent ?? 0));
        setItems(
          resolveShopItems(
            {
              shop_mode: String(shopRecord.shop_mode ?? "unique"),
              archetype_key: shopRecord.archetype_key ?? null,
            },
            (itemRows ?? []) as never[],
          ),
        );
        setIsLoading(false);
      }
    }

    void loadShop();
    return () => {
      cancelled = true;
    };
  }, [campaignId, merchantNpcId, shopId, supabase]);

  useEffect(() => {
    if (!tradingCharacterId) return;
    void refreshWealth(tradingCharacterId);
    void loadSellInventory(tradingCharacterId);
    setSellSelection(new Set());
  }, [tradingCharacterId, refreshWealth, loadSellInventory]);

  useEffect(() => {
    if (characterId && !isGM) {
      setActiveCharacterId(characterId);
    }
  }, [characterId, isGM]);

  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        dynamicPriceCp: calculateDynamicPriceCp(
          item.base_price_cp,
          shopModifier,
          locationReputation,
          npcReputation,
        ),
      })),
    [items, locationReputation, npcReputation, shopModifier],
  );

  const totalCp = pricedItems.reduce((sum, item) => {
    const quantity = cart[item.id] ?? 0;
    return sum + (item.dynamicPriceCp ?? 0) * quantity;
  }, 0);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const sellTotalCp = sellItems
    .filter((item) => sellSelection.has(item.id))
    .reduce((sum, item) => sum + item.sellPriceCp, 0);

  const changeQuantity = (itemId: string, delta: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + delta);
      const next = { ...current };
      if (nextQuantity === 0) delete next[itemId];
      else next[itemId] = nextQuantity;
      return next;
    });
  };

  const toggleSellItem = (itemId: string) => {
    setSellSelection((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleCheckout = () => {
    if (!tradingCharacterId) {
      toast.error("Kein Charakter für den Einkauf ausgewählt.");
      return;
    }

    const checkoutItems = pricedItems
      .filter((item) => (cart[item.id] ?? 0) > 0 && item.dynamicPriceCp != null)
      .map((item) => ({
        itemId: item.id,
        quantity: cart[item.id] ?? 0,
        calculatedPrice: item.dynamicPriceCp ?? 0,
      }));

    if (checkoutItems.length === 0) {
      toast.error("Dein Warenkorb ist leer.");
      return;
    }

    startTransition(async () => {
      const result = await checkoutShopCart(tradingCharacterId, shopId, checkoutItems, {
        merchantNpcId,
        gmProxy,
      });
      if (!result.success) {
        toast.error(result.error || "Kauf fehlgeschlagen.");
        return;
      }

      toast.success(
        gmProxy ? "Kauf für den Charakter abgeschlossen." : "Items wurden dem Inventar hinzugefügt.",
      );
      setCart({});
      await refreshWealth(tradingCharacterId);
      await loadSellInventory(tradingCharacterId);
    });
  };

  const handleSell = () => {
    if (!tradingCharacterId) {
      toast.error("Kein Charakter ausgewählt.");
      return;
    }
    const ids = [...sellSelection];
    if (ids.length === 0) {
      toast.error("Wähle Items zum Verkaufen.");
      return;
    }

    startTransition(async () => {
      const result = await sellCharacterItemsAtShop(tradingCharacterId, shopId, ids, {
        merchantNpcId,
        gmProxy,
      });
      if (!result.success) {
        toast.error(result.error || "Verkauf fehlgeschlagen.");
        return;
      }
      toast.success(
        gmProxy
          ? `Verkauf für Charakter: +${formatCopper(result.totalCp ?? 0)}`
          : `Verkauft: +${formatCopper(result.totalCp ?? 0)}`,
      );
      setSellSelection(new Set());
      await refreshWealth(tradingCharacterId);
      await loadSellInventory(tradingCharacterId);
    });
  };

  const characterOptions =
    isGM && partyCharacters.length > 0
      ? partyCharacters
      : tradingCharacterId
        ? [{ id: tradingCharacterId, name: "Dein Charakter" }]
        : [];

  return (
    <div className="absolute inset-x-4 top-24 z-30 mx-auto max-w-5xl overflow-hidden rounded-2xl border border-accent-gold/60 bg-[#0a1f10] shadow-2xl shadow-black/80">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hero-border/40 p-4">
        <div>
          <p className="flex items-center gap-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
            <ShoppingBag className="h-4 w-4" />
            Händlerangebot
          </p>
          <h3 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            {shopName}
          </h3>
          {merchantName ? (
            <p className="font-libre text-xs text-gray-300">Geöffnet von {merchantName}</p>
          ) : null}
          {shopMode === "archetype" && shopArchetypeKey ? (
            <p className="font-libre text-[10px] text-gray-500">Archetyp-Katalog · Ruf wirkt auf Preise</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isGM || characterOptions.length > 0) && (
            <label className="flex flex-col gap-1">
              <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                {isGM ? "Charakter (Kauf/Verkauf)" : "Charakter"}
              </span>
              <select
                value={activeCharacterId}
                onChange={(e) => setActiveCharacterId(e.target.value)}
                disabled={!isGM && !!characterId}
                className="rounded border border-hero-border/50 bg-slate-950 px-2 py-1.5 font-libre text-xs text-white outline-none focus:border-accent-gold disabled:opacity-70"
              >
                {!tradingCharacterId && <option value="">— wählen —</option>}
                {(isGM ? partyCharacters : characterOptions).map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="rounded border border-accent-gold/40 bg-[#132e1b] px-2 py-1.5">
            <DndCoinDisplay pouch={characterWealth} size="sm" />
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-red-500/40 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-red-200 hover:bg-red-950/50"
            >
              Shop schließen
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 border-b border-hero-border/30 px-4 pt-2">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`rounded-t px-4 py-2 font-barlow text-xs font-bold uppercase ${
            tab === "buy"
              ? "border border-b-0 border-accent-gold/50 bg-[#132e1b] text-accent-gold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Kaufen
        </button>
        <button
          type="button"
          onClick={() => setTab("sell")}
          className={`rounded-t px-4 py-2 font-barlow text-xs font-bold uppercase ${
            tab === "sell"
              ? "border border-b-0 border-accent-gold/50 bg-[#132e1b] text-accent-gold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Verkaufen
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 p-8 font-barlow text-sm font-bold uppercase text-accent-gold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Waren werden auf den Tresen gelegt...
        </div>
      ) : error ? (
        <div className="p-5 font-libre text-sm text-red-200">{error}</div>
      ) : tab === "buy" ? (
        <>
          {items.length === 0 ? (
            <p className="p-6 font-libre text-sm text-gray-400 italic">
              Dieser Shop hat noch keine Waren. Lege Items an oder wähle einen Archetyp mit Katalog.
            </p>
          ) : (
            <div className="grid max-h-[46vh] gap-3 overflow-y-auto p-4 md:grid-cols-2">
              {pricedItems.map((item) => {
                const quantity = cart[item.id] ?? 0;
                const priceCp = item.dynamicPriceCp;
                const unavailable = priceCp == null;

                return (
                  <article
                    key={item.id}
                    className="rounded-lg border border-hero-dark bg-[#132e1b] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-barlow text-base font-bold uppercase text-white">
                          {item.name}
                        </h4>
                        <p className="mt-1 line-clamp-2 font-libre text-xs leading-relaxed text-gray-300">
                          {item.description || "Keine Beschreibung."}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-barlow text-lg font-extrabold text-accent-gold">
                          {unavailable ? (
                            "Nein"
                          ) : (
                            <DndCoinDisplay totalCp={priceCp} size="md" />
                          )}
                        </p>
                        <p className="font-libre text-[10px] text-gray-500">
                          Basis <DndCoinDisplay totalCp={item.base_price_cp} size="xs" amountClassName="font-libre text-[10px] text-gray-500" />
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-barlow text-[10px] font-bold uppercase ${RARITY_CLASS[item.rarity] ?? RARITY_CLASS.common}`}
                      >
                        {item.rarity}
                      </span>
                      {item.is_magical ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                          <Star className="h-3 w-3" />
                          Magisch
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden rounded-full border border-hero-border/50 bg-[#0a1f10]">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={quantity === 0 || unavailable}
                          className="grid h-8 w-8 place-items-center text-gray-200 hover:bg-hero-dark disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center font-barlow text-sm font-bold text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, 1)}
                          disabled={unavailable}
                          className="grid h-8 w-8 place-items-center text-gray-200 hover:bg-hero-dark disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {unavailable ? (
                        <span className="font-libre text-xs text-red-200">Händler verweigert Verkauf</span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hero-border/40 p-4">
            <p className="font-libre text-sm text-gray-200">
              Warenkorb: <span className="text-accent-gold">{cartCount}</span> Items, Summe{" "}
              <DndCoinDisplay totalCp={totalCp} size="sm" className="inline-flex" />
              {gmProxy ? (
                <span className="ml-2 text-xs text-gray-500">(SL übernimmt Kauf)</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending || cartCount === 0 || !tradingCharacterId}
              className="inline-flex items-center gap-2 rounded border border-accent-gold bg-accent-gold px-5 py-2.5 font-barlow text-sm font-bold uppercase text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Bezahlen
            </button>
          </div>
        </>
      ) : (
        <>
          {sellItems.length === 0 ? (
            <p className="p-6 font-libre text-sm text-gray-400 italic">
              Keine verkaufbaren Items im Inventar dieses Charakters.
            </p>
          ) : (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto p-4">
              {sellItems.map((item) => {
                const selected = sellSelection.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 ${
                      selected
                        ? "border-accent-gold/60 bg-[#132e1b]"
                        : "border-hero-dark bg-[#132e1b]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSellItem(item.id)}
                        className="h-4 w-4 rounded border-hero-dark text-accent-gold"
                      />
                      <div>
                        <p className="font-barlow text-sm font-bold text-white">{item.name}</p>
                        <p className="font-libre text-[10px] text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <DndCoinDisplay totalCp={item.sellPriceCp} size="sm" />
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hero-border/40 p-4">
            <p className="font-libre text-sm text-gray-200">
              Auswahl: <span className="text-accent-gold">{sellSelection.size}</span> · Erlös{" "}
              <DndCoinDisplay totalCp={sellTotalCp} size="sm" className="inline-flex" />
              {gmProxy ? (
                <span className="ml-2 text-xs text-gray-500">(SL übernimmt Verkauf)</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={handleSell}
              disabled={isPending || sellSelection.size === 0 || !tradingCharacterId}
              className="inline-flex items-center gap-2 rounded border border-hero-vibrant/70 bg-hero-vibrant/20 px-5 py-2.5 font-barlow text-sm font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verkaufen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
