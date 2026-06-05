import { createClient } from "@/src/lib/supabase/server";

type CampaignShopRecord = Omit<CampaignShopRow, "merchant_npcs">;

type MerchantNpcRecord = {
  id: string;
  name: string | null;
  description: string | null;
  role: string | null;
  shop_id: string | null;
};

export type CampaignShopRow = {
  id: string;
  campaign_id: string;
  name: string;
  shop_mode: "archetype" | "unique";
  archetype_key: string | null;
  price_modifier_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_npcs: Array<{
    id: string;
    name: string;
    description: string | null;
    role: string | null;
  }>;
};

export async function getCampaignShops(campaignId: string): Promise<{
  shops: CampaignShopRow[];
  loadError: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_shops")
    .select(
      "id, campaign_id, name, shop_mode, archetype_key, price_modifier_percent, notes, created_at, updated_at",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCampaignShops", error);
    return { shops: [], loadError: true };
  }

  const shops = (data ?? []) as CampaignShopRecord[];
  const shopIds = shops.map((shop) => shop.id);

  const merchantsByShopId = new Map<string, CampaignShopRow["merchant_npcs"]>();
  if (shopIds.length > 0) {
    const { data: merchantRows, error: merchantError } = await supabase
      .from("npcs")
      .select("id, name, description, role, shop_id")
      .in("shop_id", shopIds)
      .eq("is_merchant", true);

    if (merchantError) {
      console.error("getCampaignShops merchants", merchantError);
    } else {
      for (const row of (merchantRows ?? []) as MerchantNpcRecord[]) {
        const shopId = String(row.shop_id ?? "");
        if (!shopId) continue;
        const list = merchantsByShopId.get(shopId) ?? [];
        list.push({
          id: String(row.id),
          name: String(row.name ?? "Unbenannter Händler"),
          description: row.description ?? null,
          role: row.role ?? null,
        });
        merchantsByShopId.set(shopId, list);
      }
    }
  }

  return {
    shops: shops.map((shop) => ({
      ...shop,
      merchant_npcs: merchantsByShopId.get(shop.id) ?? [],
    })),
    loadError: false,
  };
}

export type MerchantAssignableNpc = {
  id: string;
  name: string;
  role: string | null;
  title: string | null;
  is_merchant: boolean;
  shop_id: string | null;
  image_url: string | null;
};

export async function getCampaignNpcsForMerchantAssignment(
  campaignId: string,
): Promise<MerchantAssignableNpc[]> {
  const supabase = await createClient();

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("world_id")
    .eq("id", campaignId)
    .single();

  const worldId = (campaignRaw as { world_id?: string | null } | null)?.world_id;
  if (!worldId) return [];

  const { data, error } = await supabase
    .from("npcs")
    .select("id, name, role, title, is_merchant, shop_id, image_url")
    .eq("world_id", worldId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getCampaignNpcsForMerchantAssignment", error);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Unbenannt"),
    role: row.role != null ? String(row.role) : null,
    title: row.title != null ? String(row.title) : null,
    is_merchant: Boolean(row.is_merchant),
    shop_id: row.shop_id != null ? String(row.shop_id) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
  }));
}

export type CampaignShopItemRow = {
  id: string;
  shop_id: string;
  sort_order: number;
  name: string;
  description: string | null;
  base_price_gp: number;
  is_magical: boolean;
  is_legal: boolean;
  rarity: string;
  item_type: string;
  target_fap: number;
  is_ration_package: boolean;
};

export async function getCampaignShopWithItems(
  campaignId: string,
  shopId: string,
): Promise<{
  shop: CampaignShopRow | null;
  items: CampaignShopItemRow[];
  loadError: boolean;
}> {
  const supabase = await createClient();

  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select(
      "id, campaign_id, name, shop_mode, archetype_key, price_modifier_percent, notes, created_at, updated_at",
    )
    .eq("id", shopId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (shopError || !shopRaw) {
    if (shopError) console.error("getCampaignShopWithItems shop", shopError);
    return { shop: null, items: [], loadError: Boolean(shopError) };
  }

  const shopRecord = shopRaw as Omit<CampaignShopRow, "merchant_npcs">;

  const { data: itemRows, error: itemError } = await supabase
    .from("campaign_shop_items")
    .select(
      "id, shop_id, sort_order, name, description, base_price_gp, is_magical, is_legal, rarity, item_type, target_fap, is_ration_package",
    )
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (itemError) {
    console.error("getCampaignShopWithItems items", itemError);
    return { shop: { ...shopRecord, merchant_npcs: [] }, items: [], loadError: true };
  }

  const items = ((itemRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    shop_id: String(row.shop_id),
    sort_order: Number(row.sort_order ?? 0),
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    base_price_gp: Math.max(0, Math.round(Number(row.base_price_gp ?? 0))),
    is_magical: Boolean(row.is_magical),
    is_legal: row.is_legal !== false,
    rarity: String(row.rarity ?? "common"),
    item_type: String(row.item_type ?? "gear"),
    target_fap: Math.max(0, Math.round(Number(row.target_fap ?? 0))),
    is_ration_package: Boolean(row.is_ration_package),
  }));

  return {
    shop: { ...shopRecord, merchant_npcs: [] },
    items,
    loadError: false,
  };
}
