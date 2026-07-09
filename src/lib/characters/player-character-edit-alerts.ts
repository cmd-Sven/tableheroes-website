"use server";

import { createClient, createAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCampaignGm } from "@/src/lib/campaign-gm";

export type CharacterPlayerEditAlert = {
  id: string;
  characterId: string;
  characterName: string;
  campaignId: string;
  campaignName: string;
  playerUserId: string;
  playerUsername: string | null;
  editedAt: string;
  editSource: string;
  editSummary: string | null;
};

async function isCharacterCampaignLinked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
  campaignId: string,
  userId: string,
): Promise<boolean> {
  const { data: member } = await (supabase.from("campaign_members") as any)
    .select("character_id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  const row = member as { character_id?: string | null; status?: string } | null;
  if (!row) return false;

  const linkedStatuses = new Set(["Approved", "Active", "Drafting", "Changes_Proposed"]);
  if (row.character_id && String(row.character_id) === characterId) {
    return linkedStatuses.has(String(row.status ?? ""));
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("status")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const status = String((char as { status?: string } | null)?.status ?? "");
  return status === "Active" || status === "Approved";
}

/**
 * Erstellt oder aktualisiert einen offenen GM-Hinweis, wenn ein Spieler
 * einen kampagnenverknüpften Charakter bearbeitet hat.
 */
export async function recordPlayerCharacterEdit(input: {
  characterId: string;
  campaignId: string;
  playerUserId: string;
  editSource?: "profile" | "sheet" | "live_session";
  editSummary?: string;
}): Promise<void> {
  const supabase = await createClient();

  const linked = await isCharacterCampaignLinked(
    supabase,
    input.characterId,
    input.campaignId,
    input.playerUserId,
  );
  if (!linked) return;

  const summary =
    input.editSummary?.trim() ||
    (input.editSource === "sheet"
      ? "D&D-5e-Charakterblatt bearbeitet"
      : "Charakterdaten bearbeitet");

  const { data: existing } = await (supabase as any)
    .from("character_player_edit_alerts")
    .select("id")
    .eq("character_id", input.characterId)
    .is("dismissed_at", null)
    .is("reviewed_at", null)
    .maybeSingle();

  if (existing?.id) {
    await (supabase as any)
      .from("character_player_edit_alerts")
      .update({
        edited_at: new Date().toISOString(),
        edit_source: input.editSource ?? "profile",
        edit_summary: summary,
      })
      .eq("id", existing.id);
  } else {
    await (supabase as any).from("character_player_edit_alerts").insert({
      character_id: input.characterId,
      campaign_id: input.campaignId,
      player_user_id: input.playerUserId,
      edit_source: input.editSource ?? "profile",
      edit_summary: summary,
    });
  }

  revalidatePath("/dashboard/gm-inbox");
  revalidatePath(`/dashboard/campaigns/${input.campaignId}/gm-inbox`);
}

export async function getOpenCharacterPlayerEditAlertsForGm(
  gmUserId: string,
  campaignId?: string,
): Promise<CharacterPlayerEditAlert[]> {
  const supabase = await createClient();

  let campaignQuery = (supabase.from("campaigns") as any).select("id, name");
  if (campaignId) {
    campaignQuery = campaignQuery.eq("id", campaignId);
  } else {
    campaignQuery = campaignQuery.or(`gm_id.eq.${gmUserId},owner_id.eq.${gmUserId}`);
  }

  const { data: campaigns } = await campaignQuery;
  const campaignList = (campaigns as { id: string; name: string }[]) ?? [];
  if (campaignList.length === 0) return [];

  const campaignIds = campaignList.map((c) => c.id);
  const campaignNameMap = new Map(campaignList.map((c) => [c.id, c.name]));

  const { data: rows } = await (supabase as any)
    .from("character_player_edit_alerts")
    .select(
      "id, character_id, campaign_id, player_user_id, edited_at, edit_source, edit_summary, characters ( name ), users ( username )",
    )
    .in("campaign_id", campaignIds)
    .is("dismissed_at", null)
    .is("reviewed_at", null)
    .order("edited_at", { ascending: false })
    .limit(30);

  return ((rows as any[]) ?? []).map((row) => ({
    id: String(row.id),
    characterId: String(row.character_id),
    characterName: String(row.characters?.name ?? "Charakter"),
    campaignId: String(row.campaign_id),
    campaignName: campaignNameMap.get(row.campaign_id) ?? "Kampagne",
    playerUserId: String(row.player_user_id),
    playerUsername: row.users?.username != null ? String(row.users.username) : null,
    editedAt: String(row.edited_at),
    editSource: String(row.edit_source ?? "profile"),
    editSummary: row.edit_summary != null ? String(row.edit_summary) : null,
  }));
}

async function assertGmForAlert(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: alert } = await (supabase as any)
    .from("character_player_edit_alerts")
    .select("id, campaign_id, campaigns ( gm_id, owner_id )")
    .eq("id", alertId)
    .maybeSingle();

  if (!alert) throw new Error("Hinweis nicht gefunden.");

  const campaign = (alert as any).campaigns as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der Spielleiter kann diesen Hinweis bearbeiten.");
  }

  return { supabase, userId: user.id, campaignId: String((alert as any).campaign_id) };
}

export async function dismissCharacterPlayerEditAlert(
  alertId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, campaignId } = await assertGmForAlert(alertId);
    const { error } = await (supabase as any)
      .from("character_player_edit_alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/gm-inbox");
    revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function markCharacterPlayerEditReviewed(
  alertId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId, campaignId } = await assertGmForAlert(alertId);
    const { error } = await (supabase as any)
      .from("character_player_edit_alerts")
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq("id", alertId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/gm-inbox");
    revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}

/** Admin-Client-Fallback falls RLS den Upsert blockiert (z. B. bei Server Actions). */
export async function recordPlayerCharacterEditAdmin(input: {
  characterId: string;
  campaignId: string;
  playerUserId: string;
  editSource?: "profile" | "sheet" | "live_session";
  editSummary?: string;
}): Promise<void> {
  try {
    await recordPlayerCharacterEdit(input);
  } catch {
    try {
      const admin = createAdminClient();
      const summary =
        input.editSummary?.trim() ||
        (input.editSource === "sheet"
          ? "D&D-5e-Charakterblatt bearbeitet"
          : "Charakterdaten bearbeitet");

      const { data: existing } = await (admin as any)
        .from("character_player_edit_alerts")
        .select("id")
        .eq("character_id", input.characterId)
        .is("dismissed_at", null)
        .is("reviewed_at", null)
        .maybeSingle();

      if (existing?.id) {
        await (admin as any)
          .from("character_player_edit_alerts")
          .update({
            edited_at: new Date().toISOString(),
            edit_source: input.editSource ?? "profile",
            edit_summary: summary,
          })
          .eq("id", existing.id);
      } else {
        await (admin as any).from("character_player_edit_alerts").insert({
          character_id: input.characterId,
          campaign_id: input.campaignId,
          player_user_id: input.playerUserId,
          edit_source: input.editSource ?? "profile",
          edit_summary: summary,
        });
      }
    } catch (err) {
      console.warn("[recordPlayerCharacterEditAdmin]", err);
    }
  }
}
