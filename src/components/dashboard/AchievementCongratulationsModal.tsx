"use client";

import { useEffect, useState } from "react";
import { Award, X } from "lucide-react";
import {
  getAchievementImageSrc,
  getAchievementImageFallbackSrc,
} from "@/src/types/achievement";

type Achievement = {
  id: string;
  name: string;
  image_url?: string | null;
  points_awarded?: number;
  description?: string | null;
};

type Props = {
  achievement: Achievement;
  onClose: () => void;
};

export function AchievementCongratulationsModal({ achievement, onClose }: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const [src, setSrc] = useState<string | null>(() =>
    getAchievementImageSrc(achievement.image_url)
  );
  const fallback = getAchievementImageFallbackSrc(achievement.image_url);

  const handleError = () => {
    if (fallback && src !== fallback) setSrc(fallback);
    else setSrc(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-modal-title"
    >
      {/* Backdrop – Klick schließt Modal */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal-Inhalt */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border-2 border-accent-gold/60 bg-background-card p-8 shadow-[0_0_40px_rgba(202,185,38,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Schließen-Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-gray-300 hover:bg-hero-dark hover:text-white transition-colors"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h2
            id="achievement-modal-title"
            className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-accent-gold mb-2"
          >
            Herzlichen Glückwunsch!
          </h2>
          <p className="font-libre text-gray-300 mb-6">
            Du hast ein neues Achievement freigeschaltet:
          </p>

          {/* Achievement-Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-accent-gold/50 bg-accent-gold/10 overflow-hidden">
              {src ? (
                <img
                  src={src}
                  alt=""
                  width={96}
                  height={96}
                  className="object-contain w-full h-full"
                  onError={handleError}
                />
              ) : (
                <Award className="h-12 w-12 text-accent-gold/70" />
              )}
            </div>
          </div>

          <h3 className="font-cinzel font-bold text-xl text-white mb-2">
            {achievement.name}
          </h3>
          {achievement.points_awarded ? (
            <p className="font-barlow font-bold text-hero-vibrant text-sm uppercase">
              +{achievement.points_awarded} Punkte
            </p>
          ) : null}
          {achievement.description ? (
            <p className="font-libre text-sm text-gray-400 mt-3 line-clamp-2">
              {achievement.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
