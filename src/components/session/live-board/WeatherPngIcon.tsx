/**
 * WeatherPngIcon — Renders a weather preset PNG with Lucide fallback on load error.
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import type { WeatherIconOption } from "./live-session-types";

export function WeatherPngIcon({
  option,
  sizeClassName,
}: {
  option: WeatherIconOption;
  sizeClassName: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const FallbackIcon = option.FallbackIcon;

  if (hasImageError) {
    return <FallbackIcon className={sizeClassName} strokeWidth={1.7} />;
  }

  return (
    <span className={`relative block ${sizeClassName}`}>
      <Image
        src={option.src}
        alt={option.label}
        fill
        sizes="(max-width: 768px) 96px, 128px"
        className="object-contain"
        onError={() => setHasImageError(true)}
      />
    </span>
  );
}
