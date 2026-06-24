import { createAdminClient } from "@/src/lib/supabase/server";
import { canShowPublicImage } from "@/src/lib/public-image-policy";
import type {
  PublicSeoCard,
  PublicSeoDetail,
  PublicSeoEntityType,
} from "@/src/lib/public-seo-types";

const SITE_URL = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://table-heroes.de").replace(/\/$/, "");

function excerpt(text: string | null | undefined, max = 160): string | null {
  if (!text?.trim()) return null;
  const plain = text.replace(/[#*_`[\]]/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

type LoreRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  image_url: string | null;
  image_is_ai_generated: boolean | null;
  image_upload_rights_confirmed: boolean | null;
};

type NpcRow = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  description: string | null;
  appearance: string | null;
  image_url: string | null;
  image_is_ai_generated: boolean | null;
  image_upload_rights_confirmed: boolean | null;
};

type FactionRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  philosophy: string | null;
  goals: string | null;
  image_url: string | null;
  banner_url: string | null;
  image_is_ai_generated: boolean | null;
  image_upload_rights_confirmed: boolean | null;
};

async function loadEntityPayload(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: PublicSeoEntityType,
  entityId: string,
): Promise<{
  name: string;
  entitySubtype: string | null;
  description: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  imageIsAiGenerated: boolean;
  imageUploadRightsConfirmed: boolean | null;
  sections: Array<{ title: string; body: string | null }>;
} | null> {
  if (entityType === "lore") {
    const { data } = await (supabase as any)
      .from("world_lore")
      .select(
        "id, name, type, description, image_url, image_is_ai_generated, image_upload_rights_confirmed",
      )
      .eq("id", entityId)
      .maybeSingle();
    const row = data as LoreRow | null;
    if (!row) return null;
    const imageUrl = row.image_url?.trim() || null;
    const imageIsAiGenerated = row.image_is_ai_generated === true;
    const imageUploadRightsConfirmed = row.image_upload_rights_confirmed ?? null;
    return {
      name: row.name,
      entitySubtype: row.type,
      description: row.description,
      excerpt: excerpt(row.description),
      imageUrl: canShowPublicImage({
        imageUrl,
        imageIsAiGenerated,
        imageUploadRightsConfirmed,
      })
        ? imageUrl
        : null,
      imageIsAiGenerated,
      imageUploadRightsConfirmed,
      sections: [],
    };
  }

  if (entityType === "npc") {
    const { data } = await (supabase as any)
      .from("npcs")
      .select(
        "id, name, title, role, description, appearance, image_url, image_is_ai_generated, image_upload_rights_confirmed",
      )
      .eq("id", entityId)
      .maybeSingle();
    const row = data as NpcRow | null;
    if (!row) return null;
    const imageUrl = row.image_url?.trim() || null;
    const imageIsAiGenerated = row.image_is_ai_generated === true;
    const imageUploadRightsConfirmed = row.image_upload_rights_confirmed ?? null;
    const sections: Array<{ title: string; body: string | null }> = [];
    if (row.appearance?.trim()) {
      sections.push({ title: "Erscheinung", body: row.appearance });
    }
    return {
      name: row.name,
      entitySubtype: row.role || row.title,
      description: row.description,
      excerpt: excerpt(row.description || row.appearance),
      imageUrl: canShowPublicImage({
        imageUrl,
        imageIsAiGenerated,
        imageUploadRightsConfirmed,
      })
        ? imageUrl
        : null,
      imageIsAiGenerated,
      imageUploadRightsConfirmed,
      sections,
    };
  }

  const { data } = await (supabase as any)
    .from("factions")
    .select(
      "id, name, type, description, philosophy, goals, image_url, banner_url, image_is_ai_generated, image_upload_rights_confirmed",
    )
    .eq("id", entityId)
    .maybeSingle();
  const row = data as FactionRow | null;
  if (!row) return null;
  const rawImage = row.banner_url?.trim() || row.image_url?.trim() || null;
  const imageIsAiGenerated = row.image_is_ai_generated === true;
  const imageUploadRightsConfirmed = row.image_upload_rights_confirmed ?? null;
  const sections: Array<{ title: string; body: string | null }> = [];
  if (row.philosophy?.trim()) sections.push({ title: "Philosophie", body: row.philosophy });
  if (row.goals?.trim()) sections.push({ title: "Ziele", body: row.goals });

  return {
    name: row.name,
    entitySubtype: row.type,
    description: row.description,
    excerpt: excerpt(row.description),
    imageUrl: canShowPublicImage({
      imageUrl: rawImage,
      imageIsAiGenerated,
      imageUploadRightsConfirmed,
    })
      ? rawImage
      : null,
    imageIsAiGenerated,
    imageUploadRightsConfirmed,
    sections,
  };
}

