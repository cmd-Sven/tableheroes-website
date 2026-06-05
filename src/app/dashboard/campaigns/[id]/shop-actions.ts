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
  target_fap?: number;
  is_ration_package?: boolean;
};

export type CampaignShopItemInput = BulkShopItemInput & {
  id?: string;
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
  const targetFap = Math.max(0, Math.round(Number(item.target_fap ?? 0)));

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
    target_fap: targetFap,
    is_ration_package: Boolean(item.is_ration_package),
  };
}

async function assertUniqueShop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  shopId: string,
) {
  const { data: shopRaw, error: shopError } = await supabase
    .from("campaign_shops")
    .select("id, campaign_id, shop_mode")
    .eq("id", shopId)
    .eq("campaign_id", campaignId)
    .single();

  if (shopError || !shopRaw) {
    throw new Error("Shop wurde nicht gefunden.");
  }

  const shop = shopRaw as { shop_mode: string };
  if (shop.shop_mode !== "unique") {
    throw new Error("Nur Unique-Shops können hier manuell bearbeitet werden.");
  }

  return shopRaw;
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

export async function upsertCampaignShopItem(
  campaignId: string,
  shopId: string,
  item: CampaignShopItemInput,
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  if (!campaignId || !shopId) {
    return { success: false, error: "Kampagne oder Shop fehlt." };
  }

  try {
    const { supabase } = await assertGmForCampaign(campaignId);
    await assertUniqueShop(supabase, campaignId, shopId);

    const itemId = item.id?.trim() ?? "";
    const normalized = normalizeShopItem(item, shopId, 0);

    if (itemId) {
      const { data: existing } = await supabase
        .from("campaign_shop_items")
        .select("id, sort_order")
        .eq("id", itemId)
        .eq("shop_id", shopId)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: "Item wurde nicht gefunden." };
      }

      const { error } = await supabase
        .from("campaign_shop_items")
        .update({
          name: normalized.name,
          description: normalized.description,
          base_price_gp: normalized.base_price_gp,
          is_magical: normalized.is_magical,
          is_legal: normalized.is_legal,
          rarity: normalized.rarity,
          item_type: normalized.item_type,
          target_fap: normalized.target_fap,
          is_ration_package: normalized.is_ration_package,
        })
        .eq("id", itemId)
        .eq("shop_id", shopId);

      if (error) {
        console.error("upsertCampaignShopItem update", error);
        return { success: false, error: error.message || "Speichern fehlgeschlagen." };
      }

      revalidatePath(`/dashboard/campaigns/${campaignId}/shops/${shopId}`);
      revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
      return { success: true, itemId };
    }

    const { data: lastItem } = await supabase
      .from("campaign_shop_items")
      .select("sort_order")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = Number(lastItem?.[0]?.sort_order ?? -1) + 1;
    const insertRow = normalizeShopItem(item, shopId, nextOrder);

    const { data: inserted, error } = await supabase
      .from("campaign_shop_items")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      console.error("upsertCampaignShopItem insert", error);
      return { success: false, error: error.message || "Anlegen fehlgeschlagen." };
    }

    revalidatePath(`/dashboard/campaigns/${campaignId}/shops/${shopId}`);
    revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
    return { success: true, itemId: String((inserted as { id: string }).id) };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message || "Speichern fehlgeschlagen." };
  }
}

export async function deleteCampaignShopItem(
  campaignId: string,
  shopId: string,
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!campaignId || !shopId || !itemId) {
    return { success: false, error: "Ungültige Anfrage." };
  }

  try {
    const { supabase } = await assertGmForCampaign(campaignId);
    await assertUniqueShop(supabase, campaignId, shopId);

    const { error } = await supabase
      .from("campaign_shop_items")
      .delete()
      .eq("id", itemId)
      .eq("shop_id", shopId);

    if (error) {
      console.error("deleteCampaignShopItem", error);
      return { success: false, error: error.message || "Löschen fehlgeschlagen." };
    }

    revalidatePath(`/dashboard/campaigns/${campaignId}/shops/${shopId}`);
    revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message || "Löschen fehlgeschlagen." };
  }
}

export async function updateNpcMerchantAssignment(
  campaignId: string,
  npcId: string,
  isMerchant: boolean,
  shopId: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!campaignId || !npcId) {
    return { success: false, error: "Ungültige Anfrage." };
  }

  try {
    const { supabase } = await assertGmForCampaign(campaignId);

    const { data: campaignRaw } = await supabase
      .from("campaigns")
      .select("world_id")
      .eq("id", campaignId)
      .single();
    const worldId = (campaignRaw as { world_id?: string | null } | null)?.world_id;
    if (!worldId) {
      return { success: false, error: "Kampagne hat keine Welt." };
    }

    if (isMerchant) {
      const sid = shopId?.trim() ?? "";
      if (!sid) {
        return { success: false, error: "Bitte ein Shop-Template wählen." };
      }
      const { data: shopRaw } = await supabase
        .from("campaign_shops")
        .select("id")
        .eq("id", sid)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (!shopRaw) {
        return { success: false, error: "Shop gehört nicht zu dieser Kampagne." };
      }
    }

    const { data: npcRaw } = await supabase
      .from("npcs")
      .select("id, world_id")
      .eq("id", npcId)
      .maybeSingle();

    const npc = npcRaw as { id: string; world_id: string } | null;
    if (!npc || npc.world_id !== worldId) {
      return { success: false, error: "NPC gehört nicht zur Welt dieser Kampagne." };
    }

    const { error } = await supabase
      .from("npcs")
      .update({
        is_merchant: isMerchant,
        shop_id: isMerchant && shopId?.trim() ? shopId.trim() : null,
      })
      .eq("id", npcId);

    if (error) {
      console.error("updateNpcMerchantAssignment", error);
      return { success: false, error: error.message || "Speichern fehlgeschlagen." };
    }

    revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message || "Speichern fehlgeschlagen." };
  }
}
