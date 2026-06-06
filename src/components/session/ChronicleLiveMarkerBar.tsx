"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Mic, Square } from "lucide-react";
import {
  LIVE_MARKER_LABELS,
  LIVE_MARKER_TYPES,
  type LiveMarkerType,
} from "@/src/lib/session-chronicle/constants";
import { setLiveMarkerWithFeedback } from "@/src/components/session/live-marker-feedback";
import type { UseSessionChronicleRecorderReturn } from "@/src/hooks/useSessionChronicleRecorder";

type Props = {
  recorder: Pick<
    UseSessionChronicleRecorderReturn,
    "phase" | "addMarker" | "stopRecording" | "togglePause"
  >;
};

export function ChronicleLiveMarkerBar({ recorder }: Props) {
  const isActive = recorder.phase === "recording" || recorder.phase === "paused";
  const [confirmedMarker, setConfirmedMarker] = useState<LiveMarkerType | null>(null);

  useEffect(() => {
    if (!confirmedMarker) return;
    const id = window.setTimeout(() => setConfirmedMarker(null), 2000);
    return () => window.clearTimeout(id);
  }, [confirmedMarker]);

  const handleMarker = useCallback(
    async (type: LiveMarkerType) => {
      const ok = await setLiveMarkerWithFeedback(recorder.addMarker, type);
      if (ok) setConfirmedMarker(type);
    },
    [recorder],
  );

  if (!isActive) return null;

  const markerTypes = LIVE_MARKER_TYPES.filter((t) => t !== "pause");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6">
      <div className="pointer-events-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-xl border border-red-500/45 bg-background-card/95 px-3 py-2 shadow-xl backdrop-blur-sm">
        <span className="flex items-center gap-1.5 font-barlow text-[9px] font-bold uppercase text-red-300">
          <Mic className="h-3.5 w-3.5 animate-pulse" />
          Chronist live
        </span>
        {markerTypes.map((type) => {
          const confirmed = confirmedMarker === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => void handleMarker(type)}
              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 font-barlow text-[9px] font-bold uppercase transition-all duration-200 ${
                confirmed
                  ? "border-emerald-400 bg-emerald-950/70 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.35)]"
                  : type === "npc"
                    ? "border-hero-vibrant/50 text-hero-vibrant hover:bg-hero-vibrant/10"
                    : type === "location"
                      ? "border-accent-gold/50 text-accent-gold hover:bg-accent-gold/10"
                      : "border-purple-400/50 text-purple-300 hover:bg-purple-400/10"
              }`}
            >
              {confirmed ? <Check className="h-3 w-3" /> : null}
              {LIVE_MARKER_LABELS[type]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void recorder.togglePause()}
          className="rounded border border-amber-700/50 px-2.5 py-1.5 font-barlow text-[9px] font-bold uppercase text-amber-200 hover:bg-amber-950/40"
        >
          {recorder.phase === "paused" ? "Fortsetzen" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "Aufnahme wirklich beenden? Der aktuelle Audio-Chunk wird noch hochgeladen.",
              )
            ) {
              return;
            }
            void recorder.stopRecording();
          }}
          className="inline-flex items-center gap-1 rounded border border-red-600 bg-red-900/60 px-2.5 py-1.5 font-barlow text-[9px] font-bold uppercase text-red-100 hover:bg-red-800/70"
        >
          <Square className="h-3 w-3 fill-current" />
          Beenden
        </button>
      </div>
    </div>
  );
}
