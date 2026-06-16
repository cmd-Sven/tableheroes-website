import {
  CHRONICLE_SUMMARIZE_MODEL,
  CHRONICLE_SUMMARIZE_SYSTEM_PROMPT,
  CHRONICLE_WHISPER_MODEL,
  getOpenAIClient,
} from "./openai-chronicle";
import { buildSummarizeUserPrompt } from "./summarize-prompt";
import {
  mergeChronicleChunkSummary,
  parseChronicleChunkSummary,
} from "./summarize-chunk";
import { sanitizeChronicleChunkSummary } from "./chronicle-summary-sanitize";
import {
  filterGmBoardEventsForChunk,
} from "./chronicle-gm-board-events";
import type { ChronicleChunkSummary, LiveMarker } from "./types";
import type { GmBoardEventRow } from "./chronicle-gm-board-events";
import { SESSION_AUDIO_BUCKET } from "./constants";
import { createAdminClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { parseChronicleStateRow } from "./parse-db";
import { emptyChronicleState } from "./types";
import { ensureChronicleState, compactOrphanTranscriptionChunks } from "./transcription-server";
import {
  loadCampaignPartyRoster,
  type CampaignPartyRosterEntry,
} from "./campaign-party-roster";
import { after } from "next/server";

function guessAudioFilename(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? "chunk.webm";
  if (base.includes(".")) return base;
  return `${base}.webm`;
}

function whisperMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".mp3") || lower.endsWith(".mpeg") || lower.endsWith(".mpga")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".flac")) return "audio/flac";
  return "audio/webm";
}

const CHRONICLE_ADMIN_CONFIG_ERROR =
  "Server-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY). Audio-Chunks sind ggf. gespeichert — Verarbeitung ist erst nach Server-Setup möglich.";

function requireChronicleAdminClient():
  | { ok: true; client: ReturnType<typeof createAdminClient> }
  | { ok: false; message: string } {
  const client = tryCreateAdminClient();
  if (!client) {
    return { ok: false, message: CHRONICLE_ADMIN_CONFIG_ERROR };
  }
  return { ok: true, client };
}

export async function transcribeChunkAudio(storagePath: string): Promise<string> {
  const adminResult = requireChronicleAdminClient();
  if (!adminResult.ok) {
    throw new Error(adminResult.message);
  }
  const admin = adminResult.client;
  const { data, error } = await admin.storage
    .from(SESSION_AUDIO_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message || "Audio-Datei konnte nicht geladen werden.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength < 256) {
    throw new Error("Audio-Chunk ist leer oder zu klein für Whisper.");
  }

  const filename = guessAudioFilename(storagePath);
  const mime = whisperMimeType(filename);
  const openai = getOpenAIClient();

  const file = new File([buffer], filename, { type: mime });
  const result = await openai.audio.transcriptions.create({
    file,
    model: CHRONICLE_WHISPER_MODEL,
    language: "de",
  });

  const text = result.text?.trim();
  if (!text) {
    throw new Error("Whisper lieferte keinen Text (evtl. Stille im Segment).");
  }
  return text;
}

