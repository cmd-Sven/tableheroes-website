"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { isSessionStatusLive, isSessionStatusScheduled, isSessionStatusTerminal } from "@/src/lib/session-status";
import { isMissedScheduledSession } from "@/src/lib/session-focus";
import { sendMessage } from "@/src/lib/actions/message-actions";
import { stopTranscriptionRecording } from "@/src/lib/session-chronicle/transcription-server";
import { schedulePendingTranscriptionChunksProcessing } from "@/src/lib/session-chronicle/process-chunk";

/**
 * Server Action: Einfachen Kampagne-Termin anlegen (Event / Spielplanung).
 * Keine Szenen, keine Live-Bühne — RSVP nur mit Spielerprofil.
 */
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
      transcription_mode: formData.transcription_mode ?? "table",
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

/** PostgREST: Spalte im API-Schema-Cache nicht (Migration fehlt / Cache veraltet). */
function isPostgrestUnknownColumnError(insertError: unknown): boolean {
  const e = insertError as { code?: string; message?: string };
  if (e?.code === "PGRST204") return true;
  const msg = String(e?.message ?? "");
  return (
    /could not find the '[^']+' column/i.test(msg) &&
    (/schema cache/i.test(msg) || /not in the schema cache/i.test(msg))
  );
}

function parseUnknownColumnFromPostgrestMessage(message: string): string | null {
  const m = message.match(/Could not find the '([^']+)' column/i);
  if (m?.[1]) return m[1];
  const m2 = message.match(/"([^"]+)" column of 'session_live_states'/i);
  return m2?.[1] ?? null;
}

function logSupabaseInsertError(context: string, insertError: unknown) {
  const e = insertError as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  console.error(`${context} Supabase Insert Error Message:`, e?.message ?? insertError);
  console.error(`${context} Supabase Insert Error Details:`, e?.details ?? "No details");
  console.error(`${context} Supabase Insert Error Hint:`, e?.hint ?? "No hint");
  console.error(`${context} Supabase Insert Error Code:`, e?.code ?? "No code");
  if (insertError && typeof insertError === "object") {
    console.error(
      `${context} Supabase Insert Error keys:`,
      Object.getOwnPropertyNames(insertError),
    );
    try {
      console.error(
        `${context} Supabase Insert Error JSON:`,
        JSON.stringify(insertError, null, 2),
      );
    } catch {
      console.error(`${context} Supabase Insert Error (not JSON-serializable)`);
    }
  }
}

/** Kernfelder ohne neuere Spalten (z. B. temperature) — für sehr alte PostgREST-Caches / DBs. */
function buildSessionPrepCoreInsertPayload(
  sessionId: string,
  scribeUserId: string,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    scribe_id: scribeUserId,
    weather: "Klar",
    current_time: "Tag",
    current_location: null,
    journal_text: null,
    system_logs: [],
    visible_npc_ids: [],
    visible_faction_ids: [],
    is_background_manual_override: false,
    is_combat_mode: false,
    current_turn_index: 0,
  };
}

