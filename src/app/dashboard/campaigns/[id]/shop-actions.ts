"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidShopArchetypeKey } from "@/src/lib/shop-archetypes";

async function assertGmForCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();
  const c = campaignRaw as {
    gm_id: string;
    owner_id?: string | null;
  } | null;
  if (!c) throw new Error("Kampagne nicht gefunden.");
  const isGm = c.gm_id === user.id || c.owner_id === user.id;
  if (!isGm) throw new Error("Nur der Spielleiter kann Shops verwalten.");
  return { supabase, userId: user.id };
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

  const { error } = await (supabase.from("campaign_shops") as any).insert({
    campaign_id: campaignId,
    name,
    shop_mode,
    archetype_key,
    price_modifier_percent,
    notes,
  });

  if (error) {
    console.error("createCampaignShop", error);
    throw new Error("Shop konnte nicht angelegt werden.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
}

export async function deleteCampaignShop(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const shopId = String(formData.get("shop_id") ?? "").trim();
  if (!campaignId || !shopId) throw new Error("Ungültige Anfrage.");

  const { supabase } = await assertGmForCampaign(campaignId);

  const { error } = await (supabase.from("campaign_shops") as any)
    .delete()
    .eq("id", shopId)
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("deleteCampaignShop", error);
    throw new Error("Shop konnte nicht gelöscht werden.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/shops`);
}
