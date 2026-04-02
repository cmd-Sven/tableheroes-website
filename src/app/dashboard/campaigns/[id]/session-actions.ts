"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { revalidatePath } from "next/cache";
import { sendMessage } from "@/src/lib/actions/message-actions";
import { isPlayerReadyForSessionStart } from "./session-rsvp-readiness";

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
      gm_prep_complete: false,
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
    .select("id, campaign_id, status, gm_prep_complete")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    gm_prep_complete?: boolean | null;
  } | null;

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

  const gmId = campaign.gm_id;

  // 3b. Jeder Spieler (ohne GM) muss „dabei“ sein: Zusage / Via Online ODER vom GM manuell bestätigt (gm_confirmed).
  const { data: members } = await (supabase.from("campaign_members") as any)
    .select("user_id")
    .eq("campaign_id", session.campaign_id)
    .in("status", ["Accepted", "Approved"]);

  const { data: rsvps } = await (supabase.from("session_rsvps") as any)
    .select("user_id, rsvp_status, gm_confirmed")
    .eq("session_id", sessionId);

  const playerUserIds = ((members as any[]) || [])
    .map((m: any) => m.user_id as string)
    .filter((uid: string) => uid && uid !== gmId);

  const rsvpByUser = new Map<
    string,
    { rsvp_status: string | null; gm_confirmed: boolean }
  >();
  for (const r of (rsvps as any[]) || []) {
    rsvpByUser.set(String(r.user_id), {
      rsvp_status: r.rsvp_status != null ? String(r.rsvp_status) : null,
      gm_confirmed: !!r.gm_confirmed,
    });
  }

  const notReady = playerUserIds.filter(
    (uid) => !isPlayerReadyForSessionStart(rsvpByUser.get(uid)),
  );

  const pendingCount = notReady.length;
  if (pendingCount > 0) {
    throw new Error(
      `Die Session kann erst starten, wenn alle Spieler zugesagt haben oder du sie manuell bestätigt hast. Noch ${pendingCount} Spieler nicht „dabei“.`
    );
  }

  const prepOk = session.gm_prep_complete !== false;
  if (!prepOk) {
    throw new Error(
      "Die Session kann erst starten, wenn du die Planung abgeschlossen hast (Button „Planung abschließen“ auf der Kampagne oder bei den Terminen).",
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

  // 5. Live State: nur anlegen wenn noch keine Zeile (Vorbereitung am Tisch bleibt erhalten)
  const { data: existingLive } = await (supabase.from("session_live_states") as any)
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!existingLive) {
    const { error: liveError } = await (supabase.from("session_live_states") as any).insert({
      session_id: sessionId,
      weather: "Klar",
      current_time: "Tagsüber",
      current_location: null,
      journal_text: null,
      visible_npc_ids: [],
      visible_faction_ids: [],
      scribe_id: user.id,
    });
    if (liveError) {
      console.error("Start Session Error (Init Live State):", liveError);
      throw new Error(liveError.message);
    }
  } else {
    const { error: scribeErr } = await (supabase.from("session_live_states") as any)
      .update({ scribe_id: user.id })
      .eq("session_id", sessionId);
    if (scribeErr) {
      console.error("Start Session Error (scribe_id):", scribeErr);
    }
  }

  // 6. Revalidate
  if ((session as any).campaign_id) {
    revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  }
  revalidatePath(`/session/${sessionId}`);

  return { success: true };
}

