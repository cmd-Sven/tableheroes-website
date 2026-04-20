"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileDesign } from "@/src/app/dashboard/settings/settings-actions";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  removeProfileMediaAsset,
  uploadProfileMediaAsset,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import { toast } from "sonner";

export type ProfileDesignData = {
  avatarUrl: string | null;
  avatarStoragePath: string | null;
  profileBannerStoragePath: string | null;
  avatarPositionX: number;
  avatarPositionY: number;
  bannerPositionX: number;
  bannerPositionY: number;
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
  userId: string;
  initial: ProfileDesignData;
  achievements: AchievementOption[];
};

export function ProfileSettings({ userId, initial, achievements }: Props) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [avatarStoragePath, setAvatarStoragePath] = useState(
    initial.avatarStoragePath ?? null,
  );
  const [bannerStoragePath, setBannerStoragePath] = useState(
    initial.profileBannerStoragePath ?? null,
  );
  const [avatarShape, setAvatarShape] = useState<"circle" | "square">(
    initial.avatarShape ?? "circle",
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    initial.backgroundImageUrl ?? "",
  );
  const [avatarPosX, setAvatarPosX] = useState(initial.avatarPositionX ?? 50);
  const [avatarPosY, setAvatarPosY] = useState(initial.avatarPositionY ?? 50);
  const [bannerPosX, setBannerPosX] = useState(initial.bannerPositionX ?? 50);
  const [bannerPosY, setBannerPosY] = useState(initial.bannerPositionY ?? 50);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [bannerBlobUrl, setBannerBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(bannerFile);
    setBannerBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bannerFile]);

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

  const previewAvatarSrc =
    avatarBlobUrl ||
    (!avatarRemoved && (avatarUrl.trim() || null)) ||
    null;
  const previewBannerSrc =
    bannerBlobUrl ||
    (!bannerRemoved && (backgroundImageUrl.trim() || null)) ||
    null;

  const avatarRoundClass =
    avatarShape === "square" ? "rounded-xl" : "rounded-full";

  function onPickAvatar(f: File | null) {
    if (!f) return;
    const msg = validateProfileImageFile(f);
    if (msg) {
      toast.error(msg);
      return;
    }
    setAvatarFile(f);
    setAvatarRemoved(false);
  }

  function onPickBanner(f: File | null) {
    if (!f) return;
    const msg = validateProfileImageFile(f);
    if (msg) {
      toast.error(msg);
      return;
    }
    setBannerFile(f);
    setBannerRemoved(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let nextAvatarUrl =
        avatarRemoved ? null : avatarUrl.trim() || null;
      let nextBannerUrl =
        bannerRemoved ? null : backgroundImageUrl.trim() || null;
      let nextAvatarPath = avatarRemoved ? null : avatarStoragePath;
      let nextBannerPath = bannerRemoved ? null : bannerStoragePath;

      if (avatarFile) {
        const r = await uploadProfileMediaAsset(userId, "avatar", avatarFile);
        if ("error" in r) {
          toast.error(r.error);
          return;
        }
        nextAvatarUrl = r.publicUrl;
        nextAvatarPath = r.path;
      }

      if (bannerFile) {
        const r = await uploadProfileMediaAsset(userId, "banner", bannerFile);
        if ("error" in r) {
          toast.error(r.error);
          return;
        }
        nextBannerUrl = r.publicUrl;
        nextBannerPath = r.path;
      }

      if (!nextAvatarUrl) nextAvatarPath = null;
      if (!nextBannerUrl) nextBannerPath = null;

      await updateProfileDesign({
        avatar_url: nextAvatarUrl,
        avatar_shape: avatarShape,
        profile_background_image: nextBannerUrl,
        avatar_storage_path: nextAvatarPath,
        profile_banner_storage_path: nextBannerPath,
        avatar_position_x: avatarPosX,
        avatar_position_y: avatarPosY,
        banner_position_x: bannerPosX,
        banner_position_y: bannerPosY,
        profile_show_rank: showRank,
        profile_show_points: showPoints,
        profile_achievement_mode: achievementMode,
        profile_favorite_achievement_id: favoriteAchievementId.trim() || null,
        profile_slogan: slogan.trim() || null,
        profile_show_slogan: showSlogan,
      });

      const delPaths: string[] = [];
      if (avatarFile && initial.avatarStoragePath && initial.avatarStoragePath !== nextAvatarPath) {
        delPaths.push(initial.avatarStoragePath);
      }
      if (bannerFile && initial.profileBannerStoragePath && initial.profileBannerStoragePath !== nextBannerPath) {
        delPaths.push(initial.profileBannerStoragePath);
      }
      if (avatarRemoved && initial.avatarStoragePath) {
        delPaths.push(initial.avatarStoragePath);
      }
      if (bannerRemoved && initial.profileBannerStoragePath) {
        delPaths.push(initial.profileBannerStoragePath);
      }
      for (const p of delPaths) {
        await removeProfileMediaAsset(p);
      }

      setAvatarFile(null);
      setBannerFile(null);
      if (nextAvatarUrl) setAvatarUrl(nextAvatarUrl);
      if (nextBannerUrl) setBackgroundImageUrl(nextBannerUrl);
      setAvatarStoragePath(nextAvatarPath);
      setBannerStoragePath(nextBannerPath);
      setAvatarRemoved(false);
      setBannerRemoved(false);

      toast.success("Profil-Design gespeichert.");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const acceptAttr = PROFILE_MEDIA_ACCEPT_MIME.join(",");

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
        Header &amp; Profil-Design
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar */}
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
          <div className="space-y-3">
            <label className="block font-barlow font-bold text-sm uppercase text-accent-gold">
              Avatar (Vorschau)
            </label>
            <div
              className={`relative h-24 w-24 shrink-0 overflow-hidden border-2 border-accent-gold/50 bg-hero-dark shadow-lg ${avatarRoundClass}`}
            >
              {previewAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob/data URLs
                <img
                  src={previewAvatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${avatarPosX}% ${avatarPosY}%`,
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-libre text-xs text-gray-500">
                  Kein Bild
                </div>
              )}
            </div>
            <input
              type="file"
              accept={acceptAttr}
              className="block w-full max-w-xs text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
              onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
            />
            <p className="font-libre text-xs text-gray-500 max-w-xs">
              Max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB, JPEG/PNG/WebP.
            </p>
            {(previewAvatarSrc || avatarUrl) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarUrl("");
                  setAvatarRemoved(true);
                  setAvatarStoragePath(null);
                }}
                className="text-sm font-libre text-red-400 hover:underline"
              >
                Avatar entfernen
              </button>
            )}
          </div>
          <div className="space-y-4">
            <label className="block font-barlow font-bold text-sm uppercase text-accent-gold">
              Bildausrichtung (Avatar)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-libre text-xs text-gray-400 w-16">Horizontal</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={avatarPosX}
                  onChange={(e) => setAvatarPosX(Number(e.target.value))}
                  className="flex-1 accent-hero-vibrant"
                />
                <span className="font-libre text-xs text-gray-500 w-8">{avatarPosX}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-libre text-xs text-gray-400 w-16">Vertikal</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={avatarPosY}
                  onChange={(e) => setAvatarPosY(Number(e.target.value))}
                  className="flex-1 accent-hero-vibrant"
                />
                <span className="font-libre text-xs text-gray-500 w-8">{avatarPosY}</span>
              </div>
            </div>
            <label className="block font-barlow font-bold text-sm uppercase text-accent-gold mt-4">
              Oder Avatar-URL
            </label>
            <input
              type="url"
              value={avatarRemoved ? "" : avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setAvatarRemoved(false);
              }}
              placeholder="https://…"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white font-libre text-sm outline-none focus:border-hero-vibrant"
            />
            <div className="flex items-center gap-4 pt-2">
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
        </div>

        {/* Banner */}
        <div className="space-y-4 border-t border-hero-border pt-6">
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold">
            Hintergrund / Banner (Vorschau)
          </label>
          <div
            className="relative min-h-[140px] w-full overflow-hidden rounded-lg border border-hero-border bg-hero-dark"
            style={
              previewBannerSrc
                ? {
                    backgroundImage: `url(${previewBannerSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: `${bannerPosX}% ${bannerPosY}%`,
                  }
                : {
                    background:
                      "linear-gradient(135deg, var(--hero-dark, #0a1f10) 0%, var(--background-card, #132e1b) 100%)",
                  }
            }
          >
            <div className="absolute inset-0 bg-black/35 pointer-events-none" />
            <p className="relative z-[1] p-4 font-libre text-xs text-gray-400">
              So wirkt das Banner über dem Profil-Inhalt (ungefähre Höhe).
            </p>
          </div>
          <input
            type="file"
            accept={acceptAttr}
            className="block w-full max-w-md text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
            onChange={(e) => onPickBanner(e.target.files?.[0] ?? null)}
          />
          {(previewBannerSrc || backgroundImageUrl) && (
            <button
              type="button"
              onClick={() => {
                setBannerFile(null);
                setBackgroundImageUrl("");
                setBannerRemoved(true);
                setBannerStoragePath(null);
              }}
              className="text-sm font-libre text-red-400 hover:underline"
            >
              Hintergrundbild entfernen
            </button>
          )}
          <div className="space-y-2">
            <span className="font-libre text-sm text-gray-400">Ausrichtung (Banner)</span>
            <div className="flex items-center gap-3">
              <span className="font-libre text-xs text-gray-400 w-16">Horizontal</span>
              <input
                type="range"
                min={0}
                max={100}
                value={bannerPosX}
                onChange={(e) => setBannerPosX(Number(e.target.value))}
                className="flex-1 accent-hero-vibrant max-w-md"
              />
              <span className="font-libre text-xs text-gray-500 w-8">{bannerPosX}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-libre text-xs text-gray-400 w-16">Vertikal</span>
              <input
                type="range"
                min={0}
                max={100}
                value={bannerPosY}
                onChange={(e) => setBannerPosY(Number(e.target.value))}
                className="flex-1 accent-hero-vibrant max-w-md"
              />
              <span className="font-libre text-xs text-gray-500 w-8">{bannerPosY}</span>
            </div>
          </div>
          <label className="block font-barlow font-bold text-sm uppercase text-accent-gold">
            Oder Banner-URL
          </label>
          <input
            type="url"
            value={bannerRemoved ? "" : backgroundImageUrl}
            onChange={(e) => {
              setBackgroundImageUrl(e.target.value);
              setBannerRemoved(false);
            }}
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
