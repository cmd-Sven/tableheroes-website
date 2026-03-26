"use server";

import { createClient } from "@/src/lib/supabase/server";
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
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM kann die Sichtbarkeit ändern.");
  }

  const { error } = await (supabase.from("campaign_visibility") as any)
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
    .select("world_id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!row || (row as { gm_id: string }).gm_id !== user.id) return null;
  return (row as { world_id: string | null }).world_id ?? null;
}