export async function summarizeChunkTranscript(params: {
  sessionTitle: string | null;
  chunkIndex: number;
  transcript: string;
  previousRecap: string | null;
  liveMarkers: LiveMarker[];
  gmBoardEvents?: GmBoardEventRow[];
  partyRoster?: CampaignPartyRosterEntry[];
}): Promise<ChronicleChunkSummary> {
  const openai = getOpenAIClient();
  const userPrompt = buildSummarizeUserPrompt(params);

  const completion = await openai.chat.completions.create({
    model: CHRONICLE_SUMMARIZE_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CHRONICLE_SUMMARIZE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Keine Zusammenfassung von OpenAI erhalten.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("KI-Antwort war kein gültiges JSON.");
  }

  return sanitizeChronicleChunkSummary(parseChronicleChunkSummary(parsed), params.liveMarkers);
}

type ProcessResult =
  | {
      ok: true;
      chunkIndex: number;
      transcriptLength: number;
      summary: ChronicleChunkSummary;
      skipped?: boolean;
    }
  | { ok: false; message: string; chunkIndex?: number };

export async function processTranscriptionChunk(
  sessionId: string,
  chunkIndex: number,
  options?: { force?: boolean; skipWhisper?: boolean },
): Promise<ProcessResult> {
  const adminResult = requireChronicleAdminClient();
  if (!adminResult.ok) {
    return { ok: false, message: adminResult.message, chunkIndex };
  }
  const admin = adminResult.client;

  const { data: sessionRaw } = await (admin.from("sessions") as any)
    .select("id, campaign_id, title")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
  } | null;
  if (!session) {
    return { ok: false, message: "Session nicht gefunden." };
  }

  const { data: tsRaw } = await (admin as any)
    .from("session_transcription_sessions")
    .select("id, started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string; started_at: string | null } | null;
  if (!ts) {
    return { ok: false, message: "Keine Transcription-Session." };
  }

  const { data: chunkRaw } = await (admin as any)
    .from("session_transcription_chunks")
    .select("*")
    .eq("transcription_session_id", ts.id)
    .eq("chunk_index", chunkIndex)
    .maybeSingle();

  const chunk = chunkRaw as {
    id: string;
    storage_path: string | null;
    transcript_text: string | null;
    whisper_status: string;
    summarize_status: string;
    live_markers: LiveMarker[];
  } | null;

  if (!chunk) {
    return { ok: false, message: "Chunk nicht gefunden.", chunkIndex };
  }
  if (!chunk.storage_path) {
    return {
      ok: false,
      message:
        "Für diesen Eintrag wurde kein Audio hochgeladen — nur ein Marker ohne Aufnahme. Seite neu laden; leere Einträge werden automatisch bereinigt.",
      chunkIndex,
    };
  }

  const force = options?.force === true;

  if (
    !force &&
    chunk.whisper_status === "done" &&
    chunk.summarize_status === "done" &&
    chunk.transcript_text
  ) {
    return {
      ok: true,
      chunkIndex,
      transcriptLength: chunk.transcript_text.length,
      summary: parseChronicleChunkSummary({}),
      skipped: true,
    };
  }

  let transcript = chunk.transcript_text?.trim() ?? "";

  const whisperIncomplete =
    chunk.whisper_status === "pending" ||
    chunk.whisper_status === "processing" ||
    chunk.whisper_status === "failed";

  if (!options?.skipWhisper && (force || whisperIncomplete || !transcript)) {
    await (admin as any)
      .from("session_transcription_chunks")
      .update({ whisper_status: "processing", error_message: null })
      .eq("id", chunk.id);

    try {
      transcript = await transcribeChunkAudio(chunk.storage_path);
      await (admin as any)
        .from("session_transcription_chunks")
        .update({ transcript_text: transcript, whisper_status: "done" })
        .eq("id", chunk.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Whisper fehlgeschlagen.";
      await (admin as any)
        .from("session_transcription_chunks")
        .update({ whisper_status: "failed", error_message: message })
        .eq("id", chunk.id);
      return { ok: false, message, chunkIndex };
    }
  }

  if (!transcript) {
    return { ok: false, message: "Kein Transkript für Zusammenfassung.", chunkIndex };
  }

  if (!force && chunk.summarize_status === "done") {
    return {
      ok: true,
      chunkIndex,
      transcriptLength: transcript.length,
      summary: parseChronicleChunkSummary({}),
      skipped: true,
    };
  }

  await (admin as any)
    .from("session_transcription_chunks")
    .update({ summarize_status: "processing", error_message: null })
    .eq("id", chunk.id);

  const { data: stateRaw } = await (admin as any)
    .from("session_chronicle_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  let state = parseChronicleStateRow(stateRaw);
  if (!state) {
    await ensureChronicleState(admin as any, sessionId, session.campaign_id);
    state = emptyChronicleState(sessionId, session.campaign_id);
  }

  const markers = Array.isArray(chunk.live_markers) ? chunk.live_markers : [];

  const { data: liveStateRaw } = await (admin as any)
    .from("session_live_states")
    .select("system_logs")
    .eq("session_id", sessionId)
    .maybeSingle();

  const gmBoardEvents = filterGmBoardEventsForChunk(
    (liveStateRaw as { system_logs?: unknown } | null)?.system_logs,
    ts.started_at,
    chunkIndex,
  );

  let partyRoster: CampaignPartyRosterEntry[] = [];
  try {
    partyRoster = await loadCampaignPartyRoster(session.campaign_id);
  } catch (e: unknown) {
    console.warn("[processTranscriptionChunk] Party-Roster konnte nicht geladen werden.", e);
  }

  try {
    const summary = await summarizeChunkTranscript({
      sessionTitle: session.title,
      chunkIndex,
      transcript,
      previousRecap: state.story_recap,
      liveMarkers: markers,
      gmBoardEvents,
      partyRoster,
    });

    const merged = mergeChronicleChunkSummary(state, summary, chunkIndex);

    await (admin as any).from("session_chronicle_state").upsert(
      {
        session_id: sessionId,
        campaign_id: session.campaign_id,
        ...merged,
      },
      { onConflict: "session_id" },
    );

    await (admin as any)
      .from("session_transcription_chunks")
      .update({
        summarize_status: "done",
        summarized_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", chunk.id);

    return {
      ok: true,
      chunkIndex,
      transcriptLength: transcript.length,
      summary,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Zusammenfassung fehlgeschlagen.";
    await (admin as any)
      .from("session_transcription_chunks")
      .update({ summarize_status: "failed", error_message: message })
      .eq("id", chunk.id);
    return { ok: false, message, chunkIndex };
  }
}

export async function summarizeTranscriptionChunkOnly(
  sessionId: string,
  chunkIndex: number,
  force?: boolean,
) {
  return processTranscriptionChunk(sessionId, chunkIndex, {
    force,
    skipWhisper: true,
  });
}

async function listIncompleteTranscriptionChunkIndexes(
  sessionId: string,
): Promise<number[]> {
  const adminResult = requireChronicleAdminClient();
  if (!adminResult.ok) return [];
  const admin = adminResult.client;

  const { data: tsRaw } = await (admin as any)
    .from("session_transcription_sessions")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string } | null;
  if (!ts) return [];

  const { data: chunksRaw } = await (admin as any)
    .from("session_transcription_chunks")
    .select("chunk_index, whisper_status, summarize_status, storage_path")
    .eq("transcription_session_id", ts.id)
    .order("chunk_index", { ascending: true });

  const chunks = (chunksRaw ?? []) as Array<{
    chunk_index: number;
    whisper_status: string;
    summarize_status: string;
    storage_path: string | null;
  }>;

  return chunks
    .filter((chunk) => {
      if (!chunk.storage_path) return false;
      return (
        chunk.whisper_status !== "done" ||
        chunk.summarize_status !== "done"
      );
    })
    .map((chunk) => chunk.chunk_index);
}

/** Nach Audio-Upload: Whisper + Zusammenfassung im Hintergrund. */
export function scheduleTranscriptionChunkProcessing(
  sessionId: string,
  chunkIndex: number,
) {
  after(async () => {
    try {
      await processTranscriptionChunk(sessionId, chunkIndex);
    } catch (e: unknown) {
      console.error("[scheduleTranscriptionChunkProcessing]", sessionId, chunkIndex, e);
    }
  });
}

/** Nach Aufnahme-Ende / Session-Abschluss: offene Chunks nachholen. */
export function schedulePendingTranscriptionChunksProcessing(sessionId: string) {
  after(async () => {
    try {
      const adminResult = requireChronicleAdminClient();
      if (!adminResult.ok) {
        console.error(
          "[schedulePendingTranscriptionChunksProcessing]",
          sessionId,
          adminResult.message,
        );
        return;
      }
      const admin = adminResult.client;
      const { data: tsRaw } = await (admin as any)
        .from("session_transcription_sessions")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (tsRaw) {
        await compactOrphanTranscriptionChunks(admin as any, (tsRaw as { id: string }).id);
      }

      const indexes = await listIncompleteTranscriptionChunkIndexes(sessionId);
      for (const chunkIndex of indexes) {
        try {
          await processTranscriptionChunk(sessionId, chunkIndex);
        } catch (e: unknown) {
          console.error(
            "[schedulePendingTranscriptionChunksProcessing]",
            sessionId,
            chunkIndex,
            e,
          );
        }
      }
    } catch (e: unknown) {
      console.error("[schedulePendingTranscriptionChunksProcessing]", sessionId, e);
    }
  });
}
