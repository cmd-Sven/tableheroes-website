import { createClient } from "@/src/lib/supabase/server";

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
};

export async function getCampaignShops(campaignId: string): Promise<{
  shops: CampaignShopRow[];
  loadError: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("campaign_shops") as any)
    .select(
      "id, campaign_id, name, shop_mode, archetype_key, price_modifier_percent, notes, created_at, updated_at",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCampaignShops", error);
    return { shops: [], loadError: true };
  }
  return { shops: (data ?? []) as CampaignShopRow[], loadError: false };
}
