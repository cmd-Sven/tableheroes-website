import { prepareNewsMarkdown } from "@/src/lib/markdown-normalize";

const DISCORD_EMBED_DESC_MAX = 4096;
const TEASER_MAX = 320;
const RECAP_EXCERPT_MAX = 500;

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/** Öffentliche Bild-URL für Discord-Embeds (muss absolut und korrekt encodiert sein). */
export function toAbsoluteAssetUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).href;
    }
    const base = getAppBaseUrl().replace(/\/$/, "");
    const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(relative, `${base}/`).href;
  } catch {
    return undefined;
  }
}

export { toDiscordEmbedImageUrl } from "./resolve-image-url";

export function truncateText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Entfernt Markdown-Muster, die Discord-Embeds ablehnen können. */
export function sanitizeDiscordDescription(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/@(everyone|here)/gi, "@\u200b$1")
    .replace(/\[([^\]]+)\]\(\s*\)/g, "$1")
    .replace(/\n{4,}/g, "\n\n\n");
}

/** Grobe Markdown → Discord-kompatible Beschreibung. */
export function markdownToDiscordText(markdown: string, max = DISCORD_EMBED_DESC_MAX): string {
  let text = prepareNewsMarkdown(markdown);
  text = text
    .replace(/^###\s+(.+)$/gm, "**$1**")
    .replace(/^##\s+(.+)$/gm, "**$1**")
    .replace(/^#\s+(.+)$/gm, "**$1**")
    .replace(/\n{3,}/g, "\n\n");
  return truncateText(sanitizeDiscordDescription(text), max);
}

export function teaserFromText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const plain = text.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  return truncateText(plain, TEASER_MAX);
}

export function recapExcerpt(markdown: string): string {
  return truncateText(markdown.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim(), RECAP_EXCERPT_MAX);
}

export function isValidDiscordWebhookUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const parsed = new URL(t);
    if (parsed.protocol !== "https:") return false;
    return (
      parsed.hostname === "discord.com" ||
      parsed.hostname === "discordapp.com" ||
      parsed.hostname.endsWith(".discord.com")
    ) && parsed.pathname.includes("/api/webhooks/");
  } catch {
    return false;
  }
}

export function campaignDashboardUrl(campaignId: string): string {
  return `${getAppBaseUrl()}/dashboard/campaigns/${campaignId}`;
}

export function entityDetailUrl(
  campaignId: string,
  entityType: string,
  entityId: string,
): string {
  const base = `${getAppBaseUrl()}/dashboard/campaigns/${campaignId}`;
  switch (entityType) {
    case "npc":
      return `${base}/npcs/${entityId}`;
    case "faction":
      return `${base}/factions/${entityId}`;
    case "lore":
      return `${base}/lore/${entityId}`;
    case "bestarium":
      return `${base}/bestarium/${entityId}`;
    case "quest":
      return `${base}/quests/${entityId}`;
    default:
      return base;
  }
}
