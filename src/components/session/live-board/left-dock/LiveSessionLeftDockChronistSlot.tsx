/**
 * LiveSessionLeftDockChronistSlot — Chronist mode controls, recorder, mic test, and inbox feed.
 */
"use client";

import type { MutableRefObject } from "react";
import { Mic } from "lucide-react";
import { ChronicleRecorderPanel } from "@/src/components/session/ChronicleRecorderPanel";
import { ChronicleInboxFeed } from "@/src/components/chronicle/ChronicleInboxFeed";
import { SessionChronistModeControl } from "@/src/components/session/SessionChronistModeControl";
import { ChronicleMicTestPanel } from "@/src/components/session/ChronicleMicTestPanel";
import type { UseSessionChronicleRecorderReturn } from "@/src/hooks/useSessionChronicleRecorder";
import type { MicMonitorApi } from "@/src/hooks/useMicMonitor";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";

type Props = {
  isPrepMode: boolean;
  sessionStatus: string;
  chronistTableMode: boolean;
  sessionId: string;
  campaignId: string;
  worldId: string | null | undefined;
  activeTranscriptionMode: TranscriptionMode | null;
  setActiveTranscriptionMode: (mode: TranscriptionMode) => void;
  prepMicTest: MicMonitorApi;
  chronicleRecorder: UseSessionChronicleRecorderReturn;
  chronistPanelOpen: boolean;
  setChronistPanelOpen: (open: boolean) => void;
  chronistStartFlowRef: MutableRefObject<(() => void) | null>;
  chronistStopFlowRef: MutableRefObject<(() => void) | null>;
  chronistSettingsFlowRef: MutableRefObject<(() => void) | null>;
  npcNames: { id: string; name: string }[];
};

export function LiveSessionLeftDockChronistSlot({
  isPrepMode,
  sessionStatus,
  chronistTableMode,
  sessionId,
  campaignId,
  worldId,
  activeTranscriptionMode,
  setActiveTranscriptionMode,
  prepMicTest,
  chronicleRecorder,
  chronistPanelOpen,
  setChronistPanelOpen,
  chronistStartFlowRef,
  chronistStopFlowRef,
  chronistSettingsFlowRef,
  npcNames,
}: Props) {
  return (
    <div className="space-y-3">
      {isPrepMode ? (
        <>
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-2 rounded border border-red-500/40 bg-red-950/30 px-3 py-2.5 font-barlow text-xs font-bold uppercase text-red-200/80 disabled:cursor-not-allowed"
          >
            <Mic className="h-4 w-4" />
            Aufnahme starten
          </button>
          <p className="font-libre text-[11px] leading-relaxed text-gray-500">
            Die Aufnahme startest du, sobald die Session live läuft. Hier kannst du
            Modus und Mikrofon schon testen.
          </p>
          <SessionChronistModeControl
            sessionId={sessionId}
            initialMode={activeTranscriptionMode}
            variant="sidebar"
            onModeChange={setActiveTranscriptionMode}
          />
          {chronistTableMode ? (
            <ChronicleMicTestPanel variant="sidebar" monitor={prepMicTest} />
          ) : null}
        </>
      ) : null}
      {sessionStatus === "Live" && !chronistTableMode ? (
        <div className="space-y-2 rounded border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="font-libre text-xs text-amber-100/90">
            Chronist-Aufnahme ist nur im <strong>Tisch-Modus</strong> verfügbar
            (Jitsi folgt später). Bitte Modus wechseln:
          </p>
          <SessionChronistModeControl
            sessionId={sessionId}
            initialMode={activeTranscriptionMode}
            variant="sidebar"
            onModeChange={setActiveTranscriptionMode}
          />
        </div>
      ) : null}
      {sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleRecorderPanel
          sessionId={sessionId}
          plannedMode={activeTranscriptionMode}
          recorder={chronicleRecorder}
          panelOpen={chronistPanelOpen}
          onPanelOpenChange={setChronistPanelOpen}
          layout="inline"
          registerStartFlow={(fn) => {
            chronistStartFlowRef.current = fn;
          }}
          registerStopFlow={(fn) => {
            chronistStopFlowRef.current = fn;
          }}
          registerSettingsFlow={(fn) => {
            chronistSettingsFlowRef.current = fn;
          }}
        />
      ) : null}
      {sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleInboxFeed
          campaignId={campaignId}
          sessionId={sessionId}
          worldId={worldId ?? null}
          variant="compact"
          npcNames={npcNames}
        />
      ) : null}
    </div>
  );
}
