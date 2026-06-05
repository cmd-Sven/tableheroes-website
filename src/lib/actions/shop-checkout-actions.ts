"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  calculateDynamicPriceCp,
  calculateSellPriceCp,
  parsePurchasePriceFromDescription,
} from "@/src/lib/pricing-engine";
import {
  addCharacterWealthCopper,
  getCharacterCoinPouch,
  getCharacterWealthCopper,
  setCharacterCoinPouch,
  subtractCharacterWealthCopper,
} from "@/src/lib/character-gold";
import {
  CP_PER_GP,
  formatCopper,
  formatPurchasePriceTag,
  normalizeCoinPouch,
  type CoinPouch,
} from "@/src/lib/dnd-currency";
import {
  findResolvedShopItem,
  resolveShopItems,
  type ResolvedShopItem,
} from "@/src/lib/shop-resolve-items";

type CartItemInput = {
  itemId: string;
  quantity: number;
  calculatedPrice: number;
};

function normalizeQuantity(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(99, Math.round(n)));
}

function itemTypeToInventoryCategory(itemType: string | null | undefined) {
  switch (itemType) {
    case "weapon":
      return "Weapon";
    case "potion":
      return "Consumable";
    case "quest":
      return "Story";
    default:
      return "Equipment";
  }
}

function buildInventoryDescription(item: ResolvedShopItem, unitPriceCp: number) {
  const tags = [
    item.is_magical ? "magisch" : null,
    item.is_legal === false ? "illegal" : null,
    item.rarity ? `Seltenheit: ${item.rarity}` : null,
    item.item_type ? `Typ: ${item.item_type}` : null,
    item.is_ration_package ? "Proviant (+2 Rationen)" : null,
    formatPurchasePriceTag(unitPriceCp),
  ].filter(Boolean);

  return [item.description, tags.length > 0 ? `[Shop] ${tags.join(", ")}` : null]
    .filter(Boolean)
    .join("\n\n") || null;
}

async function loadShopContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  campaignId: string,
  merchantNpcId?: string | null,
) {
  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select("id, campaign_id, shop_mode, archetype_key, price_modifier_percent")
    .eq("id", shopId)
    .single();

  const shop = shopRaw as {
    id: string;
    campaign_id: string;
    shop_mode: string;
    archetype_key: string | null;
    price_modifier_percent: number;
  } | null;

  if (shopError || !shop || shop.campaign_id !== campaignId) {
    return { error: "Shop wurde nicht gefunden." as const };
  }

  const { data: itemRows, error: itemError } = await supabase
    .from("campaign_shop_items")
    .select(
      "id, name, description, base_price_gp, is_magical, is_legal, rarity, item_type, target_fap, is_ration_package",
    )
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true });

  if (itemError) {
    return { error: "Shop-Items konnten nicht geladen werden." as const };
  }

  const resolvedItems = resolveShopItems(shop, (itemRows ?? []) as never[]);

  let npcReputation = 0;
  let locationReputation = 0;

  const merchantQuery = merchantNpcId
    ? supabase.from("npcs").select("id, current_location_id").eq("id", merchantNpcId).maybeSingle()
    : supabase
        .from("npcs")
        .select("id, current_location_id")
        .eq("shop_id", shopId)
        .eq("is_merchant", true)
        .limit(1)
        .maybeSingle();

  const { data: merchantRaw } = await merchantQuery;
  const merchant = merchantRaw as {
    id: string;
    current_location_id: string | null;
  } | null;

  if (merchant?.id) {
    const { data: npcRepRaw } = await supabase
      .from("campaign_npc_reputation")
      .select("reputation_score")
      .eq("campaign_id", campaignId)
      .eq("npc_id", merchant.id)
      .maybeSingle();
    npcReputation = Number(
      (npcRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0,
    );
  }

  if (merchant?.current_location_id) {
    const { data: locationRepRaw } = await supabase
      .from("campaign_location_reputation")
      .select("reputation_score")
      .eq("campaign_id", campaignId)
      .eq("location_id", merchant.current_location_id)
      .maybeSingle();
    locationReputation = Number(
      (locationRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0,
    );
  }

  return {
    shop,
    resolvedItems,
    npcReputation,
    locationReputation,
  };
}

async function assertCanActOnCharacter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  characterId: string,
  allowGm: boolean,
): Promise<
  | { error: string }
  | {
      character: { id: string; campaign_id: string; user_id: string | null };
      isGmActor: boolean;
    }
