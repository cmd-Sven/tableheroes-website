"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { mirrorSystemLogToChronicle } from "@/src/lib/session-chronicle/transcription-server";

function normalizeSystemLogs(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> =>
        entry != null && typeof entry === "object",
      )
    : [];
}

export async function createSystemLog(
  sessionId: string,
  type: string,
  value: unknown,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht authentifiziert.");
  }

  const { data: sessionRaw, error: sessionError } = await (supabase.from(
    "sessions",
  ) as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string } | null;
  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
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
    throw new Error("Nur der GM kann System-Logs schreiben.");
  }

  let writeClient = supabase;
  try {
    writeClient = createAdminClient();
  } catch {
    writeClient = supabase;
  }

  const { data: liveStateRaw, error: liveStateError } = await (writeClient.from(
    "session_live_states",
  ) as any)
    .select("system_logs")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (liveStateError) {
    throw new Error(liveStateError.message || "Chronik konnte nicht geladen werden.");
  }

  const text =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "text" in value
        ? String((value as { text?: unknown }).text ?? "")
        : JSON.stringify(value ?? "");

  const nextLog = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    text: text.trim(),
    type,
    author_name: "System",
  };

  if (!nextLog.text) {
    return null;
  }

  const nextLogs = [
    ...normalizeSystemLogs((liveStateRaw as { system_logs?: unknown } | null)?.system_logs),
    nextLog,
  ].slice(-80);

  const { error: updateError } = await (writeClient.from(
    "session_live_states",
  ) as any)
    .update({ system_logs: nextLogs })
    .eq("session_id", sessionId);

  if (updateError) {
    throw new Error(updateError.message || "System-Log konnte nicht gespeichert werden.");
  }

  try {
    await mirrorSystemLogToChronicle(writeClient, sessionId, type, nextLog.text, nextLog.at);
  } catch (mirrorErr) {
    console.warn("[createSystemLog] Chronist-Marker:", mirrorErr);
  }

  return nextLog;
}
