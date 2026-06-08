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

/** Sendet Embed; bei 400 ohne Bild/Thumbnail erneut versuchen. */
export async function postDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
): Promise<{ ok: boolean; error?: string }> {
  const first = await postDiscordWebhook(webhookUrl, { embeds: [embed] });
  if (first.ok || !embedHasMedia(embed)) return first;

  const retry = await postDiscordWebhook(webhookUrl, {
    embeds: [stripEmbedMedia(embed)],
  });
  if (retry.ok) return retry;

  return {
    ok: false,
    error: retry.error ?? first.error,
  };
}
