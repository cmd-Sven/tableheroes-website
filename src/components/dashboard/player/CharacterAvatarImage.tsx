"use client";

import Image from "next/image";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";

type Props = {
  src: string;
  avatarDisplay?: unknown;
  alt?: string;
  /** Container (z. B. h-32 w-32 rounded-lg) */
  className?: string;
  /** Wenn true: next/image mit fill (benötigt className mit Größe) */
  asNextImage?: boolean;
  sizes?: string;
};

/**
 * Charakterportrait mit gespeichertem Ausschnitt (avatar_display),
 * analog zu NPC-Bilddarstellung.
 */
export function CharacterAvatarImage({
  src,
  avatarDisplay,
  alt = "",
  className = "",
  asNextImage = false,
  sizes = "128px",
}: Props) {
  const d = normalizeImageDisplay(avatarDisplay);
  const backdrop = imageDisplayBackdropStyle(d);
  const object = imageDisplayObjectStyle(d);
  const unopt =
    src.startsWith("http://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.includes("localhost") ||
    src.includes("supabase.co");

  if (asNextImage) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={backdrop}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="select-none"
          style={object}
          unoptimized={unopt}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={backdrop}>
      {/* eslint-disable-next-line @next/next/no-img-element -- externe & Supabase-URLs */}
      <img src={src} alt={alt} className="h-full w-full select-none" style={object} />
    </div>
  );
}
