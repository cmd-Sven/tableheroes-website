"use client";

import { useState, useTransition } from "react";
import { createWorld } from "@/src/app/dashboard/campaigns/[id]/world-actions";
import { Save, X, Loader2 } from "lucide-react";

type Props = {
  campaignId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

const COSMOLOGY_TYPES = [
  "Planet",
  "Hohlwelt",
  "Scheibe",
  "Archipel",
  "Schwebende Inseln",
  "Dimensionsebene",
  "Andere",
];

const GENRE_STYLES = [
  "Klassische Fantasy",
  "Dunkle Fantasy",
  "Steampunk",
  "Cyberpunk",
  "Post-Apokalypse",
  "Science-Fiction",
  "Urban Fantasy",
  "Historisch",
  "Andere",
];

const MAGIC_LEVELS = [
  "Keine Magie",
  "Niedrige Magie",
  "Mittlere Magie",
  "Hohe Magie",
  "Übernatürlich",
];

export function WorldSetupForm({ campaignId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    cosmology_type: "",
    genre_style: "",
    magic_level: "",
    current_year: "",
    main_conflict: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Der Name der Welt ist erforderlich.");
      return;
    }

    startTransition(async () => {
      try {
        await createWorld({
          campaign_id: campaignId,
          name: formData.name.trim(),
          cosmology_type: formData.cosmology_type || undefined,
          genre_style: formData.genre_style || undefined,
          magic_level: formData.magic_level || undefined,
          current_year: formData.current_year ? parseInt(formData.current_year) : undefined,
          main_conflict: formData.main_conflict || undefined,
          description: formData.description || undefined,
        });
        // onSuccess will reload the page, which will re-fetch the world
        // and the WorldRequiredBlocker will disappear automatically
        onSuccess();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Fehler beim Erstellen der Welt.";
        setError(errorMessage);
      }
    });
  };

  return (
    <div
      className="rounded-lg p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      style={{
        border: "3px solid #B8860B",
        backgroundImage: "url('/images/backgrounds/dark-marble.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="relative z-10">
        <h2 className="font-cinzel font-bold text-3xl text-accent-gold mb-6">
          Die Welt erschaffen
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (Required) */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Name der Welt *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
              placeholder="z.B. Das Anderwall, Aetheria, Midgard..."
              required
              disabled={isPending}
            />
          </div>

          {/* Cosmology Type */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Kosmologie-Typ
            </label>
            <select
              value={formData.cosmology_type}
              onChange={(e) => setFormData({ ...formData, cosmology_type: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
              disabled={isPending}
            >
              <option value="">Bitte wählen...</option>
              {COSMOLOGY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Genre/Stil */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Genre / Stil
            </label>
            <select
              value={formData.genre_style}
              onChange={(e) => setFormData({ ...formData, genre_style: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
              disabled={isPending}
            >
              <option value="">Bitte wählen...</option>
              {GENRE_STYLES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          {/* Magic Level */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Magie-Level
            </label>
            <select
              value={formData.magic_level}
              onChange={(e) => setFormData({ ...formData, magic_level: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
              disabled={isPending}
            >
              <option value="">Bitte wählen...</option>
              {MAGIC_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Current Year */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Aktuelles Jahr
            </label>
            <input
              type="number"
              value={formData.current_year}
              onChange={(e) => setFormData({ ...formData, current_year: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
              placeholder="z.B. 1247, 2024, 0..."
              disabled={isPending}
            />
          </div>

          {/* Main Conflict */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Hauptkonflikt
            </label>
            <textarea
              value={formData.main_conflict}
              onChange={(e) => setFormData({ ...formData, main_conflict: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm min-h-[100px]"
              placeholder="Kurze Beschreibung des Hauptkonflikts der Welt..."
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-barlow font-semibold text-accent-blood mb-2 text-sm uppercase">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-libre text-white outline-none focus:border-hero-vibrant backdrop-blur-sm min-h-[150px]"
              placeholder="Ausführliche Beschreibung der Welt..."
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-vibrant text-black font-barlow font-bold uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Welt erschaffen
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
      </div>
    </div>
  );
}

