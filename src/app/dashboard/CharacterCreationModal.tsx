"use client";

import { useState } from "react";
import {
  X,
  User,
  Shield,
  Sparkles,
  AlertCircle,
  BookOpen,
  Target,
  Heart,
  Users,
  Sword,
  Briefcase,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { createCharacter } from "./characters/actions";
import { generateBackstorySuggestions } from "@/src/app/dashboard/campaigns/[id]/ai-actions";

type CharacterCreationModalProps = {
  onClose: () => void;
  campaignId?: string; // Optional: Für Backstory-Inspiration
};

type Suggestion = {
  title: string;
  description: string;
  connected_entities: string[];
};

type FormState = {
  name: string;
  class: string;
  race: string;
  level: string;
  avatar_url: string;
  backstory_summary: string;
  profession: string;
  faction_membership: string;
  goals: string;
  fears: string;
  rivals: string;
  important_people: string;
};

export function CharacterCreationModal({ onClose, campaignId }: CharacterCreationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roughIdea, setRoughIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState<FormState>({
    name: "",
    class: "",
    race: "",
    level: "1",
    avatar_url: "",
    backstory_summary: "",
    profession: "",
    faction_membership: "",
    goals: "",
    fears: "",
    rivals: "",
    important_people: "",
  });

  const basicsValid =
    formData.name.trim().length > 0 &&
    formData.class.trim().length > 0 &&
    formData.race.trim().length > 0;

  function goNext() {
    if (step === 1 && !basicsValid) {
      setError("Bitte fülle alle Pflichtfelder im ersten Schritt aus.");
      return;
    }
    setError(null);
    setStep((prev) => (prev === 1 ? 2 : 3));
  }

  function goBack() {
    setError(null);
    setStep((prev) => (prev === 3 ? 2 : 1));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!basicsValid) {
      setError("Bitte fülle alle Pflichtfelder (Name, Klasse, Rasse) aus.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("class", formData.class);
      payload.append("race", formData.race);
      payload.append("level", formData.level || "1");
      if (formData.avatar_url.trim()) {
        payload.append("avatar_url", formData.avatar_url.trim());
      }
      if (formData.backstory_summary.trim()) {
        payload.append("backstory_summary", formData.backstory_summary.trim());
      }
      if (formData.profession.trim()) {
        payload.append("profession", formData.profession.trim());
      }
      if (formData.faction_membership.trim()) {
        payload.append("faction_membership", formData.faction_membership.trim());
      }
      if (formData.goals.trim()) {
        payload.append("goals", formData.goals.trim());
      }
      if (formData.fears.trim()) {
        payload.append("fears", formData.fears.trim());
      }
      if (formData.rivals.trim()) {
        payload.append("rivals", formData.rivals.trim());
      }
      if (formData.important_people.trim()) {
        payload.append("important_people", formData.important_people.trim());
      }

      await createCharacter(payload);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <div>
            <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
              Neuen Charakter erstellen
            </h2>
            <p className="mt-1 font-barlow text-xs uppercase text-gray-400">
              Schritt {step} von 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form id="character-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: BASIS */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Die Basis
              </h3>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <User className="inline h-4 w-4 mr-2" />
                  Charaktername *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="z.B. Thorin Eisenschild"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Class */}
              <div>
                <label
                  htmlFor="class"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Shield className="inline h-4 w-4 mr-2" />
                  Klasse *
                </label>
                <input
                  type="text"
                  id="class"
                  value={formData.class}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, class: e.target.value }))
                  }
                  placeholder="z.B. Krieger, Magier, Schurke"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Race */}
              <div>
                <label
                  htmlFor="race"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Sparkles className="inline h-4 w-4 mr-2" />
                  Rasse *
                </label>
                <input
                  type="text"
                  id="race"
                  value={formData.race}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, race: e.target.value }))
                  }
                  placeholder="z.B. Zwerg, Elf, Mensch"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Level */}
              <div>
                <label
                  htmlFor="level"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  Level
                </label>
                <input
                  type="number"
                  id="level"
                  min={1}
                  max={20}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      level: e.target.value || "1",
                    }))
                  }
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Standard: Level 1 (kann später angepasst werden)
                </p>
              </div>

              {/* Avatar URL (Optional) */}
              <div>
                <label
                  htmlFor="avatar_url"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      avatar_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
            </div>
          )}

          {/* STEP 2: GESCHICHTE & WELT */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Geschichte & Welt
              </h3>

              {/* Backstory */}
              <div>
                <label
                  htmlFor="backstory_summary"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <BookOpen className="inline h-4 w-4 mr-2" />
                  Backstory (Zusammenfassung)
                </label>
                <textarea
                  id="backstory_summary"
                  value={formData.backstory_summary}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      backstory_summary: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Kurze Zusammenfassung der Charaktergeschichte..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Profession */}
              <div>
                <label
                  htmlFor="profession"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Briefcase className="inline h-4 w-4 mr-2" />
                  Beruf
                </label>
                <input
                  type="text"
                  id="profession"
                  value={formData.profession}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      profession: e.target.value,
                    }))
                  }
                  placeholder="z.B. Schmied, Händler, Gelehrter"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Faction Membership */}
              <div>
                <label
                  htmlFor="faction_membership"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Users className="inline h-4 w-4 mr-2" />
                  Fraktion / Zugehörigkeit
                </label>
                <input
                  type="text"
                  id="faction_membership"
                  value={formData.faction_membership}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      faction_membership: e.target.value,
                    }))
                  }
                  placeholder="z.B. Zunft der Magier, Königliche Garde"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Inspiration Section (nur für Kampagnen) */}
              {campaignId && (
                <div className="rounded border-2 border-accent-gold/50 bg-accent-gold/5 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent-gold" />
                    <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase">
                      ✨ Inspiration aus der Lore
                    </h3>
                  </div>
                  <p className="font-libre text-sm text-gray-300">
                    Beschreibe deine grobe Idee für die Backstory. Die KI schlägt dir
                    vor, wie du sie mit der existierenden Welt verknüpfen kannst.
                  </p>

                  <div>
                    <label className="block mb-2 font-barlow font-bold text-sm uppercase text-gray-300">
                      Deine grobe Idee
                    </label>
                    <textarea
                      value={roughIdea}
                      onChange={(e) => setRoughIdea(e.target.value)}
                      placeholder="z.B. 'Mein Charakter ist ein ehemaliger Soldat, der seine Familie verloren hat...'"
                      rows={3}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!roughIdea.trim() || !campaignId) return;
                      setIsGenerating(true);
                      try {
                        const result = await generateBackstorySuggestions(
                          campaignId,
                          roughIdea,
                        );
                        setSuggestions(result.suggestions || []);
                      } catch (err: any) {
                        alert(err.message || "Fehler bei der Generierung.");
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    disabled={!roughIdea.trim() || isGenerating}
                    className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        ✨ Vorschläge aus der Lore
                      </>
                    )}
                  </button>

                  {suggestions.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="rounded border border-hero-dark bg-background-dark p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-barlow font-bold text-sm text-white">
                              {suggestion.title}
                            </h4>
                            <button
                              type="button"
                              onClick={async () => {
                                const text = `${suggestion.title}\n\n${suggestion.description}`;
                                await navigator.clipboard.writeText(text);
                                setCopiedIndex(index);
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                              className="rounded p-1 text-gray-400 hover:text-accent-gold transition-colors"
                            >
                              {copiedIndex === index ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <p className="font-libre text-sm text-gray-300 mb-2">
                            {suggestion.description}
                          </p>
                          {suggestion.connected_entities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {suggestion.connected_entities.map((entity, i) => (
                                <span
                                  key={i}
                                  className="rounded bg-hero-dark px-2 py-1 font-barlow text-xs text-accent-gold"
                                >
                                  {entity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PERSÖNLICHKEIT */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Persönlichkeit & Hooks
              </h3>

              {/* Goals */}
              <div>
                <label
                  htmlFor="goals"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Target className="inline h-4 w-4 mr-2" />
                  Ziele
                </label>
                <textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, goals: e.target.value }))
                  }
                  rows={2}
                  placeholder="Was möchte der Charakter erreichen?"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Fears */}
              <div>
                <label
                  htmlFor="fears"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  Ängste
                </label>
                <textarea
                  id="fears"
                  value={formData.fears}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fears: e.target.value }))
                  }
                  rows={2}
                  placeholder="Wovor hat der Charakter Angst?"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Important People */}
              <div>
                <label
                  htmlFor="important_people"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Heart className="inline h-4 w-4 mr-2" />
                  Wichtige Personen
                </label>
                <textarea
                  id="important_people"
                  value={formData.important_people}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      important_people: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Familie, Freunde, Mentoren..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Rivals */}
              <div>
                <label
                  htmlFor="rivals"
                  className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
                >
                  <Sword className="inline h-4 w-4 mr-2" />
                  Rivalen
                </label>
                <textarea
                  id="rivals"
                  value={formData.rivals}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rivals: e.target.value }))
                  }
                  rows={2}
                  placeholder="Feinde, Konkurrenten..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                  suppressHydrationWarning={true}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer (Fixed) */}
        <div className="flex-none p-6 border-t border-hero-dark bg-background-dark">
          <div className="flex items-center justify-between gap-2">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
                >
                  Zurück
                </button>
              )}
            </div>
            <div className="ml-auto">
              {step < 3 && (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && !basicsValid}
                  className="rounded border border-hero-border bg-hero-vibrant px-6 py-2 font-barlow font-bold uppercase text-xs text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Weiter
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById("character-form") as HTMLFormElement;
                    if (form) {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
                    }
                  }}
                  disabled={isSubmitting}
                  className="rounded border border-hero-border bg-hero-vibrant px-6 py-2 font-barlow font-bold uppercase text-xs text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  suppressHydrationWarning={true}
                >
                  {isSubmitting ? "Wird erstellt..." : "Charakter erstellen"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


