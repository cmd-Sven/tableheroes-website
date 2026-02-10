"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  /** URL des Tages-Comics (z. B. /images/comic/strrip_01.png) oder null */
  src: string | null;
};

export function DailyComicCard({ src }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="w-full p-4">
      <div
        className="rounded-lg border border-hero-border/40 bg-hero-dark/20 overflow-hidden flex flex-col items-center justify-center min-h-[180px]"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        {src ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative w-full aspect-[4/3] max-h-[220px] flex items-center justify-center p-2 cursor-zoom-in hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:ring-inset rounded"
            aria-label="Comic vergrößern"
          >
            <img
              src={src}
              alt="Comic des Tages"
              className="object-contain max-h-full w-auto rounded pointer-events-none"
            />
          </button>
        ) : (
          <p className="font-libre text-sm text-gray-500 italic p-4 text-center">
            Heute kein Comic verfügbar.
          </p>
        )}
        <p className="font-cinzel font-bold text-sm text-accent-gold mt-2 pb-2">
          Comic des Tages
        </p>
      </div>

      {src && lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Comic vergrößert"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold z-10"
            aria-label="Schließen"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt="Comic des Tages (Vergrößert)"
              className="object-contain max-h-[95vh] w-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
