"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Minus, Plus, ShoppingBag, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import { calculateDynamicPrice } from "@/src/lib/pricing-engine";
import { checkoutShopCart } from "@/src/lib/actions/shop-checkout-actions";

type ShopItem = {
  id: string;
  name: string;
  description: string | null;
  base_price_gp: number;
  is_magical: boolean;
  is_legal: boolean;
  rarity: string;
  item_type: string;
  is_ration_package?: boolean;
};

type Props = {
  campaignId: string;
  shopId: string;
  merchantNpcId: string | null;
  characterId: string | null;
  onClose?: () => void;
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
  onClose,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [shopName, setShopName] = useState("Geöffneter Shop");
  const [shopModifier, setShopModifier] = useState(0);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [locationReputation, setLocationReputation] = useState(0);
  const [npcReputation, setNpcReputation] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      setIsLoading(true);
      setError(null);

      const { data: shopRaw, error: shopError } = await supabase
        .from("campaign_shops")
        .select("id, name, price_modifier_percent")
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
        .select("id, name, description, base_price_gp, is_magical, is_legal, rarity, item_type, is_ration_package")
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
          merchantLocationId = (merchantRaw as { current_location_id?: string | null }).current_location_id ?? null;
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
          setNpcReputation(Number((npcRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0));
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
          setLocationReputation(Number((locationRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0));
        }
      }

      if (!cancelled) {
        setShopName(String(shopRaw.name ?? "Geöffneter Shop"));
        setShopModifier(Number(shopRaw.price_modifier_percent ?? 0));
        setItems(
          ((itemRows ?? []) as Array<Record<string, unknown>>).map((item) => ({
            id: String(item.id),
            name: String(item.name ?? ""),
            description: item.description != null ? String(item.description) : null,
            base_price_gp: Number(item.base_price_gp ?? 0),
            is_magical: Boolean(item.is_magical),
            is_legal: item.is_legal !== false,
            rarity: String(item.rarity ?? "common"),
            item_type: String(item.item_type ?? "gear"),
            is_ration_package: Boolean(item.is_ration_package),
          })),
        );
        setIsLoading(false);
      }
    }

    void loadShop();
    return () => {
      cancelled = true;
    };
  }, [campaignId, merchantNpcId, shopId, supabase]);

  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        dynamicPrice: calculateDynamicPrice(
          item.base_price_gp,
          shopModifier,
          locationReputation,
          npcReputation,
        ),
      })),
    [items, locationReputation, npcReputation, shopModifier],
  );

  const total = pricedItems.reduce((sum, item) => {
    const quantity = cart[item.id] ?? 0;
    return sum + (item.dynamicPrice ?? 0) * quantity;
  }, 0);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const changeQuantity = (itemId: string, delta: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + delta);
      const next = { ...current };
      if (nextQuantity === 0) {
        delete next[itemId];
      } else {
        next[itemId] = nextQuantity;
      }
      return next;
    });
  };

  const handleCheckout = () => {
    if (!characterId) {
      toast.error("Kein Charakter für den Einkauf gefunden.");
      return;
    }

    const checkoutItems = pricedItems
      .filter((item) => (cart[item.id] ?? 0) > 0 && item.dynamicPrice != null)
      .map((item) => ({
        itemId: item.id,
        quantity: cart[item.id] ?? 0,
        calculatedPrice: item.dynamicPrice ?? 0,
      }));

    if (checkoutItems.length === 0) {
      toast.error("Dein Warenkorb ist leer.");
      return;
    }

    startTransition(async () => {
      const result = await checkoutShopCart(characterId, shopId, checkoutItems);
      if (!result.success) {
        toast.error(result.error || "Kauf fehlgeschlagen.");
        return;
      }

      toast.success("Items wurden dem Inventar hinzugefügt.");
      setCart({});
    });
  };

  return (
    <div className="absolute inset-x-4 top-24 z-30 mx-auto max-w-5xl rounded-2xl border border-accent-gold/60 bg-background-card/95 shadow-2xl shadow-black/70 backdrop-blur-md">
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

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 p-8 font-barlow text-sm font-bold uppercase text-accent-gold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Waren werden auf den Tresen gelegt...
        </div>
      ) : error ? (
        <div className="p-5 font-libre text-sm text-red-200">{error}</div>
      ) : (
        <>
          <div className="grid max-h-[46vh] gap-3 overflow-y-auto p-4 md:grid-cols-2">
            {pricedItems.map((item) => {
              const quantity = cart[item.id] ?? 0;
              const price = item.dynamicPrice;
              const unavailable = price == null;

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-hero-dark bg-slate-950/70 p-3"
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
                        {unavailable ? "Nein" : `${price} gp`}
                      </p>
                      <p className="font-libre text-[10px] text-gray-500">Basis {item.base_price_gp} gp</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-barlow text-[10px] font-bold uppercase ${RARITY_CLASS[item.rarity] ?? RARITY_CLASS.common}`}
                      title={`Seltenheit: ${item.rarity}`}
                    >
                      {item.rarity}
                    </span>
                    {item.is_magical ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-accent-gold"
                        title="Magischer oder besonderer Gegenstand"
                      >
                        <Star className="h-3 w-3" />
                        Magisch
                      </span>
                    ) : null}
                    {item.is_ration_package ? (
                      <span
                        className="rounded-full border border-hero-vibrant/50 bg-hero-vibrant/15 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant"
                        title="Beim Kauf +2 Rationen (max. 10)"
                      >
                        +2 Rationen
                      </span>
                    ) : null}
                    {!item.is_legal ? (
                      <span
                        className="rounded-full border border-red-500/60 bg-red-950/50 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-red-200"
                        title="Illegaler Schwarzmarkt-Gegenstand"
                      >
                        Illegal
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-full border border-hero-border/50 bg-background-dark">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hero-border/40 p-4">
            <p className="font-libre text-sm text-gray-200">
              Warenkorb: <span className="text-accent-gold">{cartCount}</span> Items,
              Summe <span className="text-accent-gold">{total} gp</span>
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending || cartCount === 0 || !characterId}
              className="inline-flex items-center gap-2 rounded border border-accent-gold bg-accent-gold px-5 py-2.5 font-barlow text-sm font-bold uppercase text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Bezahlen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