> {
  const { data: characterRaw, error: characterError } = await supabase
    .from("characters")
    .select("id, campaign_id, user_id")
    .eq("id", characterId)
    .single();

  if (characterError || !characterRaw) {
    return { error: "Charakter wurde nicht gefunden." };
  }

  const character = characterRaw as {
    id: string;
    campaign_id: string;
    user_id: string | null;
  };

  if (character.user_id === userId) {
    return { character, isGmActor: false };
  }

  if (!allowGm) {
    return { error: "Du kannst nur mit deinem eigenen Charakter handeln." };
  }

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", character.campaign_id)
    .single();

  if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, userId)) {
    return { error: "Nur der Spielleiter kann für andere Charaktere einkaufen." };
  }

  return { character, isGmActor: true };
}

export async function checkoutShopCart(
  characterId: string,
  shopId: string,
  cartItems: CartItemInput[],
  options?: { merchantNpcId?: string | null; gmProxy?: boolean },
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht authentifiziert." };
  }

  if (!characterId || !shopId || !Array.isArray(cartItems) || cartItems.length === 0) {
    return { success: false, error: "Ungültiger Warenkorb." };
  }

  const normalizedCart = cartItems
    .map((item) => ({
      itemId: String(item.itemId ?? "").trim(),
      quantity: normalizeQuantity(item.quantity),
    }))
    .filter((item) => item.itemId && item.quantity > 0);

  if (normalizedCart.length === 0) {
    return { success: false, error: "Der Warenkorb ist leer." };
  }

  const access = await assertCanActOnCharacter(
    supabase,
    user.id,
    characterId,
    Boolean(options?.gmProxy),
  );
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const { character } = access;
  const ctx = await loadShopContext(
    supabase,
    shopId,
    character.campaign_id,
    options?.merchantNpcId,
  );
  if ("error" in ctx) {
    return { success: false, error: ctx.error };
  }

  const { shop, resolvedItems, npcReputation, locationReputation } = ctx;

  const purchaseLines = [];
  for (const line of normalizedCart) {
    const item = findResolvedShopItem(resolvedItems, line.itemId);
    if (!item) {
      return { success: false, error: "Ein Item im Warenkorb existiert nicht mehr." };
    }

    const unitPriceCp = calculateDynamicPriceCp(
      item.base_price_cp,
      Number(shop.price_modifier_percent ?? 0),
      locationReputation,
      npcReputation,
    );

    if (unitPriceCp == null) {
      return { success: false, error: "Der Händler weigert sich, an dich zu verkaufen." };
    }

    purchaseLines.push({
      item,
      quantity: line.quantity,
      unitPriceCp,
      total: unitPriceCp * line.quantity,
    });
  }

  const totalPriceCp = purchaseLines.reduce((sum, line) => sum + line.total, 0);

  let rationGainTotal = 0;
  for (const line of purchaseLines) {
    if (line.item.is_ration_package) {
      rationGainTotal += 2 * line.quantity;
    }
  }

  const wealthBefore = await getCharacterCoinPouch(supabase, characterId);
  const currentWealthCp = await getCharacterWealthCopper(supabase, characterId);
  if (currentWealthCp < totalPriceCp) {
    return { success: false, error: "Nicht genug Geld!" };
  }

  const inventoryRows = purchaseLines.flatMap((line) => {
    const tf = Math.max(0, Math.round(Number(line.item.target_fap ?? 0)));
    return Array.from({ length: line.quantity }, () => ({
      character_id: characterId,
      name: line.item.name,
      description: buildInventoryDescription(line.item, line.unitPriceCp),
      category: itemTypeToInventoryCategory(line.item.item_type),
      icon_type: line.item.item_type ?? null,
      target_fap: tf,
      current_fap: 0,
    }));
  });

  const previousWealth = wealthBefore;
  const { data: insertedRows, error: inventoryError } = await (supabase as any)
    .from("character_items")
    .insert(inventoryRows)
    .select("id");

  if (inventoryError) {
    return { success: false, error: inventoryError.message ?? "Items konnten nicht hinzugefügt werden." };
  }

  const insertedIds = ((insertedRows ?? []) as { id: string }[])
    .map((r) => String(r.id))
    .filter(Boolean);

  async function rollbackInventoryAndWealth() {
    if (insertedIds.length > 0) {
      await (supabase as any).from("character_items").delete().in("id", insertedIds);
    }
    await setCharacterCoinPouch(supabase, characterId, previousWealth);
  }

  const payResult = await subtractCharacterWealthCopper(supabase, characterId, totalPriceCp);

  if (!payResult.ok || payResult.error) {
    await rollbackInventoryAndWealth();
    return { success: false, error: payResult.error ?? "Geld konnte nicht abgezogen werden." };
  }

  if (rationGainTotal > 0) {
    const { data: chRat } = await supabase
      .from("characters")
      .select("rations_count")
      .eq("id", characterId)
      .single();

    const prevRations = Math.min(
      10,
      Math.max(0, Math.round(Number((chRat as { rations_count?: number } | null)?.rations_count ?? 0))),
    );
    const nextRations = Math.min(10, prevRations + rationGainTotal);
    const { error: rationErr } = await (supabase as any)
      .from("characters")
      .update({ rations_count: nextRations })
      .eq("id", characterId);

    if (rationErr) {
      await rollbackInventoryAndWealth();
      return { success: false, error: rationErr.message ?? "Rationen-Update fehlgeschlagen." };
    }
  }

  return { success: true, message: "Kauf erfolgreich" };
}

