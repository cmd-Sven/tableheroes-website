/**
 * session-actions — part 5: updateSession, deleteSession, archiveScheduledSessionQuietly, setPlanningDummyPlayerCount, cancelSession.
 */
"use server";

import { endSession } from "./part-04";
import { ensureSessionPrepLiveState } from "./part-03";

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

export async function updateSession(
  sessionId: string,
  data: {
    title?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    rsvp_deadline_days?: number | null;
    is_live?: boolean;
    registration_closed_on_landing?: boolean;
    visible_on_public_landing?: boolean;
    show_open_slots_on_landing?: boolean;
    show_session_title_on_landing?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status, start_time, end_time")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string | null;
    start_time: string;
    end_time: string | null;
  } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  const scheduleFieldsTouched =
    data.start_time !== undefined || data.end_time !== undefined;

  if (scheduleFieldsTouched && !canEditSessionSchedule(session.status)) {
    throw new Error(
      "Datum und Uhrzeit können nur bei geplanten Terminen geändert werden, die noch nicht stattgefunden haben.",
    );
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

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.start_time !== undefined) {
    payload.start_time = data.start_time;
    if (data.start_time !== session.start_time) {
      payload.schedule_customized = true;
    }
  }
  if (data.end_time !== undefined) {
    payload.end_time = data.end_time;
    const prevEnd = session.end_time ?? "";
    if (data.end_time !== prevEnd) {
      payload.schedule_customized = true;
    }
  }
  if (data.status !== undefined) payload.status = data.status;
  if (data.rsvp_deadline_days !== undefined) payload.rsvp_deadline_days = data.rsvp_deadline_days;
  if (data.is_live !== undefined) payload.is_live = data.is_live;
  if (data.registration_closed_on_landing !== undefined) {
    payload.registration_closed_on_landing = data.registration_closed_on_landing;
  }
  if (data.visible_on_public_landing !== undefined) {
    payload.visible_on_public_landing = data.visible_on_public_landing;
  }
  if (data.show_open_slots_on_landing !== undefined) {
    payload.show_open_slots_on_landing = data.show_open_slots_on_landing;
  }
  if (data.show_session_title_on_landing !== undefined) {
    payload.show_session_title_on_landing = data.show_session_title_on_landing;
  }

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
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}/schedule`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sessions");
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
    .select("id, gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
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
  return { success: true };
}

// ============================================================================
// GM: Geplanten Termin still archivieren (Completed) — keine Nachrichten an Spieler
// ============================================================================
export async function archiveScheduledSessionQuietly(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (!session) throw new Error("Session nicht gefunden.");

  if (!isSessionStatusScheduled(session.status)) {
    throw new Error(
      "Nur geplante (nicht gestartete) Termine können ohne Benachrichtigung archiviert werden.",
    );
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
    throw new Error("Nur der Spielleiter kann den Termin archivieren.");
  }

  await endSession(sessionId);
  revalidatePath("/dashboard/my-campaigns");
  return { success: true, campaignId: session.campaign_id };
}

// ============================================================================
// GM: Platzhalter am Tisch (0–3) für Vorbereitung / Live — session_live_states
// ============================================================================
export async function setPlanningDummyPlayerCount(sessionId: string, count: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const n = Math.min(3, Math.max(0, Math.round(Number(count)) || 0));

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (!session) throw new Error("Session nicht gefunden.");
  if (isSessionStatusTerminal(session.status)) {
    throw new Error("Session ist bereits abgeschlossen oder abgesagt.");
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
    throw new Error("Nur der Spielleiter kann Platzhalter setzen.");
  }

  await ensureSessionPrepLiveState(sessionId);

  const { error: updError } = await (supabase.from("session_live_states") as any)
    .update({ dummy_player_count: n })
    .eq("session_id", sessionId);

  if (updError) {
    console.error("[setPlanningDummyPlayerCount]", updError);
    throw new Error(updError.message || "Platzhalter konnten nicht gespeichert werden.");
  }

  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  revalidatePath("/dashboard/my-campaigns");
  return { success: true, dummy_player_count: n };
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
    .select("id, gm_id, owner_id, name")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
    name?: string;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann einen Termin absagen.");
  }

  if (isSessionStatusLive(session.status)) {
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
  const campaignName = campaign?.name || "Kampagne";
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
  revalidatePath("/dashboard/my-campaigns");
  return { success: true };
}
