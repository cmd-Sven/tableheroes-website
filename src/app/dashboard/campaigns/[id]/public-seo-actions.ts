"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { publicImageBlockReason } from "@/src/lib/public-image-policy";
import type { PublicSeoEntityType, PublicSeoGmState } from "@/src/lib/public-seo-types";
import {
  isPublicSeoSlugTaken,
  publicSeoAbsoluteUrl,
} from "@/src/lib/queries/public-seo-queries";
import { generateUniqueEntitySlug, slugifyEntityName } from "@/src/lib/slugify";

const SITE_URL = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://table-heroes.de").replace(/\/$/, "");

async function assertGm(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    throw new Error("Nur der GM kann die öffentliche Sichtbarkeit ändern.");
  }

  return { supabase, user };
}

async function loadEntityNameAndImage(
  entityType: PublicSeoEntityType,
  entityId: string,
): Promise<{
  name: string;
  imageUrl: string | null;
  imageIsAiGenerated: boolean;
  imageUploadRightsConfirmed: boolean | null;
}> {
  const admin = createAdminClient();

  if (entityType === "lore") {
    const { data } = await (admin as any)
      .from("world_lore")
      .select(
        "name, image_url, image_is_ai_generated, image_upload_rights_confirmed",
      )
      .eq("id", entityId)
      .maybeSingle();
    if (!data) throw new Error("Lore-Eintrag nicht gefunden.");
    return {
      name: String(data.name),
      imageUrl: data.image_url?.trim() || null,
      imageIsAiGenerated: data.image_is_ai_generated === true,
      imageUploadRightsConfirmed: data.image_upload_rights_confirmed ?? null,
    };
  }

  if (entityType === "npc") {
    const { data } = await (admin as any)
      .from("npcs")
      .select(
        "name, image_url, image_is_ai_generated, image_upload_rights_confirmed",
      )
      .eq("id", entityId)
      .maybeSingle();
    if (!data) throw new Error("NPC nicht gefunden.");
    return {
      name: String(data.name),
      imageUrl: data.image_url?.trim() || null,
      imageIsAiGenerated: data.image_is_ai_generated === true,
      imageUploadRightsConfirmed: data.image_upload_rights_confirmed ?? null,
    };
  }

  const { data } = await (admin as any)
    .from("factions")
    .select(
      "name, image_url, banner_url, image_is_ai_generated, image_upload_rights_confirmed",
    )
    .eq("id", entityId)
    .maybeSingle();
  if (!data) throw new Error("Fraktion nicht gefunden.");
  return {
    name: String(data.name),
    imageUrl: data.banner_url?.trim() || data.image_url?.trim() || null,
    imageIsAiGenerated: data.image_is_ai_generated === true,
    imageUploadRightsConfirmed: data.image_upload_rights_confirmed ?? null,
  };
}

export async function getPublicSeoGmState(
  campaignId: string,
  entityType: PublicSeoEntityType,
  entityId: string,
): Promise<PublicSeoGmState | null> {
  await assertGm(campaignId);
  const admin = createAdminClient();

  const { data: row } = await (admin as any)
    .from("public_seo_entries")
    .select("slug, is_public, published_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  const entity = await loadEntityNameAndImage(entityType, entityId);
  const slug =
    row?.slug ??
    (await generateUniqueEntitySlug(entity.name, (candidate) =>
      isPublicSeoSlugTaken(candidate),
    ));

  const imageBlockReason = publicImageBlockReason({
    imageUrl: entity.imageUrl,
    imageIsAiGenerated: entity.imageIsAiGenerated,
    imageUploadRightsConfirmed: entity.imageUploadRightsConfirmed,
  });

  return {
    slug,
    isPublic: row?.is_public === true,
    publishedAt: row?.published_at ? String(row.published_at) : null,
    publicUrl: publicSeoAbsoluteUrl(slug),
    imageUrl: entity.imageUrl,
    imageIsAiGenerated: entity.imageIsAiGenerated,
    imageUploadRightsConfirmed: entity.imageUploadRightsConfirmed,
    canPublishWithImage: !imageBlockReason,
    imageBlockReason,
  };
}

export async function setEntityImageRightsForPublic(
  entityType: PublicSeoEntityType,
  entityId: string,
  input: {
    imageIsAiGenerated: boolean;
    imageUploadRightsConfirmed: boolean;
  },
): Promise<void> {
  const admin = createAdminClient();
  const payload = {
    image_is_ai_generated: input.imageIsAiGenerated,
    image_upload_rights_confirmed: input.imageIsAiGenerated
      ? null
      : input.imageUploadRightsConfirmed
        ? true
        : false,
  };

  const table =
    entityType === "lore" ? "world_lore" : entityType === "npc" ? "npcs" : "factions";

  const { error } = await (admin as any).from(table).update(payload).eq("id", entityId);
  if (error) throw new Error(error.message);
}

export async function setPublicSeoVisibility(
  campaignId: string,
  entityType: PublicSeoEntityType,
  entityId: string,
  isPublic: boolean,
  options?: {
    customSlug?: string;
    imageIsAiGenerated?: boolean;
    imageUploadRightsConfirmed?: boolean;
  },
): Promise<{ slug: string; publicUrl: string }> {
  await assertGm(campaignId);
  const admin = createAdminClient();

  const entity = await loadEntityNameAndImage(entityType, entityId);

  if (options?.imageIsAiGenerated !== undefined) {
    await setEntityImageRightsForPublic(entityType, entityId, {
      imageIsAiGenerated: options.imageIsAiGenerated,
      imageUploadRightsConfirmed: options.imageUploadRightsConfirmed ?? false,
    });
    entity.imageIsAiGenerated = options.imageIsAiGenerated;
    entity.imageUploadRightsConfirmed = options.imageIsAiGenerated
      ? null
      : options.imageUploadRightsConfirmed
        ? true
        : false;
  }

  if (isPublic) {
    const blockReason = publicImageBlockReason({
      imageUrl: entity.imageUrl,
      imageIsAiGenerated: entity.imageIsAiGenerated,
      imageUploadRightsConfirmed: entity.imageUploadRightsConfirmed,
    });
    // Text kann öffentlich sein; Bild wird ohne Rechte einfach ausgeblendet.
    void blockReason;
  }

  const { data: existing } = await (admin as any)
    .from("public_seo_entries")
    .select("slug")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  let slug = existing?.slug as string | undefined;
  if (!slug) {
    const requested = options?.customSlug?.trim()
      ? slugifyEntityName(options.customSlug)
      : slugifyEntityName(entity.name);
    slug = await generateUniqueEntitySlug(requested || entity.name, (candidate) =>
      isPublicSeoSlugTaken(candidate, { entityType, entityId }),
    );
  }

  const payload = {
    campaign_id: campaignId,
    entity_type: entityType,
    entity_id: entityId,
    slug,
    is_public: isPublic,
    published_at: isPublic ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (admin as any)
    .from("public_seo_entries")
    .upsert(payload, { onConflict: "entity_type,entity_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);

  return { slug, publicUrl: publicSeoAbsoluteUrl(slug) };
}

export async function setCampaignSeoHomepageEnabled(
  campaignId: string,
  enabled: boolean,
): Promise<void> {
  await assertGm(campaignId);
  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("campaigns")
    .update({ seo_lore_homepage_enabled: enabled })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
