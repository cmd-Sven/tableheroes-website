"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { isValidDiscordWebhookUrl } from "@/src/lib/integrations/discord/format";
import {
  notifyCampaignEntityRevealed,
  sendDiscordTestMessage,
} from "@/src/lib/integrations/discord/notify";
import type { CampaignRevealEntityType } from "@/src/lib/integrations/discord/types";
import { revalidatePath } from "next/cache";
import type { VisibilityEntityType } from "./campaign-visibility-queries";

export type CampaignDiscordSettings = {
  webhookUrl: string;
  notificationsEnabled: boolean;
  configured: boolean;
};

export async function getCampaignDiscordSettings(
  campaignId: string,
): Promise<CampaignDiscordSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    return null;
  }

  const { data: row } = await (supabase as any)
    .from("campaign_discord_integrations")
    .select("webhook_url, notifications_enabled")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const integration = row as {
    webhook_url?: string | null;
    notifications_enabled?: boolean;
  } | null;

  return {
    webhookUrl: integration?.webhook_url?.trim() ?? "",
    notificationsEnabled: integration?.notifications_enabled ?? true,
    configured: !!integration?.webhook_url?.trim(),
  };
}

export async function saveCampaignDiscordSettings(
  campaignId: string,
  input: { webhookUrl: string; notificationsEnabled: boolean },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    return { success: false, error: "Nur der GM kann Discord-Einstellungen ändern." };
  }

  const webhookUrl = input.webhookUrl.trim();
  if (webhookUrl && !isValidDiscordWebhookUrl(webhookUrl)) {
    return {
      success: false,
      error: "Ungültige Webhook-URL. Erwartet: https://discord.com/api/webhooks/…",
    };
  }

  const { error } = await (supabase as any).from("campaign_discord_integrations").upsert(
    {
      campaign_id: campaignId,
      webhook_url: webhookUrl || null,
      notifications_enabled: input.notificationsEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id" },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

export async function testCampaignDiscordWebhook(
  campaignId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("name, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    return { success: false, error: "Nur der GM kann einen Test senden." };
  }

  const { data: row } = await (supabase as any)
    .from("campaign_discord_integrations")
    .select("webhook_url")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const webhookUrl = (row as { webhook_url?: string } | null)?.webhook_url?.trim();
  if (!webhookUrl) {
    return { success: false, error: "Kein Webhook hinterlegt." };
  }

  const result = await sendDiscordTestMessage(
    webhookUrl,
    "campaign",
    (campaign as { name?: string }).name,
  );
  return result.ok
    ? { success: true }
    : { success: false, error: result.error ?? "Test fehlgeschlagen." };
}

async function isEntityRevealedForCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  entityType: CampaignRevealEntityType,
  entityId: string,
): Promise<boolean> {
  if (entityType === "quest") {
    const { data } = await (supabase.from("quests") as any)
      .select("campaign_id, is_revealed")
      .eq("id", entityId)
      .maybeSingle();
    const row = data as { campaign_id?: string; is_revealed?: boolean } | null;
    return row?.campaign_id === campaignId && !!row?.is_revealed;
  }

  const visibilityType = entityType as VisibilityEntityType;
  const { data } = await (supabase.from("campaign_visibility") as any)
    .select("is_revealed")
    .eq("campaign_id", campaignId)
    .eq("entity_type", visibilityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  return !!(data as { is_revealed?: boolean } | null)?.is_revealed;
}

/** Manuell an Discord senden (z. B. NSC erneut teilen). Nur für freigegebene Inhalte. */
export async function sendCampaignEntityToDiscord(
  campaignId: string,
  entityType: CampaignRevealEntityType,
  entityId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    return { success: false, error: "Nur der GM kann an Discord senden." };
  }

  const settings = await getCampaignDiscordSettings(campaignId);
  if (!settings?.configured || !settings.notificationsEnabled) {
    return {
      success: false,
      error: "Discord ist für diese Kampagne nicht eingerichtet oder deaktiviert.",
    };
  }

  const revealed = await isEntityRevealedForCampaign(
    supabase,
    campaignId,
    entityType,
    entityId,
  );
  if (!revealed) {
    return {
      success: false,
      error: "Nur für Spieler freigegebene Inhalte können an Discord gesendet werden.",
    };
  }

  const result = await notifyCampaignEntityRevealed(campaignId, entityType, entityId);
  if (!result.ok) {
    return { success: false, error: result.error ?? "Discord-Versand fehlgeschlagen." };
  }
  if (result.error) {
    return { success: true, error: result.error };
  }
  return { success: true };
}
