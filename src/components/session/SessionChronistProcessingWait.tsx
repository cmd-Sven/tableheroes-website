"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import { ChronicleChunkProcessingList } from "@/src/components/session/ChronicleChunkProcessingList";
import {
  summarizeChronistChunkProcessing,
  type ChronistProcessingSummary,
} from "@/src/lib/session-chronicle/chronist-processing-status";

type StatusChunk = {
  chunk_index: number;
  whisper_status: string;
  summarize_status: string;
  error_message?: string | null;
};

type StatusResponse = {
  chunks?: StatusChunk[];
  chronicleState?: {
    story_recap?: string | null;
  } | null;
};

type Phase = "waiting-upload" | "processing" | "complete" | "empty" | "error";

const POLL_MS = 4000;
const UPLOAD_WAIT_MS = 90_000;

type Props = {
  sessionId: string;
  onStatusChange?: (summary: ChronistProcessingSummary, phase: Phase) => void;
};

export function SessionChronistProcessingWait({
  sessionId,
  onStatusChange,
}: Props) {
  const [phase, setPhase] = useState<Phase>("waiting-upload");
  const [summary, setSummary] = useState<ChronistProcessingSummary | null>(null);
  const [chunks, setChunks] = useState<StatusChunk[]>([]);
  const [storyRecap, setStoryRecap] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());

  const applyStatus = useCallback(
    (data: StatusResponse) => {
      const nextChunks = Array.isArray(data.chunks) ? data.chunks : [];
      const nextSummary = summarizeChronistChunkProcessing(nextChunks, {
        onlyWithStorage: false,
      });
      const recap =
        typeof data.chronicleState?.story_recap === "string"
          ? data.chronicleState.story_recap.trim()
          : "";

      setChunks(nextChunks);
      setSummary(nextSummary);
      if (recap) setStoryRecap(recap);

      let nextPhase: Phase = "waiting-upload";

      if (nextSummary.chunkCount === 0) {
        nextPhase =
          Date.now() - startedAtRef.current >= UPLOAD_WAIT_MS
            ? "empty"
            : "waiting-upload";
      } else if (nextSummary.isComplete) {
        nextPhase = "complete";
      } else {
        nextPhase = "processing";
      }

      setPhase(nextPhase);
      onStatusChange?.(nextSummary, nextPhase);
    },
    [onStatusChange],
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Status konnte nicht geladen werden.");
      }
      const data = (await res.json()) as StatusResponse;
      setErrorMessage(null);
      applyStatus(data);
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Chronist-Status konnte nicht geladen werden.",
      );
      setPhase("error");
    }
  }, [applyStatus, sessionId]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setPhase("waiting-upload");
    setSummary(null);
    setChunks([]);
    setStoryRecap(null);
    setErrorMessage(null);
    void fetchStatus();
  }, [fetchStatus, sessionId]);

  useEffect(() => {
    if (phase === "complete" || phase === "empty" || phase === "error") return;

    const id = window.setInterval(() => {
      void fetchStatus();
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, [fetchStatus, phase]);

  const progressPct =
    summary && summary.chunkCount > 0
      ? Math.round((summary.processedChunks / summary.chunkCount) * 100)
      : 0;

  return (
    <section className="space-y-4 rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-4">
      <div className="flex items-start gap-3">
        {phase === "complete" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : phase === "error" || phase === "empty" ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        ) : (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-emerald-300" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-emerald-300" />
            <h3 className="font-barlow text-xs font-bold uppercase text-emerald-100">
              {phase === "complete"
                ? "Chronist fertig"
                : phase === "empty"
                  ? "Keine Audio-Chunks"
                  : phase === "error"
                    ? "Status nicht verfügbar"
                    : "Chronist arbeitet die Aufnahme auf"}
            </h3>
          </div>

          {phase === "waiting-upload" ? (
            <p className="mt-2 font-libre text-sm text-gray-300 leading-relaxed">
              Die Session ist archiviert. Der letzte Audio-Chunk wird noch hochgeladen —
              gleich startet die KI-Verarbeitung.
            </p>
          ) : null}

          {phase === "processing" && summary ? (
            <>
              <p className="mt-2 font-libre text-sm text-gray-300 leading-relaxed">
                <strong className="text-white">
                  {summary.processedChunks} von {summary.chunkCount}
                </strong>{" "}
                Chunks vollständig verarbeitet
                {summary.pendingWhisper > 0
                  ? ` · ${summary.pendingWhisper} in Transkription`
                  : ""}
                {summary.pendingSummarize > 0
                  ? ` · ${summary.pendingSummarize} in Zusammenfassung`
                  : ""}
                .
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1 font-barlow text-[10px] font-bold uppercase text-gray-500">
                {progressPct}% abgeschlossen
              </p>
            </>
          ) : null}

          {phase === "complete" && summary ? (
            <>
              <p className="mt-2 font-libre text-sm text-emerald-100 leading-relaxed">
                Alle {summary.chunkCount} Audio-Chunks wurden durchgearbeitet
                {summary.failedChunks > 0
                  ? ` (${summary.failedChunks} mit Fehlern — im Chronist prüfen).`
                  : ". Du kannst das Ergebnis jetzt direkt öffnen."}
              </p>
              {storyRecap ? (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-black/25 p-3">
                  <p className="mb-1 flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    Story-Recap (Vorschau)
                  </p>
                  <p className="font-libre text-xs text-gray-300 leading-relaxed line-clamp-4">
                    {storyRecap}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {phase === "empty" ? (
            <p className="mt-2 font-libre text-sm text-amber-100/90 leading-relaxed">
              Es sind keine Audio-Chunks für diese Session angekommen. Falls du eine Aufnahme
              gestartet hattest, prüfe Mikrofon und Verbindung — oder öffne den Chronist später
              erneut.
            </p>
          ) : null}

          {phase === "error" && errorMessage ? (
            <p className="mt-2 font-libre text-sm text-amber-100/90 leading-relaxed">
              {errorMessage} Der Chronist arbeitet im Hintergrund weiter — du findest den Stand
              im Kampagnen-Dashboard.
            </p>
          ) : null}
        </div>
      </div>

      {chunks.length > 0 ? <ChronicleChunkProcessingList chunks={chunks} /> : null}
    </section>
  );
}
