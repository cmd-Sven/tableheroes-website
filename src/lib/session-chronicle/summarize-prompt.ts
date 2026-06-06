import type { LiveMarker } from "./types";
import { LIVE_MARKER_LABELS } from "./constants";

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
}): string {
  const parts = [
    `Session: ${params.sessionTitle?.trim() || "Unbenannte Session"}`,
    `Chunk-Index: ${params.chunkIndex} (~10 Minuten Audio)`,
  ];
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
    "Hinweis: Text über NSC-Motivation, Wahrnehmung/Insight oder Persönlichkeit ist KEINE Quest — ordne solche Inhalte spontaneous_npcs zu.",
    "",
    "Transkript (Whisper, Deutsch):",
    params.transcript.trim(),
  );
  return parts.join("\n");
}
