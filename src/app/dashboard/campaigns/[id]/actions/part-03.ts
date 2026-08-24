/**
 * actions — part 3: deleteCampaign, updateCampaignDescription.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeCharacterOnboarding,
  generateCharacterQuest,
} from "../ai-actions";
import { createQuest } from "../quest-actions";
import {
  CampaignMembershipSchema,
  CampaignSchema,
} from "@/src/lib/validations/schemas";
import {
  addBerlinCalendarDays,
  APP_TIMEZONE,
  berlinLocalToUtc,
  getBerlinDateKey,
  getBerlinParts,
  nextBerlinScheduleOccurrence,
} from "@/src/lib/datetime/berlin";

// ============================================================================
// RECURRING SESSION SCHEDULE
// ============================================================================

export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Verify GM ownership
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id, name")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({
    id: true,
    gm_id: true,
    name: true,
  }).safeParse(campaignRaw);

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Nicht autorisiert: Du bist nicht der GM dieser Kampagne.");
  }

  // Delete campaign (CASCADE should handle related data)
  const { error } = await (supabase.from("campaigns") as any)
    .delete()
    .eq("id", campaignId);

  if (error) {
    console.error("Delete Campaign Error:", error);
    throw new Error(error.message);
  }

  // Revalidate all relevant pages
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/");

  // Return success for client-side redirect handling
  return { success: true };
}

// ============================================================================
// Update Campaign Description (Rich-Text HTML)
// ============================================================================

export async function updateCampaignDescription(
  campaignId: string,
  htmlContent: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  // GM-Check
  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.gm_id !== user.id) {
    return { success: false, error: "Nur der Spielleiter kann die Beschreibung bearbeiten." };
  }

  const { sanitizeDescriptionHtml } = await import("@/src/lib/sanitize-description-html");
  const clean = sanitizeDescriptionHtml(htmlContent);

  const { error } = await (supabase.from("campaigns") as any)
    .update({ description: clean })
    .eq("id", campaignId);

  if (error) {
    console.error("[updateCampaignDescription]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}
