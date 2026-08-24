"use client";

import { Award } from "lucide-react";
import { getAchievementImageSrc } from "@/src/types/achievement";

type AchievementPreviewProps = {
  name: string;
  pointsAwarded: number;
  description: string;
  /** Dateiname aus dem Dropdown (z. B. "gold_coin.png"). Bild unter /images/achievement/ */
  iconFilename: string | null;
};

/**
 * Live-Vorschau einer Achievement-Karte für das GM-Formular.
 * Aktualisiert sich sofort beim Ändern von Name, Punkten, Beschreibung oder Bild.
 */
export function AchievementPreview({
  name,
  pointsAwarded,
  description,
  iconFilename,
}: AchievementPreviewProps) {
  const src = iconFilename ? getAchievementImageSrc(iconFilename) : null;

  return (
    <div
      className="rounded-lg border border-hero-border bg-background-card p-6 shadow-lg"
      style={{
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
      }}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hero-border bg-hero-dark/40">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <Award className="h-10 w-10 text-accent-gold/70" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-cinzel font-bold text-lg text-accent-gold">
            {name.trim() || "Name des Erfolgs"}
          </h3>
          <p className="mt-0.5 font-barlow text-xs uppercase text-hero-vibrant">
            +{Number.isNaN(pointsAwarded) ? 0 : pointsAwarded} Punkte
          </p>
          {description.trim() ? (
            <p className="mt-2 font-libre text-sm leading-relaxed text-gray-300">
              {description}
            </p>
          ) : (
            <p className="mt-2 font-libre text-sm italic text-gray-500">
              Beschreibung (optional)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
