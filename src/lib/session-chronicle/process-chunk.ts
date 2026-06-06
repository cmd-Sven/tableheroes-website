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
import type { ChronicleChunkSummary, LiveMarker } from "./types";
import { SESSION_AUDIO_BUCKET } from "./constants";
import { createAdminClient } from "@/src/lib/supabase/server";
import { parseChronicleStateRow } from "./parse-db";
import { emptyChronicleState } from "./types";
import { ensureChronicleState } from "./transcription-server";
import { after } from "next/server";

function guessAudioFilename(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? "chunk.webm";
  return base.includes(".") ? base : `${base}.webm`;
}

function guessMimeType(filename: string): string {
  if (filename.endsWith(".ogg")) return "audio/ogg";
  if (filename.endsWith(".wav")) return "audio/wav";
  if (filename.endsWith(".mp4")) return "audio/mp4";
  return "audio/webm";
}

export async function transcribeChunkAudio(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(SESSION_AUDIO_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message || "Audio-Datei konnte nicht geladen werden.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const filename = guessAudioFilename(storagePath);
  const mime = guessMimeType(filename);
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
  const admin = createAdminClient();

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
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string } | null;
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
    return { ok: false, message: "Chunk hat noch keine Audio-Datei.", chunkIndex };
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

  if (!options?.skipWhisper && (!transcript || force || chunk.whisper_status === "failed")) {
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

  try {
    const summary = await summarizeChunkTranscript({
      sessionTitle: session.title,
      chunkIndex,
      transcript,
      previousRecap: state.story_recap,
      liveMarkers: markers,
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
