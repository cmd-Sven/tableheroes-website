"use client";

import { useState, useTransition } from "react";
import { Loader2, Map, Play, SkipForward, Square, X } from "lucide-react";
import {
  distributeRations,
  endDowntime,
  nextDowntimeDay,
  startDowntime,
} from "@/src/lib/actions/downtime-actions";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";

type PartyCharacter = {
  id: string;
  name: string;
  rations_count: number;
  starvation_days: number;
};

type Props = {
  sessionId: string;
  partyCharacters: PartyCharacter[];
  downtimeActive: boolean;
  downtimeCurrentDay: number;
  downtimeTotalDays: number;
  fapAllocations: FapAllocationsMap;
  onReload: () => void | Promise<void>;
  /** `modal`: breitere Typo, höhere Listen — für TravelDowntimeGmModal */
  layout?: "sidebar" | "modal";
};

function formatAllocations(allocations: { activity: string; fap: number }[]) {
  if (!allocations.length) return "—";
  return allocations.map((a) => `${a.fap}× ${a.activity}`).join(", ");
}

function maxRationsAdd(pc: PartyCharacter) {
  const cur = Math.min(10, Math.max(0, Math.round(pc.rations_count)));
  return Math.max(0, 10 - cur);
}

export function TravelDowntimeGmPanel({
  sessionId,
  partyCharacters,
  downtimeActive,
  downtimeCurrentDay,
  downtimeTotalDays,
  fapAllocations,
  onReload,
  layout = "sidebar",
}: Props) {
  const isModal = layout === "modal";
  const [daysInput, setDaysInput] = useState("3");
  const [isPending, startTransition] = useTransition();
  const [huntOpen, setHuntOpen] = useState(false);
  const [huntDraft, setHuntDraft] = useState<Record<string, number>>({});
  const [isDistributing, startDistributing] = useTransition();

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        alert(res.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      await onReload();
    });
  };

  function openHuntModal() {
    const next: Record<string, number> = {};
    for (const pc of partyCharacters) {
      next[pc.id] = 0;
    }
    setHuntDraft(next);
    setHuntOpen(true);
  }

  function submitHunt() {
    startDistributing(async () => {
      const res = await distributeRations(sessionId, huntDraft);
      if (!res.ok) {
        alert(res.error ?? "Verteilen fehlgeschlagen.");
        return;
      }
      setHuntOpen(false);
      await onReload();
    });
  }

  const shell =
    isModal
      ? "rounded-xl border border-amber-900/40 bg-background-dark/50 p-4 sm:p-5"
      : "rounded-2xl border border-amber-900/60 bg-background-card/80 p-3";

  return (
    <div className={shell}>
      {!isModal ? (
        <div className="mb-2 flex items-center gap-2">
          <Map className="h-4 w-4 text-accent-gold" />
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
            Reise-Manager (FAP)
          </span>
        </div>
      ) : null}

      {!downtimeActive ? (
        <div className={isModal ? "space-y-3" : "space-y-2"}>
          <label
            className={`block font-barlow font-bold uppercase text-gray-500 ${isModal ? "text-xs" : "text-[9px]"}`}
          >
            Reisetage
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            className={`w-full rounded border border-hero-dark bg-slate-900 text-white outline-none focus:border-accent-gold ${isModal ? "px-3 py-2.5 font-barlow text-base" : "px-2 py-1.5 font-barlow text-sm"}`}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() => startDowntime(sessionId, Number(daysInput) || 1))
            }
            className={`flex w-full items-center justify-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 font-barlow font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50 ${isModal ? "py-3 text-xs sm:text-sm" : "py-2 text-[10px]"}`}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Reise starten
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p
            className={`font-libre text-gray-300 ${isModal ? "text-sm sm:text-base" : "text-[11px]"}`}
          >
            Tag{" "}
            <span className="font-barlow font-extrabold text-accent-gold">
              {downtimeCurrentDay}
            </span>{" "}
            von{" "}
            <span className="font-barlow font-extrabold text-accent-gold">
              {downtimeTotalDays}
            </span>
          </p>

          <ul
            className={`space-y-2 overflow-y-auto font-libre text-gray-200 ${isModal ? "max-h-[min(52vh,28rem)] text-sm sm:text-[15px]" : "max-h-40 text-[11px]"}`}
          >
            {partyCharacters.map((pc) => {
              const st = fapAllocations[pc.id];
              const status = st?.status === "ready" ? "Fertig" : "Plant noch";
              return (
                <li
                  key={pc.id}
                  className={`rounded border border-hero-border/40 bg-background-dark/60 ${isModal ? "px-3 py-2.5" : "px-2 py-1.5"}`}
                >
                  <span className="font-barlow font-bold text-accent-gold">{pc.name}</span>
                  <span className="text-gray-500"> — {status}</span>
                  <span className="ml-1 text-gray-400">🎒 Rationen: {pc.rations_count ?? 0}/10</span>
                  {(pc.starvation_days ?? 0) > 0 ? (
                    <span className="ml-1 inline-block rounded bg-red-950/90 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-red-200">
                      Hungert seit {pc.starvation_days} Tagen!
                    </span>
                  ) : null}
                  {st?.status === "ready" && st.allocations.length > 0 ? (
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {formatAllocations(st.allocations)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {partyCharacters.length > 0 ? (
            <button
              type="button"
              disabled={isPending || isDistributing}
              onClick={openHuntModal}
              className={`w-full rounded border border-amber-700/60 bg-amber-950/40 font-barlow font-extrabold uppercase text-amber-100 hover:bg-amber-900/50 disabled:opacity-50 ${isModal ? "py-3 text-xs sm:text-sm" : "py-2 text-[10px]"}`}
            >
              Jagdbeute verteilen
            </button>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => nextDowntimeDay(sessionId))}
              className={`flex items-center justify-center gap-2 rounded border border-hero-vibrant/60 bg-hero-vibrant/15 font-barlow font-extrabold uppercase text-hero-vibrant hover:bg-hero-vibrant/25 disabled:opacity-50 ${isModal ? "py-3 text-xs sm:text-sm" : "py-2 text-[10px]"}`}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SkipForward className="h-4 w-4" />
              )}
              Nächsten Tag auswerten
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!window.confirm("Reise vorzeitig beenden?")) return;
                void run(() => endDowntime(sessionId));
              }}
              className={`flex items-center justify-center gap-2 rounded border border-red-800/60 bg-red-950/40 font-barlow font-extrabold uppercase text-red-200 hover:bg-red-900/50 disabled:opacity-50 ${isModal ? "py-3 text-xs sm:text-sm" : "py-2 text-[10px]"}`}
            >
              <Square className="h-4 w-4" />
              Reise beenden
            </button>
          </div>
        </div>
      )}

      {huntOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-3 py-6">
          <div
            className="max-h-[min(80vh,480px)] w-full max-w-sm overflow-y-auto rounded-xl border border-accent-gold/40 bg-background-card p-4 shadow-2xl"
            role="dialog"
            aria-label="Jagdbeute verteilen"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-barlow text-sm font-extrabold uppercase tracking-wide text-accent-gold">
                Jagdbeute
              </h3>
              <button
                type="button"
                onClick={() => setHuntOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-background-dark hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-3">
              {partyCharacters.map((pc) => {
                const cap = maxRationsAdd(pc);
                const v = Math.min(cap, Math.max(0, Math.round(huntDraft[pc.id] ?? 0)));
                const preview = Math.min(10, pc.rations_count + v);
                return (
                  <li key={pc.id} className="rounded border border-hero-border/40 bg-background-dark/70 px-2 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-barlow text-xs font-bold text-accent-gold">{pc.name}</span>
                      <span className="font-libre text-[10px] text-gray-500">
                        {pc.rations_count}/10 → {preview}/10
                      </span>
                    </div>
                    <label className="block font-libre text-[10px] text-gray-400">
                      +Rationen (max. {cap})
                      <input
                        type="range"
                        min={0}
                        max={cap}
                        step={1}
                        value={v}
                        disabled={isDistributing || cap === 0}
                        onChange={(e) =>
                          setHuntDraft((prev) => ({
                            ...prev,
                            [pc.id]: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-hero-vibrant"
                      />
                    </label>
                    <p className="mt-0.5 text-center font-barlow text-xs text-gray-300">+{v}</p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDistributing}
                onClick={() => setHuntOpen(false)}
                className="rounded border border-gray-600 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:bg-background-dark"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isDistributing}
                onClick={submitHunt}
                className="rounded border border-accent-gold bg-accent-gold/20 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold hover:bg-accent-gold/30 disabled:opacity-40"
              >
                {isDistributing ? "Speichert…" : "Verteilen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
