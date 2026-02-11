"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { submitOnboarding } from "@/src/lib/actions/onboarding-actions";

type ExperienceLevel = "Neuling" | "Erfahren" | "Veteran";

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: "Neuling",
    label: "Neuling",
    description: "Ich habe noch nie oder sehr selten Pen & Paper gespielt.",
    color: "border-amber-700 bg-amber-950/30 text-amber-400",
  },
  {
    value: "Erfahren",
    label: "Erfahren",
    description: "Ich habe bereits an mehreren Kampagnen teilgenommen.",
    color: "border-gray-400 bg-gray-800/30 text-gray-200",
  },
  {
    value: "Veteran",
    label: "Veteran",
    description:
      "Ich spiele seit Jahren und/oder leite selbst Runden als Spielleiter.",
    color: "border-accent-gold bg-accent-gold/10 text-accent-gold",
  },
];

export function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [previousGames, setPreviousGames] = useState("");
  const [motivation, setMotivation] = useState("");
  const [codexAgreed, setCodexAgreed] = useState(false);
  const [techConfirmed, setTechConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    experience &&
    previousGames.trim().length > 0 &&
    motivation.trim().length > 0 &&
    codexAgreed &&
    techConfirmed;

  function handleSubmit() {
    if (!canSubmit || !experience) return;
    setError(null);

    startTransition(async () => {
      const result = await submitOnboarding({
        experience_level: experience,
        previous_games: previousGames,
        motivation,
        codex_agreed: codexAgreed,
        tech_requirements_agreed: techConfirmed,
      });

      if (result.success) {
        setSuccess(true);
        // Kurze Pause, dann Reload (zeigt dann den Pending-Hinweis)
        setTimeout(() => router.refresh(), 1500);
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-hero-border bg-background-card p-8 text-center">
        <CheckCircle className="h-12 w-12 text-hero-vibrant mx-auto mb-4" />
        <h2 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
          Onboarding abgeschlossen!
        </h2>
        <p className="font-libre text-gray-300">
          Dein Account wird jetzt von einem Admin geprüft. Einen Moment...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Erfahrungslevel */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          1. Wie erfahren bist du?
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExperience(opt.value)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                experience === opt.value
                  ? `${opt.color} ring-2 ring-accent-gold/50 scale-[1.02]`
                  : "border-hero-dark bg-background-dark hover:border-hero-border"
              }`}
            >
              <p
                className={`font-barlow font-bold uppercase text-sm ${
                  experience === opt.value ? "" : "text-gray-300"
                }`}
              >
                {opt.label}
              </p>
              <p
                className={`font-libre text-xs mt-1 ${
                  experience === opt.value ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Bisherige Spiele */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          2. Welche Pen &amp; Paper Spiele hast du bereits gespielt?
        </h2>
        <textarea
          value={previousGames}
          onChange={(e) => setPreviousGames(e.target.value)}
          rows={3}
          placeholder="z.B. D&D 5e, Pathfinder, Das Schwarze Auge, Call of Cthulhu... oder 'Noch keine!'"
          className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white text-sm placeholder-gray-500 outline-none transition-colors focus:border-hero-vibrant resize-none"
        />
      </section>

      {/* 3. Motivation */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          3. Was ist deine Motivation?
        </h2>
        <p className="font-libre text-sm text-gray-400 mb-3">
          Warum möchtest du Teil der TableHeroes werden? Was erhoffst du dir?
        </p>
        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={4}
          placeholder="Erzähl uns, was dich zu den TableHeroes führt..."
          className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white text-sm placeholder-gray-500 outline-none transition-colors focus:border-hero-vibrant resize-none"
        />
      </section>

      {/* 4. Kodex & Technik */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-4">
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          4. Bestätigungen
        </h2>

        {/* Kodex Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={codexAgreed}
            onChange={(e) => setCodexAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-hero-dark bg-slate-900 text-hero-vibrant accent-hero-vibrant"
          />
          <span className="font-libre text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
            Ich habe den{" "}
            <Link
              href="/kodex"
              target="_blank"
              className="inline-flex items-center gap-1 text-accent-gold hover:underline font-bold"
            >
              TableHeroes-Kodex
              <ExternalLink className="h-3 w-3" />
            </Link>{" "}
            gelesen und akzeptiere die darin enthaltenen Regeln und Werte.
          </span>
        </label>

        {/* Technik Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={techConfirmed}
            onChange={(e) => setTechConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-hero-dark bg-slate-900 text-hero-vibrant accent-hero-vibrant"
          />
          <span className="font-libre text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
            Ich bestätige, dass ich für Online-Runden über ein funktionierendes
            Mikrofon, stabile Internetverbindung und einen ruhigen Raum verfüge.
          </span>
        </label>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded border border-red-900/50 bg-red-950/20 p-3 text-center">
          <p className="font-barlow font-bold text-sm text-accent-blood">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="w-full rounded-md border border-hero-border bg-hero-vibrant px-6 py-4 font-barlow font-bold uppercase text-lg text-white shadow-lg transition-all hover:bg-hero-dark hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Wird gespeichert...
          </span>
        ) : (
          "Bewerbung abschicken"
        )}
      </button>
    </div>
  );
}
