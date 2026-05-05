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
