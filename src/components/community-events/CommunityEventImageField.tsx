"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2 } from "lucide-react";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  uploadCommunityEventImage,
  validateProfileImageFile,
} from "@/src/lib/profile-media";

type Props = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  /** Bestehende Event-ID für Upload-Pfad (optional). */
  eventId?: string | null;
};

/**
 * Termin-/Beitragsbild: URL einfügen oder Datei hochladen (profile-media Bucket).
 */
export function CommunityEventImageField({
  imageUrl,
  onImageUrlChange,
  eventId,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const previewUrl = useMemo(
    () => localPreview || imageUrl.trim() || null,
    [localPreview, imageUrl],
  );

  async function handleFile(file: File | null) {
    setUploadError(null);
    if (!file) return;

    const msg = validateProfileImageFile(file);
    if (msg) {
      setUploadError(msg);
      return;
    }

    const blob = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob;
    });

    setUploading(true);
    try {
      const result = await uploadCommunityEventImage(file, { eventId });
      if ("error" in result) {
        setUploadError(result.error);
        return;
      }
      onImageUrlChange(result.publicUrl);
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
        Terminbild / Beitragsbild (optional)
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border border-hero-dark bg-slate-950">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Vorschau Terminbild"
              fill
              unoptimized={!!localPreview}
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 24rem"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-600">
              <ImageIcon className="h-10 w-10" aria-hidden />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
              Bild-URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setLocalPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                onImageUrlChange(e.target.value);
                setUploadError(null);
              }}
              placeholder="https://… oder Datei hochladen"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white outline-none focus:border-hero-vibrant"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
              Oder Datei hochladen
            </label>
            <input
              type="file"
              accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
              disabled={uploading}
              className="block w-full text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                void handleFile(file);
              }}
            />
            <p className="mt-1 font-libre text-xs text-gray-500">
              Max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB · JPEG/PNG/WebP. Erscheint
              auf der Startseite, wenn „Auf Startseite anzeigen“ aktiv ist.
            </p>
          </div>

          {previewUrl ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                setLocalPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                onImageUrlChange("");
                setUploadError(null);
              }}
              className="font-barlow text-xs font-bold uppercase text-red-300 hover:text-red-200"
            >
              Bild entfernen
            </button>
          ) : null}

          {uploadError ? (
            <p className="font-libre text-xs text-red-400">{uploadError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
