"use server";

import { createClient } from "@/src/lib/supabase/server";
import { calculateDynamicPrice } from "@/src/lib/pricing-engine";

type QueryBuilderLike = {
  select: (columns?: string) => QueryBuilderLike;
  eq: (column: string, value: unknown) => QueryBuilderLike;
  in: (column: string, values: unknown[]) => QueryBuilderLike;
  limit: (count: number) => QueryBuilderLike;
  single: () => Promise<{ data: unknown; error: { message?: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
  insert: (values: unknown) => Promise<{ error: { message?: string } | null }>;
  upsert: (
    values: unknown,
    options?: { onConflict?: string },
  ) => Promise<{ error: { message?: string } | null }>;
};

type UnknownTableClient = {
  from: (table: string) => QueryBuilderLike;
};

type CartItemInput = {
  itemId: string;
  quantity: number;
  calculatedPrice: number;
};

type ShopItemRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  base_price_gp: number;
  is_magical?: boolean | null;
  is_legal?: boolean | null;
  rarity?: string | null;
  item_type?: string | null;
  target_fap?: number | null;
  is_ration_package?: boolean | null;
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

function buildInventoryDescription(item: ShopItemRow) {
  const tags = [
    item.is_magical ? "magisch" : null,
    item.is_legal === false ? "illegal" : null,
    item.rarity ? `Seltenheit: ${item.rarity}` : null,
    item.item_type ? `Typ: ${item.item_type}` : null,
    item.is_ration_package ? "Proviant (+2 Rationen)" : null,
  ].filter(Boolean);

  return [item.description, tags.length > 0 ? `[Shop] ${tags.join(", ")}` : null]
    .filter(Boolean)
    .join("\n\n") || null;
}

export async function checkoutShopCart(
  characterId: string,
  shopId: string,
  cartItems: CartItemInput[],
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

  const { data: characterRaw, error: characterError } = await supabase
    .from("characters")
    .select("id, campaign_id, user_id")
    .eq("id", characterId)
    .single();

  if (characterError || !characterRaw) {
    return { success: false, error: "Charakter wurde nicht gefunden." };
  }

  const character = characterRaw as {
    id: string;
    campaign_id: string;
    user_id: string | null;
  };

  if (character.user_id !== user.id) {
    return { success: false, error: "Du kannst nur mit deinem eigenen Charakter einkaufen." };
  }

  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select("id, campaign_id, price_modifier_percent")
    .eq("id", shopId)
    .single();

  const shop = shopRaw as {
    id: string;
    campaign_id: string;
    price_modifier_percent: number;
  } | null;

  if (shopError || !shop || shop.campaign_id !== character.campaign_id) {
    return { success: false, error: "Shop wurde nicht gefunden." };
  }

  const itemIds = [...new Set(normalizedCart.map((item) => item.itemId))];
  const { data: itemRows, error: itemError } = await supabase
    .from("campaign_shop_items")
    .select("id, shop_id, name, description, base_price_gp, is_magical, is_legal, rarity, item_type, target_fap, is_ration_package")
    .eq("shop_id", shopId)
    .in("id", itemIds);

  if (itemError) {
    return { success: false, error: "Shop-Items konnten nicht geladen werden." };
  }

  const itemById = new Map(
    ((itemRows ?? []) as ShopItemRow[]).map((item) => [String(item.id), item]),
  );

  if (itemById.size !== itemIds.length) {
    return { success: false, error: "Ein Item im Warenkorb existiert nicht mehr." };
  }

  const { data: merchantRaw } = await supabase
    .from("npcs")
    .select("id, current_location_id")
    .eq("shop_id", shopId)
    .eq("is_merchant", true)
    .limit(1)
    .maybeSingle();

  const merchant = merchantRaw as {
    id: string;
    current_location_id: string | null;
  } | null;

  let npcReputation = 0;
  if (merchant?.id) {
    const { data: npcRepRaw } = await supabase
      .from("campaign_npc_reputation")
      .select("reputation_score")
      .eq("campaign_id", character.campaign_id)
      .eq("npc_id", merchant.id)
      .maybeSingle();
    npcReputation = Number((npcRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0);
  }

  let locationReputation = 0;
  if (merchant?.current_location_id) {
    const { data: locationRepRaw } = await supabase
      .from("campaign_location_reputation")
      .select("reputation_score")
      .eq("campaign_id", character.campaign_id)
      .eq("location_id", merchant.current_location_id)
      .maybeSingle();
    locationReputation = Number(
      (locationRepRaw as { reputation_score?: number } | null)?.reputation_score ?? 0,
    );
  }

  const purchaseLines = [];
  for (const line of normalizedCart) {
    const item = itemById.get(line.itemId)!;
    const unitPrice = calculateDynamicPrice(
      Number(item.base_price_gp ?? 0),
      Number(shop.price_modifier_percent ?? 0),
      locationReputation,
      npcReputation,
    );

    if (unitPrice == null) {
      return { success: false, error: "Der Händler weigert sich, an dich zu verkaufen." };
    }

    purchaseLines.push({
      item,
      quantity: line.quantity,
      unitPrice,
      total: unitPrice * line.quantity,
    });
  }

  const totalPrice = purchaseLines.reduce((sum, line) => sum + line.total, 0);

  let rationGainTotal = 0;
  for (const line of purchaseLines) {
    if (line.item.is_ration_package) {
      rationGainTotal += 2 * line.quantity;
    }
  }

  const untypedSupabase = supabase as unknown as UnknownTableClient;

  const { data: wealthRaw, error: wealthError } = await untypedSupabase
    .from("character_wealth")
    .select("id, gp")
    .eq("character_id", characterId)
    .maybeSingle();

  if (wealthError) {
    return { success: false, error: "Goldbestand konnte nicht geladen werden." };
  }

  const currentGold = Number((wealthRaw as { gp?: number } | null)?.gp ?? 0);
  if (currentGold < totalPrice) {
    return { success: false, error: "Nicht genug Gold!" };
  }

  const newGold = currentGold - totalPrice;
  const inventoryRows = purchaseLines.flatMap((line) => {
    const tf = Math.max(0, Math.round(Number(line.item.target_fap ?? 0)));
    return Array.from({ length: line.quantity }, () => ({
      character_id: characterId,
      name: line.item.name,
      description: buildInventoryDescription(line.item),
      category: itemTypeToInventoryCategory(line.item.item_type),
      icon_type: line.item.item_type ?? null,
      target_fap: tf,
      current_fap: 0,
    }));
  });

  const previousGold = currentGold;
  const { data: insertedRows, error: inventoryError } = await (supabase as any)
    .from("character_items")
    .insert(inventoryRows)
    .select("id");

  if (inventoryError) {
    return { success: false, error: inventoryError.message ?? "Items konnten nicht hinzugefügt werden." };
  }

  const insertedIds = ((insertedRows ?? []) as { id: string }[])
    .map((r: { id: string }) => String(r.id))
    .filter(Boolean);

  async function rollbackInventoryAndGold() {
    if (insertedIds.length > 0) {
      const { error: delErr } = await (supabase as any).from("character_items").delete().in("id", insertedIds);
      if (delErr) console.error("checkout rollback delete items", delErr);
    }
    const { error: revErr } = await untypedSupabase
      .from("character_wealth")
      .upsert({ character_id: characterId, gp: previousGold }, { onConflict: "character_id" });
    if (revErr) console.error("checkout rollback gold", revErr);
  }

  const { error: wealthUpdateError } = await untypedSupabase
    .from("character_wealth")
    .upsert(
      { character_id: characterId, gp: newGold },
      { onConflict: "character_id" },
    );

  if (wealthUpdateError) {
    await rollbackInventoryAndGold();
    return { success: false, error: wealthUpdateError.message ?? "Gold konnte nicht abgezogen werden." };
  }

  if (rationGainTotal > 0) {
    const { data: chRat, error: chRatErr } = await supabase
      .from("characters")
      .select("rations_count")
      .eq("id", characterId)
      .single();

    if (chRatErr || !chRat) {
      await rollbackInventoryAndGold();
      return { success: false, error: "Rationen konnten nicht gutgeschrieben werden." };
    }

    const prevRations = Math.min(
      10,
      Math.max(0, Math.round(Number((chRat as { rations_count?: number }).rations_count ?? 0))),
    );
    const nextRations = Math.min(10, prevRations + rationGainTotal);
    const { error: rationErr } = await (supabase as any)
      .from("characters")
      .update({ rations_count: nextRations })
      .eq("id", characterId);

    if (rationErr) {
      await rollbackInventoryAndGold();
      return { success: false, error: rationErr.message ?? "Rationen-Update fehlgeschlagen." };
    }
  }

  return { success: true, message: "Kauf erfolgreich" };
}
