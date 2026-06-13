import type { EntityForSmartText } from "@/src/components/ui/SmartText";
import type { LiveMarkerType, TranscriptionMode, TranscriptionStatus } from "./constants";

export type LiveMarker = {
  /** Millisekunden seit Start der aktuellen Aufnahme / Chunk-Offset */
  at_ms: number;
  type: LiveMarkerType;
  /** Optional vom SL gesetzt */
  label?: string;
};

export type SpontaneousNpcDraft = {
  detected_name: string;
  appearance?: string;
  behavior?: string;
  estimated_stats?: {
    race?: string;
    class?: string;
  };
  located_in?: string;
  isImported: boolean;
  /** Vom GM verworfen — erscheint nicht mehr in der Inbox */
  isDismissed?: boolean;
  /** Nach Import: permanente NPC-ID */
  imported_entity_id?: string | null;
};

export type SpontaneousLocationDraft = {
  name: string;
  type: string;
  description?: string;
  isImported: boolean;
  isDismissed?: boolean;
  imported_entity_id?: string | null;
};

export type SpontaneousQuestDraft = {
  title: string;
  giver?: string;
  objective?: string;
  isImported: boolean;
  isDismissed?: boolean;
  imported_entity_id?: string | null;
};

/** LLM-Ausgabe pro 10-Minuten-Chunk (gpt-4o-mini JSON). */
export type ChronicleChunkSummary = {
  story_recap: string;
  discovered_loot: string[];
  spontaneous_npcs: SpontaneousNpcDraft[];
  spontaneous_locations: SpontaneousLocationDraft[];
  spontaneous_quests: SpontaneousQuestDraft[];
};

export type SessionChronicleState = {
  session_id: string;
  campaign_id: string;
  story_recap: string | null;
  discovered_loot: string[];
  spontaneous_npcs: SpontaneousNpcDraft[];
  spontaneous_locations: SpontaneousLocationDraft[];
  spontaneous_quests: SpontaneousQuestDraft[];
  last_chunk_index: number;
  updated_at: string;
};

export type SessionTranscriptionSession = {
  id: string;
  session_id: string;
  campaign_id: string;
  mode: TranscriptionMode;
  status: TranscriptionStatus;
  jitsi_room_url: string;
  recording_notice_acknowledged_at: string | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionTranscriptionChunk = {
  id: string;
  transcription_session_id: string;
  chunk_index: number;
  storage_path: string | null;
  duration_ms: number | null;
  overlap_ms: number;
  transcript_text: string | null;
  whisper_status: "pending" | "processing" | "done" | "failed";
  summarize_status: "pending" | "processing" | "done" | "failed";
  live_markers: LiveMarker[];
  error_message: string | null;
  created_at: string;
  summarized_at: string | null;
};

export type PlayerRecapSection<T> = {
  entity_id?: string | null;
  name: string;
  note?: string;
  type?: string;
};

export type PlayerRecapPayload = {
  summary_md: string;
  sections: {
    npcs: PlayerRecapSection<"npc">[];
    locations: PlayerRecapSection<"location">[];
    factions: PlayerRecapSection<"faction">[];
    quests_new: Array<{ title: string; objective?: string; quest_id?: string | null }>;
    quests_completed: Array<{ title: string; quest_id?: string | null }>;
    combat_outcomes: Array<{ summary: string }>;
    loot: string[];
    decisions: Array<{ summary: string }>;
  };
  /** Für SmartText-Verlinkung (nur freigegebene Entitäten) */
  link_entities: EntityForSmartText[];
  generated_at: string;
};

export type ChronicleInboxItem =
  | { kind: "npc"; draft: SpontaneousNpcDraft; index: number }
  | { kind: "location"; draft: SpontaneousLocationDraft; index: number }
  | { kind: "quest"; draft: SpontaneousQuestDraft; index: number };

/** Leerer Chronicle-Zustand für neue Sessions. */
export function emptyChronicleState(
  sessionId: string,
  campaignId: string,
): SessionChronicleState {
  return {
    session_id: sessionId,
    campaign_id: campaignId,
    story_recap: null,
    discovered_loot: [],
    spontaneous_npcs: [],
    spontaneous_locations: [],
    spontaneous_quests: [],
    last_chunk_index: -1,
    updated_at: new Date().toISOString(),
  };
}
