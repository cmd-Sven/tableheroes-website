import type {
  ChronicleChunkSummary,
  SpontaneousLocationDraft,
  SpontaneousNpcDraft,
  SpontaneousQuestDraft,
} from "./types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

function normalizeNpc(raw: unknown): SpontaneousNpcDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.detected_name);
  if (!name) return null;
  const stats =
    r.estimated_stats && typeof r.estimated_stats === "object"
      ? (r.estimated_stats as Record<string, unknown>)
      : null;
  return {
    detected_name: name,
    appearance: asString(r.appearance) || undefined,
    behavior: asString(r.behavior) || undefined,
    estimated_stats: stats
      ? {
          race: asString(stats.race) || undefined,
          class: asString(stats.class) || undefined,
        }
      : undefined,
    located_in: asString(r.located_in) || undefined,
    isImported: false,
  };
}

function normalizeLocation(raw: unknown): SpontaneousLocationDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name);
  const type = asString(r.type) || "Ort";
  if (!name) return null;
  return {
    name,
    type,
    description: asString(r.description) || undefined,
    isImported: false,
  };
}

function normalizeQuest(raw: unknown): SpontaneousQuestDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = asString(r.title);
  if (!title) return null;
  return {
    title,
    giver: asString(r.giver) || undefined,
    objective: asString(r.objective) || undefined,
    isImported: false,
  };
}

/** LLM-JSON robust normalisieren. */
export function parseChronicleChunkSummary(raw: unknown): ChronicleChunkSummary {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const spontaneous_npcs = (Array.isArray(r.spontaneous_npcs) ? r.spontaneous_npcs : [])
    .map(normalizeNpc)
    .filter((x): x is SpontaneousNpcDraft => x != null);

  const spontaneous_locations = (
    Array.isArray(r.spontaneous_locations) ? r.spontaneous_locations : []
  )
    .map(normalizeLocation)
    .filter((x): x is SpontaneousLocationDraft => x != null);

  const spontaneous_quests = (Array.isArray(r.spontaneous_quests) ? r.spontaneous_quests : [])
    .map(normalizeQuest)
    .filter((x): x is SpontaneousQuestDraft => x != null);

  return {
    story_recap: asString(r.story_recap),
    discovered_loot: asStringArray(r.discovered_loot),
    spontaneous_npcs,
    spontaneous_locations,
    spontaneous_quests,
  };
}

export function mergeChronicleChunkSummary(
  previous: {
    story_recap: string | null;
    discovered_loot: string[];
    spontaneous_npcs: SpontaneousNpcDraft[];
    spontaneous_locations: SpontaneousLocationDraft[];
    spontaneous_quests: SpontaneousQuestDraft[];
    last_chunk_index: number;
  },
  summary: ChronicleChunkSummary,
  chunkIndex: number,
) {
  const recapParts = [previous.story_recap, summary.story_recap].filter(
    (p) => p != null && String(p).trim(),
  );
  return {
    story_recap: recapParts.length > 0 ? recapParts.join("\n\n") : null,
    discovered_loot: [...previous.discovered_loot, ...summary.discovered_loot],
    spontaneous_npcs: [...previous.spontaneous_npcs, ...summary.spontaneous_npcs],
    spontaneous_locations: [
      ...previous.spontaneous_locations,
      ...summary.spontaneous_locations,
    ],
    spontaneous_quests: [...previous.spontaneous_quests, ...summary.spontaneous_quests],
    last_chunk_index: chunkIndex,
    updated_at: new Date().toISOString(),
  };
}
