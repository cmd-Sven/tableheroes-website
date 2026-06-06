"use client";

import { Mic, Pause } from "lucide-react";
import { GmBoardSettingsModal } from "@/src/components/session/GmBoardSettingsModal";
import { RECORDING_NOTICE_TEXT } from "@/src/lib/session-chronicle/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  status: "recording" | "paused";
};

export function ChronicleRecordingNoticeModal({ open, onClose, status }: Props) {
  const isRecording = status === "recording";

  return (
    <GmBoardSettingsModal
      open={open}
      onClose={onClose}
      title={isRecording ? "Aufzeichnung aktiv" : "Aufzeichnung pausiert"}
      size="md"
      zIndexClass="z-[180]"
    >
      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
            isRecording
              ? "border-red-500/40 bg-red-950/40 text-red-100"
              : "border-amber-600/40 bg-amber-950/35 text-amber-100"
          }`}
        >
          {isRecording ? (
            <Mic className="h-4 w-4 shrink-0 animate-pulse" />
          ) : (
            <Pause className="h-4 w-4 shrink-0" />
          )}
          <span className="font-barlow text-xs font-bold uppercase">
            {isRecording ? "Audio wird aufgezeichnet" : "Aufzeichnung pausiert"}
          </span>
        </div>

        <p className="font-libre text-sm leading-relaxed text-gray-300">
          {RECORDING_NOTICE_TEXT}
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border/60 bg-background-dark px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-200 hover:border-accent-gold hover:text-accent-gold"
          >
            Verstanden
          </button>
        </div>
      </div>
    </GmBoardSettingsModal>
  );
}
