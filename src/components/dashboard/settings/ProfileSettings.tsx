"use client";

import { useState } from "react";
import { updateProfileDesign } from "@/src/app/dashboard/settings/settings-actions";
import { toast } from "sonner";

export type ProfileDesignData = {
  avatarUrl: string | null;
  avatarShape: "circle" | "square";
  backgroundImageUrl: string | null;
  showRank: boolean;
  showPoints: boolean;
  achievementMode: "newest" | "specific";
  favoriteAchievementId: string | null;
  slogan: string | null;
  showSlogan: boolean;
};

export type AchievementOption = {
  id: string;
  name: string;
  icon?: string | null;
};

type Props = {
  initial: ProfileDesignData;
  achievements: AchievementOption[];
};

export function ProfileSettings({ initial, achievements }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [avatarShape, setAvatarShape] = useState<"circle" | "square">(
    initial.avatarShape ?? "circle",
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    initial.backgroundImageUrl ?? "",
  );
  const [showRank, setShowRank] = useState(initial.showRank ?? true);
  const [showPoints, setShowPoints] = useState(initial.showPoints ?? true);
  const [achievementMode, setAchievementMode] = useState<"newest" | "specific">(
    initial.achievementMode ?? "newest",
  );
  const [favoriteAchievementId, setFavoriteAchievementId] = useState(
    initial.favoriteAchievementId ?? "",
  );
  const [slogan, setSlogan] = useState(initial.slogan ?? "");
  const [showSlogan, setShowSlogan] = useState(initial.showSlogan ?? false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileDesign({
        avatar_url: avatarUrl.trim() || null,
        avatar_shape: avatarShape,
        profile_background_image: backgroundImageUrl.trim() || null,
        profile_show_rank: showRank,
        profile_show_points: showPoints,
        profile_achievement_mode: achievementMode,
        profile_favorite_achievement_id: favoriteAchievementId.trim() || null,
        profile_slogan: slogan.trim() || null,
        profile_show_slogan: showSlogan,
      });
      toast.success("Profil-Design gespeichert.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
        Header &amp; Profil-Design
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
            Avatar
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant"
          />
          <div className="mt-2 flex items-center gap-4">
            <span className="font-libre text-sm text-gray-400">Form:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="avatarShape"
                checked={avatarShape === "circle"}
                onChange={() => setAvatarShape("circle")}
                className="rounded-full border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
              />
              <span className="font-libre text-sm text-gray-200">Rund</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="avatarShape"
                checked={avatarShape === "square"}
                onChange={() => setAvatarShape("square")}
                className="rounded-full border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
              />
              <span className="font-libre text-sm text-gray-200">Eckig</span>
            </label>
          </div>
        </div>

        {/* Hintergrund */}
        <div>
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
            Hintergrund (Banner-URL)
          </label>
          <input
            type="url"
            value={backgroundImageUrl}
            onChange={(e) => setBackgroundImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant"
          />
        </div>

        {/* Anzeige-Optionen */}
        <div>
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold mb-3">
            Anzeige-Optionen
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="font-libre text-gray-200">Rang anzeigen</span>
              <button
                type="button"
                role="switch"
                aria-checked={showRank}
                onClick={() => setShowRank((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant ${
                  showRank
                    ? "border-hero-vibrant bg-hero-vibrant"
                    : "border-hero-border bg-hero-dark"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                    showRank ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="font-libre text-gray-200">Punkte anzeigen</span>
              <button
                type="button"
                role="switch"
                aria-checked={showPoints}
                onClick={() => setShowPoints((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant ${
                  showPoints
                    ? "border-hero-vibrant bg-hero-vibrant"
                    : "border-hero-border bg-hero-dark"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                    showPoints ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
          <div className="mt-4">
            <label className="block font-libre text-sm text-gray-400 mb-2">
              Achievements im Header
            </label>
            <select
              value={achievementMode}
              onChange={(e) =>
                setAchievementMode(e.target.value as "newest" | "specific")
              }
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant"
            >
              <option value="newest">Neuestes anzeigen</option>
              <option value="specific">Bestimmtes Achievement wählen</option>
            </select>
            {achievementMode === "specific" && (
              <select
                value={favoriteAchievementId}
                onChange={(e) => setFavoriteAchievementId(e.target.value)}
                className="mt-2 w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant"
              >
                <option value="">— Achievement wählen —</option>
                {achievements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Slogan */}
        <div>
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
            Slogan
          </label>
          <textarea
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Dein Motto oder Zitat…"
            rows={3}
            className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant resize-y"
          />
          <label className="mt-2 flex items-center justify-between gap-4 cursor-pointer">
            <span className="font-libre text-gray-200">
              Slogan im Profil anzeigen
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showSlogan}
              onClick={() => setShowSlogan((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant ${
                showSlogan
                  ? "border-hero-vibrant bg-hero-vibrant"
                  : "border-hero-border bg-hero-dark"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                  showSlogan ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </form>
    </section>
  );
}
