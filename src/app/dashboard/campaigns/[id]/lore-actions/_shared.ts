/**
 * Shared helpers for lore-actions.
 */
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

export type AdditionalImageItem = {
  url: string;
  description: string;
  display?: ReturnType<typeof imageDisplayToJson> | null;
};


/** Normalisiert additional_images für JSONB: Array beibehalten, String parsen, sonst null. */
export function normalizeAdditionalImages(
  value: unknown
): Array<AdditionalImageItem> | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => {
        const raw = item as Record<string, unknown>;
        const url = typeof raw?.url === "string" ? raw.url : "";
        const description = typeof raw?.description === "string" ? raw.description : "";
        const displayRaw = raw?.display;
        const display =
          displayRaw != null && typeof displayRaw === "object"
            ? imageDisplayToJson(normalizeImageDisplay(displayRaw))
            : undefined;
        const base: AdditionalImageItem = { url, description };
        if (display) base.display = display;
        return base;
      })
      .filter((item) => item.url.trim() !== "");
    return arr.length > 0 ? arr : null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? normalizeAdditionalImages(parsed) : null;
    } catch {
      return null;
    }
  }
  return null;
}


// Get All Lore Entries: lore-queries.ts (RSC) – hier keine Duplikation.

/** Status, in denen Spieler Kampagnen-Inhalte sehen dürfen. */
export const PLAYER_LORE_MEMBER_STATUSES = [
  "Approved",
  "Active",
  "Drafting",
  "In_Review",
  "Changes_Proposed",
] as const;

export type GetLoreByIdOptions = {
  /**
   * Aus dem Kampagnen-Kontext übergeben: prüft Mitgliedschaft nur für diese Kampagne.
   * Ohne diese Option: alle Kampagnen mit derselben world_id — bei mehreren Treffern
   * lieferte `.maybeSingle()` einen Fehler → fälschlich 404 auf der Lore-Detailseite.
   */
  campaignId?: string;
};
