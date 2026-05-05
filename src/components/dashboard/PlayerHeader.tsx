"use client";

import { useState } from "react";
import Image from "next/image";
import { User, Star, Award } from "lucide-react";
import { calculateLevel } from "@/src/lib/utils/rank-utils";
import {
  getAchievementImageSrc,
  getAchievementImageFallbackSrc,
} from "@/src/types/achievement";

export type FavoriteAchievement = {
  id: string;
  name: string;
  icon?: string | null;
  /** Dateiname für Bild unter /images/achievement/ */
  image_url?: string | null;
};

type Props = {
  username: string | null;
  avatarUrl?: string | null;
  /** Avatar-Form: 'circle' = rounded-full, 'square' = rounded-xl */
  avatarShape?: "circle" | "square";
  /** Fokus für object-position (0–100), Standard 50 */
  avatarPositionX?: number;
  avatarPositionY?: number;
  backgroundType?: "color" | "image";
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  bannerPositionX?: number;
  bannerPositionY?: number;
  memberSince: string | null;
  rank: string;
  /** Lebenslang verdiente Punkte fuer Level/Rang-Fortschritt. */
  lifetimePoints: number;
  /** Aktuell ausgebbares Punkteguthaben. */
  totalPoints: number;
  favoriteAchievements: FavoriteAchievement[];
  isPublicView?: boolean;
  /** Nur anzeigen, wenn true (aus users-Tabelle). */
  showRank?: boolean;
  /** Nur anzeigen, wenn true (aus users-Tabelle). */
  showPoints?: boolean;
  /** Slogan/Zitat (nur anzeigen, wenn showSlogan true). */
  slogan?: string | null;
  /** Slogan im Profil anzeigen (aus users-Tabelle). */
  showSlogan?: boolean;
};

export function PlayerHeader({
  username,
  avatarUrl,
  avatarShape = "circle",
  avatarPositionX = 50,
  avatarPositionY = 50,
  backgroundType = "color",
  backgroundColor,
  backgroundImageUrl,
  bannerPositionX = 50,
  bannerPositionY = 50,
  memberSince,
  rank,
  lifetimePoints,
  totalPoints,
  favoriteAchievements,
  isPublicView = false,
  showRank = true,
  showPoints = true,
  slogan,
  showSlogan = false,
}: Props) {
  const level = calculateLevel(lifetimePoints);
  const displayRank = rank;
  const favs = favoriteAchievements.slice(0, 3);
  const avatarRoundClass =
    avatarShape === "square" ? "rounded-xl" : "rounded-full";
  const backgroundStyle =
    backgroundType === "image" && backgroundImageUrl
      ? {
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: `${bannerPositionX}% ${bannerPositionY}%`,
        }
      : backgroundColor
      ? { backgroundColor: backgroundColor }
      : {
          background:
            "linear-gradient(135deg, var(--hero-dark, #0a1f10) 0%, var(--background-card, #132e1b) 100%)",
        };

  return (
    <header
      className="relative overflow-hidden rounded-xl border border-hero-border bg-background-card min-h-[200px]"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-6 p-6">
        <div className="flex items-center gap-4">
          <div
            className={`relative h-20 w-20 shrink-0 overflow-hidden border-2 border-accent-gold/50 bg-hero-dark shadow-lg ${avatarRoundClass}`}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                style={{
                  objectPosition: `${avatarPositionX}% ${avatarPositionY}%`,
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-10 w-10 text-accent-gold/70" />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-barlow font-extrabold text-2xl sm:text-3xl uppercase tracking-wide text-hero-vibrant">
              {username || "Abenteurer"}
            </h1>
            {memberSince && (
              <p className="font-libre text-sm text-gray-400 mt-0.5">
                Mitglied seit{" "}
                {new Date(memberSince).toLocaleDateString("de-DE", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {/* Level wird immer angezeigt */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-gold/50 bg-accent-gold/10 px-3 py-1 font-barlow font-bold text-xs uppercase text-accent-gold">
                <Star className="h-3.5 w-3.5" />
                Lvl {level}
              </span>
              {/* Rang nur, wenn vom GM gesetzt und in den Einstellungen erlaubt */}
              {showRank && displayRank && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-border bg-hero-dark/60 px-3 py-1 font-barlow font-bold text-[11px] uppercase text-gray-200">
                  {displayRank}
                </span>
              )}
              {showPoints && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-300">
                  {totalPoints} Punkte
                </span>
              )}
            </div>
            {showSlogan && slogan && slogan.trim() && (
              <p className="font-libre text-gray-300 italic mt-2 text-sm sm:text-base text-center sm:text-left">
                „{slogan.trim()}“
              </p>
            )}
          </div>
        </div>
        {favs.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="font-barlow font-bold text-xs uppercase text-gray-500 mr-1">
              Favoriten
            </span>
            <div className="flex gap-3">
              {favs.map((a) => (
                <FavoriteAchievementIcon key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function FavoriteAchievementIcon({
  achievement: a,
}: {
  achievement: FavoriteAchievement;
}) {
  const [src, setSrc] = useState<string | null>(() =>
    getAchievementImageSrc(a.image_url ?? a.icon ?? null)
  );
  const fallback = getAchievementImageFallbackSrc(
    a.image_url ?? a.icon ?? null
  );

  const handleError = () => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
    } else {
      setSrc(null);
    }
  };

  return (
    <div
      className="flex h-[120px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-accent-gold/40 bg-accent-gold/20 shadow-md ring-1 ring-accent-gold/30"
      title={a.name}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={120}
          height={120}
          className="h-[120px] w-[120px] object-contain"
          onError={handleError}
        />
      ) : (
        <Award className="h-12 w-12 text-accent-gold" />
      )}
    </div>
  );
}
