"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ImageCarousel3D } from "@/src/components/ui/ImageCarousel3D";

const SLIDE_INTERVAL_MS = 6000;

type Slide = {
  src: string;
  alt: string;
};

const SLIDES: Slide[] = [
  { src: "/images/impressions/1.png", alt: "TableHeroes Impression 1" },
  { src: "/images/impressions/2.jpg", alt: "TableHeroes Impression 2" },
  { src: "/images/impressions/3.jpeg", alt: "TableHeroes Impression 3" },
  { src: "/images/impressions/4.jpeg", alt: "TableHeroes Impression 4" },
  { src: "/images/impressions/5.jpeg", alt: "TableHeroes Impression 5" },
  { src: "/images/impressions/6.png", alt: "TableHeroes Impression 6" },
  { src: "/images/impressions/7.png", alt: "TableHeroes Impression 7" },
  { src: "/images/impressions/8.jpeg", alt: "TableHeroes Impression 8" },
  { src: "/images/impressions/9.png", alt: "TableHeroes Impression 9" },
  { src: "/images/impressions/10.jpg", alt: "TableHeroes Impression 10" },
  { src: "/images/impressions/11.png", alt: "TableHeroes Impression 11" },
  { src: "/images/impressions/12.png", alt: "TableHeroes Impression 12" },
  { src: "/images/impressions/13.png", alt: "TableHeroes Impression 13" },
  { src: "/images/impressions/14.png", alt: "TableHeroes Impression 14" },
  { src: "/images/impressions/15.jpg", alt: "TableHeroes Impression 15" },
  { src: "/images/impressions/16.jpg", alt: "TableHeroes Impression 16" },
  { src: "/images/impressions/20.jpeg", alt: "TableHeroes Impression 20" },
];

const RUNES = ["ᚱ", "ᚦ", "ᚨ", "ᚲ", "ᚾ", "ᚺ", "ᛃ", "ᛟ"];

export function ImageSliderSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section
      className="relative scroll-mt-20 bg-background-dark overflow-hidden"
      style={{
        backgroundImage: "url('/images/dragon-town.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Dunkle Maske über dem Hintergrundbild mit radialem Verlauf (Vignette) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      
      <div className="relative mx-auto max-w-6xl px-6 py-16 z-10">
        <div className="text-center mb-10">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8 inline-block">
            Impressionen aus unseren Abenteuern
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed max-w-2xl mx-auto">
            Ein Blick hinter die Kulissen unserer Spielrunden und Community-Events.
          </p>
        </div>

        {/* 3D Carousel */}
        <div className="relative rounded-2xl bg-background-card/80 shadow-2xl z-20 p-8">
          <ImageCarousel3D
            images={SLIDES}
            autoCarousel={true}
            autoInterval={3000}
            onImageClick={setLightboxIndex}
          />
        </div>
      </div>

      {/* Lightbox für vergrößerte Ansicht */}
      <AnimatePresence>
        {lightboxIndex !== null && SLIDES[lightboxIndex] && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              className="relative w-[92vw] max-w-5xl max-h-[85vh]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-[60vh] md:h-[70vh] bg-black">
                <Image
                  src={SLIDES[lightboxIndex].src}
                  alt={SLIDES[lightboxIndex].alt}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  quality={90}
                  priority={false}
                />
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-barlow font-bold uppercase tracking-wide text-gray-100 hover:bg-black/90"
              >
                Schließen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glühende Runen-Reihe am unteren Rand */}
      <div className="pointer-events-none absolute bottom-[20px] left-0 w-full flex justify-center z-30">
        <div className="flex w-full max-w-6xl justify-between px-4 md:px-6 lg:px-8">
          {RUNES.map((rune, index) => (
            <span
              key={`${rune}-${index}`}
              className={[
                "rune-glow font-cinzel tracking-[0.35em]",
                "text-[9px] md:text-xs lg:text-sm",
                index >= 6 ? "hidden sm:inline-block" : "",
              ].join(" ")}
              style={{ animationDelay: `${index * 1.25}s` }}
            >
              {rune}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .rune-glow {
          color: #ffe8c7;
          text-shadow: 0 0 5px #ff4500, 0 0 10px #ff4500, 0 0 20px #ff0000;
          opacity: 0;
          animation: rune-pulse 6s ease-in-out infinite;
        }

        @keyframes rune-pulse {
          0% {
            opacity: 0;
            text-shadow: 0 0 2px #7f1d1d, 0 0 4px #7f1d1d, 0 0 8px #7f1d1d;
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          20% {
            opacity: 1;
            text-shadow: 0 0 5px #ff4500, 0 0 12px #ff4500, 0 0 24px #ff0000;
            transform: translate3d(0, -1px, 0) scale(1.05);
          }
          50% {
            opacity: 0.85;
            text-shadow: 0 0 4px #ff7a1a, 0 0 10px #ff7a1a, 0 0 20px #ff4500;
            transform: translate3d(0, 0, 0) scale(1.02);
          }
          80% {
            opacity: 0.4;
            text-shadow: 0 0 3px #b91c1c, 0 0 6px #b91c1c, 0 0 12px #7f1d1d;
            transform: translate3d(0, 1px, 0) scale(0.98);
          }
          100% {
            opacity: 0;
            text-shadow: 0 0 2px #7f1d1d, 0 0 4px #7f1d1d, 0 0 8px #7f1d1d;
            transform: translate3d(0, 0, 0) scale(0.95);
          }
        }
      `}</style>
    </section>
  );
}

