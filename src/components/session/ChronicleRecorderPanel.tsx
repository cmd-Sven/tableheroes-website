"use client";

import { useEffect, useState } from "react";
import {
  LIVE_MARKER_LABELS,
  LIVE_MARKER_TYPES,
  RECORDING_NOTICE_TEXT,
  TRANSCRIPTION_MODE_LABELS,
  type LiveMarkerType,
  type TranscriptionMode,
} from "@/src/lib/session-chronicle/constants";
import {
  useSessionChronicleRecorder,
  type UseSessionChronicleRecorderReturn,
} from "@/src/hooks/useSessionChronicleRecorder";
import { GmSlideSettingsPanel } from "@/src/components/session/GmSlideSettingsPanel";
import { MicLevelVisual, MicSignalBadge } from "@/src/components/session/MicLevelVisual";
import { ChronicleChunkProcessingList } from "@/src/components/session/ChronicleChunkProcessingList";
import { Loader2, Mic, MicOff, Pause, Play, Radio } from "lucide-react";

export type { UseSessionChronicleRecorderReturn };

type Props = {
  sessionId: string;
  plannedMode: TranscriptionMode | null;
  /** Optional: Recorder vom Parent (Top-Bar + Sidebar teilen sich den State). */
  recorder?: UseSessionChronicleRecorderReturn;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ChronicleRecorderPanel({ sessionId, plannedMode, recorder: externalRecorder }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeAck, setNoticeAck] = useState(false);
  const [pendingMode, setPendingMode] = useState<TranscriptionMode>(
    plannedMode ?? "table",
  );

  const internalRecorder = useSessionChronicleRecorder({
    sessionId,
    enabled: externalRecorder == null,
    plannedMode,
  });
  const recorder = externalRecorder ?? internalRecorder;

  const [chunkRows, setChunkRows] = useState<
    Array<{
      chunk_index: number;
      whisper_status: string;
      summarize_status: string;
      error_message?: string | null;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
          { credentials: "same-origin" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          chunks?: Array<{
            chunk_index: number;
            whisper_status: string;
            summarize_status: string;
            error_message?: string | null;
          }>;
        };
        if (!cancelled && res.ok && Array.isArray(data.chunks)) {
          setChunkRows(data.chunks);
        }
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, recorder.uploadQueueSize, recorder.currentChunkIndex]);

  const isActive = recorder.phase === "recording" || recorder.phase === "paused";
  const micLive = isActive;
  const statusLabel =
    recorder.phase === "recording"
      ? "Aufnahme läuft"
      : recorder.phase === "paused"
        ? "Pausiert"
        : recorder.phase === "starting"
          ? "Startet…"
          : "Bereit";

  async function confirmStart() {
    if (!noticeAck) return;
    setNoticeOpen(false);
    await recorder.startRecording(pendingMode, true);
  }

  function openStartFlow() {
    setPendingMode(plannedMode ?? "table");
    setNoticeAck(false);
    setNoticeOpen(true);
  }

  const markerButtons = LIVE_MARKER_TYPES.filter((t) => t !== "pause");

  return (
    <>
      <GmSlideSettingsPanel
        isGM
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
        settingsLabel="Chronist steuern"
        preview={
          <div className="flex w-full flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Mic className="h-5 w-5 text-red-400 animate-pulse" />
              ) : (
                <MicOff className="h-5 w-5 text-gray-500" />
              )}
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                {statusLabel}
              </span>
            </div>
            <MicLevelVisual
              levels={recorder.waveformLevels}
              active={micLive}
              className="w-full px-2"
            />
            <MicSignalBadge
              hasSignal={recorder.hasSignal}
              isActive={micLive}
              deviceLabel={recorder.deviceLabel}
              compact
            />
            {isActive ? (
              <span className="font-barlow text-xs text-accent-gold">
                {formatElapsed(recorder.elapsedMs)}
              </span>
            ) : null}
          </div>
        }
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Radio className="h-4 w-4 text-accent-gold" />
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Session-Chronist
            </span>
          </div>

          <p className="font-libre text-xs text-gray-400 leading-relaxed">
            Modus:{" "}
            <strong className="text-gray-200">
              {TRANSCRIPTION_MODE_LABELS[plannedMode ?? "table"]}
            </strong>
            {plannedMode === "jitsi" ? (
              <span className="block mt-1 text-gray-500">
                Jitsi-Aufnahme folgt in Phase 4. Bitte vorerst Tisch-Modus wählen.
              </span>
            ) : null}
          </p>

          {recorder.error ? (
            <p className="font-libre text-xs text-red-400">{recorder.error}</p>
          ) : null}

          {isActive ? (
            <div className="rounded border border-emerald-900/40 bg-[#0a1f10]/80 p-2">
              <MicLevelVisual levels={recorder.waveformLevels} active={micLive} />
              <div className="mt-2">
                <MicSignalBadge
                  hasSignal={recorder.hasSignal}
                  isActive={micLive}
                  deviceLabel={recorder.deviceLabel}
                />
              </div>
            </div>
          ) : null}

          {recorder.uploadQueueSize > 0 ? (
            <p className="font-libre text-[10px] text-gray-500">
              Upload-Warteschlange: {recorder.uploadQueueSize} Chunk(s)
            </p>
          ) : null}

          <ChronicleChunkProcessingList chunks={chunkRows} />

          <div className="flex flex-wrap gap-2">
            {!isActive ? (
              <button
                type="button"
                onClick={openStartFlow}
                disabled={
                  recorder.phase === "starting" || plannedMode === "jitsi"
                }
                className="inline-flex items-center gap-1.5 rounded border border-red-500/60 bg-red-950/40 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-red-300 hover:bg-red-900/40 disabled:opacity-50"
              >
                {recorder.phase === "starting" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                Aufnahme starten
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void recorder.togglePause()}
                  className="inline-flex items-center gap-1.5 rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-200 hover:border-accent-gold"
                >
                  {recorder.phase === "paused" ? (
                    <>
                      <Play className="h-3.5 w-3.5" /> Fortsetzen
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void recorder.addMarker("pause")}
                  className="inline-flex items-center gap-1.5 rounded border border-hero-border/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:text-white"
                >
                  <Pause className="h-3.5 w-3.5" />
                  {LIVE_MARKER_LABELS.pause}
                </button>
              </>
            )}
          </div>

          {isActive ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {markerButtons.map((type) => (
                <MarkerButton
                  key={type}
                  type={type}
                  label={LIVE_MARKER_LABELS[type]}
                  onClick={() => void recorder.addMarker(type)}
                />
              ))}
            </div>
          ) : null}

          {isActive ? (
            <p className="font-barlow text-[9px] uppercase text-gray-600">
              Chunk #{recorder.currentChunkIndex + 1} · 10-Min-Segmente
            </p>
          ) : null}
        </div>
      </GmSlideSettingsPanel>

      {noticeOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-red-500/40 bg-background-card p-6 shadow-2xl">
            <h3 className="font-barlow text-lg font-bold uppercase text-red-300">
              Aufzeichnungshinweis
            </h3>
            <p className="mt-3 font-libre text-sm text-gray-300 leading-relaxed">
              {RECORDING_NOTICE_TEXT}
            </p>

            {plannedMode == null ? (
              <fieldset className="mt-4 space-y-2">
                <legend className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                  Chronist-Modus
                </legend>
                {(["table", "jitsi"] as TranscriptionMode[]).map((mode) => (
                  <label
                    key={mode}
                    className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-300"
                  >
                    <input
                      type="radio"
                      name="chronist-mode"
                      checked={pendingMode === mode}
                      onChange={() => setPendingMode(mode)}
                      className="border-hero-border text-hero-vibrant"
                    />
                    {TRANSCRIPTION_MODE_LABELS[mode]}
                  </label>
                ))}
              </fieldset>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={noticeAck}
                onChange={(e) => setNoticeAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-hero-border text-red-500"
              />
              <span className="font-libre text-sm text-gray-300">
                Ich habe alle Anwesenden informiert und starte die Aufzeichnung.
              </span>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!noticeAck || pendingMode === "jitsi"}
                onClick={() => void confirmStart()}
                className="rounded border border-red-500 bg-red-600/80 px-4 py-2 font-barlow text-xs font-bold uppercase text-white disabled:opacity-50"
              >
                Aufnahme starten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MarkerButton({
  type,
  label,
  onClick,
}: {
  type: LiveMarkerType;
  label: string;
  onClick: () => void;
}) {
  const color =
    type === "npc"
      ? "border-hero-vibrant/50 text-hero-vibrant"
      : type === "location"
        ? "border-accent-gold/50 text-accent-gold"
        : "border-purple-400/50 text-purple-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border bg-background-dark/80 px-2 py-2 font-barlow text-[9px] font-bold uppercase hover:bg-background-dark ${color}`}
    >
      {label}
    </button>
  );
}
