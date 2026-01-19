"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Scenes
 * 
 * Unterstützt:
 * - Create Scene (linked to session)
 * - Get Scenes for Session
 */

// ============================================================================
// Create Scene
// ============================================================================
export async function createScene(formData: {
  session_id: string;
  title: string;
  description?: string;
  gm_notes?: string;
  location_id?: string | null;
  order?: number;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Verify Session ownership via Campaign
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", formData.session_id)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!session) throw new Error("Session nicht gefunden.");

  const campaigns = (session as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Szenen erstellen.");
  }

  // 3. Insert Scene
  const { data: scene, error } = await (supabase.from("scenes") as any)
    .insert({
      session_id: formData.session_id,
      title: formData.title,
      description: formData.description || null,
      gm_notes: formData.gm_notes || null,
      location_id: formData.location_id || null,
      order: formData.order || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Create Scene Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  return scene;
}

// ============================================================================
// Get Scenes for Session
// ============================================================================
export async function getScenesForSession(sessionId: string) {
  const supabase = await createClient();

  // Fetch scenes with location data joined
  const { data: scenes, error } = await (supabase.from("scenes") as any)
    .select(`
      *,
      world_lore (
        id,
        name,
        type
      )
    `)
    .eq("session_id", sessionId)
    .order("order", { ascending: true });

  if (error) {
    console.error("Fetch Scenes Error:", error);
    return [];
  }

  return scenes || [];
}





