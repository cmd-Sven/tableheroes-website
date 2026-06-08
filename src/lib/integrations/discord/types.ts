export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
};

export type DiscordWebhookPayload = {
  content?: string;
  embeds?: DiscordEmbed[];
};

export type CampaignRevealEntityType = "npc" | "faction" | "lore" | "bestarium" | "quest";

export const DISCORD_PLATFORM_NEWS_KEY = "discord_news_webhook";
