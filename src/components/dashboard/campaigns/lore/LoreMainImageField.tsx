"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { ImageIcon, Sparkles } from "lucide-react";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import {
  DEFAULT_IMAGE_DISPLAY,
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";

type Props = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  imageFile: File | null;
  onImageFileChange: (file: File | null) => void;
  imageDisplay: ImageDisplaySettings;
  onImageDisplayChange: (value: ImageDisplaySettings) => void;
  isAiGenerated: boolean;
  onIsAiGeneratedChange: (value: boolean) => void;
  uploadRightsConfirmed: boolean;
  onUploadRightsConfirmedChange: (value: boolean) => void;
  urlRightsConfirmed: boolean;
  onUrlRightsConfirmedChange: (value: boolean) => void;
};

export function LoreMainImageField({
  imageUrl,
  onImageUrlChange,
  imageFile,
  onImageFileChange,
  imageDisplay,
  onImageDisplayChange,
  isAiGenerated,
  onIsAiGeneratedChange,
  uploadRightsConfirmed,
  onUploadRightsConfirmedChange,
  urlRightsConfirmed,
  onUrlRightsConfirmedChange,
}: Props) {
  const blobPreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    return () => {
      if (blobPreview) URL.revokeObjectURL(blobPreview);
    };
  }, [blobPreview]);

  const previewUrl = blobPreview || imageUrl.trim();
  const hasImage = !!previewUrl;
  const showAiAttribution = isAiGenerated && hasImage && !imageFile;
  const previewAspectClassName = "aspect-video w-full max-w-xl";

  const clearImage = () => {
    onImageUrlChange("");
    onImageFileChange(null);
    onIsAiGeneratedChange(false);
    onUploadRightsConfirmedChange(false);
    onUrlRightsConfirmedChange(false);
    onImageDisplayChange({ ...DEFAULT_IMAGE_DISPLAY });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-full max-w-xl space-y-2">
          {hasImage ? (
            <div
              className={`relative overflow-hidden rounded-xl border-2 border-hero-border shadow-lg ${previewAspectClassName}`}
              style={imageDisplayBackdropStyle(imageDisplay)}
            >
              <Image
                src={previewUrl}
                alt="Lore-Bild Vorschau"
                fill
                unoptimized={!!blobPreview}
                className="select-none"
                style={imageDisplayObjectStyle(imageDisplay)}
              />
            </div>
          ) : (
            <div
              className={`flex items-center justify-center rounded-xl border-2 border-dashed border-hero-border bg-hero-dark/40 ${previewAspectClassName}`}
            >
              <ImageIcon className="h-12 w-12 text-gray-600" />
            </div>
          )}
          {showAiAttribution ? <NpcPortraitAttribution isAiGenerated /> : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Bild-URL (optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                onImageUrlChange(e.target.value);
                if (e.target.value.trim()) onImageFileChange(null);
              }}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2.5 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
              placeholder="https://example.com/bild.jpg"
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Oder Datei hochladen
            </label>
            <input
              type="file"
              accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
              className="block w-full text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!file) return;
                const msg = validateProfileImageFile(file);
                if (msg) {
                  alert(msg);
                  return;
                }
                onImageFileChange(file);
                onImageUrlChange("");
                onUploadRightsConfirmedChange(false);
                onUrlRightsConfirmedChange(false);
                onIsAiGeneratedChange(false);
              }}
            />
            <p className="mt-1 font-libre text-xs text-gray-500">
              Max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB, JPEG/PNG/WebP. Wird in
              Table Heroes gespeichert.
            </p>
          </div>

          {hasImage ? (
            <div className="rounded border border-hero-border/50 bg-hero-dark/30 p-3 space-y-2">
              <p className="font-barlow text-xs font-bold uppercase text-gray-400">
                Bildrechte (für öffentliche Anzeige)
              </p>
              {imageFile ? (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={uploadRightsConfirmed}
                    onChange={(e) => onUploadRightsConfirmedChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
                  />
                  <span className="font-libre text-xs leading-relaxed text-gray-300">
                    Ich bestätige, dass ich die Nutzungsrechte an diesem hochgeladenen Bild besitze.
                  </span>
                </label>
              ) : (
                <>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isAiGenerated}
                      onChange={(e) => {
                        onIsAiGeneratedChange(e.target.checked);
                        if (e.target.checked) onUrlRightsConfirmedChange(false);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
                    />
                    <span className="flex items-center gap-1 font-libre text-xs text-gray-300">
                      <Sparkles className="h-3.5 w-3.5 text-accent-gold/80" />
                      Bild ist KI-generiert
                    </span>
                  </label>
                  {!isAiGenerated ? (
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={urlRightsConfirmed}
                        onChange={(e) => onUrlRightsConfirmedChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
                      />
                      <span className="font-libre text-xs leading-relaxed text-gray-300">
                        Ich bestätige die Nutzungsrechte an dieser Bild-URL für die öffentliche
                        Anzeige.
                      </span>
                    </label>
                  ) : null}
                </>
              )}
              <p className="font-libre text-[11px] text-gray-500">
                Ohne Rechtebestätigung oder KI-Kennzeichnung wird das Bild auf der öffentlichen
                Lore-Seite ausgeblendet.
              </p>
            </div>
          ) : null}

          {hasImage ? (
            <button
              type="button"
              onClick={clearImage}
              className="text-sm font-libre text-red-400 hover:underline"
            >
              Bild entfernen
            </button>
          ) : null}
        </div>
      </div>

      {hasImage ? (
        <ImageUrlDisplayEditor
          value={imageDisplay}
          onChange={onImageDisplayChange}
          previewUrl={previewUrl}
          previewAspectClassName={previewAspectClassName}
        />
      ) : null}
    </div>
  );
}