// ============================================================================
// GM: Session-Planung abschließen (Voraussetzung für Live-Start)
// ============================================================================
export async function markSessionPlanningComplete(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as { gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Planung abschließen.");
  }

  if (session.status !== "Scheduled") {
    throw new Error("Planung kann nur für geplante Termine abgeschlossen werden.");
  }

  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({ gm_prep_complete: true })
    .eq("id", sessionId);

  if (updateError) {
    if (
      updateError.message?.includes("gm_prep_complete") ||
      updateError.message?.includes("column")
    ) {
      throw new Error(
        "Spalte gm_prep_complete fehlt. Bitte Migration 20260327160000_sessions_gm_prep_complete.sql in Supabase ausführen.",
      );
    }
    throw new Error(updateError.message || "Speichern fehlgeschlagen.");
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/session/${sessionId}`);
  return { success: true };
}

// ============================================================================
// GM: Bühnendeck (welche NPCs/Fraktionen im Stage Manager erscheinen)
// ============================================================================
export async function updateSessionStageDeck(
  sessionId: string,
  deck: {
    stage_deck_npc_ids: string[] | null;
    stage_deck_faction_ids: string[] | null;
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string } | null;
  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann das Bühnendeck ändern.");
  }

  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({
      stage_deck_npc_ids: deck.stage_deck_npc_ids,
      stage_deck_faction_ids: deck.stage_deck_faction_ids,
    })
    .eq("id", sessionId);

  if (updateError) {
    if (
      updateError.message?.includes("stage_deck") ||
      updateError.message?.includes("column")
    ) {
      throw new Error(
        "Spalten stage_deck_* fehlen. Bitte Migration 20260329100000_session_stage_deck_and_visible_factions.sql ausführen.",
      );
    }
    throw new Error(updateError.message || "Deck konnte nicht gespeichert werden.");
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/session/${sessionId}`);
  return { success: true };
}

// ============================================================================
// GM: Session-Hintergrundbild (session_live_states.background_url)
// ============================================================================
export async function updateSessionBackgroundUrl(
  sessionId: string,
  backgroundUrl: string | null,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann den Hintergrund ändern.");
  }

  const trimmed =
    backgroundUrl != null && String(backgroundUrl).trim() !== ""
      ? String(backgroundUrl).trim()
      : null;

  const { data: existing } = await (supabase.from("session_live_states") as any)
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await (supabase.from("session_live_states") as any)
      .update({ background_url: trimmed })
      .eq("session_id", sessionId);
    if (upErr) {
      if (
        upErr.message?.includes("background_url") ||
        upErr.message?.includes("column")
      ) {
        throw new Error(
          "Spalte background_url fehlt. Bitte Migration session_live_states_background_url ausführen.",
        );
      }
      throw new Error(upErr.message || "Speichern fehlgeschlagen.");
    }
  } else {
    const { error: insErr } = await (supabase.from("session_live_states") as any).insert({
      session_id: sessionId,
      background_url: trimmed,
      weather: null,
      current_time: null,
      current_location: null,
      journal_text: null,
      visible_npc_ids: [],
      visible_faction_ids: [],
      scribe_id: user.id,
    });
    if (insErr) {
      throw new Error(insErr.message || "Live-Zustand konnte nicht angelegt werden.");
    }
  }

  // Nur Live-Session invalidieren. Kein revalidatePath für diese Stage-Prep-URL oder die
  // Kampagnen-Hub-Seite: In Production löste das einen RSC-Refresh der aktuellen Seite aus
  // und führte zu „An error occurred in the Server Components render“ (Next 16).
  revalidatePath(`/session/${sessionId}`);
  return { success: true, backgroundUrl: trimmed };
}

