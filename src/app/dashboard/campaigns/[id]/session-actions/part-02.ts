/**
 * session-actions — part 2: startSession, markSessionPlanningComplete, updateSessionStageDeck, updateSessionTranscriptionMode.
 */
"use server";

import { randomBytes } from "crypto";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { canEditSessionSchedule, isSessionStatusLive, isSessionStatusScheduled, isSessionStatusTerminal } from "@/src/lib/session-status";
import { isStaleLiveSession } from "@/src/lib/session-focus";
import { findLatestPublishedPlayerRecap } from "@/src/lib/session-chronicle/latest-published-recap";
import { sendMessage } from "@/src/lib/actions/message-actions";
import { stopTranscriptionRecording } from "@/src/lib/session-chronicle/transcription-server";
import { schedulePendingTranscriptionChunksProcessing } from "@/src/lib/session-chronicle/process-chunk";

export async function startSession(sessionId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Load Session with Campaign
  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status, gm_prep_complete, title")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    gm_prep_complete?: boolean | null;
    title?: string | null;
  } | null;

  if (sessionError || !session) {
    console.error("Start Session Error (Session Load):", sessionError);
    throw new Error("Session nicht gefunden.");
  }

  // 3. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", (session as any).campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann eine Session starten.");
  }

  // Offene RSVPs sind nur noch eine UI-Warnung. Der GM/Owner darf die Session trotzdem starten.

  const prepOk = session.gm_prep_complete !== false;
  if (!prepOk) {
    throw new Error(
      "Die Session kann erst starten, wenn du die Planung abgeschlossen hast (Button „Planung abschließen“ auf der Kampagne oder bei den Terminen).",
    );
  }

  // 4. Update Session Status to Live + Gäste-Join-Token
  const guestJoinToken = randomBytes(24).toString("hex");
  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({ status: "Live", guest_join_token: guestJoinToken })
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
    const insertPayload = {
      session_id: sessionId,
      weather: "Klar",
      temperature: "normal",
      temperature_value: 15,
      current_time: "Tag",
      current_location: null,
      journal_text: null,
      system_logs: [],
      visible_npc_ids: [],
      visible_faction_ids: [],
      is_background_manual_override: false,
      is_combat_mode: false,
      current_turn_index: 0,
      scribe_id: user.id,
    };
    const { error: liveError } = await (supabase.from("session_live_states") as any).insert(insertPayload);
    if (liveError) {
      console.error("Supabase Insert Error:", liveError);
      console.error("Start Session Error (Init Live State):", {
        payload: insertPayload,
        session,
        campaign,
        userId: user.id,
      });
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

  // Kein revalidatePath hier: vermeidet RSC-/Digest-Fehler beim sofortigen
  // router.push auf /session/...; die Zielseite lädt frisch, die Kampagne beim nächsten Besuch.

  after(async () => {
    const admin = createAdminClient();
    const { notifySessionLiveEmails } = await import("@/src/lib/email/dispatch");
    await notifySessionLiveEmails({
      supabase: admin,
      sessionId,
      campaignId: session.campaign_id,
      sessionTitle: session.title?.trim() || "Live-Session",
    });
  });

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
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
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
  // Kein revalidatePath(/session/…): vermeidet RSC-Digest, solange die Live-Oberfläche offen ist.
  return { success: true };
}

// ============================================================================
// GM: Bühnendeck (welche NPCs/Fraktionen im Stage Manager erscheinen)
// ============================================================================
export async function updateSessionStageDeck(
  sessionId: string,
  deck: {
    stage_deck_npc_ids?: string[] | null;
    stage_deck_faction_ids?: string[] | null;
    stage_deck_scene_media_ids?: string[] | null;
    stage_deck_creature_ids?: string[] | null;
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

  const updatePayload: Record<string, unknown> = {};
  if (deck.stage_deck_npc_ids !== undefined) {
    updatePayload.stage_deck_npc_ids = deck.stage_deck_npc_ids;
  }
  if (deck.stage_deck_faction_ids !== undefined) {
    updatePayload.stage_deck_faction_ids = deck.stage_deck_faction_ids;
  }
  if (deck.stage_deck_scene_media_ids !== undefined) {
    updatePayload.stage_deck_scene_media_ids = deck.stage_deck_scene_media_ids;
  }
  if (deck.stage_deck_creature_ids !== undefined) {
    updatePayload.stage_deck_creature_ids = deck.stage_deck_creature_ids;
  }

  const { error: updateError } = await (supabase.from("sessions") as any)
    .update(updatePayload)
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
  return { success: true };
}

export async function updateSessionTranscriptionMode(
  sessionId: string,
  mode: "table" | "jitsi",
) {
  const supabase = await createClient();
  const { updateSessionTranscriptionModeDb } = await import(
    "@/src/lib/session-chronicle/transcription-server"
  );
  const result = await updateSessionTranscriptionModeDb(supabase, sessionId, mode);
  if (!result.ok) {
    throw new Error(result.message);
  }
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .single();
  const campaignId = (sessionRaw as { campaign_id?: string } | null)?.campaign_id;
  if (campaignId) {
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    revalidatePath(
      `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`,
    );
  }
  return { success: true };
}

// Session-Hintergrund: POST /api/sessions/[sessionId]/live-background (kein Server Action,
// damit Next 16 die Stage-Prep-Seite nicht per RSC neu rendert).
