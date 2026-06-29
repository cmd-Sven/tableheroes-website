import "server-only";

import { cache } from "react";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";

/**
 * Reine Datenabfragen (kein "use server") – sicher importierbar aus Server Components
 * und anderen Server-Modulen ohne Server-Action-Bundling-Probleme in Production.
 */

export type VisibilityEntityType = "lore" | "npc" | "faction" | "bestarium";

/**
 * Lädt die Sichtbarkeits-Map für eine Kampagne und einen Entity-Typ.
 * Rückgabe: Record<entity_id, is_revealed>.
 */
async function getVisibilityForCampaignUncached(
  campaignId: string,
  entityType: VisibilityEntityType,
): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  let readClient: Awaited<ReturnType<typeof createClient>> = supabase;
  if (isCampaignGm(campaign, user.id)) {
    try {
      readClient = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
    } catch {
      readClient = supabase;
    }
  }

  const { data: rows, error } = await (readClient.from("campaign_visibility") as any)
    .select("entity_id, is_revealed")
    .eq("campaign_id", campaignId)
    .eq("entity_type", entityType);

  if (error) {
    console.error("[campaign_visibility] getVisibilityForCampaign:", error);
    return {};
  }

  const map: Record<string, boolean> = {};
  (rows || []).forEach((r: { entity_id: string; is_revealed: boolean }) => {
    map[r.entity_id] = !!r.is_revealed;
  });
  return map;
}

/** Pro Request dedupliziert (mehrere Tabs/Queries teilen sich einen Roundtrip). */
export const getVisibilityForCampaign = cache(getVisibilityForCampaignUncached);
