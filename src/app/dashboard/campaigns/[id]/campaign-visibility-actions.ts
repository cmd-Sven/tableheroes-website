"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { VisibilityEntityType } from "./campaign-visibility-queries";

export type { VisibilityEntityType } from "./campaign-visibility-queries";

/**
 * Erwartete Tabelle campaign_visibility:
 * - campaign_id (uuid), entity_type (text), entity_id (uuid), is_revealed (boolean)
 * - UNIQUE(campaign_id, entity_type, entity_id) oder PK(campaign_id, entity_type, entity_id)
 *
 * Sichtbarkeits-Queries: getVisibilityForCampaign in campaign-visibility-queries.ts (kein "use server").
 */

/**
 * Setzt oder toggelt die Sichtbarkeit eines Elements für eine Kampagne.
 * Upsert in campaign_visibility (campaign_id, entity_type, entity_id, is_revealed).
 */
export async function setCampaignVisibility(
  campaignId: string,
  entityType: VisibilityEntityType,
  entityId: string,
  isRevealed: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaignAccess = campaign as {
    gm_id: string | null;
    owner_id?: string | null;
  } | null;
  const canManageVisibility =
    !!campaignAccess &&
    (campaignAccess.gm_id === user.id || campaignAccess.owner_id === user.id);

  if (!canManageVisibility) {
    throw new Error("Nur der GM oder Owner kann die Sichtbarkeit ändern.");
  }

  const admin = createAdminClient();
  const { error } = await (admin.from("campaign_visibility") as any)
    .upsert(
      {
        campaign_id: campaignId,
        entity_type: entityType,
        entity_id: entityId,
        is_revealed: isRevealed,
      },
      { onConflict: "campaign_id,entity_type,entity_id" }
    );

  if (error) {
    console.error("[campaign_visibility] setCampaignVisibility:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
}

/** Liefert die world_id einer Kampagne (für Sidebar-Link „Zum Welt-Editor“). */
export async function getCampaignWorldId(campaignId: string): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await (supabase.from("campaigns") as any)
    .select("world_id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = row as {
    world_id: string | null;
    gm_id: string | null;
    owner_id?: string | null;
  } | null;
  if (!campaign || (campaign.gm_id !== user.id && campaign.owner_id !== user.id)) {
    return null;
  }
  return (row as { world_id: string | null }).world_id ?? null;
}
