/** Feste Jitsi-Raum-URL für Online-Runden. */
export const JITSI_ROOM_URL = "https://meet.osna.social/tableheroes";

export const TRANSCRIPTION_MODES = ["table", "jitsi"] as const;
export type TranscriptionMode = (typeof TRANSCRIPTION_MODES)[number];

export const TRANSCRIPTION_MODE_LABELS: Record<TranscriptionMode, string> = {
  table: "Tisch-Runde",
  jitsi: "Online-Runde (Jitsi)",
};

export const TRANSCRIPTION_STATUS = [
  "idle",
  "recording",
  "paused",
  "stopped",
] as const;
export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUS)[number];

/** Erster Chunk nach 2 Minuten — frühes Feedback, ob Upload funktioniert. */
export const AUDIO_FIRST_CHUNK_DURATION_MS = 120_000;

/** Chunk-Dauer in Millisekunden (10 Minuten). */
export const AUDIO_CHUNK_DURATION_MS = 600_000;

/** Overlap vom vorherigen Chunk (5 Sekunden). */
export const AUDIO_CHUNK_OVERLAP_MS = 5_000;

/** Warnung, wenn nach dem ersten Chunk-Fenster noch nichts auf dem Server liegt. */
export const AUDIO_UPLOAD_STALL_WARN_MS =
  AUDIO_FIRST_CHUNK_DURATION_MS + 90_000;

/** Keine MediaRecorder-Slices mehr — Aufnahme hängt vermutlich (Tab-Hintergrund). */
export const AUDIO_SLICE_STALL_WARN_MS = 90_000;

/** Puffer nach erwarteter Chunk-Zeit, bevor „Upload stockt“ gewarnt wird. */
export const AUDIO_NEXT_CHUNK_GRACE_MS = 120_000;

/** Warnung, wenn das Mikro längere Zeit kein Signal liefert. */
export const AUDIO_NO_SIGNAL_WARN_MS = 15_000;

export const RECORDING_NOTICE_TEXT =
  "Achtung: Das Audio Ihrer Session wird aufgezeichnet.";

export const LIVE_MARKER_TYPES = [
  "npc",
  "location",
  "quest",
  "pause",
  "gm_action",
] as const;
export type LiveMarkerType = (typeof LIVE_MARKER_TYPES)[number];

export const LIVE_MARKER_LABELS: Record<LiveMarkerType, string> = {
  npc: "Wichtiger NSC",
  location: "Ort",
  quest: "Quest",
  pause: "Pause",
  gm_action: "GM-Aktion",
};

/** Kurze GM-Rückmeldung nach Setzen eines Live-Markers. */
export function liveMarkerFeedbackMessage(type: LiveMarkerType): string {
  if (type === "pause") {
    return "Pause markiert — Aufnahme pausiert.";
  }
  if (type === "gm_action") {
    return "GM-Aktion protokolliert.";
  }
  return `Markierung „${LIVE_MARKER_LABELS[type]}“ gesetzt.`;
}

/** Storage-Bucket für Audio-Chunks (Supabase Storage). */
export const SESSION_AUDIO_BUCKET = "session-audio-chunks";
