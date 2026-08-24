/**
 * ActivityComposer — Hand-raise controls and chat/dice command input for the activity panel.
 */
"use client";

import { AlertTriangle, Hand, Send } from "lucide-react";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";

type Props = {
  pending: boolean;
  myHandRaise: SessionHandRaise | null;
  canRaiseHand: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRaiseHand: (urgent: boolean) => void;
  onLowerHand: () => void;
  canSubmit: boolean;
};

export function ActivityComposer({
  pending,
  myHandRaise,
  canRaiseHand,
  input,
  onInputChange,
  onSubmit,
  onRaiseHand,
  onLowerHand,
  canSubmit,
}: Props) {
  return (
    <div className="shrink-0 border-t border-amber-900/50 p-3 space-y-2">
      <div className="flex gap-1">
        {myHandRaise ? (
          <button
            type="button"
            disabled={pending}
            onClick={onLowerHand}
            className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 font-barlow text-[10px] font-bold uppercase disabled:opacity-40 ${
              myHandRaise.urgent
                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                : "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
            }`}
          >
            <Hand className="h-3.5 w-3.5" />
            Zurücknehmen
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={pending || !canRaiseHand}
              onClick={() => onRaiseHand(false)}
              title="Hand heben"
              className="flex flex-1 items-center justify-center gap-1 rounded border border-hero-border/60 bg-hero-dark/50 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant disabled:opacity-40"
            >
              <Hand className="h-3.5 w-3.5" />
              Melden
            </button>
            <button
              type="button"
              disabled={pending || !canRaiseHand}
              onClick={() => onRaiseHand(true)}
              title="Dringend melden"
              className="flex flex-1 items-center justify-center gap-1 rounded border border-accent-blood/60 bg-accent-blood/15 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-blood/25 disabled:opacity-40"
            >
              <Hand className="h-3.5 w-3.5" />
              <AlertTriangle className="h-3 w-3" />
              Dringend
            </button>
          </>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-1">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Nachricht oder 2d6+3"
          className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-hero-vibrant px-2 text-black disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
