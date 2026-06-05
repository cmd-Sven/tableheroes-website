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

/** Chunk-Dauer in Millisekunden (10 Minuten). */
export const AUDIO_CHUNK_DURATION_MS = 600_000;

/** Overlap vom vorherigen Chunk (5 Sekunden). */
export const AUDIO_CHUNK_OVERLAP_MS = 5_000;

export const RECORDING_NOTICE_TEXT =
  "Achtung: Das Audio Ihrer Session wird aufgezeichnet.";

export const LIVE_MARKER_TYPES = [
  "npc",
  "location",
  "quest",
  "pause",
] as const;
export type LiveMarkerType = (typeof LIVE_MARKER_TYPES)[number];

export const LIVE_MARKER_LABELS: Record<LiveMarkerType, string> = {
  npc: "Wichtiger NSC",
  location: "Ort",
  quest: "Quest",
  pause: "Pause",
};

/** Storage-Bucket für Audio-Chunks (Supabase Storage). */
export const SESSION_AUDIO_BUCKET = "session-audio-chunks";
