"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCustomAchievement } from "@/src/lib/actions/achievement-actions";
import { AchievementPreview } from "@/src/components/dashboard/AchievementPreview";
import { getAchievementImageSrc } from "@/src/types/achievement";
import { Award } from "lucide-react";

type AchievementRow = {
  id: string;
  name: string;
  points_awarded: number;
  image_url?: string | null;
  description?: string | null;
  is_custom?: boolean;
};

type Props = {
  imageFilenames: string[];
  existingAchievements: AchievementRow[];
};

export function AchievementCreatorClient({
  imageFilenames,
  existingAchievements,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [iconFilename, setIconFilename] = useState<string | null>(
    imageFilenames[0] ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte einen Namen eintragen.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createCustomAchievement(
        name.trim(),
        pointsAwarded,
        description.trim() || null,
        iconFilename
      );
      if (result.success) {
        toast.success("Achievement erstellt.");
        setName("");
        setDescription("");
        setPointsAwarded(10);
        setIconFilename(imageFilenames[0] ?? null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Fehler beim Erstellen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Formular */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
          Neues Achievement anlegen
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Drachenbezwinger"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Punkte
            </label>
            <input
              type="number"
              min={0}
              value={pointsAwarded}
              onChange={(e) => setPointsAwarded(Number(e.target.value) || 0)}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was muss man tun, um dieses Achievement zu erhalten?"
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-y"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Bild (aus Ordner public/images/achievement/)
            </label>
            <select
              value={iconFilename ?? ""}
              onChange={(e) =>
                setIconFilename(e.target.value ? e.target.value : null)
              }
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">— Kein Bild —</option>
              {imageFilenames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {imageFilenames.length === 0 && (
              <p className="mt-1 font-libre text-xs text-gray-500">
                Keine Bilder gefunden. Bitte Dateien in{" "}
                <code className="bg-hero-dark/50 px-1 rounded">
                  public/images/achievement/
                </code>{" "}
                ablegen.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded border border-hero-border bg-hero-dark px-6 py-2 font-barlow font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Wird erstellt…" : "Achievement erstellen"}
          </button>
        </form>

        {/* Live-Vorschau */}
        <div className="mt-8">
          <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-3">
            Vorschau
          </h3>
          <AchievementPreview
            name={name}
            pointsAwarded={pointsAwarded}
            description={description}
            iconFilename={iconFilename}
          />
        </div>
      </section>

      {/* Liste existierender Achievements */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Bereits angelegte Achievements
        </h2>
        {existingAchievements.length === 0 ? (
          <p className="font-libre text-gray-400 text-center py-8">
            Noch keine Achievements angelegt.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {existingAchievements.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded border border-hero-border/50 bg-background-dark p-3"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-hero-border bg-hero-dark/40">
                  {(() => {
                    const src = getAchievementImageSrc(a.image_url);
                    return src ? (
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Award className="h-6 w-6 text-accent-gold/70" />
                    );
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-cinzel font-bold text-sm text-white truncate">
                    {a.name}
                  </p>
                  <p className="font-barlow text-xs text-accent-gold">
                    +{a.points_awarded} Pkt
                    {a.is_custom && (
                      <span className="ml-1 text-gray-500">(eigen)</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
