"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Action: Create Session with Scenes
 */
export async function createSessionWithScenes(formData: {
  campaign_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location_id?: string | null;
  scenes: Array<{
    title: string;
    description: string;
    gm_notes?: string;
    order: number;
  }>;
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
    throw new Error("Nur der GM kann Sessions erstellen.");
  }

  // 3. Create Session
  const { data: session, error: sessionError } = await (supabase.from("sessions") as any)
    .insert({
      campaign_id: formData.campaign_id,
      title: formData.title,
      type: "GameSession",
      start_time: formData.start_time,
      end_time: formData.end_time,
      status: "Scheduled",
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error("Create Session Error:", sessionError);
    throw new Error(sessionError?.message || "Fehler beim Erstellen der Session.");
  }

  // 4. Create Scenes
  for (const scene of formData.scenes) {
    if (!scene.title || !scene.description) continue; // Skip incomplete scenes

    const { error: sceneError } = await (supabase.from("scenes") as any).insert({
      session_id: (session as any).id,
      title: scene.title,
      description: scene.description,
      gm_notes: scene.gm_notes || null,
      location_id: formData.location_id || null,
      order: scene.order,
    });

    if (sceneError) {
      console.error("Create Scene Error:", sceneError);
      // Continue with other scenes even if one fails
    }
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return session;
}

// ============================================================================
// Get Session Wizard Context (Party Level, Last Session)
// ============================================================================
export async function getSessionWizardContext(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann den Session Wizard nutzen.");
  }

  // 3. Fetch Characters (accepted members only)
  const { data: characters } = await (supabase.from("characters") as any)
    .select("level")
    .eq("campaign_id", campaignId);

  // Calculate Average Party Level
  let averagePartyLevel = 1; // Default
  if (characters && characters.length > 0) {
    const totalLevel = (characters || []).reduce((sum: number, char: any) => sum + (char.level || 1), 0);
    averagePartyLevel = Math.round(totalLevel / characters.length);
  }

  // 4. Fetch Last Session
  const { data: lastSession } = await (supabase.from("sessions") as any)
    .select("id, title, status, end_time, gm_notes")
    .eq("campaign_id", campaignId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  return {
    averagePartyLevel,
    lastSession: lastSession
      ? {
          id: lastSession.id,
          title: lastSession.title || "Unbenannte Session",
          status: lastSession.status || "Completed",
          end_time: lastSession.end_time,
          summary: lastSession.gm_notes || "", // Use gm_notes as summary for now
        }
      : null,
  };
}

// ============================================================================
// Start Session (Set to Live & Initialize Live State)
// ============================================================================
export async function startSession(sessionId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Load Session with Campaign
  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;

  if (sessionError || !session) {
    console.error("Start Session Error (Session Load):", sessionError);
    throw new Error("Session nicht gefunden.");
  }

  // 3. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", (session as any).campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann eine Session starten.");
  }

  // 3b. Prüfen: Alle Spieler müssen sich bestätigt haben (RSVP abgegeben)
  const { data: members } = await (supabase.from("campaign_members") as any)
    .select("user_id")
    .eq("campaign_id", session.campaign_id)
    .eq("status", "Accepted");

  const { data: rsvps } = await (supabase.from("session_rsvps") as any)
    .select("user_id")
    .eq("session_id", sessionId);

  const memberIds = new Set(((members as any[]) || []).map((m: any) => m.user_id));
  const rsvpUserIds = new Set(((rsvps as any[]) || []).map((r: any) => r.user_id));

  const pendingCount = [...memberIds].filter((uid) => !rsvpUserIds.has(uid)).length;
  if (pendingCount > 0) {
    throw new Error(
      `Die Session kann erst starten, wenn alle Spieler ihre Teilnahme bestätigt haben. Noch ${pendingCount} Spieler ohne Rückmeldung.`
    );
  }

  // 4. Update Session Status to Live
  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({ status: "Live" })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Start Session Error (Update Status):", updateError);
    throw new Error(updateError.message);
  }

  // 5. Initialize / Upsert Live State
  const { error: liveError } = await (supabase.from("session_live_states") as any)
    .upsert(
      {
        session_id: sessionId,
        weather: "Klar",
        current_time: "Tagsüber",
        current_location: null,
        journal_text: null,
        visible_npc_ids: [],
        scribe_id: user.id,
      },
      { onConflict: "session_id" },
    );

  if (liveError) {
    console.error("Start Session Error (Init Live State):", liveError);
    throw new Error(liveError.message);
  }

  // 6. Revalidate
  if ((session as any).campaign_id) {
    revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  }
  revalidatePath(`/session/${sessionId}`);

  return { success: true };
}

// ============================================================================
// End Session (Archive Journal & Mark as Completed)
// ============================================================================
export async function endSession(sessionId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Load Session (with campaign)
  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title, status")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as { id: string; campaign_id: string; title: string | null; status: string } | null;

  if (sessionError || !session) {
    console.error("End Session Error (Session Load):", sessionError);
    throw new Error("Session nicht gefunden.");
  }

  // 3. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", (session as any).campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann eine Session beenden.");
  }

  // 4. Fetch Live State (Journal)
  const { data: liveState } = await (supabase.from("session_live_states") as any)
    .select("journal_text")
    .eq("session_id", sessionId)
    .single()
    .throwOnError(false);

  const journalText =
    (liveState && liveState.journal_text && liveState.journal_text.trim().length > 0)
      ? liveState.journal_text
      : "Keine Notizen gemacht.";

  // 5. Insert Journal Entry
  if ((session as any).campaign_id) {
    const { error: journalError } = await (supabase.from("journals") as any).insert({
      campaign_id: (session as any).campaign_id,
      title: `Logbuch: ${(session as any).title || "Unbenannte Session"}`,
      content: journalText,
      type: "Session Log",
      related_session_id: sessionId,
      visibility: "Public",
    });

    if (journalError) {
      console.error("End Session Error (Insert Journal):", journalError);
      // Wir loggen nur – Session-Ende soll trotzdem weiterlaufen.
    }
  }

  // 6. Close Session (status + end_time)
  const { error: closeError } = await (supabase.from("sessions") as any)
    .update({ status: "Completed", end_time: new Date().toISOString() })
    .eq("id", sessionId);

  if (closeError) {
    console.error("End Session Error (Close Session):", closeError);
    throw new Error(closeError.message);
  }

  // 7. Cleanup Live State (optional: nur sichtbare NPCs leeren)
  const { error: liveCleanupError } = await (supabase.from("session_live_states") as any)
    .update({ visible_npc_ids: [] })
    .eq("session_id", sessionId);

  if (liveCleanupError) {
    console.error("End Session Error (Cleanup Live State):", liveCleanupError);
    // Nicht kritisch für den Flow
  }

  // 8. Revalidate
  if ((session as any).campaign_id) {
    revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  }
  revalidatePath(`/session/${sessionId}`);

  return { success: true, campaignId: (session as any).campaign_id };
}

