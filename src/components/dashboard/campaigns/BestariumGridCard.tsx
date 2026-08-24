"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, MapPin, PawPrint } from "lucide-react";
import {
  BESTARIUM_PLACEHOLDER_IMAGE,
  resolveBestariumImageUrl,
} from "@/src/lib/bestarium-image";

export type BestariumCardCreature = {
  id: string;
  name: string;
  image_url: string | null;
  creature_type: string | null;
  subtype?: string | null;
  location_name: string | null;
  is_revealed?: boolean;
};

type Props = {
  creature: BestariumCardCreature;
  worldId?: string;
  isGM: boolean;
  detailHref: string;
  onToggleReveal?: (creatureId: string, current: boolean) => void;
};

function gattungLine(c: BestariumCardCreature): string | null {
  const parts = [c.creature_type?.trim(), c.subtype?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function BestariumGridCard({
  creature,
  worldId,
  isGM,
  detailHref,
  onToggleReveal,
}: Props) {
  const [imgBroken, setImgBroken] = useState(false);
  const imgSrc = imgBroken
    ? BESTARIUM_PLACEHOLDER_IMAGE
    : resolveBestariumImageUrl(creature.image_url);
  const gattung = gattungLine(creature);
  const revealed = creature.is_revealed !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        revealed || !isGM
          ? "border-transparent hover:border-accent-gold/50"
          : "border-hero-border/40 opacity-80 hover:opacity-100"
      }`}
      style={{
        backgroundImage: "url('/images/grunge-paper-background.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {isGM && onToggleReveal && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-black/70 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleReveal(creature.id, !!creature.is_revealed);
            }}
            className={`rounded p-1.5 transition-colors ${
              revealed
                ? "text-hero-vibrant hover:bg-white/10"
                : "text-gray-400 hover:text-amber-400 hover:bg-white/10"
            }`}
            title={revealed ? "Für Spieler ausblenden" : "Für Spieler freigeben"}
          >
            {revealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      )}

      <Link href={detailHref} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-gray-400/30 bg-hero-dark/40">
          {/* natives img: zuverlässig für Supabase-URLs, /public und Next/Image-Optimizer-Umgehung */}
          <img
            src={imgSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgBroken(true)}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/65 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col p-4">
          <div className="mb-1 flex items-start gap-2">
            <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold/80" aria-hidden />
            <h3 className="font-cinzel font-bold text-lg leading-tight text-gray-900 line-clamp-2">
              {creature.name}
            </h3>
          </div>
          {gattung ? (
            <p className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-700">
              {gattung}
            </p>
          ) : (
            <p className="font-libre text-xs italic text-gray-500">Keine Gattung hinterlegt</p>
          )}
          {creature.location_name?.trim() ? (
            <p className="mt-2 flex items-center gap-1.5 font-libre text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-hero-dark/70" aria-hidden />
              <span className="line-clamp-2">{creature.location_name}</span>
            </p>
          ) : null}
        </div>
      </Link>

      {isGM && worldId && (
        <div className="border-t border-gray-400/20 px-4 py-2">
          <Link
            href={`/dashboard/worlds/${worldId}/bestarium/${creature.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="font-barlow text-xs font-bold uppercase text-hero-dark hover:text-accent-blood"
          >
            Statblock bearbeiten
          </Link>
        </div>
      )}
    </motion.div>
  );
}