// ============================================================================
// GM: Live-State-Zeile für Vorbereitung / Live — unabhängig von RSVP
// ============================================================================
export async function ensureSessionPrepLiveState(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (sessionError || !session) {
    return null;
  }
  if (["Completed", "Ended", "Cancelled"].includes(session.status)) {
    return null;
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    return null;
  }

  const { data: existing } = await (supabase.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return existing as Record<string, unknown>;

  const { data: inserted, error: insertError } = await (supabase.from("session_live_states") as any)
    .insert({
      session_id: sessionId,
      weather: null,
      current_time: null,
      current_location: null,
      journal_text: null,
      visible_npc_ids: [],
      visible_faction_ids: [],
      scribe_id: user.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[ensureSessionPrepLiveState] insert:", insertError);
    const { data: raceRow } = await (supabase.from("session_live_states") as any)
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    return (raceRow as Record<string, unknown>) ?? null;
  }

  return (inserted as Record<string, unknown>) ?? null;
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

  // 4. Fetch Live State (Journal) – maybeSingle: 0 oder 1 Zeile, kein Fehler
  const { data: liveStateRow } = await (supabase.from("session_live_states") as any)
    .select("journal_text")
    .eq("session_id", sessionId)
    .maybeSingle();

  const journalText =
    liveStateRow?.journal_text && String(liveStateRow.journal_text).trim().length > 0
      ? String(liveStateRow.journal_text).trim()
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
    .update({ visible_npc_ids: [], visible_faction_ids: [] })
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

// ============================================================================
// Update Session (GM only)
// ============================================================================
export async function updateSession(
  sessionId: string,
  data: {
    title?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    rsvp_deadline_days?: number | null;
    is_live?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Sessions bearbeiten.");
  }

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.start_time !== undefined) payload.start_time = data.start_time;
  if (data.end_time !== undefined) payload.end_time = data.end_time;
  if (data.status !== undefined) payload.status = data.status;
  if (data.rsvp_deadline_days !== undefined) payload.rsvp_deadline_days = data.rsvp_deadline_days;
  if (data.is_live !== undefined) payload.is_live = data.is_live;

  if (Object.keys(payload).length === 0) {
    return { success: true };
  }

  const { error } = await (supabase.from("sessions") as any)
    .update(payload)
    .eq("id", sessionId);

  if (error) {
    console.error("Update Session Error:", error);
    throw new Error(error.message || "Fehler beim Aktualisieren der Session.");
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/session/${sessionId}`);
  return { success: true };
}

// ============================================================================
// Delete Session (GM only) – nur wenn keine Zusage vorhanden
// ============================================================================
export async function deleteSession(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; title: string | null } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Sessions löschen.");
  }

  // Prüfen: Mindestens eine Zusage (Zusage oder Via Online) → nicht löschen
  const { data: acceptedRsvps } = await (supabase.from("session_rsvps") as any)
    .select("user_id")
    .eq("session_id", sessionId)
    .in("rsvp_status", ["Zusage", "Via Online"]);

  if (acceptedRsvps && (acceptedRsvps as any[]).length > 0) {
    throw new Error(
      "Der Termin kann nicht gelöscht werden, da bereits Spieler zugesagt haben. Bitte nutze stattdessen „Absagen“, damit zugesagte Spieler benachrichtigt werden."
    );
  }

  const { error } = await (supabase.from("sessions") as any).delete().eq("id", sessionId);

  if (error) {
    console.error("Delete Session Error:", error);
    throw new Error(error.message || "Fehler beim Löschen der Session.");
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/session/${sessionId}`);
  return { success: true };
}

// ============================================================================
// Cancel Session (GM only) – Status auf Cancelled, Nachrichten an zugesagte Spieler
// ============================================================================
export async function cancelSession(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; title: string | null; status: string } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, name")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; name?: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann einen Termin absagen.");
  }

  if (session.status === "Live") {
    throw new Error("Eine laufende Session kann nicht abgesagt werden. Beende sie zuerst.");
  }

  // Zugesagte Spieler laden (Zusage oder Via Online)
  const { data: acceptedRsvps } = await (supabase.from("session_rsvps") as any)
    .select("user_id")
    .eq("session_id", sessionId)
    .in("rsvp_status", ["Zusage", "Via Online"]);

  const recipientIds = new Set<string>();
  for (const r of (acceptedRsvps as any[]) || []) {
    recipientIds.add(r.user_id);
  }

  // Session-Status auf Cancelled setzen
  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({ status: "Cancelled" })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Cancel Session Error:", updateError);
    throw new Error(updateError.message || "Fehler beim Absagen des Termins.");
  }

  // Direktnachrichten an zugesagte Spieler
  const sessionTitle = session.title || "Termin";
  const campaignName = campaign.name || "Kampagne";
  const subject = `Termin abgesagt: ${sessionTitle}`;
  const content = `Der Spielleiter hat den Termin „${sessionTitle}" in der Kampagne „${campaignName}" abgesagt.`;

  for (const recipientId of recipientIds) {
    const result = await sendMessage({
      type: "direct",
      recipientUserId: recipientId,
      campaignId: session.campaign_id,
      subject,
      content,
      priority: "high",
    });
    if (!result.success) {
      console.error("[cancelSession] Nachricht an User", recipientId, "fehlgeschlagen:", result);
    }
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/session/${sessionId}`);
  return { success: true };
}
