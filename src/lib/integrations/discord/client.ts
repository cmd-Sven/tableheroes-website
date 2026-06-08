import type { DiscordEmbed, DiscordWebhookPayload } from "./types";
import { sanitizeDiscordEmbed } from "./sanitize-embed";

function buildBody(payload: DiscordWebhookPayload): DiscordWebhookPayload {
  if (!payload.embeds?.length) return payload;
  return {
    ...payload,
    embeds: payload.embeds.map(sanitizeDiscordEmbed),
  };
}

export async function postDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(payload)),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Discord ${res.status}${body ? `: ${body.slice(0, 400)}` : ""}`,
      };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Netzwerkfehler";
    return { ok: false, error: message };
  }
}

function embedHasMedia(embed: DiscordEmbed): boolean {
  return !!(embed.image?.url || embed.thumbnail?.url);
}

function stripEmbedMedia(embed: DiscordEmbed): DiscordEmbed {
  return { ...embed, image: undefined, thumbnail: undefined };
}

/** Sendet Embed; bei 400 zuerst Thumbnail, dann ohne Bild erneut versuchen. */
export async function postDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
): Promise<{ ok: boolean; error?: string; imageOmitted?: boolean }> {
  const first = await postDiscordWebhook(webhookUrl, { embeds: [embed] });
  if (first.ok || !embedHasMedia(embed)) return first;

  const mediaUrl = embed.image?.url ?? embed.thumbnail?.url;
  if (mediaUrl && embed.image?.url) {
    const thumbRetry = await postDiscordWebhook(webhookUrl, {
      embeds: [{ ...embed, image: undefined, thumbnail: { url: mediaUrl } }],
    });
    if (thumbRetry.ok) {
      console.warn("[discord] Embed nur mit Thumbnail gesendet (Großbild abgelehnt).");
      return { ok: true, imageOmitted: true };
    }
  }

  const retry = await postDiscordWebhook(webhookUrl, {
    embeds: [stripEmbedMedia(embed)],
  });
  if (retry.ok) {
    console.warn(
      "[discord] Embed ohne Bild gesendet (Bild-URL von Discord abgelehnt oder nicht erreichbar).",
    );
    return { ok: true, imageOmitted: true };
  }

  return {
    ok: false,
    error: retry.error ?? first.error,
  };
}
