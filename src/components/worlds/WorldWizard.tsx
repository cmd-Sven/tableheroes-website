"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Save } from "lucide-react";
import type { WorldBlueprint } from "@/src/types/world";
import { updateWorldBlueprint, createWorldComplete } from "@/src/app/dashboard/worlds/actions";
import {
  generateBlueprintProposal,
  generateBlueprintProposalForNewWorld,
} from "@/src/app/dashboard/campaigns/[id]/world-actions";

type Props = {
  /** Fehlt = Creation-Modus: Welt wird am Ende mit createWorldComplete erstellt. */
  worldId?: string;
  worldName: string;
  initialBlueprint: WorldBlueprint | null;
};

const GENRES = [
  "High Fantasy",
  "Dark Fantasy",
  "Low Fantasy",
  "Heroic Fantasy",
  "Sci-Fi",
  "Space Opera",
  "Cyberpunk",
  "Steampunk",
  "Postapokalypse",
  "History with a Twist",
];

const TECH_LEVELS = [
  "Steinzeit",
  "Bronzezeit",
  "Mittelalter",
  "Renaissance",
  "Industrialisierung",
  "Modern",
  "Near Future",
  "Interstellar",
];

const MAGIC_LEVELS = [
  "Keine Magie",
  "Selten",
  "Alltäglich",
  "Überall präsent",
  "Instabil / Chaotisch",
];

const WORLD_SHAPES = ["Kugel", "Scheibe", "Fragmentiert", "Schwebende Inseln", "Unbekannt / Bizarre Kosmologie"];

const RELIGION_TYPES = [
  "Pantheon",
  "Monotheismus",
  "Dualismus",
  "Ahnenkult",
  "Animismus",
  "Säkular / Keine Religion",
];

const LANGUAGE_BASES = [
  "Eigenständig",
  "Angelehnt an Deutsch",
  "Angelehnt an Englisch",
  "Angelehnt an Latein",
  "Angelehnt an Nordisch",
  "Angelehnt an Ostasiatisch",
];

const MAIN_CONFLICTS = [
  "Krieg zwischen Reichen",
  "Religiöser Konflikt",
  "Aufstand gegen ein Imperium",
  "Kosmische Bedrohung",
  "Magische Katastrophe",
  "Intrigen am Hof",
];

