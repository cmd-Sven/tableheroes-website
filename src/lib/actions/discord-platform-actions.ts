"use server";

import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isValidDiscordWebhookUrl } from "@/src/lib/integrations/discord/format";
import {
  getPlatformNewsWebhookForAdmin,
  sendDiscordTestMessage,
} from "@/src/lib/integrations/discord/notify";
import { DISCORD_PLATFORM_NEWS_KEY } from "@/src/lib/integrations/discord/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();

  if (
    (profile as { primary_role?: string })?.primary_role !== "Admin" &&
    !(profile as { is_super_admin?: boolean })?.is_super_admin
  ) {
    throw new Error("Nur Admins haben Zugriff.");
  }
  return user;
}

export async function getDiscordPlatformNewsWebhook(): Promise<string> {
  try {
    await requireAdmin();
    return await getPlatformNewsWebhookForAdmin();
  } catch (e) {
    console.error("[getDiscordPlatformNewsWebhook]", e);
    return "";
  }
}

export async function saveDiscordPlatformNewsWebhook(
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const trimmed = webhookUrl.trim();
  if (trimmed && !isValidDiscordWebhookUrl(trimmed)) {
    return {
      success: false,
      error: "Ungültige Webhook-URL. Erwartet: https://discord.com/api/webhooks/…",
    };
  }

  const payload = {
    key: DISCORD_PLATFORM_NEWS_KEY,
    value: { webhook_url: trimmed || null },
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error: sessionError } = await (supabase as any).from("platform_settings").upsert(
    payload,
    { onConflict: "key" },
  );
  if (!sessionError) return { success: true };

  const admin = tryCreateAdminClient();
  if (!admin) {
    return {
      success: false,
      error:
        sessionError.message ||
        "Webhook konnte nicht gespeichert werden (fehlende Admin-Berechtigung oder Service-Role-Key).",
    };
  }

  const { error } = await (admin as any).from("platform_settings").upsert(payload, {
    onConflict: "key",
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function testDiscordPlatformNewsWebhook(): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();
  const webhook = await getPlatformNewsWebhookForAdmin();
  if (!webhook) {
    return { success: false, error: "Kein Webhook hinterlegt." };
  }

  const result = await sendDiscordTestMessage(webhook, "platform");
  return result.ok
    ? { success: true }
    : { success: false, error: result.error ?? "Test fehlgeschlagen." };
}
