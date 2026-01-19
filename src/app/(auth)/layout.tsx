import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Footer } from "@/src/components/layout/Footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-dark">
      <div className="flex flex-1 items-center justify-center p-6">
        {/* Optional: Radial Gradient für Atmosphäre */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(35,199,99,0.08),transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-accent-gold" />
              <span className="font-barlow font-bold text-2xl uppercase tracking-wide text-hero-vibrant">
                TableHeroes
              </span>
            </div>
            <p className="font-libre text-gray-400 text-sm">
              Deine Pen &amp; Paper Community in Osnabrück
            </p>
          </div>

          <div className="rounded-md border border-hero-border bg-background-card p-8 shadow-2xl">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

