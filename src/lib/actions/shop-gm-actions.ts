"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";

const MIN_SHOP_MODIFIER = -50;
const MAX_SHOP_MODIFIER = 100;

function clampShopModifier(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SHOP_MODIFIER, Math.max(MIN_SHOP_MODIFIER, Math.round(value)));
}

/**
 * SL setzt den NPC-/Shop-Aufschlag (`campaign_shops.price_modifier_percent`).
 */
export async function updateCampaignShopPriceModifier(
  shopId: string,
  priceModifierPercent: number,
): Promise<{ success: boolean; priceModifierPercent?: number; error?: string }> {
  const id = String(shopId ?? "").trim();
  if (!id) return { success: false, error: "Ungültiger Shop." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select("id, campaign_id")
    .eq("id", id)
    .maybeSingle();

  if (shopError || !shopRaw) {
    return { success: false, error: "Shop wurde nicht gefunden." };
  }

  const shop = shopRaw as { id: string; campaign_id: string };

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", shop.campaign_id)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null,
      user.id,
    )
  ) {
    return { success: false, error: "Nur der Spielleiter kann den Aufschlag ändern." };
  }

  const next = clampShopModifier(priceModifierPercent);

  const { error: updateError } = await supabase
    .from("campaign_shops")
    .update({ price_modifier_percent: next })
    .eq("id", shop.id);

  if (updateError) {
    console.error("updateCampaignShopPriceModifier", updateError.message);
    return { success: false, error: "Aufschlag konnte nicht gespeichert werden." };
  }

  return { success: true, priceModifierPercent: next };
}