/** Kein undefined im Insert — PostgREST/JS-Client; optionale FK/JSON explizit null / {}. */
function buildSessionPrepLiveStateInsertPayload(
  sessionId: string,
  scribeUserId: string,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    weather: "Klar",
    temperature: "normal",
    temperature_value: 15,
    current_time: "Tag",
    current_location: null,
    current_location_lore_id: null,
    current_location_id: null,
    current_loot_id: null,
    journal_text: null,
    system_logs: [],
    visible_npc_ids: [],
    visible_faction_ids: [],
    is_background_manual_override: false,
    is_combat_mode: false,
    current_turn_index: 0,
    scribe_id: scribeUserId,
    fate_coins: [],
    destroyed_fate_coins: 0,
    downtime_active: false,
    downtime_type: "travel",
    downtime_current_day: 1,
    downtime_total_days: 1,
    fap_allocations: {},
    physically_present_user_ids: [],
    loot_hide_npcs: false,
    dummy_player_count: 0,
    active_shop_id: null,
    active_merchant_npc_id: null,
    background_url: null,
    in_game_date: null,
    in_game_time: null,
    weather_intensity: null,
    weather_preset: null,
    weather_temperature: null,
  };
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
    if (sessionError) {
      console.error("[ensureSessionPrepLiveState] Session Load Error:", sessionError);
    }
    return null;
  }
  if (isSessionStatusTerminal(session.status)) {
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

  if (existing) return serializeForClient(existing) as Record<string, unknown>;

  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    "ensure_session_prep_live_state",
    { p_session_id: sessionId },
  );
  if (rpcError) {
    const msg = String(rpcError.message ?? "").toLowerCase();
    const fnMissing =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("could not find the function");
    if (!fnMissing) {
      console.warn("[ensureSessionPrepLiveState] RPC:", rpcError);
    }
  } else if (rpcData != null) {
    const rows = Array.isArray(rpcData) ? rpcData : [rpcData];
    const first = rows.find(
      (r) =>
        r &&
        typeof r === "object" &&
        String((r as Record<string, unknown>).session_id ?? "") === sessionId,
    );
    if (first) {
      return serializeForClient(first) as Record<string, unknown>;
    }
  }

  /** Service Role umgeht RLS beim Anlegen; sonst GM-Session (RLS insert_gm_owner). */
  let writeClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> =
    supabase;
  try {
    writeClient = createAdminClient();
  } catch (error) {
    console.warn(
      "[ensureSessionPrepLiveState] Admin-Client nicht verfügbar, verwende RLS-Client.",
      error,
    );
  }

  let insertPayload: Record<string, unknown> = {
    ...buildSessionPrepLiveStateInsertPayload(sessionId, user.id),
  };

  try {
    let inserted: Record<string, unknown> | null = null;
    let insertError: unknown = null;

    /** PGRST204: unbekannte Spalte → Feld entfernen und erneut (ältere API-Caches / fehlende Migrationen). */
    for (let stripAttempt = 0; stripAttempt < 40; stripAttempt++) {
      const res = await (writeClient.from("session_live_states") as any)
        .insert(insertPayload)
        .select()
        .single();
      insertError = res.error;
      inserted = res.data as Record<string, unknown> | null;
      if (!insertError && inserted) {
        break;
      }
      if (!isPostgrestUnknownColumnError(insertError)) {
        break;
      }
      const msg = String((insertError as { message?: string }).message ?? "");
      const badCol = parseUnknownColumnFromPostgrestMessage(msg);
      if (badCol && Object.prototype.hasOwnProperty.call(insertPayload, badCol)) {
        const next = { ...insertPayload };
        delete next[badCol];
        insertPayload = next;
        console.warn(
          `[ensureSessionPrepLiveState] PostgREST kennt Spalte '${badCol}' nicht — Insert ohne dieses Feld wiederholt.`,
        );
        continue;
      }
      break;
    }

    /** Fallback: minimale Zeile + erneut Strip-Retry (ohne temperature & Co.). */
    if (insertError) {
      insertPayload = buildSessionPrepCoreInsertPayload(sessionId, user.id);
      for (let stripAttempt = 0; stripAttempt < 25; stripAttempt++) {
        const res = await (writeClient.from("session_live_states") as any)
          .insert(insertPayload)
          .select()
          .single();
        insertError = res.error;
        inserted = res.data as Record<string, unknown> | null;
        if (!insertError && inserted) {
          break;
        }
        if (!isPostgrestUnknownColumnError(insertError)) {
          break;
        }
        const msg = String((insertError as { message?: string }).message ?? "");
        const badCol = parseUnknownColumnFromPostgrestMessage(msg);
        if (badCol && Object.prototype.hasOwnProperty.call(insertPayload, badCol)) {
          const next = { ...insertPayload };
          delete next[badCol];
          insertPayload = next;
          console.warn(
            `[ensureSessionPrepLiveState] (Kern-Payload) PostgREST kennt Spalte '${badCol}' nicht — Feld entfernt, erneuter Versuch.`,
          );
          continue;
        }
        break;
      }
    }

    if (insertError) {
      logSupabaseInsertError("[ensureSessionPrepLiveState]", insertError);
      console.error("[ensureSessionPrepLiveState] Insert Context:", {
        payload: insertPayload,
        session,
        campaign,
        userId: user.id,
        usedAdminClient: writeClient !== supabase,
      });
      const { data: existingAfterFail } = await (supabase.from("session_live_states") as any)
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      const rr = existingAfterFail as Record<string, unknown> | null;
      if (rr) {
        return serializeForClient(rr) as Record<string, unknown>;
      }
      throw new Error("Fehler beim Erstellen der Bühnen-Datenbank.");
    }

    const ins = inserted as Record<string, unknown> | null;
    return ins ? (serializeForClient(ins) as Record<string, unknown>) : null;
  } catch (e) {
    if (e instanceof Error && e.message === "Fehler beim Erstellen der Bühnen-Datenbank.") {
      throw e;
    }
    console.error("[ensureSessionPrepLiveState] unexpected exception:", e);
    throw new Error("Fehler beim Erstellen der Bühnen-Datenbank.");
  }
}

type ChronicleEntry = {
  id: string;
  at: string;
  text: string;
  type: string;
  author_name: string;
};

function normalizeStringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

