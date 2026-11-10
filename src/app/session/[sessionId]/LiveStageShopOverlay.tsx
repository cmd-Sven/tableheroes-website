"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Backpack,
  Check,
  Loader2,
  Minus,
  Plus,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import {
  calculateDynamicPriceCp,
  calculateSellPriceCp,
  explainPriceModifiers,
  parsePurchasePriceFromDescription,
} from "@/src/lib/pricing-engine";
import { CP_PER_GP, formatCopper, type CoinPouch } from "@/src/lib/dnd-currency";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";
import { resolveShopItems, type ResolvedShopItem } from "@/src/lib/shop-resolve-items";
import {
  checkoutShopCart,
  getCharacterShopWealth,
  sellCharacterItemsAtShop,
} from "@/src/lib/actions/shop-checkout-actions";
import { updateCampaignShopPriceModifier } from "@/src/lib/actions/shop-gm-actions";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";
import {
  dispatchSessionActivityPosted,
  SESSION_ACTIVITY_POSTED_EVENT,
  type SessionActivityPostedDetail,
} from "@/src/lib/session/session-activity-bridge";
import {
  BARGAIN_DISCOUNTS,
  applyBargainDiscount,
  bargainDifficulty,
  type BargainDiscount,
} from "@/src/lib/shop-bargain";
import { abilityModifier } from "@/src/lib/characters/dnd5e/formulas";
import { PrivateInventoryModal } from "@/src/components/inventory/PrivateInventoryModal";

type PartyCharacterOption = {
  id: string;
  name: string;
  playerUserId?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  campaignId: string;
  sessionId?: string;
  shopId: string;
  merchantNpcId: string | null;
  /** Eigener Charakter des eingeloggten Spielers */
  characterId: string | null;
  isGM?: boolean;
  isPrepMode?: boolean;
  shopSellingUnlocked?: boolean;
  onToggleShopSelling?: (unlocked: boolean) => void;
  partyCharacters?: PartyCharacterOption[];
  layout?: "stage" | "cityFullscreen";
  onClose?: () => void;
};

type SellableItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sellPriceCp: number;
};

type PricedShopItem = ResolvedShopItem & { dynamicPriceCp: number | null };

type TradeLogEntry = {
  id: string;
  at: string;
  kind: "buy" | "sell" | "other";
  text: string;
};

const BUY_DIALOGUE = [
  "Gute Wahl — das Stück hatte ich extra beiseite gelegt.",
  "Ah, scharfsinnig! Genau das richtige für Abenteurer.",
  "Ein Schnäppchen, wenn ihr mich fragt. Und ihr fragt mich.",
  "Bargeld freut mich. Ware freut euch. Fairer Handel!",
];

const SELL_DIALOGUE = [
  "Hmm… nicht schlecht. Ich nehm’s euch ab.",
  "Interessant. Dafür find’ ich bestimmt einen Abnehmer.",
  "Schon gut, schon gut — hier ist euer Gold.",
  "Ihr wisst, was ihr tut. Oder ihr tut so.",
];

function pickLine(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? "";
}

const RARITY_CLASS: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

