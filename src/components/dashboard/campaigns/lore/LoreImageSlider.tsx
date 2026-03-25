"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";

export type LoreHeaderSlide = {
  url: string;
  description: string;
  display?: ImageDisplaySettings | unknown | null;
};

/** Header-Variante: volle Breite, Darstellung pro Slide aus image_display / Galerie. */
export function LoreHeaderImageSlider({ images }: { images: LoreHeaderSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;
  const currentImage = images[currentIndex];
  const display = normalizeImageDisplay(currentImage.display);

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ ...imageDisplayBackdropStyle(display), opacity: fade ? 1 : 0 }}
      >
        <Image
          src={currentImage.url}
          alt={currentImage.description || `Bild ${currentIndex + 1}`}
          fill
          className="transition-opacity duration-300"
          style={imageDisplayObjectStyle(display)}
          sizes="100vw"
          priority
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-8 bg-hero-vibrant" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  images: LoreHeaderSlide[];
};

export function LoreImageSlider({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setShowDescription(false);

        setFade(true);

        setTimeout(() => {
          setShowDescription(true);
        }, 500);

        setTimeout(() => {
          setShowDescription(false);
        }, 2500);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];
  const display = normalizeImageDisplay(currentImage.display);

  return (
    <div className="relative w-96 rounded-lg border-2 border-hero-border bg-hero-dark/50 shadow-2xl backdrop-blur-sm aspect-video overflow-hidden">
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ ...imageDisplayBackdropStyle(display), opacity: fade ? 1 : 0 }}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.description || `Bild ${currentIndex + 1}`}
            fill
            className="transition-opacity duration-300"
            style={imageDisplayObjectStyle(display)}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {currentImage.description && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 transition-opacity duration-300 ${
            showDescription ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-libre text-base text-white drop-shadow-lg">{currentImage.description}</p>
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute top-2 right-2 flex gap-1">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-6 bg-hero-vibrant" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
