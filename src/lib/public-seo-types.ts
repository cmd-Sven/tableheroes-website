export type PublicSeoEntityType = "lore" | "npc" | "faction";

export type PublicSeoEntryRow = {
  id: string;
  campaign_id: string;
  entity_type: PublicSeoEntityType;
  entity_id: string;
  slug: string;
  is_public: boolean;
  published_at: string | null;
};

export type PublicSeoCard = {
  slug: string;
  name: string;
  entityType: PublicSeoEntityType;
  entitySubtype: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  imageIsAiGenerated: boolean;
  campaignId: string;
  campaignName: string;
  publishedAt: string | null;
};

export type PublicSeoDetail = PublicSeoCard & {
  description: string | null;
  sections: Array<{ title: string; body: string | null }>;
  imageUploadRightsConfirmed: boolean | null;
};

export type PublicSeoGmState = {
  slug: string;
  isPublic: boolean;
  publishedAt: string | null;
  publicUrl: string;
  imageUrl: string | null;
  imageIsAiGenerated: boolean;
  imageUploadRightsConfirmed: boolean | null;
  canPublishWithImage: boolean;
  imageBlockReason: string | null;
};
