"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle, User } from "lucide-react";
import { applyToCampaign } from "@/src/app/dashboard/campaigns/[id]/actions";
import Link from "next/link";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
};

type ApplicationModalProps = {
  campaignId: string;
  availableCharacters: Character[];
  onClose: () => void;
};

export function ApplicationModal({ campaignId, availableCharacters, onClose }: ApplicationModalProps) {
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToRules || !selectedCharacterId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await applyToCampaign(campaignId, message, selectedCharacterId);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload(); // Refresh to show new status
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler bei der Bewerbung");
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-lg border border-hero-border bg-background-card p-8 shadow-2xl">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h2 className="font-barlow font-bold text-2xl text-white mb-2">
              Bewerbung verschickt!
            </h2>
            <p className="font-libre text-gray-300">
              Der Spielleiter wird deine Bewerbung prüfen und sich bei dir melden.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No characters available
  if (availableCharacters.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-lg border border-hero-border bg-background-card p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
              Kein Charakter verfügbar
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="text-center py-6">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border mx-auto">
              <User className="h-8 w-8 text-accent-gold" />
            </div>
            <p className="font-libre text-gray-300 mb-6">
              Bitte erstelle zuerst einen Charakter im Dashboard, bevor du dich für eine Kampagne bewerben kannst.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-hero-border bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-background-dark shadow-lg hover:scale-105 transition-transform"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-lg border border-hero-border bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-border">
          <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
            Jetzt bewerben
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form id="application-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Character Selection */}
          <div className="rounded-md border border-hero-border/40 bg-background-dark p-6">
            <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-4">
              Wähle deinen Charakter
            </h3>
            <p className="font-libre text-sm text-gray-300 mb-4">
              Mit welchem Charakter möchtest du dich bewerben?
            </p>
            
            <div className="space-y-2">
              {availableCharacters.map((character) => (
                <label
                  key={character.id}
                  className={`flex items-center gap-4 rounded border p-4 cursor-pointer transition-colors ${
                    selectedCharacterId === character.id
                      ? "border-hero-vibrant bg-hero-dark/20"
                      : "border-hero-border/30 hover:border-hero-vibrant/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="character"
                    value={character.id}
                    checked={selectedCharacterId === character.id}
                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                    className="h-4 w-4 text-hero-vibrant focus:ring-hero-vibrant"
                    suppressHydrationWarning={true}
                  />
                  <div className="flex-1">
                    <p className="font-cinzel font-bold text-white">{character.name}</p>
                    <p className="font-barlow text-sm text-gray-400">
                      Level {character.level} {character.race} {character.class}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 1: Code of Conduct */}
          <div className="rounded-md border border-hero-border/40 bg-background-dark p-6">
            <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-4">
              Der Spielvertrag
            </h3>
            <p className="font-libre text-gray-200 mb-4 leading-relaxed">
              Bei TableHeroes steht der Spaß im Vordergrund. Mit deiner Bewerbung akzeptierst du:
            </p>
            <ul className="space-y-3 font-libre text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-gold flex-shrink-0" />
                <span>
                  Der <strong className="text-white">Spielleiter (GM)</strong> hat das letzte Wort 
                  bei Regelentscheidungen und Konflikten.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-gold flex-shrink-0" />
                <span>
                  <strong className="text-white">Respektvoller Umgang</strong> ist Pflicht. 
                  Der GM darf bei Fehlverhalten Spieler ausschließen.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-gold flex-shrink-0" />
                <span>
                  <strong className="text-white">Kommunikation ist der Schlüssel:</strong> Melde 
                  dich beim GM, wenn du dich unwohl fühlst.
                </span>
              </li>
            </ul>

            {/* Checkbox */}
            <label className="mt-6 flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-hero-border bg-background-card text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
                suppressHydrationWarning={true}
              />
              <span className="font-libre text-sm text-gray-200 group-hover:text-white transition-colors">
                Ich stimme den Regeln und der Entscheidungsgewalt des Spielleiters zu.
              </span>
            </label>
          </div>

          {/* Section 2: Application Message */}
          <div>
            <label htmlFor="message" className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Deine Nachricht
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Warum möchtest du mitspielen? Erzähl dem GM etwas über deinen Charakter..."
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none"
              suppressHydrationWarning={true}
            />
            <p className="mt-2 font-libre text-xs text-gray-500">
              💡 Tipp: Erzähl dem GM, was dich interessiert und wie dein Charakter ins Abenteuer passt.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer (Fixed) */}
        <div className="flex-none p-6 border-t border-hero-border bg-background-dark">
          <button
            type="submit"
            form="application-form"
            disabled={!agreedToRules || !selectedCharacterId || isSubmitting}
            className="w-full rounded-md border border-hero-border bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            suppressHydrationWarning={true}
          >
            {isSubmitting ? "Wird gesendet..." : "Bewerbung absenden"}
          </button>
        </div>
      </div>
    </div>
  );
}