export async function sellCharacterItemsAtShop(
  characterId: string,
  shopId: string,
  itemIds: string[],
  options?: { merchantNpcId?: string | null; gmProxy?: boolean },
): Promise<{ success: boolean; message?: string; error?: string; totalCp?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  const ids = [...new Set(itemIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!characterId || !shopId || ids.length === 0) {
    return { success: false, error: "Keine Items zum Verkaufen ausgewählt." };
  }

  const access = await assertCanActOnCharacter(
    supabase,
    user.id,
    characterId,
    Boolean(options?.gmProxy),
  );
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const { character } = access;
  const ctx = await loadShopContext(
    supabase,
    shopId,
    character.campaign_id,
    options?.merchantNpcId,
  );
  if ("error" in ctx) {
    return { success: false, error: ctx.error };
  }

  const { npcReputation } = ctx;

  if (npcReputation <= -90) {
    return { success: false, error: "Der Händler weigert sich, von dir zu kaufen." };
  }

  const { data: itemRows, error: itemError } = await (supabase as any)
    .from("character_items")
    .select("id, character_id, name, description, category, is_deleted")
    .in("id", ids)
    .eq("character_id", characterId)
    .eq("is_deleted", false);

  if (itemError) {
    return { success: false, error: "Inventar konnte nicht geladen werden." };
  }

  const items = (itemRows ?? []) as Array<{
    id: string;
    description: string | null;
    category: string;
  }>;

  if (items.length !== ids.length) {
    return { success: false, error: "Ein oder mehrere Items sind nicht (mehr) im Inventar." };
  }

  let totalSellCp = 0;
  for (const item of items) {
    const purchasePriceCp = parsePurchasePriceFromDescription(item.description);
    const baseCp =
      purchasePriceCp ??
      (item.category === "Consumable"
        ? 8 * CP_PER_GP
        : item.category === "Weapon"
          ? 25 * CP_PER_GP
          : 12 * CP_PER_GP);
    totalSellCp += calculateSellPriceCp(baseCp);
  }

  if (totalSellCp <= 0) {
    return { success: false, error: "Für diese Items wird kein Geld gezahlt." };
  }

  const { error: delErr } = await (supabase as any)
    .from("character_items")
    .update({ is_deleted: true })
    .in("id", ids)
    .eq("character_id", characterId);

  if (delErr) {
    return { success: false, error: delErr.message ?? "Items konnten nicht entfernt werden." };
  }

  const creditResult = await addCharacterWealthCopper(supabase, characterId, totalSellCp);

  if (creditResult.error) {
    await (supabase as any)
      .from("character_items")
      .update({ is_deleted: false })
      .in("id", ids);
    return { success: false, error: creditResult.error };
  }

  return {
    success: true,
    message: `${items.length} Item(s) verkauft.`,
    totalCp: totalSellCp,
  };
}

export async function getCharacterShopWealth(
  characterId: string,
): Promise<{ wealth: CoinPouch; totalCp: number; formatted: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      wealth: normalizeCoinPouch({}),
      totalCp: 0,
      formatted: "0 KM",
      error: "Nicht authentifiziert.",
    };
  }

  const { data: characterRaw } = await supabase
    .from("characters")
    .select("id, user_id, campaign_id")
    .eq("id", characterId)
    .maybeSingle();

  const character = characterRaw as {
    id: string;
    user_id: string | null;
    campaign_id: string;
  } | null;

  if (!character) {
    return {
      wealth: normalizeCoinPouch({}),
      totalCp: 0,
      formatted: "0 KM",
      error: "Charakter nicht gefunden.",
    };
  }

  const isOwner = character.user_id === user.id;
  if (!isOwner) {
    const { data: campaignRaw } = await supabase
      .from("campaigns")
      .select("gm_id, owner_id")
      .eq("id", character.campaign_id)
      .single();
    if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return {
        wealth: normalizeCoinPouch({}),
        totalCp: 0,
        formatted: "0 KM",
        error: "Kein Zugriff.",
      };
    }
  }

  const wealth = await getCharacterCoinPouch(supabase, characterId);
  const totalCp = await getCharacterWealthCopper(supabase, characterId);
  return { wealth, totalCp, formatted: formatCopper(totalCp) };
}

export async function getCharacterShopGold(
  characterId: string,
): Promise<{ gp: number; error?: string }> {
  const result = await getCharacterShopWealth(characterId);
  return {
    gp: Math.floor(result.totalCp / CP_PER_GP),
    error: result.error,
  };
}