function normalizeChronicleSnapshot(systemLogs: unknown, journalText: unknown): ChronicleEntry[] {
  const entries: ChronicleEntry[] = [];

  if (Array.isArray(systemLogs)) {
    for (const item of systemLogs) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? "").trim();
      if (!text) continue;
      entries.push({
        id: String(row.id ?? `system-${entries.length}`),
        at: String(row.at ?? new Date().toISOString()),
        text,
        type: String(row.type ?? "system"),
        author_name: String(row.author_name ?? "System"),
      });
    }
  }

  const manualText = String(journalText ?? "").trim();
  if (manualText) {
    entries.push({
      id: `journal-${Date.now()}`,
      at: new Date().toISOString(),
      text: manualText,
      type: "journal",
      author_name: "Chronik",
    });
  }

  return entries.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export async function archiveSession(
  sessionId: string,
  campaignId: string,
  sessionName?: string | null,
  /** true z. B. bei expirePastScheduledSessionsForCampaign während RSC-Render — kein revalidatePath. */
  skipRevalidate = false,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await (supabase.from(
    "sessions",
  ) as any)
    .select("id, campaign_id, title, start_time")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
    start_time: string | null;
  } | null;

  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
  }

  if (String(session.campaign_id) !== String(campaignId)) {
    throw new Error("Session gehört nicht zu dieser Kampagne.");
  }

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
    throw new Error("Nur der GM kann eine Session archivieren.");
  }

  const { data: liveStateRaw } = await (supabase.from(
    "session_live_states",
  ) as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const liveState = (liveStateRaw ?? {}) as Record<string, unknown>;
  const visibleNpcIds = normalizeStringIds(liveState.visible_npc_ids);
  const locationId =
    liveState.current_location_lore_id != null
      ? String(liveState.current_location_lore_id)
      : null;

  const reputationTouchedNpcIds = new Set<string>();
  if (session.start_time) {
    const { data: touchedRepRows } = await (supabase.from(
      "campaign_npc_reputation",
    ) as any)
      .select("npc_id")
      .eq("campaign_id", campaignId)
      .gte("updated_at", session.start_time);

    for (const row of (touchedRepRows as Array<{ npc_id: string }> | null) ?? []) {
      reputationTouchedNpcIds.add(String(row.npc_id));
    }
  }

  const archiveNpcIds = Array.from(
    new Set([...visibleNpcIds, ...reputationTouchedNpcIds]),
  );

  const reputationScoreByNpc = new Map<string, number>();
  if (archiveNpcIds.length > 0) {
    const { data: repScoreRows } = await (supabase.from(
      "campaign_npc_reputation",
    ) as any)
      .select("npc_id, reputation_score")
      .eq("campaign_id", campaignId)
      .in("npc_id", archiveNpcIds);

    for (const row of (repScoreRows as Array<{
      npc_id: string;
      reputation_score: number;
    }> | null) ?? []) {
      reputationScoreByNpc.set(
        String(row.npc_id),
        Number(row.reputation_score ?? 0),
      );
    }
  }

  let encounteredNpcs: Array<{
    id: string;
    name: string;
    reputation_score: number;
  }> = [];
  if (visibleNpcIds.length > 0) {
    const { data: npcRows } = await (supabase.from("npcs") as any)
      .select("id, name")
      .in("id", visibleNpcIds);
    encounteredNpcs = ((npcRows as Array<{ id: string; name: string }> | null) ?? [])
      .map((npc) => ({
        id: String(npc.id),
        name: String(npc.name ?? "Unbekannt"),
        reputation_score: reputationScoreByNpc.get(String(npc.id)) ?? 0,
      }));
  }

  let visitedLocations: Array<{ id: string | null; name: string }> = [];
  if (locationId) {
    const { data: locationRow } = await (supabase.from("world_lore") as any)
      .select("id, name")
      .eq("id", locationId)
      .maybeSingle();
    if (locationRow) {
      visitedLocations = [{
        id: String((locationRow as any).id),
        name: String((locationRow as any).name ?? "Unbekannter Ort"),
      }];
    }
  } else if (liveState.current_location) {
    visitedLocations = [{
      id: null,
      name: String(liveState.current_location),
    }];
  }

  const chronicleSnapshot = normalizeChronicleSnapshot(
    liveState.system_logs,
    liveState.journal_text,
  );
  const archivedAt = new Date().toISOString();
  const fallbackSessionName =
    session.title ||
    sessionName ||
    (session.start_time
      ? `Session vom ${new Intl.DateTimeFormat("de-DE").format(new Date(session.start_time))}`
      : "Unbenannte Session");

  const { data: archiveRaw, error: archiveError } = await (supabase.from(
    "session_archives",
  ) as any)
    .upsert(
      {
        campaign_id: campaignId,
        session_id: sessionId,
        session_name: sessionName?.trim() || fallbackSessionName,
        archived_at: archivedAt,
        chronicle_snapshot: chronicleSnapshot,
        encountered_npcs: encounteredNpcs,
        visited_locations: visitedLocations,
      },
      { onConflict: "session_id" },
    )
    .select("*")
    .single();

  if (archiveError || !archiveRaw) {
    throw new Error(archiveError?.message || "Session konnte nicht archiviert werden.");
  }

  const archive = archiveRaw as { id: string };

  try {
    const { seedPlayerRecapDraftForArchive } = await import("./player-recap-actions");
    await seedPlayerRecapDraftForArchive(supabase, {
      id: archive.id,
      campaign_id: campaignId,
      session_id: sessionId,
      encountered_npcs: encounteredNpcs,
      visited_locations: visitedLocations,
    });
  } catch (recapErr) {
    console.warn("[archiveSession] Spieler-Chronik-Entwurf:", recapErr);
  }

  if (archiveNpcIds.length > 0) {
    const reputationRows = archiveNpcIds.map((npcId) => ({
      campaign_id: campaignId,
      npc_id: npcId,
      reputation_score: reputationScoreByNpc.get(npcId) ?? 0,
      last_seen_session_id: archive.id,
      last_seen_location_id: locationId,
      last_seen_at: archivedAt,
    }));

    const admin = createAdminClient();
    const { error: reputationError } = await (admin.from(
      "campaign_npc_reputation",
    ) as any).upsert(reputationRows, {
      onConflict: "campaign_id,npc_id",
    });

    if (reputationError) {
      throw new Error(reputationError.message);
    }
  }

  const { error: liveResetError } = await (supabase.from(
    "session_live_states",
  ) as any)
    .update({
      visible_npc_ids: [],
      visible_faction_ids: [],
      is_combat_mode: false,
      current_turn_index: 0,
      system_logs: [],
      journal_text: null,
    })
    .eq("session_id", sessionId);

  if (liveResetError) {
    throw new Error(liveResetError.message);
  }

  const { error: combatCleanupError } = await ((supabase as any).from(
    "combat_participants",
  ) as any)
    .delete()
    .eq("session_id", sessionId);

  if (combatCleanupError) {
    throw new Error(combatCleanupError.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return serializeForClient(archiveRaw) as any;
}

// ============================================================================
// End Session (Archive Journal & Mark as Completed)
// ============================================================================
export async function endSession(sessionId: string, skipRevalidate = false) {
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
    throw new Error("Nur der GM kann eine Session beenden.");
  }

  if (isSessionStatusLive(session.status)) {
    await stopTranscriptionRecording(supabase, sessionId);
    schedulePendingTranscriptionChunksProcessing(sessionId);
  }

  // 4. Archive live state before cleanup/close.
  await archiveSession(
    sessionId,
    (session as any).campaign_id,
    (session as any).title || "Unbenannte Session",
  );

  // 5. Close Session (status + end_time)
  const { error: closeError } = await (supabase.from("sessions") as any)
    .update({ status: "Completed", end_time: new Date().toISOString() })
    .eq("id", sessionId);

  if (closeError) {
    console.error("End Session Error (Close Session):", closeError);
    throw new Error(closeError.message);
  }

  // Revalidate nur Kampagne; /session/ nicht invalidieren (Digest bei offener Oberfläche).
  if (!skipRevalidate && (session as any).campaign_id) {
    revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  }

  return { success: true, campaignId: (session as any).campaign_id };
}

/**
 * GM: Geplante Termine, deren Startzeit mehr als 24h zurückliegt und die nie live gingen,
 * werden wie „Session beenden“ abgewickelt (Archiv-Eintrag, Status Completed).
 * Keine Absage-DMs an Spieler (im Gegensatz zu „Absagen“).
 */
export async function expirePastScheduledSessionsForCampaign(
  campaignId: string,
): Promise<{ closedCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { closedCount: 0 };

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) return { closedCount: 0 };

  const { data: rows } = await (supabase.from("sessions") as any)
    .select("id, status, start_time")
    .eq("campaign_id", campaignId);

  const now = new Date();
  const candidates = ((rows as { id: string; status: string; start_time: string }[]) || []).filter(
    (r) =>
      isMissedScheduledSession(
        {
          id: String(r.id),
          status: String(r.status ?? ""),
          start_time: String(r.start_time ?? ""),
        },
        now,
      ),
  );

  let closedCount = 0;
  for (const r of candidates) {
    try {
      await endSession(String(r.id), true);
      closedCount += 1;
    } catch (e) {
      console.warn("[expirePastScheduledSessionsForCampaign] endSession:", r.id, e);
    }
  }

  // Kein revalidatePath hier: läuft oft während loadCampaignDetailPageData (RSC) — würde Next.js verbieten.
  return { closedCount };
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
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string } | null;
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
    throw new Error("Nur der GM kann Sessions bearbeiten.");
  }

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.start_time !== undefined) payload.start_time = data.start_time;
  if (data.end_time !== undefined) payload.end_time = data.end_time;
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
