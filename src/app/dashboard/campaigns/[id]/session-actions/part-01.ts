/**
 * session-actions — part 1: createCampaignEvent, createSessionWithScenes, updateSessionFromWizard, getSessionWizardContext.
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

export async function createCampaignEvent(formData: {
  campaign_id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "Planning";
  description?: string | null;
  rsvp_deadline_days?: 1 | 2 | 3 | null;
  is_live?: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Termine erstellen.");
  }

  if (!formData.title.trim()) {
    throw new Error("Bitte gib einen Titel ein.");
  }

  const { data: session, error: sessionError } = await (supabase.from("sessions") as any)
    .insert({
      campaign_id: formData.campaign_id,
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      type: formData.type,
      start_time: formData.start_time,
      end_time: formData.end_time,
      status: "Scheduled",
      gm_prep_complete: true,
      is_live: formData.is_live ?? true,
      rsvp_deadline_days: formData.rsvp_deadline_days ?? 2,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error("Create Campaign Event Error:", sessionError);
    throw new Error(sessionError?.message || "Fehler beim Erstellen des Termins.");
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sessions");
  return session;
}

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
  transcription_mode?: "table" | "jitsi";
  stage_deck_npc_ids?: string[] | null;
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

  const stageDeckNpcIds =
    formData.stage_deck_npc_ids && formData.stage_deck_npc_ids.length > 0
      ? formData.stage_deck_npc_ids
      : null;

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
      transcription_mode: formData.transcription_mode ?? "table",
      stage_deck_npc_ids: stageDeckNpcIds,
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

  // 5. Default empty parchment battlemap (always selectable in Live Session)
  try {
    const { ensureEmptyParchmentBattlemap } = await import(
      "@/src/lib/actions/battlemap-actions"
    );
    await ensureEmptyParchmentBattlemap({
      sessionId: String((session as any).id),
      campaignId: formData.campaign_id,
    });
  } catch (e) {
    console.error("Ensure empty battlemap Error:", e);
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return session;
}

/** Bestehende geplante Session per KI-Wizard ausarbeiten (Titel, Szenen, Zeiten). */
export async function updateSessionFromWizard(formData: {
  session_id: string;
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
  transcription_mode?: "table" | "jitsi";
  stage_deck_npc_ids?: string[] | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", formData.session_id)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  if (!canEditSessionSchedule(session.status)) {
    throw new Error("Nur geplante Termine können mit dem KI-Wizard bearbeitet werden.");
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann Sessions bearbeiten.");
  }

  const stageDeckNpcIds =
    formData.stage_deck_npc_ids && formData.stage_deck_npc_ids.length > 0
      ? formData.stage_deck_npc_ids
      : null;

  const { error: updateError } = await (supabase.from("sessions") as any)
    .update({
      title: formData.title,
      start_time: formData.start_time,
      end_time: formData.end_time,
      transcription_mode: formData.transcription_mode ?? "table",
      schedule_customized: true,
      stage_deck_npc_ids: stageDeckNpcIds,
    })
    .eq("id", formData.session_id);

  if (updateError) {
    console.error("Update Session From Wizard Error:", updateError);
    throw new Error(updateError.message || "Fehler beim Aktualisieren der Session.");
  }

  const { data: existingScenes } = await (supabase.from("scenes") as any)
    .select("id")
    .eq("session_id", formData.session_id)
    .order("order", { ascending: true });

  const sceneIds = ((existingScenes as { id: string }[]) || []).map((s) => s.id);

  for (const scene of formData.scenes) {
    if (!scene.title || !scene.description) continue;

    if (scene.order === 0 && sceneIds.length > 0) {
      const { error: sceneError } = await (supabase.from("scenes") as any)
        .update({
          title: scene.title,
          description: scene.description,
          gm_notes: scene.gm_notes || null,
          location_id: formData.location_id || null,
        })
        .eq("id", sceneIds[0]);

      if (sceneError) {
        console.error("Update Scene From Wizard Error:", sceneError);
      }
      continue;
    }

    const { error: sceneError } = await (supabase.from("scenes") as any).insert({
      session_id: formData.session_id,
      title: scene.title,
      description: scene.description,
      gm_notes: scene.gm_notes || null,
      location_id: formData.location_id || null,
      order: scene.order,
    });

    if (sceneError) {
      console.error("Create Scene From Wizard Error:", sceneError);
    }
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}/schedule`);
  return { id: formData.session_id };
}

// ============================================================================
// Get Session Wizard Context (Party Level, Last Session)
// ============================================================================
export async function getSessionWizardContext(
  campaignId: string,
  sessionId?: string | null,
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann den Session Wizard nutzen.");
  }

  // 3. Fetch Characters (accepted members only)
  const { data: characters } = await (supabase.from("characters") as any)
    .select("level")
    .eq("campaign_id", campaignId);

  let averagePartyLevel = 1;
  if (characters && characters.length > 0) {
    const totalLevel = (characters || []).reduce(
      (sum: number, char: { level?: number }) => sum + (char.level || 1),
      0,
    );
    averagePartyLevel = Math.round(totalLevel / characters.length);
  }

  const { data: lastSessionRows } = await (supabase.from("sessions") as any)
    .select("id, title, status, end_time, gm_notes")
    .eq("campaign_id", campaignId)
    .eq("status", "Completed")
    .order("start_time", { ascending: false })
    .limit(1);

  const lastSession = ((lastSessionRows as any[]) || [])[0] ?? null;

  const { data: archiveRows } = await (supabase.from("session_archives") as any)
    .select("id, session_name, archived_at, player_recap")
    .eq("campaign_id", campaignId)
    .order("archived_at", { ascending: false })
    .limit(20);

  const publishedRecap = findLatestPublishedPlayerRecap(
    ((archiveRows as any[]) || []).map((row) => ({
      id: String(row.id),
      session_name: row.session_name,
      archived_at: String(row.archived_at ?? ""),
      player_recap: row.player_recap,
    })),
  );

  const { data: liveRows } = await (supabase.from("sessions") as any)
    .select("id, title, start_time, status")
    .eq("campaign_id", campaignId)
    .eq("status", "Live")
    .order("start_time", { ascending: false })
    .limit(3);

  const now = new Date();
  const activeLiveSession = ((liveRows as any[]) || []).find(
    (row) =>
      !isStaleLiveSession(
        {
          status: String(row.status ?? ""),
          start_time: String(row.start_time ?? ""),
        },
        now,
      ),
  );

  let editDraft: {
    locationId: string | null;
    plotNotes: string;
    recapNotes: string;
    selectedNpcIds: string[];
    transcriptionMode: "table" | "jitsi";
  } | null = null;

  if (sessionId) {
    const { data: sessRow } = await (supabase.from("sessions") as any)
      .select("id, transcription_mode, stage_deck_npc_ids")
      .eq("id", sessionId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const { data: sceneRows } = await (supabase.from("scenes") as any)
      .select("description, gm_notes, location_id")
      .eq("session_id", sessionId)
      .order("order", { ascending: true })
      .limit(1);

    const firstScene = ((sceneRows as any[]) || [])[0] as
      | {
          description?: string | null;
          gm_notes?: string | null;
          location_id?: string | null;
        }
      | undefined;

    const tm = (sessRow as { transcription_mode?: string } | null)?.transcription_mode;
    const deckNpcIds = (sessRow as { stage_deck_npc_ids?: string[] | null } | null)
      ?.stage_deck_npc_ids;

    editDraft = {
      locationId: firstScene?.location_id ? String(firstScene.location_id) : null,
      plotNotes: String(firstScene?.description ?? ""),
      recapNotes: String(firstScene?.gm_notes ?? ""),
      selectedNpcIds: Array.isArray(deckNpcIds) ? deckNpcIds.map(String) : [],
      transcriptionMode: tm === "jitsi" ? "jitsi" : "table",
    };
  }

  const recapFromChronicle = publishedRecap?.record.recap.summary_md?.trim() ?? "";
  const recapFromGmNotes = lastSession?.gm_notes ? String(lastSession.gm_notes).trim() : "";

  return {
    averagePartyLevel,
    lastSession: lastSession
      ? {
          id: lastSession.id,
          title: lastSession.title || "Unbenannte Session",
          status: lastSession.status || "Completed",
          end_time: lastSession.end_time,
          summary: recapFromGmNotes,
        }
      : null,
    publishedRecap: publishedRecap
      ? {
          sessionName: publishedRecap.sessionName,
          summaryMd: recapFromChronicle,
        }
      : null,
    suggestedRecap: recapFromChronicle || recapFromGmNotes || "",
    activeLiveSession: activeLiveSession
      ? {
          id: String(activeLiveSession.id),
          title: String(activeLiveSession.title ?? "Live-Session"),
        }
      : null,
    editDraft,
  };
}

// ============================================================================
// Start Session (Set to Live & Initialize Live State)
// ============================================================================