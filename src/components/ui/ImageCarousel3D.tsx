"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarousel3DProps {
  images: Array<{ src: string; alt: string }>;
  autoCarousel?: boolean;
  autoInterval?: number;
  onImageClick?: (index: number) => void;
}

export function ImageCarousel3D({
  images,
  autoCarousel = true,
  autoInterval = 3000,
  onImageClick,
}: ImageCarousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const n = images.length;
  const theta = (Math.PI * 2) / n;

  const setupCarousel = () => {
    if (!sceneRef.current || !itemRefs.current[0]) return;

    const firstItem = itemRefs.current[0];
    const width = firstItem.offsetWidth;
    const apothem = width / (2 * Math.tan(Math.PI / n));

    // Set transform origin for scene
    if (sceneRef.current) {
      sceneRef.current.style.transformOrigin = `50% 50% ${-apothem}px`;
    }

    // Set transform origin and rotation for each item
    itemRefs.current.forEach((item, i) => {
      if (item && i > 0) {
        item.style.transformOrigin = `50% 50% ${-apothem}px`;
        item.style.transform = `rotateY(${i * theta}rad)`;
      }
    });
  };

  const updateSceneRotation = () => {
    if (sceneRef.current) {
      sceneRef.current.style.transform = `rotateY(${currentIndex * -theta}rad)`;
    }
  };

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % n);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + n) % n);
  };

  const setCarouselInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (autoCarousel) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % n);
      }, autoInterval);
    }
  };

  // Setup carousel on mount and resize
  useEffect(() => {
    if (n === 0) return;

    // Initial setup
    setupCarousel();
    updateSceneRotation();

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver(() => {
      setupCarousel();
      updateSceneRotation();
    });

    if (carouselRef.current) {
      resizeObserverRef.current.observe(carouselRef.current);
    }

    // Setup auto carousel
    setCarouselInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [n, images.length]);

  // Update scene rotation when currentIndex changes
  useEffect(() => {
    updateSceneRotation();
    if (autoCarousel) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const timeout = setTimeout(() => {
        setCarouselInterval();
      }, autoInterval);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, autoCarousel, autoInterval, n, theta]);

  if (n === 0) return null;

  return (
    <div
      ref={carouselRef}
      className="w-full overflow-hidden"
      style={{ perspective: "1000px" }}
    >
      {/* 3D Scene */}
      <div
        ref={sceneRef}
        className="w-[85%] sm:w-[70%] md:w-[55%] lg:w-[42%] mx-auto mt-10"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.5s",
        }}
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`w-full box-border ${
              i === 0 ? "relative" : "absolute left-0 top-0"
            }`}
            style={{
              padding: i === 0 ? "0 20px 0 10px" : "0 20px 0 10px",
              backfaceVisibility: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => onImageClick?.(i)}
              className="relative w-full aspect-square overflow-hidden rounded-lg border border-hero-border/40 shadow-lg group hover:border-accent-gold/60 transition-colors cursor-pointer"
              aria-label={`${image.alt} vergrößern`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 42vw"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="w-full max-w-[100px] mx-auto mt-5 flex items-center justify-center gap-2.5 select-none">
        <button
          type="button"
          onClick={prev}
          className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full border-2 border-hero-border/60 text-hero-border/60 hover:text-accent-gold hover:border-accent-gold transition-all duration-300 bg-background-card/50 hover:bg-background-card"
          aria-label="Vorheriges Bild"
        >
          <ChevronLeft className="h-5 w-5 ml-0.5" />
        </button>
        <button
          type="button"
          onClick={next}
          className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full border-2 border-hero-border/60 text-hero-border/60 hover:text-accent-gold hover:border-accent-gold transition-all duration-300 bg-background-card/50 hover:bg-background-card"
          aria-label="Nächstes Bild"
        >
          <ChevronRight className="h-5 w-5 mr-0.5" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "bg-accent-gold w-6"
                : "bg-hero-border/40 hover:bg-hero-border/60"
            }`}
            aria-label={`Gehe zu Bild ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
