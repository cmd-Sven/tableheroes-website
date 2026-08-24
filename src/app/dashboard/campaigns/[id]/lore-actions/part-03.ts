/**
 * lore-actions — part 3: getLoreBreadcrumb, toggleLoreFavorite.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { BUILDING_LOCATION_TYPES } from "@/src/lib/lore-types";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "../campaign-visibility-queries";
import { setCampaignVisibility } from "../campaign-visibility-actions";

/**
 * Server Actions für World Lore (Hierarchical)
 * world_id kommt immer aus der Kampagne (campaign.world_id).
 */


// ============================================================================
// Get Breadcrumb Path (recursive parent chain)
// ============================================================================
export async function getLoreBreadcrumb(loreId: string): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const breadcrumb: Array<{ id: string; name: string }> = [];
  let currentId: string | null = loreId;
  const visited = new Set<string>(); // Prevent infinite loops

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const { data: loreEntry }: { data: any } = await (supabase.from("world_lore") as any)
      .select("id, name, parent_id")
      .eq("id", currentId)
      .single();

    if (!loreEntry) break;

    breadcrumb.unshift({ id: loreEntry.id, name: loreEntry.name });
    currentId = loreEntry.parent_id;
  }

  return breadcrumb;
}


// ============================================================================
// Toggle Lore Favorite
// ============================================================================
export async function toggleLoreFavorite(loreId: string, isFavorite: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("id")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  if (isFavorite) {
    // Remove favorite
    const { error } = await (supabase.from("lore_favorites") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("lore_id", loreId);

    if (error) {
      console.error("Remove Favorite Error:", error);
      throw new Error(error.message);
    }
  } else {
    // Add favorite
    const { error } = await (supabase.from("lore_favorites") as any)
      .insert({
        user_id: user.id,
        lore_id: loreId,
      });

    if (error) {
      console.error("Add Favorite Error:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
}
