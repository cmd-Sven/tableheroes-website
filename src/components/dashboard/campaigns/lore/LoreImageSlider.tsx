"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type AdditionalImage = {
  url: string;
  description: string;
};

type Props = {
  images: AdditionalImage[];
};

export function LoreImageSlider({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      // Fade out
      setFade(false);
      
      setTimeout(() => {
        // Change image
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setShowDescription(false);
        
        // Fade in
        setFade(true);
        
        // Show description after 500ms
        setTimeout(() => {
          setShowDescription(true);
        }, 500);
        
        // Hide description after 2500ms
        setTimeout(() => {
          setShowDescription(false);
        }, 2500);
      }, 300); // Wait for fade out
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="relative w-96 aspect-video rounded-lg overflow-hidden border-2 border-hero-border shadow-2xl bg-hero-dark/50 backdrop-blur-sm">
      {/* Image */}
      <div className="relative w-full h-full">
        <Image
          src={currentImage.url}
          alt={currentImage.description || `Bild ${currentIndex + 1}`}
          fill
          className={`object-cover transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Description */}
      {currentImage.description && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 transition-opacity duration-300 ${
            showDescription ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-libre text-base text-white drop-shadow-lg">{currentImage.description}</p>
        </div>
      )}

      {/* Image indicators */}
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