export function WorldWizard({ worldId, worldName, initialBlueprint }: Props) {
  const router = useRouter();
  const isCreationMode = worldId == null;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();

  const [blueprint, setBlueprint] = useState<WorldBlueprint>(
    initialBlueprint ?? {
      vibes: {
        genre: "",
        tech_level: "",
        magic_prevalence: "",
      },
      physics: {
        shape: "",
        sky_details: "",
      },
      culture: {
        religion_type: "",
        language_base: "",
        main_conflict: "",
      },
      life_economy: {
        holidays_summary: "",
        calendar_months: "",
        month_origin: "",
        currency_name: "",
        currency_details: "",
      },
    },
  );

  const [suggestions, setSuggestions] = useState<
    Array<
      | WorldBlueprint["vibes"]
      | WorldBlueprint["physics"]
      | WorldBlueprint["culture"]
      | WorldBlueprint["life_economy"]
    > | null
  >(null);
  const [suggestionSection, setSuggestionSection] = useState<keyof WorldBlueprint | null>(null);

  const handleChange = (section: keyof WorldBlueprint, field: string, value: string) => {
    setBlueprint((prev) => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        if (isCreationMode) {
          const result = await createWorldComplete(worldName, blueprint);
          router.push(`/dashboard/worlds/${result.id}`);
        } else {
          await updateWorldBlueprint(worldId, blueprint);
          alert("Welt-Blueprint gespeichert.");
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || (isCreationMode ? "Fehler beim Erstellen der Welt." : "Fehler beim Speichern des Blueprints."));
      }
    });
  };

  const handleKIVorschlag = (section: keyof WorldBlueprint) => {
    startTransition(async () => {
      try {
        const result = isCreationMode
          ? await generateBlueprintProposalForNewWorld(worldName, section as "vibes" | "physics" | "culture" | "life_economy", blueprint)
          : await generateBlueprintProposal(worldId!, section as "vibes" | "physics" | "culture" | "life_economy");
        if (!result || result.length === 0) return;
        setSuggestionSection(section);
        setSuggestions(result);
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Fehler beim Abrufen des KI-Vorschlags.");
      }
    });
  };

  const canGoNext =
    (step === 1 &&
      !!blueprint.vibes.genre &&
      !!blueprint.vibes.tech_level &&
      !!blueprint.vibes.magic_prevalence) ||
    step === 2 ||
    step === 3 ||
    step === 4;

  const applySuggestion = (index: number) => {
    if (!suggestions || suggestionSection == null) return;
    const selected = suggestions[index];
    if (!selected) return;

    setBlueprint((prev) => {
      const next = { ...prev };
      if (suggestionSection === "vibes") {
        next.vibes = {
          ...prev.vibes,
          ...(selected as WorldBlueprint["vibes"]),
        };
      } else if (suggestionSection === "physics") {
        next.physics = {
          ...prev.physics,
          ...(selected as WorldBlueprint["physics"]),
        };
      } else if (suggestionSection === "culture") {
        next.culture = {
          ...prev.culture,
          ...(selected as WorldBlueprint["culture"]),
        };
      } else if (suggestionSection === "life_economy") {
        next.life_economy = {
          ...prev.life_economy,
          ...(selected as WorldBlueprint["life_economy"]),
        };
      }
      return next;
    });
    setSuggestions(null);
    setSuggestionSection(null);
  };

  const closeSuggestions = () => {
    setSuggestions(null);
    setSuggestionSection(null);
  };

  return (
    <div className="relative rounded-lg border border-hero-border bg-background-card p-6 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-border">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-hero-dark p-3 border border-accent-gold/60">
            <Sparkles className="h-6 w-6 text-accent-gold" />
          </div>
          <div>
            <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
              World Wizard: Fundament von {worldName}
            </h1>
            <p className="font-libre text-sm text-gray-300">
              Lege Genre, Physik und kulturelles Gefüge deiner Welt fest. Diese Infos fließen in KI-Hooks und spätere Generatoren ein.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-barlow font-bold uppercase text-xs text-gray-400">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={step === 1 ? "text-accent-gold" : "hover:text-accent-gold"}
          >
            Vibes
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={step === 2 ? "text-accent-gold" : "hover:text-accent-gold"}
          >
            Physik
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={step === 3 ? "text-accent-gold" : "hover:text-accent-gold"}
          >
            Gefüge
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={step === 4 ? "text-accent-gold" : "hover:text-accent-gold"}
          >
            Alltag & Wirtschaft
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {step === 1 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Schritt 1: Vibes & Ton
              </h2>
              <button
                type="button"
                onClick={() => handleKIVorschlag("vibes")}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                KI-Vorschlag
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Genre / Stil
                </label>
                <select
                  value={blueprint.vibes.genre}
                  onChange={(e) => handleChange("vibes", "genre", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Technologie-Level
                </label>
                <select
                  value={blueprint.vibes.tech_level}
                  onChange={(e) => handleChange("vibes", "tech_level", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {TECH_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Magie-Präsenz
                </label>
                <select
                  value={blueprint.vibes.magic_prevalence}
                  onChange={(e) => handleChange("vibes", "magic_prevalence", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {MAGIC_LEVELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Schritt 2: Physik & Kosmologie
              </h2>
              <button
                type="button"
                onClick={() => handleKIVorschlag("physics")}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                KI-Vorschlag
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Form der Welt
                </label>
                <select
                  value={blueprint.physics.shape}
                  onChange={(e) => handleChange("physics", "shape", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {WORLD_SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Himmel, Zeit & besondere Phänomene
                </label>
                <textarea
                  value={blueprint.physics.sky_details}
                  onChange={(e) => handleChange("physics", "sky_details", e.target.value)}
                  rows={4}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-none"
                  placeholder="Wie viele Monde? Besondere Himmelsereignisse? Zeitrechnung? Jahreszeiten?"
                />
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Schritt 3: Kulturelles Gefüge & Konflikte
              </h2>
              <button
                type="button"
                onClick={() => handleKIVorschlag("culture")}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                KI-Vorschlag
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Religions-Typ
                </label>
                <select
                  value={blueprint.culture.religion_type}
                  onChange={(e) => handleChange("culture", "religion_type", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {RELIGION_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Sprach-Basis
                </label>
                <select
                  value={blueprint.culture.language_base}
                  onChange={(e) => handleChange("culture", "language_base", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {LANGUAGE_BASES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                  Hauptkonflikt
                </label>
                <select
                  value={blueprint.culture.main_conflict}
                  onChange={(e) => handleChange("culture", "main_conflict", e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                >
                  <option value="">Wählen…</option>
                  {MAIN_CONFLICTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Schritt 4: Alltag & Wirtschaft
              </h2>
              <button
                type="button"
                onClick={() => handleKIVorschlag("life_economy")}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                KI-Vorschlag
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                    Feiertage & Jahreslauf (Kurzüberblick)
                  </label>
                  <textarea
                    value={blueprint.life_economy.holidays_summary}
                    onChange={(e) => handleChange("life_economy", "holidays_summary", e.target.value)}
                    rows={3}
                    className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-none"
                    placeholder="Welche großen Feste, Jahreszeiten-Feiern oder religiösen Hochfeste prägen die Welt?"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                    Währung (Name)
                  </label>
                  <input
                    type="text"
                    value={blueprint.life_economy.currency_name}
                    onChange={(e) => handleChange("life_economy", "currency_name", e.target.value)}
                    className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
                    placeholder="z.B. Kronen, Sonnenmark, Splitter"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                    Währung (Details)
                  </label>
                  <textarea
                    value={blueprint.life_economy.currency_details}
                    onChange={(e) => handleChange("life_economy", "currency_details", e.target.value)}
                    rows={3}
                    className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-none"
                    placeholder="Material, Wechselkurse, gesellschaftliche Bedeutung (z.B. Adelswährung vs. Volksgeld)."
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                    Monatsnamen / Kalenderstruktur
                  </label>
                  <textarea
                    value={blueprint.life_economy.calendar_months}
                    onChange={(e) => handleChange("life_economy", "calendar_months", e.target.value)}
                    rows={4}
                    className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-none"
                    placeholder="Liste der Monate (z.B. kommagetrennt oder je Zeile: 'Erntemond, Blutmond, Sturmmond, ...')."
                  />
                </div>
                <div>
                  <label className="block mb-1 font-barlow font-bold text-xs uppercase text-gray-300">
                    Herkunft der Monatsnamen
                  </label>
                  <textarea
                    value={blueprint.life_economy.month_origin}
                    onChange={(e) => handleChange("life_economy", "month_origin", e.target.value)}
                    rows={3}
                    className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-none"
                    placeholder="Sind die Monate nach Göttern, Jahreszeiten, Ereignissen oder Herrschern benannt?"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer / Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-hero-border pt-4">
            <button
              type="button"
              disabled={step === 1 || isPending}
              onClick={() => setStep((prev) => (prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3 | 4))}
          className="inline-flex items-center gap-2 rounded border border-hero-border bg-slate-900/70 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-300 hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        <div className="flex items-center gap-3">
          {step < 4 && (
            <button
              type="button"
              disabled={!canGoNext || isPending}
              onClick={() => setStep((prev) => (prev === 4 ? 4 : (prev + 1) as 1 | 2 | 3 | 4))}
              className="inline-flex items-center gap-2 rounded bg-hero-dark px-4 py-2 font-barlow font-bold text-xs uppercase text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold text-xs uppercase text-black hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isCreationMode ? "Welt wird erstellt…" : "Speichern…"}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isCreationMode ? "Welt erstellen" : "Blueprint speichern"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* KI-Vorschlagsauswahl */}
      {suggestions && suggestionSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl rounded-lg border border-hero-border bg-background-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-bold text-lg text-accent-gold uppercase">
                KI-Vorschläge übernehmen
              </h2>
              <button
                type="button"
                onClick={closeSuggestions}
                className="font-barlow text-xs uppercase text-gray-400 hover:text-white"
              >
                Schließen
              </button>
            </div>
            <p className="font-libre text-sm text-gray-300 mb-4">
              Wähle einen der Vorschläge aus. Du kannst ihn danach weiter anpassen.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-hero-border/60 bg-black/40 p-3 flex flex-col gap-2"
                >
                  <div className="font-barlow font-semibold text-xs uppercase text-accent-gold">
                    Vorschlag {idx + 1}
                  </div>
                  <div className="font-libre text-xs text-gray-200 space-y-1">
                    {suggestionSection === "vibes" && (
                      <>
                        <p><strong>Genre:</strong> {(s as any).genre}</p>
                        <p><strong>Tech-Level:</strong> {(s as any).tech_level}</p>
                        <p><strong>Magie:</strong> {(s as any).magic_prevalence}</p>
                      </>
                    )}
                    {suggestionSection === "physics" && (
                      <>
                        <p><strong>Form:</strong> {(s as any).shape}</p>
                        <p><strong>Himmel/Zeit:</strong> {(s as any).sky_details}</p>
                      </>
                    )}
                    {suggestionSection === "culture" && (
                      <>
                        <p><strong>Religion:</strong> {(s as any).religion_type}</p>
                        <p><strong>Sprache:</strong> {(s as any).language_base}</p>
                        <p><strong>Konflikt:</strong> {(s as any).main_conflict}</p>
                      </>
                    )}
                    {suggestionSection === "life_economy" && (
                      <>
                        <p><strong>Feiertage:</strong> {(s as any).holidays_summary}</p>
                        <p><strong>Monate:</strong> {(s as any).calendar_months}</p>
                        <p><strong>Währung:</strong> {(s as any).currency_name}</p>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => applySuggestion(idx)}
                    className="mt-2 inline-flex items-center justify-center rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold text-[10px] uppercase text-black hover:bg-lime-400 transition-colors"
                  >
                    Vorschlag übernehmen
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

