"use client";

import Link from "next/link";
import { Globe, Info, MapPin, User } from "lucide-react";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import type { ImageDisplaySettings } from "@/src/lib/image-display";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";

type LanguageOption = { id: string; name: string };
type LocationOption = { id: string; name: string; type?: string };

export type CharacterSheetLoreProfileFieldsProps = {
  campaignId: string;
  readOnly?: boolean;
  avatarUrl: string;
  onAvatarUrlChange: (url: string) => void;
  avatarFile: File | null;
  onAvatarFileChange: (file: File | null) => void;
  avatarBlobUrl: string | null;
  avatarDisplay: ImageDisplaySettings;
  onAvatarDisplayChange: (value: ImageDisplaySettings) => void;
  onClearAvatar: () => void;
  languages: string[];
  onToggleLanguage: (id: string) => void;
  languageOptions: LanguageOption[];
  currentLocationId: string;
  onCurrentLocationChange: (id: string) => void;
  locationOptions: LocationOption[];
};

export function CharacterSheetLoreProfileFields({
  campaignId,
  readOnly = false,
  avatarUrl,
  onAvatarUrlChange,
  avatarFile,
  onAvatarFileChange,
  avatarBlobUrl,
  avatarDisplay,
  onAvatarDisplayChange,
  onClearAvatar,
  languages,
  onToggleLanguage,
  languageOptions,
  currentLocationId,
  onCurrentLocationChange,
  locationOptions,
}: CharacterSheetLoreProfileFieldsProps) {
  const previewSrc = avatarBlobUrl || avatarUrl.trim();

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-5">
      <div className="border-b border-hero-dark pb-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
          <User className="h-4 w-4" />
          Portrait &amp; Weltprofil
        </h3>
        <p className="mt-1 font-libre text-xs text-gray-500">
          Diese Angaben stammen aus der TableHeroes-Welt (Lore) und werden nicht aus Foundry
          importiert. Foundry-Sprachen im Blatt oben sind nur Referenz aus dem Spielsystem.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-3">
          <label className="block text-xs font-barlow font-bold uppercase text-gray-500">
            Charakterportrait
          </label>
          <div className="flex flex-wrap items-start gap-4">
            {previewSrc ? (
              <CharacterAvatarImage
                src={previewSrc}
                avatarDisplay={avatarDisplay}
                className="h-32 w-32 shrink-0 rounded-lg border-2 border-hero-border bg-hero-dark"
                alt=""
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-hero-border/60 bg-hero-dark/40 px-2 text-center font-libre text-[10px] text-gray-500">
                Kein Bild
              </div>
            )}
            {!readOnly ? (
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
                  className="block w-full text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) return;
                    const msg = validateProfileImageFile(f);
                    if (msg) {
                      alert(msg);
                      return;
                    }
                    onAvatarFileChange(f);
                  }}
                />
                <p className="font-libre text-xs text-gray-500">
                  Max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB (JPEG/PNG/WebP).
                </p>
                {previewSrc ? (
                  <button
                    type="button"
                    onClick={onClearAvatar}
                    className="text-sm font-libre text-red-400 hover:underline"
                  >
                    Bild entfernen
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {!readOnly ? (
            <>
              <label className="block text-xs font-barlow font-bold uppercase text-gray-500">
                Bild-URL (optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => onAvatarUrlChange(e.target.value)}
                placeholder="https://…"
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
              />
              {previewSrc ? (
                <ImageUrlDisplayEditor
                  value={avatarDisplay}
                  onChange={onAvatarDisplayChange}
                  previewUrl={previewSrc}
                  previewAspectClassName="aspect-[3/4] max-w-[220px]"
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div className="lg:col-span-8 space-y-5">
          <div id="character-sprachen" className="scroll-mt-24">
            <label className="mb-2 flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
              <Globe className="h-3.5 w-3.5" />
              Sprachen (Welt-Lore)
            </label>
            {languageOptions.length === 0 ? (
              <p className="font-libre text-sm text-gray-500 italic">
                Für diese Kampagne sind keine freigegebenen Sprachen hinterlegt. Kontaktiere deinen
                Spielleiter.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => (
                  <label
                    key={lang.id}
                    className={`flex items-center gap-2 rounded border border-hero-border bg-hero-dark/40 px-3 py-2 font-libre text-sm text-gray-200 ${
                      readOnly ? "opacity-80" : "cursor-pointer hover:border-hero-vibrant/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={languages.includes(lang.id)}
                      disabled={readOnly}
                      onChange={() => onToggleLanguage(lang.id)}
                      className="rounded border-hero-dark"
                    />
                    {lang.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {locationOptions.length > 0 ? (
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                Heimatort
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={currentLocationId}
                  disabled={readOnly}
                  onChange={(e) => onCurrentLocationChange(e.target.value)}
                  className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
                >
                  <option value="">— Noch nicht gewählt —</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.type ? ` (${loc.type})` : ""}
                    </option>
                  ))}
                </select>
                {currentLocationId ? (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${currentLocationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-border bg-hero-dark/60 p-2 text-gray-500 hover:text-accent-gold"
                    title="Ort in der Lore anzeigen"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
