"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für World Management
 * 
 * Unterstützt:
 * - Create World
 * - Get World by Campaign
 */

// ============================================================================
// Create World
// ============================================================================
export async function createWorld(formData: {
  campaign_id: string;
  name: string;
  cosmology_type?: string;
  genre_style?: string;
  magic_level?: string;
  current_year?: number;
  main_conflict?: string;
  description?: string;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann eine Welt erstellen.");
  }

  // 3. Check if world already exists
  const { data: existingWorld } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", formData.campaign_id)
    .single();

  if (existingWorld) {
    throw new Error("Für diese Kampagne existiert bereits eine Welt.");
  }

  // 4. Insert World
  const { data: world, error } = await (supabase.from("worlds") as any)
    .insert({
      campaign_id: formData.campaign_id,
      name: formData.name,
      cosmology_type: formData.cosmology_type || null,
      genre_style: formData.genre_style || null,
      magic_level: formData.magic_level || null,
      current_year: formData.current_year || null,
      main_conflict: formData.main_conflict || null,
      description: formData.description || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Create World Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return world;
}

// ============================================================================
// Get World by Campaign
// ============================================================================
export async function getWorldByCampaign(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Check campaign access
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) {
    throw new Error("Kampagne nicht gefunden.");
  }

  // Check if user is GM or member
  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaign.gm_id !== user.id && !membership) {
    throw new Error("Kein Zugriff auf diese Kampagne.");
  }

  // 3. Get World
  const { data: world, error } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (error) {
    // If no world exists, return null (not an error)
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Get World Error:", error);
    throw new Error(error.message);
  }

  return world;
}

