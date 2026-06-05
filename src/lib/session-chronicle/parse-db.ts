import type {
  LiveMarker,
  PlayerRecapPayload,
  SessionChronicleState,
  SessionTranscriptionChunk,
  SessionTranscriptionSession,
  SpontaneousLocationDraft,
  SpontaneousNpcDraft,
  SpontaneousQuestDraft,
} from "./types";
import type { PlayerRecapRecord } from "./player-recap-types";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function parseChronicleStateRow(row: unknown): SessionChronicleState | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    session_id: asString(r.session_id),
    campaign_id: asString(r.campaign_id),
    story_recap: r.story_recap != null ? asString(r.story_recap) : null,
    discovered_loot: asArray<string>(r.discovered_loot),
    spontaneous_npcs: asArray<SpontaneousNpcDraft>(r.spontaneous_npcs),
    spontaneous_locations: asArray<SpontaneousLocationDraft>(r.spontaneous_locations),
    spontaneous_quests: asArray<SpontaneousQuestDraft>(r.spontaneous_quests),
    last_chunk_index: Number(r.last_chunk_index ?? -1),
    updated_at: asString(r.updated_at, new Date().toISOString()),
  };
}

export function parseTranscriptionSessionRow(
  row: unknown,
): SessionTranscriptionSession | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    id: asString(r.id),
    session_id: asString(r.session_id),
    campaign_id: asString(r.campaign_id),
    mode: r.mode === "jitsi" ? "jitsi" : "table",
    status:
      r.status === "recording" ||
      r.status === "paused" ||
      r.status === "stopped"
        ? r.status
        : "idle",
    jitsi_room_url: asString(r.jitsi_room_url),
    recording_notice_acknowledged_at:
      r.recording_notice_acknowledged_at != null
        ? asString(r.recording_notice_acknowledged_at)
        : null,
    started_at: r.started_at != null ? asString(r.started_at) : null,
    stopped_at: r.stopped_at != null ? asString(r.stopped_at) : null,
    created_at: asString(r.created_at),
    updated_at: asString(r.updated_at),
  };
}

export function parseTranscriptionChunkRow(
  row: unknown,
): SessionTranscriptionChunk | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    id: asString(r.id),
    transcription_session_id: asString(r.transcription_session_id),
    chunk_index: Number(r.chunk_index ?? 0),
    storage_path: r.storage_path != null ? asString(r.storage_path) : null,
    duration_ms: r.duration_ms != null ? Number(r.duration_ms) : null,
    overlap_ms: Number(r.overlap_ms ?? 5000),
    transcript_text: r.transcript_text != null ? asString(r.transcript_text) : null,
    whisper_status:
      r.whisper_status === "processing" ||
      r.whisper_status === "done" ||
      r.whisper_status === "failed"
        ? r.whisper_status
        : "pending",
    summarize_status:
      r.summarize_status === "processing" ||
      r.summarize_status === "done" ||
      r.summarize_status === "failed"
        ? r.summarize_status
        : "pending",
    live_markers: asArray<LiveMarker>(r.live_markers),
    error_message: r.error_message != null ? asString(r.error_message) : null,
    created_at: asString(r.created_at),
    summarized_at: r.summarized_at != null ? asString(r.summarized_at) : null,
  };
}

export function parsePlayerRecap(value: unknown): PlayerRecapPayload | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const sectionsRaw = (r.sections ?? {}) as Record<string, unknown>;
  return {
    summary_md: asString(r.summary_md),
    sections: {
      npcs: asArray(sectionsRaw.npcs),
      locations: asArray(sectionsRaw.locations),
      factions: asArray(sectionsRaw.factions),
      quests_new: asArray(sectionsRaw.quests_new),
      quests_completed: asArray(sectionsRaw.quests_completed),
      combat_outcomes: asArray(sectionsRaw.combat_outcomes),
      loot: asArray<string>(sectionsRaw.loot),
      decisions: asArray(sectionsRaw.decisions),
    },
    link_entities: asArray(r.link_entities),
    generated_at: asString(r.generated_at, new Date().toISOString()),
  };
}

export function parsePlayerRecapRecord(value: unknown): PlayerRecapRecord | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (r.status === "draft" || r.status === "published") {
    const recap = parsePlayerRecap(r.recap);
    if (!recap) return null;
    return {
      status: r.status,
      published_at:
        r.published_at != null ? asString(r.published_at) : null,
      recap,
    };
  }
  const flat = parsePlayerRecap(value);
  if (!flat) return null;
  return {
    status: "published",
    published_at: flat.generated_at,
    recap: flat,
  };
}
