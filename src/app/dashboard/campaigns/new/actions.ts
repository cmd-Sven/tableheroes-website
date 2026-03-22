"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCampaignAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Check Role
  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  // Expliziter Cast gegen 'never'
  const profile = profileRaw as { primary_role: string } | null;

  if (profile?.primary_role !== "GameMaster" && profile?.primary_role !== "Admin") {
    throw new Error("Unauthorized: Only Game Masters can create campaigns.");
  }

  // Max 3 Kampagnen pro GM
  const { count } = await (supabase.from("campaigns") as any)
    .select("*", { count: "exact", head: true })
    .eq("gm_id", user.id);
  if ((count ?? 0) >= 3) {
    throw new Error("Du hast das Maximum von 3 Kampagnen erreicht.");
  }

  // Extract Form Data
  const world_id = formData.get("world_id") as string;
  const name = formData.get("name") as string;
  const system = formData.get("system") as string;
  const description = formData.get("description") as string;
  const max_players = parseInt(formData.get("max_players") as string, 10) || 6;
  const mode = formData.get("mode") as string;
  const firstSessionDate = formData.get("first_session_date") as string;

  if (!name || !system) {
    throw new Error("Name und System sind Pflicht.");
  }
  if (!world_id) {
    throw new Error("Bitte wähle eine Basis-Welt. Erstelle ggf. zuerst eine Welt unter Welten & Lore.");
  }

  // Prüfen: Welt gehört dem GM
  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", world_id)
    .single();
  const world = worldRaw as { id: string; gm_id: string } | null;
  if (!world || world.gm_id !== user.id) {
    throw new Error("Ungültige Welt oder keine Berechtigung.");
  }

  // Create Campaign (world_id Pflicht im welt-zentrischen Modell)
  const { data: campaign, error: campaignError } = await (supabase.from("campaigns") as any)
    .insert({
      gm_id: user.id,
      world_id,
      name,
      system,
      description: description || null,
      max_players,
      mode: mode || "Online",
      status: "active",
      is_published: false,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("Create Campaign Error:", campaignError);
    throw new Error(campaignError?.message || "Kampagne konnte nicht erstellt werden.");
  }

  const campaignId = (campaign as { id: string }).id;
  if (!campaignId) {
    console.error("Create Campaign: campaign.id fehlt nach Insert.", campaign);
    throw new Error("Kampagne wurde erstellt, aber die ID konnte nicht gelesen werden.");
  }

  // Erste Sitzung anlegen (nur wenn Datum angegeben)
  if (firstSessionDate && firstSessionDate.trim() !== "") {
    const sessionStart = new Date(firstSessionDate);
    const sessionEnd = new Date(sessionStart.getTime() + 4 * 60 * 60 * 1000); // +4h

    const sessionPayload = {
      campaign_id: campaignId,
      type: "GameSession",
      start_time: sessionStart.toISOString(),
      end_time: sessionEnd.toISOString(),
      status: "Scheduled",
    };

    const { error: sessionError } = await (supabase.from("sessions") as any).insert(sessionPayload);

    if (sessionError) {
      console.error("Create Session Error:", {
        code: sessionError.code,
        message: sessionError.message,
        details: sessionError.details,
        campaign_id: campaignId,
      });
      if (sessionError.code === "42501" || sessionError.message?.toLowerCase().includes("policy") || sessionError.message?.toLowerCase().includes("row level security")) {
        throw new Error("Berechtigungsfehler beim Anlegen der Sitzung (RLS). Bitte prüfe die RLS-Policies für die Tabelle 'sessions'.");
      }
      if (sessionError.code === "23502" || sessionError.message?.toLowerCase().includes("null value") || sessionError.message?.toLowerCase().includes("violates not-null")) {
        throw new Error(`Sitzung konnte nicht erstellt werden: Ein Pflichtfeld fehlt. Details: ${sessionError.message}`);
      }
      throw new Error(`Sitzung konnte nicht erstellt werden: ${sessionError.message}`);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/campaigns/${campaignId}`);
}

