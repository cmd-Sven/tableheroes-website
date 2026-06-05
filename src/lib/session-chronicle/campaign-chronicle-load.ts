import { createClient } from "@/src/lib/supabase/server";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import { countPendingInboxItems, listChronicleInboxItems } from "@/src/lib/session-chronicle/inbox";
import type { SessionChronicleState } from "@/src/lib/session-chronicle/types";

export type CampaignChronicleRow = {
  sessionId: string;
  sessionTitle: string | null;
  sessionStatus: string;
  state: SessionChronicleState | null;
  pendingInbox: number;
  chunks: Array<{
    chunk_index: number;
    whisper_status: string;
    summarize_status: string;
    error_message: string | null;
    duration_ms: number | null;
    created_at: string;
  }>;
};

export async function loadCampaignChronicleOverview(
  campaignId: string,
): Promise<CampaignChronicleRow[]> {
  const supabase = await createClient();

  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("id, title, status, start_time")
    .eq("campaign_id", campaignId)
    .order("start_time", { ascending: false })
    .limit(20);

  const sessions = (sessionsRaw ?? []) as Array<{
    id: string;
    title: string | null;
    status: string;
  }>;

  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: statesRaw } = await (supabase as any)
    .from("session_chronicle_state")
    .select("*")
    .in("session_id", sessionIds);

  const stateBySession = new Map<string, SessionChronicleState | null>();
  for (const row of statesRaw ?? []) {
    const parsed = parseChronicleStateRow(row);
    if (parsed) stateBySession.set(parsed.session_id, parsed);
  }

  const { data: tsRows } = await (supabase as any)
    .from("session_transcription_sessions")
    .select("id, session_id")
    .in("session_id", sessionIds);

  const tsBySession = new Map<string, string>();
  for (const row of tsRows ?? []) {
    tsBySession.set(String((row as { session_id: string }).session_id), String((row as { id: string }).id));
  }

  const tsIds = [...tsBySession.values()];
  const chunksByTs = new Map<string, CampaignChronicleRow["chunks"]>();

  if (tsIds.length > 0) {
    const { data: chunksRaw } = await (supabase as any)
      .from("session_transcription_chunks")
      .select(
        "transcription_session_id, chunk_index, whisper_status, summarize_status, error_message, duration_ms, created_at",
      )
      .in("transcription_session_id", tsIds)
      .order("chunk_index", { ascending: true });

    for (const row of chunksRaw ?? []) {
      const r = row as {
        transcription_session_id: string;
        chunk_index: number;
        whisper_status: string;
        summarize_status: string;
        error_message: string | null;
        duration_ms: number | null;
        created_at: string;
      };
      const list = chunksByTs.get(r.transcription_session_id) ?? [];
      list.push({
        chunk_index: r.chunk_index,
        whisper_status: r.whisper_status,
        summarize_status: r.summarize_status,
        error_message: r.error_message,
        duration_ms: r.duration_ms,
        created_at: r.created_at,
      });
      chunksByTs.set(r.transcription_session_id, list);
    }
  }

  return sessions
    .filter((s) => stateBySession.has(s.id) || tsBySession.has(s.id))
    .map((s) => {
      const state = stateBySession.get(s.id) ?? null;
      const tsId = tsBySession.get(s.id);
      return {
        sessionId: s.id,
        sessionTitle: s.title,
        sessionStatus: s.status,
        state,
        pendingInbox: countPendingInboxItems(state),
        chunks: tsId ? (chunksByTs.get(tsId) ?? []) : [],
      };
    });
}

export function serializeInboxPreview(state: SessionChronicleState | null) {
  if (!state) return [];
  return listChronicleInboxItems(state).slice(0, 12).map((item) => ({
    kind: item.kind,
    title:
      item.kind === "npc"
        ? item.draft.detected_name
        : item.kind === "location"
          ? item.draft.name
          : item.draft.title,
  }));
}
