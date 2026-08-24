"use client";

import { useState, useTransition } from "react";
import { assignWorldToCampaign } from "@/src/app/dashboard/campaigns/[id]/world-actions";
import { Save, X, Loader2 } from "lucide-react";
import Link from "next/link";

type World = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  campaignId: string;
  worlds: World[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function WorldSetupForm({ campaignId, worlds, onSuccess, onCancel }: Props) {
  const [selectedWorldId, setSelectedWorldId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedWorldId.trim()) {
      setError("Bitte wähle eine Welt aus.");
      return;
    }

    startTransition(async () => {
      try {
        await assignWorldToCampaign(campaignId, selectedWorldId.trim());
        onSuccess();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Zuweisung fehlgeschlagen.";
        setError(errorMessage);
      }
    });
  };

  return (
    <div
      className="rounded-lg p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      style={{
        border: "3px solid #B8860B",
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="relative z-10">
        <h2 className="font-cinzel font-bold text-3xl text-accent-gold mb-6">
          Welt dieser Kampagne zuweisen
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-200">
            {error}
          </div>
        )}

        {worlds.length === 0 ? (
          <div className="space-y-4">
            <p className="font-libre text-gray-300">
              Du hast noch keine Welten angelegt. Erstelle zuerst eine Welt unter &quot;Welten & Lore&quot;.
            </p>
            <Link
              href="/dashboard/worlds"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-vibrant text-black font-barlow font-bold uppercase hover:bg-yellow-400 transition-colors"
            >
              Welten & Lore öffnen
            </Link>
            <button
              type="button"
              onClick={onCancel}
              className="ml-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-hero-border bg-slate-900/50 text-gray-300 font-barlow font-bold uppercase hover:bg-slate-800/50 transition-colors"
            >
              <X className="h-5 w-5" />
              Abbrechen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
                Existierende Welt auswählen *
              </label>
              <select
                value={selectedWorldId}
                onChange={(e) => setSelectedWorldId(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
                required
                disabled={isPending}
              >
                <option value="">-- Welt wählen --</option>
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 font-libre text-sm text-gray-400">
                NPCs, Lore und Orte dieser Welt gelten für alle Kampagnen, die dieser Welt zugeordnet sind.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-vibrant text-black font-barlow font-bold uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Wird zugewiesen...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Welt zuweisen
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-hero-border bg-slate-900/50 text-gray-300 font-barlow font-bold uppercase hover:bg-slate-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
