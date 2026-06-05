"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import { useMicMonitor, type MicMonitorApi } from "@/src/hooks/useMicMonitor";
import { MicLevelVisual, MicSignalBadge } from "@/src/components/session/MicLevelVisual";

type Props = {
  variant?: "sidebar" | "inline";
  monitor?: MicMonitorApi;
};

export function ChronicleMicTestPanel({ variant = "sidebar", monitor: externalMic }: Props) {
  const internalMic = useMicMonitor();
  const mic = externalMic ?? internalMic;
  const isSidebar = variant === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "rounded border border-emerald-900/40 bg-[#0a1f10]/90 p-3"
          : "rounded border border-hero-border/40 bg-background-dark/80 p-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-barlow text-[10px] font-bold uppercase text-gray-400">
          Mikrofon-Test
        </p>
        {mic.isActive ? (
          <Mic className="h-4 w-4 text-red-400 animate-pulse" />
        ) : (
          <MicOff className="h-4 w-4 text-gray-600" />
        )}
      </div>

      <p className="mb-3 font-libre text-[10px] text-gray-500 leading-snug">
        Prüfe das angeschlossene Mikro — ohne Aufnahme zu speichern. Sprich kurz
        hinein; bei grünem Signal ist alles bereit.
      </p>

      {mic.error ? (
        <p className="mb-2 font-libre text-xs text-red-400">{mic.error}</p>
      ) : null}

      <MicLevelVisual
        levels={mic.waveformLevels}
        active={mic.isActive}
        compact={isSidebar}
        className="mb-2"
      />

      <MicSignalBadge
        hasSignal={mic.hasSignal}
        isActive={mic.isActive}
        deviceLabel={mic.deviceLabel}
        compact={isSidebar}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {!mic.isActive ? (
          <button
            type="button"
            onClick={() => void mic.start()}
            disabled={mic.phase === "starting"}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
          >
            {mic.phase === "starting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            Test starten
          </button>
        ) : (
          <button
            type="button"
            onClick={mic.stop}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-hero-border/50 bg-background-dark px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-red-500/50 hover:text-red-300"
          >
            <MicOff className="h-3.5 w-3.5" />
            Test beenden
          </button>
        )}
      </div>
    </div>
  );
}
