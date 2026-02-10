"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CampaignMembershipSchema } from "@/src/lib/validations/schemas";

/** Einzelne Bewerbung (wie vom Badge gezählt), mit Kampagne und Bewerber-Name. */
export type PendingApplicationRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string;
  application_message: string | null;
  created_at: string | null;
  campaigns: { id: string; name: string | null; gm_id: string } | null;
  users: { username: string | null } | null;
};

/**
 * Liefert alle ausstehenden Bewerbungen (Status "Applied" oder "Pending"),
 * bei denen der User GM der Kampagne ist. Exakt dieselbe Logik wie getPendingApplicationsCount.
 * Wird von der GM-Inbox-Seite und vom Badge (über Count) genutzt.
 */
export async function getPendingApplications(
  userId: string,
): Promise<PendingApplicationRow[]> {
  const supabase = await createClient();

  const { data: rows, error } = await (supabase.from("campaign_members") as any)
    .select(
      "id, campaign_id, user_id, status, application_message, created_at, campaigns!inner(id, name, gm_id), users:user_id(username)",
    )
    .eq("campaigns.gm_id", userId)
    .in("status", ["Applied", "Pending"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPendingApplications]", error);
    return [];
  }

  return (Array.isArray(rows) ? rows : []) as PendingApplicationRow[];
}

/**
 * Zählt alle ausstehenden Bewerbungen – nutzt dieselbe Filterlogik wie getPendingApplications.
 */
export async function getPendingApplicationsCount(
  userId: string,
): Promise<number> {
  const list = await getPendingApplications(userId);
  return list.length;
}

/**
 * Legt eine neue Bewerbung für eine Kampagne an (campaign_members mit status "Applied").
 * userId wird serverseitig aus der Auth ermittelt.
 */
export async function applyToCampaign(
  campaignId: string,
  message?: string,
  characterId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht authentifiziert." };
  }

  if (characterId) {
    const { data: characterRaw } = await (supabase.from("characters") as any)
      .select("user_id, campaign_id")
      .eq("id", characterId)
      .single();

    const character = characterRaw as {
      id: string;
      user_id: string;
      campaign_id: string | null;
    } | null;

    if (!character || character.user_id !== user.id) {
      return { success: false, error: "Dieser Charakter gehört dir nicht." };
    }
    if (character.campaign_id !== null) {
      return {
        success: false,
        error: "Dieser Charakter ist bereits einer Kampagne zugeordnet.",
      };
    }
  }

  const { data: existingRaw } = await (supabase.from("campaign_members") as any)
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  const existing = existingRaw as { id: string; status: string } | null;

  if (existing) {
    if (existing.status === "Applied" || existing.status === "Pending") {
      return { success: false, error: "Du hast dich bereits beworben." };
    }
    if (existing.status === "Accepted") {
      return {
        success: false,
        error: "Du bist bereits Mitglied dieser Kampagne.",
      };
    }
  }

  const membershipToInsert = {
    campaign_id: campaignId,
    user_id: user.id,
    role: "Player" as const,
    status: "Applied" as const,
    application_message: message || null,
    character_id: characterId || null,
  };

  const parsed = CampaignMembershipSchema.omit({ id: true }).safeParse(
    membershipToInsert,
  );

  if (!parsed.success) {
    return {
      success: false,
      error: "Ungültige Bewerbungsdaten. Bitte versuche es erneut.",
    };
  }

  const { error } = await (supabase.from("campaign_members") as any).insert(
    parsed.data,
  );

  if (error) {
    console.error("[applyToCampaign]", error);
    return {
      success: false,
      error: error.message || "Bewerbung konnte nicht gesendet werden.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gm-inbox");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}
