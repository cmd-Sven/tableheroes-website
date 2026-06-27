"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import type { CampaignSceneMedia, SceneMediaAppearance } from "@/src/lib/scene-media-types";
import { SCENE_MEDIA_CATEGORIES } from "@/src/lib/scene-media-types";

async function assertCampaignGm(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    throw new Error("Nur der GM kann die Szenen-Mediathek verwalten.");
  }

  return { supabase, user };
}

export async function getCampaignSceneMedia(
  campaignId: string,
): Promise<CampaignSceneMedia[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).from("campaign_scene_media")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignSceneMedia[];
}

export async function createCampaignSceneMedia(input: {
  campaignId: string;
  title: string;
  imageUrl: string;
  imageStoragePath?: string | null;
  category: string;
  gmNotes?: string | null;
  playerNotes?: string | null;
  imageIsAiGenerated?: boolean;
  imageUploadRightsConfirmed?: boolean | null;
  sortOrder?: number;
}) {
  const { supabase } = await assertCampaignGm(input.campaignId);

  const category = SCENE_MEDIA_CATEGORIES.includes(input.category as (typeof SCENE_MEDIA_CATEGORIES)[number])
    ? input.category
    : "Sonstiges";

  const { data, error } = await (supabase as any).from("campaign_scene_media")
    .insert({
      campaign_id: input.campaignId,
      title: input.title.trim(),
      image_url: input.imageUrl.trim(),
      image_storage_path: input.imageStoragePath ?? null,
      category,
      gm_notes: input.gmNotes?.trim() || null,
      player_notes: input.playerNotes?.trim() || null,
      image_is_ai_generated: input.imageIsAiGenerated === true,
      image_upload_rights_confirmed: input.imageIsAiGenerated
        ? null
        : input.imageUploadRightsConfirmed === true
          ? true
          : null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/campaigns/${input.campaignId}`);
  return data as CampaignSceneMedia;
}

export async function updateCampaignSceneMedia(
  sceneMediaId: string,
  campaignId: string,
  updates: {
    title?: string;
    category?: string;
    gmNotes?: string | null;
    playerNotes?: string | null;
    sortOrder?: number;
    imageIsAiGenerated?: boolean;
    imageUploadRightsConfirmed?: boolean | null;
  },
) {
  const { supabase } = await assertCampaignGm(campaignId);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.category !== undefined) {
    payload.category = SCENE_MEDIA_CATEGORIES.includes(
      updates.category as (typeof SCENE_MEDIA_CATEGORIES)[number],
    )
      ? updates.category
      : "Sonstiges";
  }
  if (updates.gmNotes !== undefined) payload.gm_notes = updates.gmNotes?.trim() || null;
  if (updates.playerNotes !== undefined) payload.player_notes = updates.playerNotes?.trim() || null;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
  if (updates.imageIsAiGenerated !== undefined) {
    payload.image_is_ai_generated = updates.imageIsAiGenerated;
    if (updates.imageIsAiGenerated) payload.image_upload_rights_confirmed = null;
  }
  if (updates.imageUploadRightsConfirmed !== undefined) {
    payload.image_upload_rights_confirmed = updates.imageUploadRightsConfirmed;
  }

  const { error } = await (supabase as any).from("campaign_scene_media")
    .update(payload)
    .eq("id", sceneMediaId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

export async function deleteCampaignSceneMedia(sceneMediaId: string, campaignId: string) {
  const { supabase } = await assertCampaignGm(campaignId);

  const { error } = await (supabase as any).from("campaign_scene_media")
    .delete()
    .eq("id", sceneMediaId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

function mapSceneAppearanceRow(row: Record<string, unknown>): SceneMediaAppearance {
  const sceneRaw = row.campaign_scene_media as Record<string, unknown> | Array<Record<string, unknown>> | null;
  const scene = Array.isArray(sceneRaw) ? sceneRaw[0] : sceneRaw;
  const archiveRaw = row.session_archives as Record<string, unknown> | Array<Record<string, unknown>> | null;
  const archive = Array.isArray(archiveRaw) ? archiveRaw[0] : archiveRaw;

  return {
    id: String(row.id),
    scene_media_id: String(row.scene_media_id),
    session_id: String(row.session_id),
    archive_id: row.archive_id ? String(row.archive_id) : null,
    npc_ids: Array.isArray(row.npc_ids) ? row.npc_ids.map(String) : [],
    location_lore_id: row.location_lore_id ? String(row.location_lore_id) : null,
    location_name: row.location_name != null ? String(row.location_name) : null,
    shown_at: String(row.shown_at),
    scene: scene
      ? {
          id: String(scene.id),
          title: String(scene.title ?? ""),
          image_url: String(scene.image_url ?? ""),
          category: String(scene.category ?? ""),
        }
      : undefined,
    session_name: archive?.session_name != null ? String(archive.session_name) : null,
  };
}

/** Wird vom GM auf der Live-Bühne aufgerufen wenn ein Szenenbild gezeigt wird. */
export async function logSceneMediaAppearance(input: {
  campaignId: string;
  sessionId: string;
  sceneMediaId: string;
  npcIds: string[];
  locationLoreId?: string | null;
  locationName?: string | null;
}) {
  const { supabase } = await assertCampaignGm(input.campaignId);

  const { data, error } = await (supabase as any).from("scene_media_appearances")
    .insert({
      campaign_id: input.campaignId,
      session_id: input.sessionId,
      scene_media_id: input.sceneMediaId,
      npc_ids: input.npcIds,
      location_lore_id: input.locationLoreId ?? null,
      location_name: input.locationName?.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: String(data.id) };
}

export async function getNpcSceneAppearances(
  campaignId: string,
  npcId: string,
): Promise<SceneMediaAppearance[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any).from("scene_media_appearances")
    .select(
      `
      id,
      scene_media_id,
      session_id,
      archive_id,
      npc_ids,
      location_lore_id,
      location_name,
      shown_at,
      campaign_scene_media:scene_media_id ( id, title, image_url, category ),
      session_archives:archive_id ( session_name )
    `,
    )
    .eq("campaign_id", campaignId)
    .contains("npc_ids", [npcId])
    .order("shown_at", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map(mapSceneAppearanceRow);
}

export async function getLoreSceneAppearances(
  campaignId: string,
  loreId: string,
): Promise<SceneMediaAppearance[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any).from("scene_media_appearances")
    .select(
      `
      id,
      scene_media_id,
      session_id,
      archive_id,
      npc_ids,
      location_lore_id,
      location_name,
      shown_at,
      campaign_scene_media:scene_media_id ( id, title, image_url, category ),
      session_archives:archive_id ( session_name )
    `,
    )
    .eq("campaign_id", campaignId)
    .eq("location_lore_id", loreId)
    .order("shown_at", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map(mapSceneAppearanceRow);
}

export async function linkSceneAppearancesToArchive(
  sessionId: string,
  archiveId: string,
) {
  const supabase = await createClient();
  const sb = supabase as any;
  const { error } = await sb.from("scene_media_appearances")
    .update({ archive_id: archiveId })
    .eq("session_id", sessionId)
    .is("archive_id", null);

  if (error) console.warn("[linkSceneAppearancesToArchive]", error.message);
}

export async function buildSceneGalleryForSession(
  sessionId: string,
): Promise<Array<{
  id: string;
  title: string;
  image_url: string;
  category: string;
  npc_ids: string[];
  shown_at: string;
}>> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any).from("scene_media_appearances")
    .select(
      `
      npc_ids,
      location_lore_id,
      location_name,
      shown_at,
      campaign_scene_media:scene_media_id ( id, title, image_url, category )
    `,
    )
    .eq("session_id", sessionId)
    .order("shown_at", { ascending: true });

  if (error) {
    console.warn("[buildSceneGalleryForSession]", error.message);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const sceneRaw = row.campaign_scene_media as Record<string, unknown> | Array<Record<string, unknown>> | null;
      const scene = Array.isArray(sceneRaw) ? sceneRaw[0] : sceneRaw;
      if (!scene?.id) return null;
      return {
        id: String(scene.id),
        title: String(scene.title ?? "Szene"),
        image_url: String(scene.image_url ?? ""),
        category: String(scene.category ?? ""),
        npc_ids: Array.isArray(row.npc_ids) ? row.npc_ids.map(String) : [],
        location_lore_id: row.location_lore_id ? String(row.location_lore_id) : null,
        location_name: row.location_name != null ? String(row.location_name) : null,
        shown_at: String(row.shown_at),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}
