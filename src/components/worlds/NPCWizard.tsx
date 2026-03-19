"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import {
  generateNPC,
  regenerateNPCSection,
  type GeneratedNPCResult,
  type RerollSection,
} from "@/src/app/dashboard/worlds/world-npc-actions";

export type GeneratedNPCData = GeneratedNPCResult;

type Props = {
  worldId: string;
  campaignId?: string | null;
  defaultName?: string;
  defaultRole?: string;
  onApply: (data: GeneratedNPCData) => void;
  onError?: (message: string) => void;
};

export function NPCWizard({
  worldId,
  campaignId,
  defaultName = "",
  defaultRole = "",
  onApply,
  onError,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState(defaultRole);
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastGenerated, setLastGenerated] = useState<GeneratedNPCData | null>(null);
  const [suggestedSecretTitle, setSuggestedSecretTitle] = useState("");
  const [suggestedSecretContent, setSuggestedSecretContent] = useState("");
  const [rerollSection, setRerollSection] = useState<RerollSection | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const userPrompt = [name.trim(), role.trim(), prompt.trim()]
          .filter(Boolean)
          .join(". ") || undefined;
        const data = await generateNPC(worldId, { prompt: userPrompt, includeSecret: true });
        setLastGenerated(data);
        setSuggestedSecretTitle(data.suggested_secret?.title ?? "");
        setSuggestedSecretContent(data.suggested_secret?.content ?? "");
        onApply(data);
      } catch (e: any) {
        const msg = e?.message || "Fehler bei der KI-Generierung.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const handleReroll = (section: RerollSection) => {
    if (!lastGenerated) return;
    setRerollSection(section);
    startTransition(async () => {
      try {
        const result = await regenerateNPCSection(worldId, section, {
          name: lastGenerated.name,
          role: lastGenerated.role ?? undefined,
          description: lastGenerated.description,
          appearance: lastGenerated.appearance ?? undefined,
          personality_traits: lastGenerated.personality_traits ?? undefined,
        });
        const updated: GeneratedNPCData = {
          ...lastGenerated,
          [section]: result[section] ?? (section === "description" ? lastGenerated.description : section === "appearance" ? lastGenerated.appearance : lastGenerated.personality_traits),
        };
        setLastGenerated(updated);
        onApply(updated);
      } catch (e: any) {
        const msg = e?.message || "Fehler beim Neugenerieren.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      } finally {
        setRerollSection(null);
      }
    });
  };

  const applyWithEditedSecret = () => {
    if (!lastGenerated) return;
    const withSecret: GeneratedNPCData = {
      ...lastGenerated,
      suggested_secret:
        suggestedSecretContent.trim()
          ? { title: suggestedSecretTitle.trim() || "Geheimnis", content: suggestedSecretContent.trim() }
          : null,
    };
    onApply(withSecret);
  };

  const hasReroll = !!lastGenerated;
  const isRerolling = rerollSection !== null;

  return (
    <div className="rounded-lg border border-hero-border bg-background-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-accent-gold" />
        <h3 className="font-barlow font-bold text-sm uppercase text-hero-vibrant">
          KI-Vorschlag
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-400">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Garrick"
            className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-400">
            Rolle (optional)
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="z.B. Schmied, Händler"
            className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-400">
          Zusätzlicher Hinweis für die KI (optional)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="z.B. Soll ein zwielichtiger Händler am Hafen sein."
          className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none resize-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending && !isRerolling}
          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
        >
          {isPending && !isRerolling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generiere…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              KI-Vorschlag generieren
            </>
          )}
        </button>
        {campaignId && !hasReroll && (
          <span className="font-libre text-xs text-gray-500">
            Bei Kampagnen-Kontext wird ein vorgeschlagenes Geheimnis beim Erstellen mit angelegt (falls ausgefüllt).
          </span>
        )}
      </div>

      {/* Reroll: einzelne Sektionen neu generieren */}
      {hasReroll && (
        <div className="mt-4 pt-4 border-t border-hero-border">
          <p className="font-barlow font-bold text-xs uppercase text-gray-400 mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-accent-gold" />
            Nur eine Sektion neu generieren
          </p>
          <div className="flex flex-wrap gap-2">
            {(["appearance", "personality_traits", "description"] as const).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => handleReroll(section)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded border border-hero-border bg-slate-900/50 px-2.5 py-1.5 font-barlow font-bold text-xs uppercase text-gray-300 hover:text-accent-gold hover:border-accent-gold/50 disabled:opacity-50"
              >
                {rerollSection === section ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {section === "appearance" ? "Aussehen" : section === "personality_traits" ? "Persönlichkeit" : "Beschreibung"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vorgeschlagenes Geheimnis (bearbeitbar) */}
      {(lastGenerated?.suggested_secret || suggestedSecretContent || suggestedSecretTitle) && (
        <div className="mt-4 pt-4 border-t border-hero-border">
          <h4 className="font-barlow font-bold text-xs uppercase text-accent-gold mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Vorgeschlagenes Geheimnis
          </h4>
          <p className="font-libre text-xs text-gray-500 mb-2">
            Optional: Wird beim Erstellen des NPCs in der gewählten Kampagne als Geheimnis angelegt. Bearbeitbar.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={suggestedSecretTitle}
              onChange={(e) => setSuggestedSecretTitle(e.target.value)}
              placeholder="Titel des Geheimnisses"
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
            />
            <textarea
              value={suggestedSecretContent}
              onChange={(e) => setSuggestedSecretContent(e.target.value)}
              rows={3}
              placeholder="Inhalt des Geheimnisses (z.B. verborgene Vergangenheit)"
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none resize-none"
            />
          </div>
          <button
            type="button"
            onClick={applyWithEditedSecret}
            className="mt-2 inline-flex items-center gap-1.5 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:text-white"
          >
            Vorschlag mit Geheimnis übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
