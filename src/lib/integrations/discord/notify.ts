import { after } from "next/server";
import { createAdminClient, createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import type { NewsPost } from "@/src/lib/constants/news";
import { postDiscordEmbed, postDiscordWebhook } from "./client";
import {
  buildNewsEmbed,
  buildRecapEmbed,
  buildRevealEmbed,
  buildTestEmbed,
} from "./embeds";
import type { CampaignRevealEntityType } from "./types";
import { DISCORD_PLATFORM_NEWS_KEY } from "./types";
import { resolveDiscordEmbedImageUrl, teaserFromText } from "./format";

function logDiscordError(context: string, error?: string) {
  if (error) {
    console.error(`[discord] ${context}:`, error);
  }
}

async function getCampaignWebhook(campaignId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await (admin as any).from("campaign_discord_integrations")
    .select("webhook_url, notifications_enabled")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    logDiscordError("getCampaignWebhook", error.message);
    return null;
  }

  const row = data as { webhook_url?: string | null; notifications_enabled?: boolean } | null;
  if (!row?.notifications_enabled || !row.webhook_url?.trim()) return null;
  return row.webhook_url.trim();
}

function extractPlatformNewsWebhook(
  data: { value?: { webhook_url?: string } } | null,
): string | null {
  const url = data?.value?.webhook_url;
  return url?.trim() || null;
}

async function getPlatformNewsWebhook(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).from("platform_settings")
      .select("value")
      .eq("key", DISCORD_PLATFORM_NEWS_KEY)
      .maybeSingle();

    if (!error && data) {
      const url = extractPlatformNewsWebhook(data as { value?: { webhook_url?: string } });
      if (url) return url;
    } else if (error) {
      logDiscordError("getPlatformNewsWebhook(session)", error.message);
    }
  } catch (e) {
    logDiscordError("getPlatformNewsWebhook(session)", e instanceof Error ? e.message : String(e));
  }

  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data, error } = await (admin as any).from("platform_settings")
    .select("value")
    .eq("key", DISCORD_PLATFORM_NEWS_KEY)
    .maybeSingle();

  if (error) {
    logDiscordError("getPlatformNewsWebhook(admin)", error.message);
    return null;
  }

  return extractPlatformNewsWebhook(data as { value?: { webhook_url?: string } } | null);
}

async function getCampaignName(campaignId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await (admin.from("campaigns") as any)
    .select("name")
    .eq("id", campaignId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || "Kampagne";
}

async function loadRevealEntity(
  entityType: CampaignRevealEntityType,
  entityId: string,
): Promise<{
  name: string;
  subtitle?: string | null;
  teaser?: string | null;
  imageUrl?: string | null;
} | null> {
  const admin = createAdminClient();

  if (entityType === "npc") {
    const { data } = await (admin.from("npcs") as any)
      .select("name, title, description, image_url")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.name ?? "Unbekannter NSC",
      subtitle: data.title,
      teaser: data.description,
      imageUrl: data.image_url,
    };
  }

  if (entityType === "faction") {
    const { data } = await (admin.from("factions") as any)
      .select("name, description, image_url, banner_url")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.name ?? "Unbekannte Fraktion",
      teaser: data.description,
      imageUrl: data.image_url || data.banner_url,
    };
  }

  if (entityType === "lore") {
    const { data } = await (admin.from("world_lore") as any)
      .select("name, type, description, image_url, default_image_url")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.name ?? "Lore-Eintrag",
      subtitle: data.type,
      teaser: data.description,
      imageUrl: data.image_url || data.default_image_url,
    };
  }

  if (entityType === "bestarium") {
    const { data } = await (admin.from("bestarium_creatures") as any)
      .select("name, player_knowledge, physical_description, image_url")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.name ?? "Kreatur",
      teaser: data.player_knowledge || data.physical_description,
      imageUrl: data.image_url,
    };
  }

  if (entityType === "quest") {
    const { data } = await (admin.from("quests") as any)
      .select("title, objective, description")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.title ?? "Quest",
      teaser: data.objective || data.description,
      imageUrl: null,
    };
  }

  return null;
}