function formatSignedPercent(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded} %`;
  if (rounded < 0) return `${rounded} %`;
  return "±0 %";
}

const SHOP_MODIFIER_MIN = -50;
const SHOP_MODIFIER_MAX = 100;

export function LiveStageShopOverlay({
  campaignId,
  sessionId,
  shopId,
  merchantNpcId,
  characterId,
  isGM = false,
  isPrepMode = false,
  shopSellingUnlocked = false,
  onToggleShopSelling,
  partyCharacters = [],
  layout = "stage",
  onClose,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const cityFullscreen = layout === "cityFullscreen";
  const tradeLocked = isPrepMode;

  const [shopName, setShopName] = useState("Geöffneter Shop");
  const [shopMode, setShopMode] = useState<string>("unique");
  const [shopArchetypeKey, setShopArchetypeKey] = useState<string | null>(null);
  const [shopModifier, setShopModifier] = useState(0);
  const [draftShopModifier, setDraftShopModifier] = useState(0);
  const [inventoryCharacter, setInventoryCharacter] = useState<PartyCharacterOption | null>(
    null,
  );
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [merchantImageUrl, setMerchantImageUrl] = useState<string | null>(null);
  const [merchantDialogue, setMerchantDialogue] = useState(
    "Willkommen — schaut euch in Ruhe um.",
  );
  const [tradeLog, setTradeLog] = useState<TradeLogEntry[]>([]);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [greedyAltruist, setGreedyAltruist] = useState(0);
  const [crimeMeter, setCrimeMeter] = useState(40);
  const [locationReputation, setLocationReputation] = useState(0);
  const [npcReputation, setNpcReputation] = useState(0);
  const [items, setItems] = useState<ResolvedShopItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tradeOpen, setTradeOpen] = useState(false);
  const [bargainOpen, setBargainOpen] = useState(false);
  const [bargainDiscount, setBargainDiscount] = useState<BargainDiscount>(10);
  const [bargainAdvantage, setBargainAdvantage] = useState(false);
  const [bargainResult, setBargainResult] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [backpackOpen, setBackpackOpen] = useState(cityFullscreen);
  const [sellMenuItemId, setSellMenuItemId] = useState<string | null>(null);
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
  const [charismaMod, setCharismaMod] = useState(0);
  const [sellItems, setSellItems] = useState<SellableItem[]>([]);

  const tradingCharacterId = activeCharacterId.trim() || null;
  const gmProxy = isGM && tradingCharacterId !== characterId;
  const canSell = !tradeLocked && shopSellingUnlocked;

  useEffect(() => {
    if (!cityFullscreen) {
      setPortalHost(null);
      return;
    }
    const el = document.createElement("div");
    el.setAttribute("data-th-live-stage-shop-overlay", "true");
    document.body.appendChild(el);
    setPortalHost(el);
    return () => {
      el.remove();
      setPortalHost(null);
    };
  }, [cityFullscreen]);

  const pushTradeLog = useCallback((entry: Omit<TradeLogEntry, "id" | "at"> & { id?: string; at?: string }) => {
    const next: TradeLogEntry = {
      id: entry.id ?? `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: entry.at ?? new Date().toISOString(),
      kind: entry.kind,
      text: entry.text,
    };
    setTradeLog((prev) => {
      if (prev.some((row) => row.id === next.id || row.text === next.text)) return prev;
      return [next, ...prev].slice(0, 40);
    });
  }, []);

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

  const loadCharacterCha = useCallback(
    async (charId: string) => {
      if (!charId) {
        setCharismaMod(0);
        return;
      }
      const { data } = await (supabase as any)
        .from("characters")
        .select("sheet_data")
        .eq("id", charId)
        .maybeSingle();
      const sheet = (data as { sheet_data?: Record<string, unknown> } | null)?.sheet_data;
      const abilities = (sheet?.abilities ?? sheet?.abilityScores ?? null) as
        | Record<string, { score?: number; value?: number } | number>
        | null;
      const chaRaw = abilities?.cha ?? abilities?.CHA ?? abilities?.charisma;
      const score =
        typeof chaRaw === "number"
          ? chaRaw
          : Number((chaRaw as { score?: number; value?: number } | null)?.score ??
              (chaRaw as { score?: number; value?: number } | null)?.value ??
              10);
      setCharismaMod(abilityModifier(Number.isFinite(score) ? score : 10));
    },
    [supabase],
  );

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
          .select(
            "id, name, image_url, current_location_id, city_axis_greedy_altruist, city_axis_loyal_criminal",
          )
          .eq("id", merchantNpcId)
          .maybeSingle();

        if (merchantRaw) {
          const merchant = merchantRaw as {
            current_location_id?: string | null;
            name?: string;
            image_url?: string | null;
            city_axis_greedy_altruist?: number | null;
            city_axis_loyal_criminal?: number | null;
          };
          merchantLocationId = merchant.current_location_id ?? null;
          const greed = Number(merchant.city_axis_greedy_altruist ?? 0);
          const loyalCriminal = Number(merchant.city_axis_loyal_criminal ?? 0);
          const name = String(merchant.name ?? "");
          if (!cancelled) {
            setMerchantName(name);
            setMerchantImageUrl(
              merchant.image_url && String(merchant.image_url).trim()
                ? String(merchant.image_url)
                : null,
            );
            setGreedyAltruist(Number.isFinite(greed) ? greed : 0);
            // Loyal↔Kriminell (−5…+5) → Kriminalitätsmeter 0–100
            setCrimeMeter(Math.max(0, Math.min(100, Math.round(((loyalCriminal + 5) / 10) * 100))));
            setMerchantDialogue(
              name
                ? `Seid gegrüßt! ${name} hat für euch ein paar Kostbarkeiten bereitgelegt.`
                : "Willkommen — schaut euch in Ruhe um.",
            );
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
        const loadedModifier = Number(shopRecord.price_modifier_percent ?? 0);
        setShopModifier(loadedModifier);
        setDraftShopModifier(loadedModifier);
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
    void loadCharacterCha(tradingCharacterId);
    setSellMenuItemId(null);
  }, [tradingCharacterId, refreshWealth, loadSellInventory, loadCharacterCha]);

  useEffect(() => {
    if (characterId && !isGM) {
      setActiveCharacterId(characterId);
    }
  }, [characterId, isGM]);

  useEffect(() => {
    if (!isGM || !cityFullscreen) return;
    const onActivity = (event: Event) => {
      const detail = (event as CustomEvent<SessionActivityPostedDetail>).detail;
      const entry = detail?.entry;
      if (!entry) return;
      if (entry.type !== "shop_buy" && entry.type !== "shop_sell") return;
      pushTradeLog({
        id: entry.id,
        at: entry.at,
        kind: entry.type === "shop_buy" ? "buy" : "sell",
        text: entry.text,
      });
    };
    window.addEventListener(SESSION_ACTIVITY_POSTED_EVENT, onActivity);
    return () => window.removeEventListener(SESSION_ACTIVITY_POSTED_EVENT, onActivity);
  }, [cityFullscreen, isGM, pushTradeLog]);

  const pricedItems: PricedShopItem[] = useMemo(
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

  const priceBreakdown = useMemo(
    () =>
      explainPriceModifiers(
        shopModifier,
        locationReputation,
        npcReputation,
        appliedDiscount,
      ),
    [appliedDiscount, locationReputation, npcReputation, shopModifier],
  );

  const saveShopModifier = useCallback(() => {
    const next = Math.min(
      SHOP_MODIFIER_MAX,
      Math.max(SHOP_MODIFIER_MIN, Math.round(draftShopModifier)),
    );
    setDraftShopModifier(next);
    if (next === shopModifier) {
      toast.message("Aufschlag unverändert.");
      return;
    }
    startTransition(async () => {
      const result = await updateCampaignShopPriceModifier(shopId, next);
      if (!result.success) {
        toast.error(result.error || "Aufschlag konnte nicht gespeichert werden.");
        setDraftShopModifier(shopModifier);
        return;
      }
      const saved = result.priceModifierPercent ?? next;
      setShopModifier(saved);
      setDraftShopModifier(saved);
      toast.success(`NPC-Aufschlag: ${formatSignedPercent(saved)}`);
    });
  }, [draftShopModifier, shopId, shopModifier]);

  const cartLines = useMemo(
    () =>
      pricedItems
        .filter((item) => (cart[item.id] ?? 0) > 0 && item.dynamicPriceCp != null)
        .map((item) => {
          const quantity = cart[item.id] ?? 0;
          const unitCp = applyBargainDiscount(item.dynamicPriceCp ?? 0, appliedDiscount);
          return {
            item,
            quantity,
            unitCp,
            lineCp: unitCp * quantity,
          };
        }),
    [appliedDiscount, cart, pricedItems],
  );

  const totalCp = cartLines.reduce((sum, line) => sum + line.lineCp, 0);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const wealthCp =
    characterWealth.pp * 1000 +
    characterWealth.gp * 100 +
    characterWealth.ep * 50 +
    characterWealth.sp * 10 +
    characterWealth.cp;
  const canAfford = wealthCp >= totalCp;
  const difficulty = bargainDifficulty(greedyAltruist, crimeMeter, bargainDiscount);

  const changeQuantity = (itemId: string, delta: number) => {
    if (tradeLocked) {
      toast.message("Vorbereitung: Einkauf ist erst Live möglich.");
      return;
    }
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + delta);
      const next = { ...current };
      if (nextQuantity === 0) delete next[itemId];
      else next[itemId] = nextQuantity;
      return next;
    });
  };

  const openTradeWindow = () => {
    if (tradeLocked) {
      toast.message("Vorbereitung: Handel ist erst Live möglich.");
      return;
    }
    if (cartCount === 0) {
      toast.error("Wähle zuerst Waren für die Sammelbestellung.");
      return;
    }
    if (!tradingCharacterId) {
      toast.error("Kein Charakter für den Einkauf ausgewählt.");
      return;
    }
    setBargainResult(null);
    setTradeOpen(true);
  };

  const handleCheckout = () => {
    if (tradeLocked) {
      toast.message("Vorbereitung: Kein Live-Handel.");
      return;
    }
    if (!tradingCharacterId) {
      toast.error("Kein Charakter für den Einkauf ausgewählt.");
      return;
    }
    if (!canAfford) {
      toast.error("Nicht genug Gold für diese Bestellung.");
      return;
    }

    const checkoutItems = cartLines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      calculatedPrice: line.unitCp,
    }));

    if (checkoutItems.length === 0) {
      toast.error("Dein Warenkorb ist leer.");
      return;
    }

    startTransition(async () => {
      const result = await checkoutShopCart(tradingCharacterId, shopId, checkoutItems, {
        merchantNpcId,
        gmProxy,
        bargainDiscountPercent: appliedDiscount,
      });
      if (!result.success) {
        toast.error(result.error || "Kauf fehlgeschlagen.");
        return;
      }

      const summary = cartLines
        .map((line) => `${line.quantity}× ${line.item.name}`)
        .join(", ");
      const charName =
        partyCharacters.find((pc) => pc.id === tradingCharacterId)?.name ?? "Held";
      const buyText = `${charName} kauft bei ${merchantName || shopName}: ${summary} (${formatCopper(totalCp)}${
        appliedDiscount > 0 ? `, −${appliedDiscount}% Feilschen` : ""
      }).`;
      setMerchantDialogue(pickLine(BUY_DIALOGUE));
      if (sessionId) {
        try {
          const entry = await appendSessionActivity({
            sessionId,
            type: "shop_buy",
            text: buyText,
            characterId: tradingCharacterId,
            characterName: charName,
          });
          if (entry) {
            pushTradeLog({
              id: entry.id,
              at: entry.at,
              kind: "buy",
              text: entry.text,
            });
            dispatchSessionActivityPosted({ entry });
          }
        } catch (err) {
          console.warn("[LiveStageShopOverlay] buy chat log failed:", err);
          pushTradeLog({ kind: "buy", text: buyText });
        }
      } else {
        pushTradeLog({ kind: "buy", text: buyText });
      }

      toast.success(
        gmProxy ? "Kauf für den Charakter abgeschlossen." : "Items wurden dem Inventar hinzugefügt.",
      );
      setCart({});
      setTradeOpen(false);
      setBargainOpen(false);
      setAppliedDiscount(0);
      setBargainResult(null);
      await refreshWealth(tradingCharacterId);
      await loadSellInventory(tradingCharacterId);
    });
  };

  const handleBargain = () => {
    if (tradeLocked) {
      toast.message("Vorbereitung: Feilschen erst Live.");
      return;
    }
    const roll1 = rollD20();
    const roll2 = bargainAdvantage ? rollD20() : roll1;
    const d20 = bargainAdvantage ? Math.max(roll1, roll2) : roll1;
    const total = d20 + charismaMod;
    const success = total >= difficulty;
    if (success) {
      setAppliedDiscount(bargainDiscount);
      setBargainResult(
        `Erfolg! Wurf ${bargainAdvantage ? `${roll1}/${roll2}` : roll1} + Cha ${charismaMod >= 0 ? "+" : ""}${charismaMod} = ${total} vs. SG ${difficulty}. Nachlass ${bargainDiscount}%.`,
      );
      toast.success(`Feilschen gelungen (−${bargainDiscount}%).`);
    } else {
      setBargainResult(
        `Fehlschlag. Wurf ${bargainAdvantage ? `${roll1}/${roll2}` : roll1} + Cha ${charismaMod >= 0 ? "+" : ""}${charismaMod} = ${total} vs. SG ${difficulty}.`,
      );
      toast.message("Der Händler lässt sich nicht erweichen.");
    }
  };

  const handleSellItem = (itemId: string) => {
    if (!canSell) {
      toast.message(
        isPrepMode
          ? "Vorbereitung: Verkaufen erst Live."
          : "Verkauf ist noch nicht freigegeben (SL: Handeln freigeben).",
      );
      return;
    }
    if (!tradingCharacterId) {
      toast.error("Kein Charakter ausgewählt.");
      return;
    }
    const item = sellItems.find((row) => row.id === itemId);
    if (!item) return;

    startTransition(async () => {
      const result = await sellCharacterItemsAtShop(tradingCharacterId, shopId, [itemId], {
        merchantNpcId,
        gmProxy,
      });
      if (!result.success) {
        toast.error(result.error || "Verkauf fehlgeschlagen.");
        return;
      }

      const charName =
        partyCharacters.find((pc) => pc.id === tradingCharacterId)?.name ?? "Held";
      const sellText = `${charName} verkauft „${item.name}“ an ${merchantName || shopName} für ${formatCopper(result.totalCp ?? item.sellPriceCp)}.`;
      setMerchantDialogue(pickLine(SELL_DIALOGUE));
      if (sessionId) {
        try {
          const entry = await appendSessionActivity({
            sessionId,
            type: "shop_sell",
            text: sellText,
            characterId: tradingCharacterId,
            characterName: charName,
          });
          if (entry) {
            pushTradeLog({
              id: entry.id,
              at: entry.at,
              kind: "sell",
              text: entry.text,
            });
            dispatchSessionActivityPosted({ entry });
          }
        } catch (err) {
          console.warn("[LiveStageShopOverlay] sell chat log failed:", err);
          pushTradeLog({ kind: "sell", text: sellText });
        }
      } else {
        pushTradeLog({ kind: "sell", text: sellText });
      }

      toast.success(`Verkauft: +${formatCopper(result.totalCp ?? 0)}`);
      setSellMenuItemId(null);
      await refreshWealth(tradingCharacterId);
      await loadSellInventory(tradingCharacterId);
    });
  };

  const characterOptions =
    isGM && partyCharacters.length > 0
      ? partyCharacters
      : tradingCharacterId
        ? [{ id: tradingCharacterId, name: "Dein Charakter", avatarUrl: null }]
        : [];

  const shellClass = cityFullscreen
    ? "fixed inset-0 z-[110] flex flex-col bg-[#0a1f10]/95 shadow-2xl shadow-black/80"
    : "absolute inset-x-4 top-24 z-30 mx-auto max-w-5xl overflow-hidden rounded-2xl border border-accent-gold/60 bg-[#0a1f10] shadow-2xl shadow-black/80";

  const overlay = (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hero-border/40 p-4">
        <div>
          <p className="flex items-center gap-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
            <ShoppingBag className="h-4 w-4" />
            {cityFullscreen ? "Ladenkatalog" : "Händlerangebot"}
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
          {isPrepMode ? (
            <p className="mt-1 rounded border border-accent-gold/50 bg-accent-gold/15 px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              Vorbereitung — Katalog nur Ansicht, kein Handel
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isGM && onToggleShopSelling ? (
            <button
              type="button"
              onClick={() => {
                if (isPrepMode) {
                  toast.message("Vorbereitung: Handeln erst freigeben, wenn die Session Live ist.");
                  return;
                }
                onToggleShopSelling(!shopSellingUnlocked);
              }}
              className={`rounded border px-3 py-1.5 font-barlow text-xs font-bold uppercase ${
                shopSellingUnlocked
                  ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  : "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
              }`}
            >
              {shopSellingUnlocked ? "Handeln aktiv" : "Handeln freigeben"}
            </button>
          ) : null}
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

      {isGM && !cityFullscreen ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-hero-border/30 bg-[#132e1b]/80 px-4 py-2">
          <div className="min-w-[12rem] flex-1">
            <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
              Preiseinflüsse
              {priceBreakdown.saleRefused ? (
                <span className="ml-2 text-red-300">· Verkauf verweigert</span>
              ) : null}
            </p>
            <p className="mt-0.5 font-libre text-[11px] text-gray-300">
              Aufschlag {formatSignedPercent(priceBreakdown.shopModifierPercent)}
              {" · "}
              Ort {formatSignedPercent(priceBreakdown.locationModifierPercent)}
              {" · "}
              NPC{" "}
              {priceBreakdown.npcModifierPercent == null
                ? "—"
                : formatSignedPercent(priceBreakdown.npcModifierPercent)}
              {priceBreakdown.bargainDiscountPercent > 0
                ? ` · Feilschen −${priceBreakdown.bargainDiscountPercent} %`
                : ""}
              {" · "}
              Summe{" "}
              {priceBreakdown.totalModifierPercent == null
                ? "Nein"
                : formatSignedPercent(priceBreakdown.totalModifierPercent)}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Aufschlag
            </span>
            <input
              type="range"
              min={SHOP_MODIFIER_MIN}
              max={SHOP_MODIFIER_MAX}
              step={1}
              value={draftShopModifier}
              onChange={(e) => setDraftShopModifier(Number(e.target.value))}
              className="w-28 accent-accent-gold"
            />
            <input
              type="number"
              min={SHOP_MODIFIER_MIN}
              max={SHOP_MODIFIER_MAX}
              step={1}
              value={draftShopModifier}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (!Number.isFinite(raw)) return;
                setDraftShopModifier(
                  Math.min(SHOP_MODIFIER_MAX, Math.max(SHOP_MODIFIER_MIN, Math.round(raw))),
                );
              }}
              className="w-14 rounded border border-hero-dark bg-slate-950 px-1.5 py-1 text-center font-barlow text-xs text-white outline-none focus:border-accent-gold"
            />
            <button
              type="button"
              onClick={saveShopModifier}
              disabled={isPending || draftShopModifier === shopModifier}
              className="rounded border border-accent-gold/60 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              Speichern
            </button>
          </label>
        </div>
      ) : null}

      <div className={`relative flex min-h-0 flex-1 ${cityFullscreen ? "flex-row" : "flex-col"}`}>
        {cityFullscreen ? (
          <aside className="flex w-[min(100%,13.5rem)] shrink-0 flex-col items-center gap-3 border-r border-hero-border/40 bg-[#0a1f10]/90 px-3 py-4">
            <div className="relative h-36 w-36 overflow-hidden rounded-full border-2 border-accent-gold/70 bg-slate-900 shadow-lg shadow-black/40">
              {merchantImageUrl ? (
                <Image
                  src={merchantImageUrl}
                  alt={merchantName || "Händler"}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              ) : (
                <span className="grid h-full w-full place-items-center font-cinzel text-3xl font-bold text-accent-gold">
                  {(merchantName || "?").slice(0, 1)}
                </span>
              )}
            </div>
            <p className="text-center font-cinzel text-sm font-bold text-accent-gold">
              {merchantName || "Händler"}
            </p>
            <div className="relative w-full rounded-lg border border-accent-gold/40 bg-[#132e1b] px-3 py-2 shadow-md">
              <span
                className="absolute -top-2 left-8 h-3 w-3 rotate-45 border-l border-t border-accent-gold/40 bg-[#132e1b]"
                aria-hidden
              />
              <p className="font-libre text-xs leading-relaxed text-gray-200">{merchantDialogue}</p>
            </div>
            {isGM ? (
              <div className="w-full space-y-3 rounded-lg border border-hero-border/40 bg-[#132e1b] p-3">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                  Preiseinflüsse
                </p>
                {priceBreakdown.saleRefused ? (
                  <p className="rounded border border-red-500/40 bg-red-950/40 px-2 py-1.5 font-libre text-[11px] text-red-200">
                    Verkauf verweigert (NPC-Ruf ≤ −90)
                  </p>
                ) : null}
                <ul className="space-y-1 font-libre text-[11px] text-gray-300">
                  <li className="flex justify-between gap-2">
                    <span>NPC-Aufschlag</span>
                    <span className="text-accent-gold">
                      {formatSignedPercent(priceBreakdown.shopModifierPercent)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Ortsruf ({priceBreakdown.locationReputation})</span>
                    <span className="text-accent-gold">
                      {formatSignedPercent(priceBreakdown.locationModifierPercent)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>NPC-Ruf ({priceBreakdown.npcReputation})</span>
                    <span className="text-accent-gold">
                      {priceBreakdown.npcModifierPercent == null
                        ? "—"
                        : formatSignedPercent(priceBreakdown.npcModifierPercent)}
                    </span>
                  </li>
                  {priceBreakdown.bargainDiscountPercent > 0 ? (
                    <li className="flex justify-between gap-2">
                      <span>Feilschen</span>
                      <span className="text-hero-vibrant">
                        −{priceBreakdown.bargainDiscountPercent} %
                      </span>
                    </li>
                  ) : null}
                  <li className="flex justify-between gap-2 border-t border-hero-border/30 pt-1 font-barlow text-[10px] font-bold uppercase text-white">
                    <span>Summe</span>
                    <span>
                      {priceBreakdown.totalModifierPercent == null
                        ? "Nein"
                        : formatSignedPercent(priceBreakdown.totalModifierPercent)}
                    </span>
                  </li>
                </ul>
                <div className="space-y-1.5 border-t border-hero-border/30 pt-2">
                  <label className="block font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    NPC-Aufschlag steuern
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={SHOP_MODIFIER_MIN}
                      max={SHOP_MODIFIER_MAX}
                      step={1}
                      value={draftShopModifier}
                      onChange={(e) => setDraftShopModifier(Number(e.target.value))}
                      className="min-w-0 flex-1 accent-accent-gold"
                    />
                    <input
                      type="number"
                      min={SHOP_MODIFIER_MIN}
                      max={SHOP_MODIFIER_MAX}
                      step={1}
                      value={draftShopModifier}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        if (!Number.isFinite(raw)) return;
                        setDraftShopModifier(
                          Math.min(SHOP_MODIFIER_MAX, Math.max(SHOP_MODIFIER_MIN, Math.round(raw))),
                        );
                      }}
                      className="w-14 rounded border border-hero-dark bg-slate-950 px-1.5 py-1 text-center font-barlow text-xs text-white outline-none focus:border-accent-gold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveShopModifier}
                    disabled={isPending || draftShopModifier === shopModifier}
                    className="w-full rounded border border-accent-gold/60 bg-accent-gold/15 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-40"
                  >
                    {isPending ? "Speichert…" : "Aufschlag speichern"}
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 p-8 font-barlow text-sm font-bold uppercase text-accent-gold">
              <Loader2 className="h-5 w-5 animate-spin" />
              Waren werden auf den Tresen gelegt...
            </div>
          ) : error ? (
            <div className="p-5 font-libre text-sm text-red-200">{error}</div>
          ) : items.length === 0 ? (
            <p className="p-6 font-libre text-sm text-gray-400 italic">
              Dieser Shop hat noch keine Waren. Lege Items an oder wähle einen Archetyp mit Katalog.
            </p>
          ) : (
            <div
              className={`grid gap-3 overflow-y-auto p-4 ${
                cityFullscreen
                  ? "max-h-[calc(100vh-13rem)] md:grid-cols-2 xl:grid-cols-3"
                  : "max-h-[46vh] md:grid-cols-2"
              }`}
            >
              {pricedItems.map((item) => {
                const quantity = cart[item.id] ?? 0;
                const priceCp = item.dynamicPriceCp;
                const unavailable = priceCp == null;
                const selected = quantity > 0;
                const displayPriceCp =
                  priceCp == null ? null : applyBargainDiscount(priceCp, appliedDiscount);
                const priceDiffersFromBase =
                  displayPriceCp != null && displayPriceCp !== item.base_price_cp;

                return (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-3 ${
                      selected
                        ? "border-accent-gold/70 bg-[#132e1b]"
                        : "border-hero-dark bg-[#132e1b]"
                    }`}
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
                          {unavailable || displayPriceCp == null ? (
                            "Nein"
                          ) : (
                            <DndCoinDisplay totalCp={displayPriceCp} size="md" />
                          )}
                        </p>
                        <p className="font-libre text-[10px] text-gray-500">
                          Basis{" "}
                          <DndCoinDisplay
                            totalCp={item.base_price_cp}
                            size="xs"
                            amountClassName="font-libre text-[10px] text-gray-500"
                          />
                        </p>
                        {priceDiffersFromBase ? (
                          <p className="mt-0.5 font-libre text-[9px] leading-tight text-accent-gold/80">
                            Ladenpreis (Ruf/Modifikator)
                          </p>
                        ) : null}
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
                          disabled={quantity === 0 || unavailable || tradeLocked}
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
                          disabled={unavailable || tradeLocked}
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
              Sammelbestellung: <span className="text-accent-gold">{cartCount}</span> Items, Summe{" "}
              <DndCoinDisplay totalCp={totalCp} size="sm" className="inline-flex" />
              {appliedDiscount > 0 ? (
                <span className="ml-2 text-xs text-hero-vibrant">−{appliedDiscount}% Feilschen</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={openTradeWindow}
              disabled={isPending || cartCount === 0 || !tradingCharacterId || tradeLocked}
              className="inline-flex items-center gap-2 rounded border border-accent-gold bg-accent-gold px-5 py-2.5 font-barlow text-sm font-bold uppercase text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Handelsfenster
            </button>
          </div>
        </div>

        {cityFullscreen ? (
          <aside className="flex w-[min(100%,18rem)] shrink-0 flex-col border-l border-hero-border/40 bg-[#0a1f10]/90">
            {isGM ? (
              <>
                <div className="flex items-center gap-2 border-b border-hero-border/30 px-3 py-3 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                  <ScrollText className="h-4 w-4" />
                  Handelsprotokoll
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {tradeLog.length === 0 ? (
                    <p className="font-libre text-xs text-gray-500 italic">
                      Noch keine Käufe oder Verkäufe in diesem Katalog.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {tradeLog.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded border border-hero-dark bg-[#132e1b] px-2 py-2"
                        >
                          <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold/80">
                            {entry.kind === "buy"
                              ? "Kauf"
                              : entry.kind === "sell"
                                ? "Verkauf"
                                : "Handel"}{" "}
                            ·{" "}
                            {new Date(entry.at).toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="mt-1 font-libre text-[11px] leading-snug text-gray-200">
                            {entry.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setBackpackOpen((open) => !open)}
                  className="flex items-center gap-2 border-b border-hero-border/30 px-3 py-3 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
                >
                  <Backpack className="h-4 w-4" />
                  Rucksack {backpackOpen ? "ausblenden" : "zeigen"}
                </button>
                {backpackOpen ? (
                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {!canSell ? (
                      <p className="mb-2 font-libre text-[11px] text-gray-400">
                        {isPrepMode
                          ? "In der Vorbereitung kein Verkauf."
                          : "Verkauf erst nach „Handeln freigeben“ (SL)."}
                      </p>
                    ) : (
                      <p className="mb-2 font-libre text-[11px] text-gray-400">
                        Rechtsklick auf ein Item zum Verkaufen.
                      </p>
                    )}
                    {sellItems.length === 0 ? (
                      <p className="font-libre text-xs text-gray-500 italic">Rucksack ist leer.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {sellItems.map((item) => (
                          <li key={item.id} className="relative">
                            <button
                              type="button"
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (!canSell) {
                                  toast.message(
                                    isPrepMode
                                      ? "Vorbereitung: Verkaufen erst Live."
                                      : "SL muss zuerst „Handeln freigeben“.",
                                  );
                                  return;
                                }
                                setSellMenuItemId(item.id);
                              }}
                              onClick={() =>
                                setSellMenuItemId((cur) => (cur === item.id ? null : item.id))
                              }
                              className="flex w-full items-center justify-between gap-2 rounded border border-hero-dark bg-[#132e1b] px-2 py-2 text-left hover:border-accent-gold/40"
                            >
                              <span className="truncate font-barlow text-[11px] font-bold uppercase text-white">
                                {item.name}
                              </span>
                              <DndCoinDisplay totalCp={item.sellPriceCp} size="xs" />
                            </button>
                            {sellMenuItemId === item.id ? (
                              <div className="absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded border border-accent-gold/50 bg-background-card p-1 shadow-xl">
                                <button
                                  type="button"
                                  disabled={isPending || !canSell}
                                  onClick={() => handleSellItem(item.id)}
                                  className="w-full rounded px-2 py-1.5 text-left font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/15 disabled:opacity-50"
                                >
                                  An Händler verkaufen
                                </button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </aside>
        ) : null}
      </div>

      {cityFullscreen && partyCharacters.length > 0 ? (
        <div className="flex items-end justify-center gap-4 border-t border-hero-border/40 bg-[#0a1f10]/95 px-4 pb-3 pt-2">
          {partyCharacters.map((pc) => {
            const active = pc.id === tradingCharacterId;
            const canOpenBackpack = isGM || (characterId != null && pc.id === characterId);
            return (
              <div
                key={pc.id}
                className={`relative flex flex-col items-center gap-1 ${
                  active ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isGM || !characterId) setActiveCharacterId(pc.id);
                    }}
                    className={`relative block h-14 w-14 overflow-hidden rounded-full border-2 ${
                      active ? "border-accent-gold" : "border-hero-dark"
                    } bg-slate-900`}
                    title={pc.name}
                  >
                    {pc.avatarUrl ? (
                      <Image
                        src={pc.avatarUrl}
                        alt={pc.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-barlow text-sm font-bold text-accent-gold">
                        {pc.name.slice(0, 1)}
                      </span>
                    )}
                  </button>
                  {canOpenBackpack ? (
                    <button
                      type="button"
                      onClick={() => setInventoryCharacter(pc)}
                      className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent-gold"
                      title={`Rucksack von ${pc.name} öffnen`}
                      aria-label={`Rucksack von ${pc.name} öffnen`}
                    >
                      <Image
                        src="/images/Session_ui/rucksack.webp"
                        alt=""
                        width={40}
                        height={40}
                        className="pointer-events-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)] transition-transform hover:scale-110"
                      />
                    </button>
                  ) : null}
                </div>
                <span className="max-w-[4.5rem] truncate font-barlow text-[10px] font-bold uppercase text-gray-300">
                  {pc.name}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {inventoryCharacter ? (
        <PrivateInventoryModal
          character={{
            id: inventoryCharacter.id,
            name: inventoryCharacter.name,
            class: null,
            level: null,
            avatar_url: inventoryCharacter.avatarUrl ?? null,
          }}
          onClose={() => setInventoryCharacter(null)}
        />
      ) : null}

      {tradeOpen ? (
        <div className="absolute inset-0 z-[20] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-accent-gold/60 bg-[#0a1f10] shadow-2xl">
            <div className="flex items-center justify-between border-b border-hero-border/40 px-4 py-3">
              <h4 className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant">
                Handelsfenster
              </h4>
              <button
                type="button"
                onClick={() => setTradeOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {cartLines.map((line) => (
                  <li
                    key={line.item.id}
                    className="flex items-center justify-between gap-2 rounded border border-hero-dark bg-[#132e1b] px-2 py-1.5"
                  >
                    <span className="font-barlow text-xs font-bold uppercase text-white">
                      {line.quantity}× {line.item.name}
                    </span>
                    <DndCoinDisplay totalCp={line.lineCp} size="sm" />
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-accent-gold/30 bg-[#132e1b] px-3 py-2">
                <span className="font-libre text-sm text-gray-200">Summe</span>
                <DndCoinDisplay totalCp={totalCp} size="md" />
              </div>
              {!canAfford ? (
                <p className="font-libre text-xs text-red-300">Nicht genug Gold für diese Bestellung.</p>
              ) : null}

              <div className="rounded border border-hero-dark bg-[#132e1b]/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-barlow text-xs font-bold uppercase text-accent-gold">Feilschen</p>
                  <button
                    type="button"
                    onClick={() => setBargainOpen((open) => !open)}
                    className="rounded border border-accent-gold/40 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold"
                  >
                    {bargainOpen ? "Schließen" : "Feilschen"}
                  </button>
                </div>
                {bargainOpen ? (
                  <div className="mt-3 space-y-2">
                    <label className="block font-libre text-xs text-gray-300">
                      Gewünschter Nachlass
                      <select
                        value={bargainDiscount}
                        onChange={(e) => setBargainDiscount(Number(e.target.value) as BargainDiscount)}
                        className="mt-1 w-full rounded border border-hero-dark bg-slate-950 px-2 py-1.5 text-white outline-none focus:border-accent-gold"
                      >
                        {BARGAIN_DISCOUNTS.map((d) => (
                          <option key={d} value={d}>
                            {d}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 font-libre text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={bargainAdvantage}
                        onChange={(e) => setBargainAdvantage(e.target.checked)}
                        className="h-4 w-4 rounded border-hero-dark text-accent-gold"
                      />
                      Vorteil (begründet)
                    </label>
                    <p className="font-libre text-[11px] text-gray-400">
                      SG {difficulty} · Cha {charismaMod >= 0 ? "+" : ""}
                      {charismaMod} · Habgier {greedyAltruist} · Kriminalität {crimeMeter}
                    </p>
                    <button
                      type="button"
                      onClick={handleBargain}
                      disabled={isPending || tradeLocked}
                      className="inline-flex items-center gap-1 rounded border border-accent-gold/60 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/15 disabled:opacity-50"
                    >
                      Charisma-Probe
                    </button>
                    {bargainResult ? (
                      <p className="font-libre text-xs text-gray-200">{bargainResult}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-hero-border/40 p-4">
              <button
                type="button"
                onClick={() => setTradeOpen(false)}
                className="rounded border border-gray-600 px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-300"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isPending || !canAfford || cartCount === 0 || tradeLocked}
                className="inline-flex items-center gap-2 rounded border border-accent-gold bg-accent-gold px-4 py-2 font-barlow text-xs font-bold uppercase text-black disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Bezahlen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (cityFullscreen) {
    if (!portalHost) return null;
    return createPortal(overlay, portalHost);
  }

  return overlay;
}
