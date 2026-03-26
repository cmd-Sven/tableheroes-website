import { createClient } from "@/src/lib/supabase/server";

/**
 * Reine Datenabfragen (kein "use server") – sicher importierbar aus Server Components
 * und anderen Server-Modulen ohne Server-Action-Bundling-Probleme in Production.
 */

export type VisibilityEntityType = "lore" | "npc" | "faction";

/**
 * Lädt die Sichtbarkeits-Map für eine Kampagne und einen Entity-Typ.
 * Rückgabe: Record<entity_id, is_revealed>.
 */
export async function getVisibilityForCampaign(
  campaignId: string,
  entityType: VisibilityEntityType,
): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: rows, error } = await (supabase.from("campaign_visibility") as any)
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