export async function getPublicSeoBySlug(slug: string): Promise<PublicSeoDetail | null> {
  const supabase = createAdminClient();
  const { data: seoRow } = await (supabase as any)
    .from("public_seo_entries")
    .select("campaign_id, entity_type, entity_id, slug, published_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!seoRow) return null;

  const { data: campaign } = await (supabase as any)
    .from("campaigns")
    .select("name")
    .eq("id", seoRow.campaign_id)
    .maybeSingle();

  const entity = await loadEntityPayload(
    supabase,
    seoRow.entity_type as PublicSeoEntityType,
    String(seoRow.entity_id),
  );
  if (!entity) return null;

  return {
    slug: String(seoRow.slug),
    name: entity.name,
    entityType: seoRow.entity_type as PublicSeoEntityType,
    entitySubtype: entity.entitySubtype,
    excerpt: entity.excerpt,
    imageUrl: entity.imageUrl,
    imageIsAiGenerated: entity.imageIsAiGenerated,
    imageUploadRightsConfirmed: entity.imageUploadRightsConfirmed,
    campaignId: String(seoRow.campaign_id),
    campaignName: String((campaign as { name?: string } | null)?.name ?? "Kampagne"),
    publishedAt: seoRow.published_at ? String(seoRow.published_at) : null,
    description: entity.description,
    sections: entity.sections,
  };
}

export type HomepageLoreGroup = {
  campaignId: string;
  campaignName: string;
  entries: PublicSeoCard[];
};

export async function getHomepagePublicLoreGroups(
  limitPerCampaign = 6,
): Promise<HomepageLoreGroup[]> {
  const supabase = createAdminClient();

  const { data: campaigns } = await (supabase as any)
    .from("campaigns")
    .select("id, name")
    .eq("seo_lore_homepage_enabled", true);

  const campaignList = (campaigns ?? []) as Array<{ id: string; name: string }>;
  if (campaignList.length === 0) return [];

  const groups: HomepageLoreGroup[] = [];

  for (const campaign of campaignList) {
    const { data: seoRows } = await (supabase as any)
      .from("public_seo_entries")
      .select("entity_type, entity_id, slug, published_at")
      .eq("campaign_id", campaign.id)
      .eq("is_public", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limitPerCampaign);

    const entries: PublicSeoCard[] = [];
    for (const row of seoRows ?? []) {
      const entity = await loadEntityPayload(
        supabase,
        row.entity_type as PublicSeoEntityType,
        String(row.entity_id),
      );
      if (!entity) continue;
      entries.push({
        slug: String(row.slug),
        name: entity.name,
        entityType: row.entity_type as PublicSeoEntityType,
        entitySubtype: entity.entitySubtype,
        excerpt: entity.excerpt,
        imageUrl: entity.imageUrl,
        imageIsAiGenerated: entity.imageIsAiGenerated,
        campaignId: campaign.id,
        campaignName: campaign.name,
        publishedAt: row.published_at ? String(row.published_at) : null,
      });
    }

    if (entries.length > 0) {
      groups.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        entries,
      });
    }
  }

  return groups;
}

export function publicSeoAbsoluteUrl(slug: string): string {
  return `${SITE_URL()}/${slug}`;
}

export async function isPublicSeoSlugTaken(slug: string, exceptEntity?: {
  entityType: PublicSeoEntityType;
  entityId: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from("public_seo_entries")
    .select("entity_type, entity_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return false;
  if (
    exceptEntity &&
    data.entity_type === exceptEntity.entityType &&
    String(data.entity_id) === exceptEntity.entityId
  ) {
    return false;
  }
  return true;
}
