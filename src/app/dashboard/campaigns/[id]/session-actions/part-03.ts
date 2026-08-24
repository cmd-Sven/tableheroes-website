/**
 * session-actions — part 3: ensureSessionPrepLiveState.
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

import {
  buildSessionPrepLiveStateInsertPayload,
  buildSessionPrepCoreInsertPayload,
  isPostgrestUnknownColumnError,
  parseUnknownColumnFromPostgrestMessage,
  logSupabaseInsertError,
} from "./_shared";

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
