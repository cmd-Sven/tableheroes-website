import { AUDIO_CHUNK_DURATION_MS, AUDIO_CHUNK_OVERLAP_MS } from "./constants";

export type GmBoardEventRow = {
  at: string;
  type: string;
  text: string;
};

function normalizeSystemLogs(value: unknown): GmBoardEventRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => entry != null && typeof entry === "object")
    .map((row) => ({
      at: String(row.at ?? ""),
      type: String(row.type ?? "system"),
      text: String(row.text ?? "").trim(),
    }))
    .filter((row) => row.text.length > 0 && row.at.length > 0);
}

/** System-Logs im Zeitfenster eines ~10-Min-Chunks (relativ zur Aufnahme). */
export function filterGmBoardEventsForChunk(
  systemLogs: unknown,
  recordingStartedAt: string | null | undefined,
  chunkIndex: number,
): GmBoardEventRow[] {
  if (!recordingStartedAt?.trim()) return [];
  const recStart = new Date(recordingStartedAt).getTime();
  if (!Number.isFinite(recStart)) return [];

  const chunkStartMs =
    chunkIndex * AUDIO_CHUNK_DURATION_MS - (chunkIndex > 0 ? AUDIO_CHUNK_OVERLAP_MS : 0);
  const chunkEndMs = (chunkIndex + 1) * AUDIO_CHUNK_DURATION_MS;

  return normalizeSystemLogs(systemLogs).filter((log) => {
    const t = new Date(log.at).getTime();
    if (!Number.isFinite(t)) return false;
    const rel = t - recStart;
    return rel >= chunkStartMs && rel < chunkEndMs;
  });
}

export function formatGmBoardEventsForPrompt(events: GmBoardEventRow[]): string {
  if (!events.length) {
    return "Keine digital protokollierten GM-Board-Aktionen in diesem Segment.";
  }
  return events
    .map((e) => `- [${e.type}] ${e.text}`)
    .join("\n");
}

export const CHRONICLE_GM_BOARD_PROMPT_HINT = `
GM-BOARD-AKTIONEN (digital protokolliert):
- NSC/Fraktion auf Bühne, Wetter/Temperatur, Loot-Gun/Truhe, Kampfmodus, Ortswechsel, Shop — sind SL-Steuerungen am Live-Board.
- Beziehe sie im story_recap ein, wenn sie zur erzählten Szene passen (z. B. „Garrik betritt die Bühne“, „Sturm zieht auf“, „Kampf beginnt“, „Beute erscheint“).
- Das sind KEINE spontaneous_quests und meist keine neuen spontaneous_npcs/locations — es sei denn, im Transkript wird zusätzlich ein neuer Name eingeführt.
- Würfelproben und Skill-Checks bleiben Tisch-Mechanik (siehe separate Regeln).`.trim();
