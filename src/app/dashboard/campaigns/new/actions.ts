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

  // Extract Form Data
  const name = formData.get("name") as string;
  const system = formData.get("system") as string;
  const description = formData.get("description") as string;
  const max_players = parseInt(formData.get("max_players") as string, 10) || 6;
  const mode = formData.get("mode") as string;
  const firstSessionDate = formData.get("first_session_date") as string;

  if (!name || !system) {
    throw new Error("Name and System are required.");
  }

  // Create Campaign
  const { data: campaign, error: campaignError } = await (supabase.from("campaigns") as any)
    .insert({
      gm_id: user.id,
      name,
      system,
      description: description || null,
      max_players,
      mode: mode || "Online",
      status: "Active", // Default status (is_published controls visibility)
      is_published: false, // Not published yet
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("Create Campaign Error:", campaignError);
    throw new Error(campaignError?.message || "Failed to create campaign.");
  }

  // Create First Session (if date provided)
  if (firstSessionDate) {
    const sessionStart = new Date(firstSessionDate);
    const sessionEnd = new Date(sessionStart.getTime() + 4 * 60 * 60 * 1000); // +4h

    const { error: sessionError } = await (supabase.from("sessions") as any).insert({
      campaign_id: (campaign as any).id,
      type: "GameSession",
      start_time: sessionStart.toISOString(),
      end_time: sessionEnd.toISOString(),
      status: "Scheduled",
    });

    if (sessionError) {
      console.error("Create Session Error:", sessionError);
      throw new Error(sessionError.message);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/campaigns/${campaign.id}`);
}

