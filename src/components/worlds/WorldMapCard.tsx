"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, User, Map, Book, Users } from "lucide-react";

type World = {
  id: string;
  name: string;
  description: string | null;
  npc_count?: number;
  lore_count?: number;
  location_count?: number;
  faction_count?: number;
  campaigns_count?: number;
  images: Array<{ url: string; description: string }>;
  genre?: string | null;
  tech_level?: string | null;
};

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function WorldImageSlider({ images }: { images: Array<{ url: string; description: string }> }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const shuffled = useMemo(() => shuffleArray(images), [images]);

  useEffect(() => {
    if (shuffled.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % shuffled.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [shuffled.length]);

  if (shuffled.length === 0) return null;
  const current = shuffled[currentIndex];

  return (
    <div className="relative h-44 w-full overflow-hidden bg-hero-dark/30">
      {/* Native img für maximale Kompatibilität mit externen URLs */}
      <img
        src={current.url}
        alt={current.description}
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {shuffled.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {shuffled.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-hero-vibrant" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  world: World;
};

export function WorldMapCard({ world }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative h-full flex flex-col rounded-lg border-2 border-transparent overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#C5A572] hover:shadow-xl"
        style={{
          backgroundImage: "url('/images/grunge-paper-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Link href={`/dashboard/worlds/${world.id}`} className="absolute inset-0 z-10" aria-label={`${world.name} öffnen`} />

      {/* Image Slider */}
      {world.images.length > 0 ? (
        <WorldImageSlider images={world.images} />
      ) : (
        <div className="h-44 w-full flex items-center justify-center bg-hero-dark/40 border-b border-hero-border">
          <Globe className="h-16 w-16 text-hero-vibrant/40" />
        </div>
      )}

      {/* Content – dunkle Schrift für lesbare Kontrast auf hellem Hintergrund */}
      <div className="flex-1 flex flex-col p-4 relative z-10">
        <h3 className="font-cinzel font-bold text-xl text-accent-blood mb-2 line-clamp-2">
          {world.name}
        </h3>

        {(world.genre || world.tech_level) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {world.genre && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border border-hero-dark bg-hero-dark/70 text-accent-blood">
                {world.genre}
              </span>
            )}
            {world.tech_level && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-barlow uppercase border border-hero-dark/80 bg-slate-800/90 text-slate-200">
                {world.tech_level}
              </span>
            )}
          </div>
        )}

        {world.description && (
          <p className="font-libre text-sm text-slate-700 leading-relaxed line-clamp-2 mb-3">
            {world.description}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5 text-accent-blood shrink-0" />
            <span className="font-libre text-slate-600">{world.npc_count ?? 0} NPCs</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Map className="h-3.5 w-3.5 text-accent-blood shrink-0" />
            <span className="font-libre text-slate-600">{world.location_count ?? 0} Orte</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Book className="h-3.5 w-3.5 text-accent-blood shrink-0" />
            <span className="font-libre text-slate-600">{world.lore_count ?? 0} Lore</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-accent-blood shrink-0" />
            <span className="font-libre text-slate-600">{world.faction_count ?? 0} Fraktionen</span>
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-hero-dark/60">
          <span className="font-barlow text-xs text-slate-600 uppercase">
            {(world.campaigns_count ?? 0)} Kampagne{(world.campaigns_count ?? 0) !== 1 ? "n" : ""}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
