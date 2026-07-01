"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  requestBeastDefeatLootSuggestion,
  type LootSuggestion,
} from "@/src/lib/actions/ai-loot-actions";

type Props = {
  open: boolean;
  creatureName: string;
  onClose: () => void;
  onAccept: (suggestion: LootSuggestion) => void;
};

const SKILLS = ["Überleben", "Arkane Kunde", "Wahrnehmung", "Naturkunde", "Geschichte"];

export function BeastDefeatLootModal({ open, creatureName, onClose, onAccept }: Props) {
  const [skill, setSkill] = useState("Überleben");
  const [rollTotal, setRollTotal] = useState("15");
  const [dc, setDc] = useState("12");
  const [suggestion, setSuggestion] = useState<LootSuggestion | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await requestBeastDefeatLootSuggestion({
          creatureName,
          creatureType: null,
          challengeRating: null,
          knownLoot: null,
          physicalDescription: null,
          rollSkill: skill,
          rollTotal: Number(rollTotal) || 10,
          dc: Number(dc) || 12,
        });
        setSuggestion(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Loot-Vorschlag fehlgeschlagen.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-lg border border-hero-border bg-background-card shadow-xl">
        <div className="flex items-center justify-between border-b border-hero-dark px-4 py-3">
          <h2 className="font-barlow font-bold uppercase text-sm text-hero-vibrant">
            Loot · {creatureName}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="font-libre text-xs text-gray-400">
            Beste Analyse-Probe der Gruppe bestimmt die Loot-Qualität. Der Vorschlag kann
            übernommen oder verworfen werden.
          </p>
          <label className="block">
            <span className="font-barlow text-[10px] uppercase text-gray-500">Fertigkeit</span>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2 text-sm text-white"
            >
              {SKILLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-barlow text-[10px] uppercase text-gray-500">Wurf</span>
              <input
                type="number"
                value={rollTotal}
                onChange={(e) => setRollTotal(e.target.value)}
                className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="font-barlow text-[10px] uppercase text-gray-500">SG</span>
              <input
                type="number"
                value={dc}
                onChange={(e) => setDc(e.target.value)}
                className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleGenerate}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            KI-Vorschlag
          </button>
          {suggestion ? (
            <div className="rounded border border-hero-border/40 bg-background-dark p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="font-barlow font-bold text-sm text-white">{suggestion.name}</p>
              <p className="font-libre text-xs text-gray-400">
                {suggestion.gp} GP · {suggestion.sp} SP
              </p>
              <ul className="space-y-1">
                {suggestion.items.map((item, i) => (
                  <li key={i} className="font-libre text-xs text-gray-300">
                    <span className="text-accent-gold">{item.name}</span>
                    {item.desc ? ` — ${item.desc}` : ""}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onAccept(suggestion);
                    onClose();
                  }}
                  className="flex-1 rounded border border-emerald-600/50 bg-emerald-950/40 py-2 font-barlow text-xs font-bold uppercase text-emerald-200"
                >
                  Übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="flex-1 rounded border border-hero-border py-2 font-barlow text-xs uppercase text-gray-400"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
