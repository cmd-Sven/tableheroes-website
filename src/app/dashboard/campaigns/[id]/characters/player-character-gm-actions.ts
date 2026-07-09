"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { recordPlayerCharacterEditAdmin } from "@/src/lib/characters/player-character-edit-alerts";

/** GM/Admin: Test-Hinweis in der GM Inbox simulieren (ohne echten Spieler-Save). */
export async function simulatePlayerEditAlertForGm(
  campaignId: string,
  characterId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nicht authentifiziert." };

    const { data: profile } = await (supabase.from("users") as any)
      .select("primary_role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("gm_id, owner_id")
      .eq("id", campaignId)
      .maybeSingle();

    const isGm = isCampaignGm(campaignRaw as { gm_id?: string; owner_id?: string | null }, user.id);
    const isAdmin = (profile as { primary_role?: string } | null)?.primary_role === "Admin";
    if (!isGm && !isAdmin) {
      return { success: false, error: "Nur Spielleiter oder Admin." };
    }

    const { data: charRaw } = await (supabase.from("characters") as any)
      .select("id, user_id, campaign_id, name")
      .eq("id", characterId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const char = charRaw as { user_id?: string; name?: string } | null;
    if (!char?.user_id) {
      return { success: false, error: "Charakter nicht gefunden." };
    }

    await recordPlayerCharacterEditAdmin({
      characterId,
      campaignId,
      playerUserId: String(char.user_id),
      editSource: "profile",
      editSummary: `Test-Hinweis (GM): „${String(char.name ?? "Charakter")}" bearbeitet`,
    });

    revalidatePath("/dashboard/gm-inbox");
    revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Simulation fehlgeschlagen.",
    };
  }
}
