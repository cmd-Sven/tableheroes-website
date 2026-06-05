"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mic, Save } from "lucide-react";
import { updateSessionTranscriptionMode } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import {
  RECORDING_NOTICE_TEXT,
  TRANSCRIPTION_MODE_LABELS,
  type TranscriptionMode,
} from "@/src/lib/session-chronicle/constants";

type Props = {
  sessionId: string;
  initialMode: TranscriptionMode | null;
  variant?: "compact" | "sidebar" | "full";
  onModeChange?: (mode: TranscriptionMode) => void;
};

function normalizeMode(value: unknown): TranscriptionMode | null {
  if (value === "table" || value === "jitsi") return value;
  return null;
}

export function SessionChronistModeControl({
  sessionId,
  initialMode,
  variant = "compact",
  onModeChange,
}: Props) {
  const [mode, setMode] = useState<TranscriptionMode | null>(initialMode);
  const [savedMode, setSavedMode] = useState<TranscriptionMode | null>(initialMode);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const next = normalizeMode(initialMode);
    setMode(next);
    setSavedMode(next);
  }, [initialMode]);

  function save() {
    if (!mode) {
      alert("Bitte einen Chronist-Modus wählen.");
      return;
    }
    startTransition(async () => {
      try {
        await updateSessionTranscriptionMode(sessionId, mode);
        setSavedMode(mode);
        onModeChange?.(mode);
      } catch (err: unknown) {
        alert(
          err instanceof Error ? err.message : "Chronist-Modus konnte nicht gespeichert werden.",
        );
      }
    });
  }

  const dirty = mode !== savedMode;
  const isSidebar = variant === "sidebar";
  const isFull = variant === "full";

  return (
    <div
      className={
        isSidebar
          ? "rounded border border-amber-900/50 bg-[#132e1b]/80 p-3"
          : isFull
            ? "space-y-4"
            : "rounded border border-hero-border/30 bg-hero-dark/20 p-4"
      }
    >
      <div className={`flex items-center gap-2 ${isSidebar ? "mb-2" : "mb-3"}`}>
        <Mic className={`${isSidebar ? "h-4 w-4" : "h-5 w-5"} text-accent-gold shrink-0`} />
        <div>
          <p
            className={`font-barlow font-bold uppercase text-accent-gold ${
              isSidebar ? "text-[10px]" : isFull ? "text-2xl" : "text-[10px]"
            }`}
          >
            Session-Chronist
          </p>
          {isSidebar ? (
            <p className="font-libre text-[10px] text-gray-500 leading-snug">
              Modus vor dem Start festlegen
            </p>
          ) : null}
        </div>
      </div>

      {!isSidebar ? (
        <p
          className={`font-libre text-gray-400 leading-relaxed ${
            isFull ? "text-sm" : "text-xs mb-3"
          }`}
        >
          {isFull ? (
            <>
              Wähle, wie die Session aufgezeichnet wird.{" "}
              <strong className="text-gray-300">{RECORDING_NOTICE_TEXT}</strong>
            </>
          ) : (
            <>
              Aufzeichnung: {RECORDING_NOTICE_TEXT} Die Aufnahme startest du in der Live-Session.
            </>
          )}
        </p>
      ) : (
        <p className="mb-2 font-libre text-[10px] text-gray-500 leading-snug">
          {RECORDING_NOTICE_TEXT}
        </p>
      )}

      <div
        className={
          isFull
            ? "flex flex-wrap gap-4"
            : isSidebar
              ? "flex flex-col gap-2"
              : "flex flex-wrap gap-3"
        }
      >
        {(["table", "jitsi"] as TranscriptionMode[]).map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-start gap-2 transition-colors ${
              isFull
                ? `rounded border px-4 py-3 ${
                    mode === option
                      ? "border-hero-vibrant bg-hero-vibrant/10"
                      : "border-hero-border/40 bg-background-dark/50 hover:border-hero-border"
                  }`
                : isSidebar
                  ? `rounded border px-2 py-1.5 ${
                      mode === option
                        ? "border-accent-gold/60 bg-accent-gold/10"
                        : "border-hero-border/30 bg-[#0a1f10]/80"
                    }`
                  : `rounded border px-3 py-2 ${
                      mode === option
                        ? "border-hero-vibrant/60 bg-hero-vibrant/10"
                        : "border-hero-border/40 bg-background-dark/60"
                    }`
            }`}
          >
            <input
              type="radio"
              name={`chronist-mode-${sessionId}-${variant}`}
              checked={mode === option}
              onChange={() => setMode(option)}
              className="mt-0.5 border-hero-border text-hero-vibrant"
            />
            <span>
              <span
                className={`block font-barlow font-bold uppercase ${
                  isSidebar ? "text-[10px] text-gray-200" : "text-xs text-gray-100"
                }`}
              >
                {TRANSCRIPTION_MODE_LABELS[option]}
              </span>
              {isFull || variant === "compact" ? (
                <span className="block font-libre text-[10px] text-gray-500 mt-0.5">
                  {option === "table"
                    ? "Mikrofon am Spieltisch"
                    : "Online über Jitsi (Capture Phase 4)"}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      {savedMode && !dirty ? (
        <p
          className={`font-libre text-gray-500 ${
            isSidebar ? "mt-2 text-[10px]" : "mt-3 text-xs"
          }`}
        >
          Gespeichert: {TRANSCRIPTION_MODE_LABELS[savedMode]}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={isPending || !mode}
        className={`inline-flex items-center gap-2 rounded border font-barlow font-bold uppercase disabled:opacity-50 ${
          isSidebar
            ? "mt-2 w-full justify-center border-amber-900/60 bg-[#0a1f10] px-3 py-2 text-[10px] text-gray-200 hover:border-accent-gold"
            : isFull
              ? "border-hero-border bg-hero-dark/50 px-4 py-2 text-xs text-gray-200 hover:border-hero-vibrant"
              : "mt-3 border-hero-vibrant/50 bg-hero-vibrant/15 px-3 py-1.5 text-[10px] text-hero-vibrant hover:bg-hero-vibrant/25"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {dirty ? "Modus speichern" : "Erneut speichern"}
      </button>
    </div>
  );
}