/** Hintergrund-Benachrichtigung (Next.js `after` — läuft nach Server Action zu Ende). */
export function dispatchDiscordNotify(task: () => Promise<void>) {
  after(() =>
    task().catch((e) => {
      console.error("[discord] notify failed:", e);
    }),
  );
}

export async function notifyNewsPublished(
  post: NewsPost,
): Promise<{ ok: boolean; error?: string }> {
  if (!post.is_published) {
    return { ok: false, error: "Beitrag ist nicht veröffentlicht." };
  }
  const webhook = await getPlatformNewsWebhook();
  if (!webhook) {
    return { ok: false, error: "Kein Discord-Webhook für News konfiguriert." };
  }

  const embedImageUrl = await resolveDiscordEmbedImageUrl(post.image_url);
  const result = await postDiscordEmbed(webhook, buildNewsEmbed(post, embedImageUrl));
  if (!result.ok) logDiscordError("notifyNewsPublished", result.error);
  return result;
}

export async function notifyCampaignEntityRevealed(
  campaignId: string,
  entityType: CampaignRevealEntityType,
  entityId: string,
): Promise<{ ok: boolean; error?: string }> {
  const webhook = await getCampaignWebhook(campaignId);
  if (!webhook) {
    return { ok: false, error: "Kein Discord-Webhook für diese Kampagne konfiguriert." };
  }

  const entity = await loadRevealEntity(entityType, entityId);
  if (!entity) {
    return { ok: false, error: "Inhalt nicht gefunden." };
  }

  const campaignName = await getCampaignName(campaignId);
  const embedImageUrl = await resolveDiscordEmbedImageUrl(entity.imageUrl);
  if (entity.imageUrl?.trim() && !embedImageUrl) {
    console.warn(
      "[discord] Bild-URL konnte nicht für Embed aufgelöst werden:",
      entity.imageUrl.slice(0, 120),
    );
  }
  const embed = buildRevealEmbed({
    campaignId,
    campaignName,
    entityType,
    entityId,
    name: entity.name,
    subtitle: entity.subtitle,
    teaser: entity.teaser ? teaserFromText(entity.teaser) : undefined,
    imageUrl: entity.imageUrl,
    embedImageUrl,
  });

  const result = await postDiscordEmbed(webhook, embed);
  if (!result.ok) {
    logDiscordError("notifyCampaignEntityRevealed", result.error);
    return result;
  }
  if (result.imageOmitted && embedImageUrl) {
    return {
      ok: true,
      error: "Nachricht gesendet, aber das Bild konnte nicht eingebettet werden.",
    };
  }
  return result;
}

export async function notifyPlayerRecapPublished(params: {
  campaignId: string;
  sessionTitle: string;
  summaryMd: string;
}) {
  const webhook = await getCampaignWebhook(params.campaignId);
  if (!webhook) return;

  const campaignName = await getCampaignName(params.campaignId);
  const result = await postDiscordWebhook(webhook, {
    embeds: [
      buildRecapEmbed({
        campaignId: params.campaignId,
        campaignName,
        sessionTitle: params.sessionTitle,
        summaryMd: params.summaryMd,
      }),
    ],
  });
  if (!result.ok) logDiscordError("notifyPlayerRecapPublished", result.error);
}

export async function sendDiscordTestMessage(
  webhookUrl: string,
  scope: "campaign" | "platform",
  campaignName?: string,
): Promise<{ ok: boolean; error?: string }> {
  return postDiscordWebhook(webhookUrl, {
    embeds: [buildTestEmbed(scope, campaignName)],
  });
}

export async function getPlatformNewsWebhookForAdmin(): Promise<string> {
  return (await getPlatformNewsWebhook()) ?? "";
}
