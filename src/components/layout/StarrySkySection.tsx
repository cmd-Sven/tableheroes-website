"use client";

import type { ReactNode } from "react";
import { TwinklingStars } from "@/src/components/marketing/TwinklingStars";

type Props = {
  children: ReactNode;
  /** Padding-Bereich für den Inhalt (z.B. pt-48 pb-48 für Footer-CTA, oder py-24 für Login) */
  className?: string;
};

/**
 * Wiederverwendbare Sternenhimmel-Sektion (nachthimmel-bg + TwinklingStars).
 * Wird im Footer und auf der Login-Seite verwendet.
 */
export function StarrySkySection({ children, className = "" }: Props) {
  return (
    <div
      className={`relative w-full min-w-0 overflow-visible ${className}`}
      style={{
        backgroundImage: "url('/images/nachthimmel-bg.webp')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dunkler Overlay (Vignette) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)",
          zIndex: 1,
        }}
      />
      <TwinklingStars />
      <div className="relative container mx-auto max-w-7xl px-6" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
