"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import {
  getAchievementImageSrc,
  getAchievementImageFallbackSrc,
} from "@/src/types/achievement";

export type AchievementWithStatus = {
  id: string;
  name: string;
  points_awarded: number;
  image_url: string | null;
  description: string | null;
  unlocked: boolean;
};

const ICON_SIZE = 160;

type Props = {
  achievements: AchievementWithStatus[];
};

export function AchievementsList({ achievements }: Props) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => (
        <AchievementRow key={a.id} achievement={a} />
      ))}
    </ul>
  );
}

function AchievementRow({
  achievement: a,
}: {
  achievement: AchievementWithStatus;
}) {
  const [src, setSrc] = useState<string | null>(() =>
    getAchievementImageSrc(a.image_url),
  );
  const fallback = getAchievementImageFallbackSrc(a.image_url);

  const handleError = () => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
    } else {
      setSrc(null);
    }
  };

  return (
    <li
      className={`rounded-lg border p-4 transition-colors ${
        a.unlocked
          ? "border-hero-border bg-background-card"
          : "border-hero-dark/60 bg-background-card/60 opacity-75"
      }`}
    >
      <div
        className={`flex items-start gap-4 ${!a.unlocked ? "grayscale" : ""}`}
      >
        <span
          className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-hero-dark/40"
          style={{
            borderColor: a.unlocked
              ? "rgba(202, 185, 38, 0.3)"
              : "rgba(255,255,255,0.1)",
          }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              width={ICON_SIZE}
              height={ICON_SIZE}
              className="h-40 w-40 object-contain"
              onError={handleError}
            />
          ) : (
            <Award
              className={`h-16 w-16 ${
                a.unlocked ? "text-accent-gold/70" : "text-gray-500"
              }`}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-cinzel font-bold text-lg ${
              a.unlocked ? "text-white" : "text-gray-500"
            }`}
          >
            {a.name}
          </h3>
          {a.points_awarded > 0 && (
            <p className="mt-0.5 font-barlow text-xs uppercase text-accent-gold/90">
              +{a.points_awarded} Punkte
            </p>
          )}
          {a.description && (
            <p className="mt-2 font-libre text-sm leading-relaxed text-gray-400">
              <span className="font-barlow font-bold uppercase text-gray-500 text-xs">
                {a.unlocked ? "Beschreibung:" : "So schaltest du es frei:"}
              </span>{" "}
              {a.description}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
