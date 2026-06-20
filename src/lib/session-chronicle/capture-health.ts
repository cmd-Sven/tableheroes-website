import {
  AUDIO_NO_SIGNAL_WARN_MS,
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
  | "upload-stalled";

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
};

export function resolveCaptureHealth(input: CaptureHealthInput): CaptureHealthStatus {
  const serverRecording =
    input.serverStatus === "recording" || input.serverStatus === "paused";

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
  if (
    input.localCaptureActive &&
    input.phase === "recording" &&
    input.elapsedMs >= AUDIO_NO_SIGNAL_WARN_MS &&
    !input.hasSignal &&
    input.audioSliceCount < 3
  ) {
    return "no-signal";
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
    input.localCaptureActive &&
    input.serverUploadedChunkCount > 0 &&
    input.phase !== "error"
  ) {
    return "healthy";
  }
  if (input.localCaptureActive && (input.phase === "recording" || input.phase === "paused")) {
    return "waiting-first-upload";
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
      return "Audio kommt nicht auf dem Server an";
    case "starting":
      return "Chronist startet…";
    default:
      return "";
  }
}

export function captureHealthDescription(status: CaptureHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Audio-Chunks werden hochgeladen. Lass diesen Browser-Tab während der Runde geöffnet.";
    case "waiting-first-upload":
      return "Das Mikro erfasst Audio. Der erste Chunk wird nach ca. 2 Minuten hochgeladen — danach alle 10 Minuten.";
    case "reconnect-needed":
      return "Die Aufnahme läuft serverseitig weiter, aber dieses Tab nimmt kein Audio auf (z. B. nach Reload). Verbinde das Mikrofon erneut.";
    case "no-signal":
      return "Das Mikro ist aktiv, aber es kommt kein Ton an. Prüfe Gerät, Stummschaltung und Lautstärke.";
    case "upload-stalled":
      return "Audio wird lokal erfasst, aber es wurde noch kein Chunk gespeichert. Tab geöffnet lassen und Verbindung prüfen.";
    default:
      return "";
  }
}
