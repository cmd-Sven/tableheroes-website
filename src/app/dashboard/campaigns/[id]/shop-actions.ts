"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidShopArchetypeKey } from "@/src/lib/shop-archetypes";

type BulkShopItemInput = {
  name: string;
  description?: string | null;
  base_price_gp: number;
  is_magical?: boolean;
  is_legal?: boolean;
  rarity?: string;
  item_type?: string;
  is_ration_package?: boolean;
};

const VALID_RARITIES = new Set([
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary",
]);

const VALID_ITEM_TYPES = new Set([
  "weapon",
  "armor",
  "potion",
  "gear",
  "material",
  "service",
  "quest",
]);

async function assertGmForCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw, error: campErr } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();
  if (campErr || !campaignRaw) {
    console.error("assertGmForCampaign campaigns", campErr);
    throw new Error("Kampagne nicht gefunden.");
  }
  const c = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  };
  const campaignGmId = c.gm_id != null ? String(c.gm_id) : null;
  const campaignOwnerId = c.owner_id != null ? String(c.owner_id) : null;
  const currentUserId = String(user.id);
  const isGm =
    (campaignGmId !== null && campaignGmId === currentUserId) ||
    (campaignOwnerId !== null && campaignOwnerId === currentUserId);
  if (!isGm) throw new Error("Nur der Spielleiter kann Shops verwalten.");
  return { supabase, userId: user.id };
}

function normalizeShopItem(item: BulkShopItemInput, shopId: string, index: number) {
  const name = String(item.name ?? "").trim();
  if (!name) throw new Error("Ein Shop-Item hat keinen Namen.");

  const rarity = String(item.rarity ?? "common").trim().toLowerCase();
  const itemType = String(item.item_type ?? "gear").trim().toLowerCase();
  const price = Math.max(0, Math.round(Number(item.base_price_gp) || 0));

  return {
    shop_id: shopId,
    sort_order: index,
    name: name.slice(0, 160),
    description: item.description ? String(item.description).trim().slice(0, 1200) : null,
    base_price_gp: price,
    is_magical: Boolean(item.is_magical),
    is_legal: item.is_legal !== false,
    rarity: VALID_RARITIES.has(rarity) ? rarity : "common",
    item_type: VALID_ITEM_TYPES.has(itemType) ? itemType : "gear",
    is_ration_package: Boolean(item.is_ration_package),
  };
}

export async function createCampaignShop(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!campaignId) throw new Error("Kampagne fehlt.");

  const { supabase } = await assertGmForCampaign(campaignId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Bitte einen Shop-Namen angeben.");

  const shopModeRaw = String(formData.get("shop_mode") ?? "archetype");
  const shop_mode =
    shopModeRaw === "unique" ? "unique" : ("archetype" as const);

  let archetype_key: string | null = null;
  if (shop_mode === "archetype") {
    const key = String(formData.get("archetype_key") ?? "").trim();
    if (!isValidShopArchetypeKey(key)) {
      throw new Error("Bitte einen gültigen Shop-Typ wählen.");
    }
    archetype_key = key;
  }

  const priceRaw = formData.get("price_modifier_percent");
  const priceNum =
    priceRaw === null || priceRaw === ""
      ? 0
      : Number(String(priceRaw).replace(",", "."));
  const price_modifier_percent = Number.isFinite(priceNum)
    ? Math.round(priceNum)
    : 0;

  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw ? notesRaw : null;

  const safePrice = Number.isFinite(price_modifier_percent)
    ? price_modifier_percent
    : 0;

  const { error } = await supabase.from("campaign_shops").insert({
    campaign_id: campaignId,
    name,
    shop_mode,
    archetype_key,
    price_modifier_percent: safePrice,
    notes,
  });

  if (error) {
    console.error("createCampaignShop", error.code, error.message, error.details);
    throw new Error("Shop konnte nicht angelegt werden.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
}

export async function deleteCampaignShop(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const shopId = String(formData.get("shop_id") ?? "").trim();
  if (!campaignId || !shopId) throw new Error("Ungültige Anfrage.");

  const { supabase } = await assertGmForCampaign(campaignId);

  const { error } = await supabase
    .from("campaign_shops")
    .delete()
    .eq("id", shopId)
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("deleteCampaignShop", error);
    throw new Error("Shop konnte nicht gelöscht werden.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
}

export async function bulkInsertCampaignShopItems(
  campaignId: string,
  shopId: string,
  items: BulkShopItemInput[],
) {
  if (!campaignId || !shopId) throw new Error("Kampagne oder Shop fehlt.");
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Keine Items zum Speichern vorhanden.");
  }

  const { supabase } = await assertGmForCampaign(campaignId);

  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select("id, campaign_id")
    .eq("id", shopId)
    .eq("campaign_id", campaignId)
    .single();

  if (shopError || !shopRaw) {
    throw new Error("Shop wurde nicht gefunden.");
  }

  const { data: existingItems } = await supabase
    .from("campaign_shop_items")
    .select("sort_order")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const startOrder = Number(existingItems?.[0]?.sort_order ?? -1) + 1;
  const rows = items
    .slice(0, 30)
    .map((item, index) => normalizeShopItem(item, shopId, startOrder + index));

  const { error } = await supabase.from("campaign_shop_items").insert(rows);

  if (error) {
    console.error("bulkInsertCampaignShopItems", error);
    throw new Error("Shop-Inventar konnte nicht gespeichert werden.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
  return { inserted: rows.length };
}
