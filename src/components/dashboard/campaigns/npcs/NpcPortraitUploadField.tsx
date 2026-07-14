"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { Flag, User } from "lucide-react";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";

import { NpcPortraitAttribution } from "./NpcPortraitAttribution";
import { EntityImageRightsFields } from "@/src/components/ui/EntityImageRightsFields";

type Props = {
  imageUrl: string;
  portraitFile: File | null;
  onPortraitFileChange: (file: File | null) => void;
  imageDisplay: ImageDisplaySettings;
  onImageDisplayChange: (value: ImageDisplaySettings) => void;
  onClearImage?: () => void;
  previewAspectClassName?: string;
  compact?: boolean;
  /** True wenn das angezeigte Bild per KI erzeugt wurde (nicht Upload). */
  isAiGenerated?: boolean;
  onIsAiGeneratedChange?: (value: boolean) => void;
  uploadRightsConfirmed?: boolean;
  onUploadRightsConfirmedChange?: (confirmed: boolean) => void;
  urlRightsConfirmed?: boolean;
  onUrlRightsConfirmedChange?: (confirmed: boolean) => void;
  /** Vorschau-Alt-Text und Upload-Hinweis (z. B. Fraktions-Wappen). */
  previewAlt?: string;
  uploadHint?: string;
  /** Leerer Platzhalter: NPC-Portrait oder Fraktions-Wappen. */
  emptyIcon?: "user" | "flag";
};

export function NpcPortraitUploadField({
  imageUrl,
  portraitFile,
  onPortraitFileChange,
  imageDisplay,
  onImageDisplayChange,
  onClearImage,
  previewAspectClassName = "aspect-[3/4] max-w-[220px]",
  compact = false,
  isAiGenerated = false,
  onIsAiGeneratedChange,
  uploadRightsConfirmed = false,
  onUploadRightsConfirmedChange,
  urlRightsConfirmed = false,
  onUrlRightsConfirmedChange,
  previewAlt = "NPC-Portrait Vorschau",
  uploadHint,
  emptyIcon = "user",
}: Props) {
  const EmptyIcon = emptyIcon === "flag" ? Flag : User;
  const blobPreview = useMemo(
    () => (portraitFile ? URL.createObjectURL(portraitFile) : null),
    [portraitFile],
  );

  useEffect(() => {
    return () => {
      if (blobPreview) URL.revokeObjectURL(blobPreview);
    };
  }, [blobPreview]);

  const previewUrl = blobPreview || imageUrl.trim();
  const hasImage = !!previewUrl;
  const showAiAttribution = isAiGenerated && hasImage && !blobPreview;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-1">
          {hasImage ? (
            <div
              className={`relative overflow-hidden rounded-xl border-2 border-hero-border shadow-lg ${previewAspectClassName}`}
              style={imageDisplayBackdropStyle(imageDisplay)}
            >
              <Image
                src={previewUrl}
                alt={previewAlt}
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
              <EmptyIcon className="h-16 w-16 text-gray-600" />
            </div>
          )}
          {showAiAttribution ? <NpcPortraitAttribution isAiGenerated className="max-w-[220px]" /> : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="file"
            accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
            className="block w-full max-w-md text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (!file) return;
              const msg = validateProfileImageFile(file);
              if (msg) {
                alert(msg);
                return;
              }
              onPortraitFileChange(file);
              onUploadRightsConfirmedChange?.(false);
              onIsAiGeneratedChange?.(false);
              onUrlRightsConfirmedChange?.(false);
            }}
          />
          {portraitFile && onUploadRightsConfirmedChange ? (
            <EntityImageRightsFields
              mode="upload"
              isAiGenerated={false}
              onIsAiGeneratedChange={() => {}}
              uploadRightsConfirmed={uploadRightsConfirmed}
              onUploadRightsConfirmedChange={onUploadRightsConfirmedChange}
              urlRightsConfirmed={false}
              onUrlRightsConfirmedChange={() => {}}
              showPublicHint={false}
            />
          ) : null}
          {!portraitFile && hasImage && onIsAiGeneratedChange && onUrlRightsConfirmedChange ? (
            <EntityImageRightsFields
              mode="url"
              isAiGenerated={isAiGenerated}
              onIsAiGeneratedChange={onIsAiGeneratedChange}
              uploadRightsConfirmed={false}
              onUploadRightsConfirmedChange={() => {}}
              urlRightsConfirmed={urlRightsConfirmed}
              onUrlRightsConfirmedChange={onUrlRightsConfirmedChange}
            />
          ) : null}
          <p className="font-libre text-xs text-gray-500">
            {uploadHint ??
              `Portrait hochladen (JPEG/PNG/WebP, wird automatisch als WebP komprimiert, max. ${Math.round(
                PROFILE_MEDIA_MAX_BYTES / 1024 / 1024,
              )} MB). Wird in TableHeroes gespeichert — kein externer Bild-Link nötig.`}
          </p>
          {hasImage && onClearImage ? (
            <button
              type="button"
              onClick={onClearImage}
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
