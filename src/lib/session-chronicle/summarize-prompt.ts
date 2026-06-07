import type { LiveMarker } from "./types";
import { LIVE_MARKER_LABELS } from "./constants";
import { CHRONICLE_TABLE_ACTIONS_PROMPT_HINT } from "./chronicle-dnd-table-actions";
import {
  CHRONICLE_GM_BOARD_PROMPT_HINT,
  formatGmBoardEventsForPrompt,
  type GmBoardEventRow,
} from "./chronicle-gm-board-events";
import { formatPartyRosterForPrompt } from "./campaign-party-roster";
import type { CampaignPartyRosterEntry } from "./campaign-party-roster";

export function formatLiveMarkersForPrompt(markers: LiveMarker[]): string {
  if (!markers.length) return "Keine Live-Marker in diesem Segment.";
  return markers
    .map((m) => {
      const label = LIVE_MARKER_LABELS[m.type] ?? m.type;
      const extra = m.label?.trim() ? ` („${m.label.trim()}")` : "";
      const atMin = Math.floor(m.at_ms / 60_000);
      const atSec = Math.floor((m.at_ms % 60_000) / 1000);
      return `- ${label}${extra} @ ${atMin}:${String(atSec).padStart(2, "0")}`;
    })
    .join("\n");
}

export function buildSummarizeUserPrompt(params: {
  sessionTitle: string | null;
  chunkIndex: number;
  transcript: string;
  previousRecap: string | null;
  liveMarkers: LiveMarker[];
  gmBoardEvents?: GmBoardEventRow[];
  partyRoster?: CampaignPartyRosterEntry[];
}): string {
  const parts = [
    `Session: ${params.sessionTitle?.trim() || "Unbenannte Session"}`,
    `Chunk-Index: ${params.chunkIndex} (~10 Minuten Audio)`,
  ];
  if (params.partyRoster && params.partyRoster.length > 0) {
    parts.push(
      "",
      "Spieler-Party (Charakter vs. Ansprache am Tisch — Aliase im Transkript auf Charakternamen normalisieren):",
      formatPartyRosterForPrompt(params.partyRoster),
    );
  }
  if (params.previousRecap?.trim()) {
    parts.push(
      "",
      "Bisheriger Story-Recap (Kontext — nicht wiederholen, nur anknüpfen):",
      params.previousRecap.trim(),
    );
  }
  parts.push(
    "",
    "Live-Marker des Spielleiters in diesem Segment (Thema des Abschnitts — kein blindes Klassifikations-Etikett):",
    formatLiveMarkersForPrompt(params.liveMarkers),
    "",
    "Hinweis: NSC-Motivation, Wahrnehmung/Insight und D&D-Würfelproben (Fertigkeiten, DC, W20) sind KEINE Quest — Fokus auf Story, NSCs und Lore.",
    CHRONICLE_TABLE_ACTIONS_PROMPT_HINT,
    "",
    "Digital protokollierte GM-Board-Aktionen in diesem Segment:",
    formatGmBoardEventsForPrompt(params.gmBoardEvents ?? []),
    CHRONICLE_GM_BOARD_PROMPT_HINT,
    "",
    "Transkript (Whisper, Deutsch):",
    params.transcript.trim(),
  );
  return parts.join("\n");
}
