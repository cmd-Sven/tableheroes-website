import type { DiscordEmbed } from "./types";
import { truncateText } from "./format";

const DISCORD_EMBED_TOTAL_MAX = 6000;
const DISCORD_URL_MAX = 2048;

function normalizeDiscordUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.length > DISCORD_URL_MAX) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

function normalizeDiscordTimestamp(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function embedTextLength(embed: DiscordEmbed): number {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.footer?.text?.length ?? 0)
  );
}

/** Discord-Webhook-Limits: Feldlängen, Gesamtzeichen, gültige URLs/Zeitstempel. */
export function sanitizeDiscordEmbed(embed: DiscordEmbed): DiscordEmbed {
  const title = embed.title?.trim()
    ? truncateText(embed.title.trim(), 256)
    : undefined;

  const footerText = embed.footer?.text?.trim()
    ? truncateText(embed.footer.text.trim(), 2048)
    : undefined;

  const reserved = (title?.length ?? 0) + (footerText?.length ?? 0) + 32;
  const descriptionBudget = Math.min(4096, Math.max(200, DISCORD_EMBED_TOTAL_MAX - reserved));

  let description = embed.description?.trim()
    ? truncateText(embed.description.trim(), descriptionBudget)
    : undefined;

  if (!title && !description) {
    description = "Neuigkeit auf TableHeroes";
  }

  const sanitized: DiscordEmbed = {
    title,
    description,
    url: normalizeDiscordUrl(embed.url),
    color:
      typeof embed.color === "number" && Number.isFinite(embed.color)
        ? Math.max(0, Math.min(0xffffff, Math.floor(embed.color)))
        : undefined,
    timestamp: normalizeDiscordTimestamp(embed.timestamp),
    footer: footerText ? { text: footerText } : undefined,
  };

  const imageUrl = normalizeDiscordUrl(embed.image?.url);
  if (imageUrl) sanitized.image = { url: imageUrl };

  const thumbUrl = normalizeDiscordUrl(embed.thumbnail?.url);
  if (thumbUrl) sanitized.thumbnail = { url: thumbUrl };

  // Falls noch über 6000: Beschreibung weiter kürzen
  while (embedTextLength(sanitized) > DISCORD_EMBED_TOTAL_MAX && sanitized.description) {
    const over = embedTextLength(sanitized) - DISCORD_EMBED_TOTAL_MAX;
    sanitized.description = truncateText(
      sanitized.description,
      Math.max(100, sanitized.description.length - over - 1),
    );
  }

  return sanitized;
}

export function sanitizeDiscordPayload(embeds: DiscordEmbed[]): DiscordEmbed[] {
  return embeds.map(sanitizeDiscordEmbed);
}
