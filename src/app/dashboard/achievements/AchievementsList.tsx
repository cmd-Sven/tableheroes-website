"use client";

import { useState } from "react";
import { Award, X } from "lucide-react";
import {
  getAchievementImageSrc,
  getAchievementImageSrcVariants,
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
  const [modalAchievement, setModalAchievement] =
    useState<AchievementWithStatus | null>(null);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <AchievementRow
            key={a.id}
            achievement={a}
            onDetailClick={() => setModalAchievement(a)}
          />
        ))}
      </ul>

      {modalAchievement && (
        <AchievementDetailModal
          achievement={modalAchievement}
          onClose={() => setModalAchievement(null)}
        />
      )}
    </>
  );
}

function AchievementRow({
  achievement: a,
  onDetailClick,
}: {
  achievement: AchievementWithStatus;
  onDetailClick: () => void;
}) {
  const variants = getAchievementImageSrcVariants(a.image_url);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = variants[srcIndex] ?? null;

  const handleError = () => {
    if (srcIndex < variants.length - 1) {
      setSrcIndex((i) => i + 1);
    } else {
      setSrcIndex(-1);
    }
  };

  const displaySrc = srcIndex >= 0 && src ? src : null;

  return (
    <li
      onClick={onDetailClick}
      className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-hero-vibrant/50 hover:shadow-lg ${
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
          {displaySrc ? (
            <img
              src={displaySrc}
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
            <p className="mt-2 font-libre text-sm leading-relaxed text-gray-400 line-clamp-2">
              <span className="font-barlow font-bold uppercase text-gray-500 text-xs">
                {a.unlocked ? "Beschreibung:" : "So schaltest du es frei:"}
              </span>{" "}
              {a.description}
            </p>
          )}
          <p className="mt-2 font-barlow text-[10px] uppercase text-gray-500">
            Klicken für Details
          </p>
        </div>
      </div>
    </li>
  );
}

function AchievementDetailModal({
  achievement: a,
  onClose,
}: {
  achievement: AchievementWithStatus;
  onClose: () => void;
}) {
  const variants = getAchievementImageSrcVariants(a.image_url);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = variants[srcIndex] ?? null;

  const handleError = () => {
    if (srcIndex < variants.length - 1) setSrcIndex((i) => i + 1);
  };

  const displaySrc = srcIndex >= 0 && src ? src : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border p-6 shadow-2xl ${
          a.unlocked
            ? "border-hero-border bg-background-card"
            : "border-hero-dark bg-background-card/90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          className={`flex flex-col items-center ${!a.unlocked ? "grayscale" : ""}`}
        >
          <div className="mb-4 flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-hero-border bg-hero-dark/40">
            {displaySrc ? (
              <img
                src={displaySrc}
                alt=""
                className="h-full w-full object-contain"
                onError={handleError}
              />
            ) : (
              <Award
                className={`h-20 w-20 ${
                  a.unlocked ? "text-accent-gold/70" : "text-gray-500"
                }`}
              />
            )}
          </div>
          <h3
            className={`text-center font-cinzel font-bold text-2xl ${
              a.unlocked ? "text-white" : "text-gray-500"
            }`}
          >
            {a.name}
          </h3>
          {a.points_awarded > 0 && (
            <p className="mt-1 font-barlow text-sm uppercase text-accent-gold">
              +{a.points_awarded} Punkte
            </p>
          )}
          {a.description && (
            <p className="mt-4 font-libre text-sm leading-relaxed text-gray-300">
              <span className="font-barlow font-bold uppercase text-gray-500 text-xs">
                {a.unlocked ? "Beschreibung:" : "So schaltest du es frei:"}
              </span>{" "}
              {a.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
