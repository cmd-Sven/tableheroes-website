import {
  AUDIO_CHUNK_DURATION_MS,
  AUDIO_FIRST_CHUNK_DURATION_MS,
  AUDIO_NEXT_CHUNK_GRACE_MS,
  AUDIO_NO_SIGNAL_WARN_MS,
  AUDIO_SLICE_STALL_WARN_MS,
  AUDIO_UPLOAD_STALL_WARN_MS,
  type TranscriptionStatus,
} from "./constants";

export type RecorderPhase = "idle" | "starting" | "recording" | "paused" | "error";

export type CaptureHealthStatus =
  | "idle"
  | "starting"
  | "healthy"
  | "waiting-first-upload"
  | "reconnect-needed"
  | "no-signal"
  | "upload-stalled"
  | "tab-background"
  | "capture-stalled";

export type CaptureHealthInput = {
  phase: RecorderPhase;
  localCaptureActive: boolean;
  serverStatus: TranscriptionStatus;
  elapsedMs: number;
  hasSignal: boolean;
  audioSliceCount: number;
  serverUploadedChunkCount: number;
  uploadQueueSize: number;
  error: string | null;
  pageHidden: boolean;
  lastSliceAtMs: number | null;
  lastUploadAtMs: number | null;
  nowMs?: number;
};

function msSince(timestamp: number | null, now: number): number {
  if (timestamp == null) return Infinity;
  return Math.max(0, now - timestamp);
}

function expectedMsUntilNextChunk(uploadedCount: number): number {
  if (uploadedCount <= 0) return AUDIO_FIRST_CHUNK_DURATION_MS;
  if (uploadedCount === 1) return AUDIO_CHUNK_DURATION_MS;
  return AUDIO_CHUNK_DURATION_MS;
}

export function resolveCaptureHealth(input: CaptureHealthInput): CaptureHealthStatus {
  const now = input.nowMs ?? Date.now();
  const serverRecording =
    input.serverStatus === "recording" || input.serverStatus === "paused";
  const locallyRecording =
    input.localCaptureActive &&
    (input.phase === "recording" || input.phase === "paused");

  if (input.phase === "starting") return "starting";
  if (!input.localCaptureActive && serverRecording) return "reconnect-needed";
  if (
    input.phase === "idle" &&
    input.serverStatus !== "recording" &&
    input.serverStatus !== "paused"
  ) {
    return "idle";
  }

  if (input.error && input.uploadQueueSize > 0) return "upload-stalled";

  if (locallyRecording && input.pageHidden && input.phase === "recording") {
    return "tab-background";
  }

  if (
    input.localCaptureActive &&
    input.phase === "recording" &&
    input.elapsedMs >= AUDIO_NO_SIGNAL_WARN_MS &&
    !input.hasSignal &&
    input.audioSliceCount < 3
  ) {
    return "no-signal";
  }

  const sliceStallMs = msSince(input.lastSliceAtMs, now);
  if (
    locallyRecording &&
    input.phase === "recording" &&
    !input.pageHidden &&
    input.elapsedMs >= AUDIO_SLICE_STALL_WARN_MS &&
    sliceStallMs >= AUDIO_SLICE_STALL_WARN_MS
  ) {
    return "capture-stalled";
  }

  if (
    locallyRecording &&
    input.phase === "recording" &&
    input.pageHidden &&
    input.elapsedMs >= AUDIO_SLICE_STALL_WARN_MS &&
    sliceStallMs >= AUDIO_SLICE_STALL_WARN_MS
  ) {
    return "tab-background";
  }

  if (
    input.localCaptureActive &&
    (input.phase === "recording" || input.phase === "paused") &&
    input.elapsedMs >= AUDIO_UPLOAD_STALL_WARN_MS &&
    input.serverUploadedChunkCount === 0 &&
    input.audioSliceCount > 10
  ) {
    return "upload-stalled";
  }

  if (
    locallyRecording &&
    input.phase === "recording" &&
    input.serverUploadedChunkCount > 0 &&
    input.lastUploadAtMs != null
  ) {
    const overdueMs =
      expectedMsUntilNextChunk(input.serverUploadedChunkCount) +
      AUDIO_NEXT_CHUNK_GRACE_MS;
    if (msSince(input.lastUploadAtMs, now) >= overdueMs) {
      return "upload-stalled";
    }
  }

  if (
    locallyRecording &&
    input.phase === "recording" &&
    !input.pageHidden &&
    sliceStallMs < AUDIO_SLICE_STALL_WARN_MS
  ) {
    return input.serverUploadedChunkCount > 0 ? "healthy" : "waiting-first-upload";
  }

  if (
    locallyRecording &&
    input.phase === "recording" &&
    !input.pageHidden &&
    input.serverUploadedChunkCount > 0 &&
    msSince(input.lastUploadAtMs, now) < AUDIO_SLICE_STALL_WARN_MS
  ) {
    return "healthy";
  }

  if (locallyRecording && (input.phase === "recording" || input.phase === "paused")) {
    return input.serverUploadedChunkCount > 0 ? "healthy" : "waiting-first-upload";
  }

  return "idle";
}

export function captureHealthTitle(status: CaptureHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Chronist nimmt auf — Audio wird gespeichert";
    case "waiting-first-upload":
      return "Chronist nimmt auf — erster Upload folgt";
    case "reconnect-needed":
      return "Mikrofon-Verbindung unterbrochen";
    case "no-signal":
      return "Kein Mikrofon-Signal";
    case "upload-stalled":
      return "Audio kommt nicht (mehr) auf dem Server an";
    case "tab-background":
      return "Tab im Hintergrund — Aufnahme gefährdet";
    case "capture-stalled":
      return "Aufnahme stockt — kein Audio mehr erfasst";
    case "starting":
      return "Chronist startet…";
    default:
      return "";
  }
}

export function captureHealthDescription(status: CaptureHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Audio-Chunks werden hochgeladen. Für virtuelle Runden: Live-Session in einem eigenen, sichtbaren Browser-Fenster lassen (z. B. zweiter Monitor).";
    case "waiting-first-upload":
      return "Das Mikro erfasst Audio. Der erste Chunk wird nach ca. 2 Minuten hochgeladen — danach alle 10 Minuten.";
    case "reconnect-needed":
      return "Die Aufnahme läuft serverseitig weiter, aber dieses Tab nimmt kein Audio auf (z. B. nach Reload). Verbinde das Mikrofon erneut.";
    case "no-signal":
      return "Das Mikro ist aktiv, aber es kommt kein Ton an. Prüfe Gerät, Stummschaltung und Lautstärke.";
    case "upload-stalled":
      return "Es wurden zu lange keine neuen Chunks gespeichert. Tab sichtbar lassen, Verbindung prüfen und ggf. Aufnahme kurz pausieren und fortsetzen.";
    case "tab-background":
      return "Dieser Tab ist nicht sichtbar (z. B. Foundry im Vordergrund). Browser drosseln Hintergrund-Tabs — stelle das Live-Session-Fenster auf einen sichtbaren Monitor oder nutze „In neuem Fenster öffnen“.";
    case "capture-stalled":
      return "Es kommen keine Audio-Daten mehr an, obwohl der Tab sichtbar ist. Mikrofon prüfen oder Aufnahme neu starten.";
    default:
      return "";
  }
}
