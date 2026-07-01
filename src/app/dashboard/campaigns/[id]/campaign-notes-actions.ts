"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Isolierte Spieler-Notizen pro Kampagne.
 * Tabelle campaign_notes: campaign_id, entity_type ('npc'|'faction'|'lore'|'location'), entity_id, user_id, content, created_at, updated_at.
 * Ein Nutzer sieht/speichert nur seine eigene Notiz pro Entity pro Kampagne; keine Notizen aus anderen Kampagnen.
 */

export type CampaignNoteEntityType = "npc" | "faction" | "lore" | "location" | "bestarium";

async function ensureCampaignAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  userId: string
): Promise<boolean> {
  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) return false;
  if ((campaign as { gm_id: string }).gm_id === userId) return true;

  const { data: member } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .in("status", ["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"])
    .maybeSingle();

  return !!member;
}

/** Lädt die Spieler-Notiz des aktuellen Nutzers für eine Entity in dieser Kampagne. */
export async function getCampaignNote(
  campaignId: string,
  entityType: CampaignNoteEntityType,
  entityId: string
): Promise<{ content: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const allowed = await ensureCampaignAccess(supabase, campaignId, user.id);
  if (!allowed) return null;

  const { data: row } = await (supabase.from("campaign_notes") as any)
    .select("content")
    .eq("campaign_id", campaignId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return null;
  return { content: (row as { content: string | null }).content ?? "" };
}

/** Speichert die Spieler-Notiz des aktuellen Nutzers für eine Entity in dieser Kampagne. */
export async function upsertCampaignNote(
  campaignId: string,
  entityType: CampaignNoteEntityType,
  entityId: string,
  content: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const allowed = await ensureCampaignAccess(supabase, campaignId, user.id);
  if (!allowed) throw new Error("Kein Zugriff auf diese Kampagne.");

  const { error } = await (supabase.from("campaign_notes") as any).upsert(
    {
      campaign_id: campaignId,
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      content: content || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "campaign_id,entity_type,entity_id,user_id",
    }
  );

  if (error) {
    console.error("[campaign_notes] upsert error:", error);
    throw new Error("Fehler beim Speichern der Notiz.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
