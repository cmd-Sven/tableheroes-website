import type { NewsPost } from "@/src/lib/constants/news";
import type { CampaignRevealEntityType, DiscordEmbed } from "./types";
import {
  campaignDashboardUrl,
  entityDetailUrl,
  getAppBaseUrl,
  markdownToDiscordText,
  recapExcerpt,
  teaserFromText,
  truncateText,
} from "./format";

/** Platz für Titel + Footer + Link — Discord-Gesamtlimit 6000 Zeichen. */
const DISCORD_NEWS_DESC_BUDGET = 5200;

export const DISCORD_COLORS = {
  gold: 0xcab926,
  green: 0x379806,
  heroDark: 0x217d42,
  blood: 0x58180d,
  blue: 0x3b82f6,
  quest: 0x23c763,
} as const;

const REVEAL_LABELS: Record<CampaignRevealEntityType, { emoji: string; label: string }> = {
  npc: { emoji: "🧙", label: "Neuer NSC entdeckt" },
  faction: { emoji: "⚔️", label: "Neue Fraktion entdeckt" },
  lore: { emoji: "📜", label: "Neuer Lore-Eintrag" },
  bestarium: { emoji: "🐉", label: "Neue Kreatur im Bestarium" },
  quest: { emoji: "🗺️", label: "Neue Quest" },
};

function newsCategoryColor(category: string): number {
  if (category === "Neue Kampagne") return DISCORD_COLORS.green;
  if (category === "Event") return DISCORD_COLORS.blue;
  return DISCORD_COLORS.gold;
}

export function buildNewsEmbed(
  post: NewsPost,
  embedImageUrl?: string | null,
): DiscordEmbed {
  const imageUrl = embedImageUrl ?? undefined;
  const readMoreUrl = `${getAppBaseUrl()}/dashboard/news`;
  const readMoreLine = `\n\n[Weiterlesen auf TableHeroes](${readMoreUrl})`;
  const descBudget = DISCORD_NEWS_DESC_BUDGET - readMoreLine.length;

  let description = post.content
    ? markdownToDiscordText(post.content, descBudget) + readMoreLine
    : `_Kein Inhalt._\n\n[Weiterlesen auf TableHeroes](${readMoreUrl})`;

  const createdAt = post.created_at?.trim();
  const timestamp =
    createdAt && !Number.isNaN(new Date(createdAt).getTime())
      ? new Date(createdAt).toISOString()
      : new Date().toISOString();

  return {
    title: truncateText(post.title, 256),
    description,
    url: `${getAppBaseUrl()}/dashboard/news`,
    color: newsCategoryColor(post.category),
    timestamp,
    image: imageUrl ? { url: imageUrl } : undefined,
    footer: { text: `TableHeroes · ${post.category}` },
  };
}

export function buildRevealEmbed(params: {
  campaignId: string;
  campaignName: string;
  entityType: CampaignRevealEntityType;
  entityId: string;
  name: string;
  subtitle?: string | null;
  teaser?: string | null;
  imageUrl?: string | null;
  embedImageUrl?: string | null;
}): DiscordEmbed {
  const meta = REVEAL_LABELS[params.entityType];
  const detailUrl = entityDetailUrl(params.campaignId, params.entityType, params.entityId);
  const portraitUrl = params.embedImageUrl ?? undefined;
  const useLargePortrait =
    params.entityType === "npc" || params.entityType === "bestarium";
  const title = params.subtitle?.trim()
    ? `${params.name} — ${params.subtitle.trim()}`
    : params.name;

  const lines = [
    `**${title}**`,
    params.teaser ? teaserFromText(params.teaser) : null,
    "",
    `🔗 [Details in TableHeroes ansehen](${detailUrl})`,
  ].filter((l) => l !== null);

  return {
    title: `${meta.emoji} ${meta.label}`,
    description: lines.join("\n"),
    url: detailUrl,
    color: DISCORD_COLORS.heroDark,
    image: useLargePortrait && portraitUrl ? { url: portraitUrl } : undefined,
    thumbnail: !useLargePortrait && portraitUrl ? { url: portraitUrl } : undefined,
    footer: { text: `TableHeroes · ${params.campaignName}` },
    timestamp: new Date().toISOString(),
  };
}

export function buildRecapEmbed(params: {
  campaignId: string;
  campaignName: string;
  sessionTitle: string;
  summaryMd: string;
}): DiscordEmbed {
  const url = campaignDashboardUrl(params.campaignId);
  return {
    title: "📖 Recap der letzten Session",
    description: [
      `**${params.sessionTitle}**`,
      "",
      recapExcerpt(params.summaryMd),
      "",
      `🔗 [Vollständigen Recap in TableHeroes lesen](${url})`,
    ].join("\n"),
    url,
    color: DISCORD_COLORS.gold,
    footer: { text: `TableHeroes · ${params.campaignName}` },
    timestamp: new Date().toISOString(),
  };
}

export function buildTestEmbed(scope: "campaign" | "platform", name?: string): DiscordEmbed {
  return {
    title: "✅ TableHeroes — Testnachricht",
    description: [
      "Die Discord-Anbindung funktioniert.",
      scope === "campaign" && name ? `Kampagne: **${name}**` : "Plattform: News & Updates",
    ]
      .filter(Boolean)
      .join("\n"),
    color: DISCORD_COLORS.green,
    footer: { text: "TableHeroes" },
    timestamp: new Date().toISOString(),
  };
}
