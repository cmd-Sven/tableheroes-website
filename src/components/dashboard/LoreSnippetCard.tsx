"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronRight } from "lucide-react";
import type { DashboardLoreEntry } from "@/src/lib/types/dashboard-widgets";

const PLACEHOLDER =
  "Geheimnisse warten darauf, entdeckt zu werden… Tritt einer Kampagne bei und lass den Spielleiter Lore enthüllen.";

const NEW_BADGE_STYLE =
  "absolute top-2 right-2 z-10 rounded-full bg-accent-gold/90 px-2 py-0.5 font-barlow font-bold text-[10px] uppercase text-background-dark shadow-md";
const NEW_GLOW_STYLE = "shadow-[0_0_15px_rgba(212,175,55,0.5)] animate-pulse";

function getDetailUrl(entry: DashboardLoreEntry): string {
  switch (entry.type) {
    case "lore":
      return `/dashboard/campaigns/${entry.campaignId}/lore/${entry.id}`;
    case "npc":
      return `/dashboard/campaigns/${entry.campaignId}/npcs/${entry.id}`;
    case "faction":
      return `/dashboard/campaigns/${entry.campaignId}/factions/${entry.id}`;
    default:
      return `/dashboard/campaigns/${entry.campaignId}/lore/${entry.id}`;
  }
}

type Props = {
  entry: DashboardLoreEntry | null;
  hasNewContent?: boolean;
  onMarkAsRead?: () => void | Promise<void>;
};

export function LoreSnippetCard({
  entry,
  hasNewContent = false,
  onMarkAsRead,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNewContent || !onMarkAsRead) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onMarkAsRead();
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNewContent, onMarkAsRead]);

  if (!entry) {
    return (
      <div className="w-full p-4">
        <div
          className="rounded-lg border border-hero-border/40 bg-hero-dark/20 p-4 text-center"
          style={{
            backgroundImage: "url('/images/dark-marmor.webp')",
            backgroundSize: "cover",
          }}
        >
          <BookOpen className="mx-auto h-10 w-10 text-accent-gold/50 mb-3" />
          <p className="font-libre text-sm text-gray-400 italic">
            {PLACEHOLDER}
          </p>
        </div>
      </div>
    );
  }

  const detailUrl = getDetailUrl(entry);

  return (
    <div className="w-full p-4" ref={ref}>
      <div
        className={`relative rounded-lg border border-hero-border/40 bg-hero-dark/20 overflow-hidden hover:border-hero-vibrant/50 transition-colors ${
          hasNewContent ? NEW_GLOW_STYLE : ""
        }`}
      >
        {hasNewContent && (
          <span className={NEW_BADGE_STYLE} aria-hidden>
            NEU
          </span>
        )}

        {/* Bild oder Platzhalter mit Titel-Overlay */}
        <div className="relative aspect-[16/10] w-full bg-hero-dark/50">
          {entry.imageUrl ? (
            <Image
              src={entry.imageUrl}
              alt={entry.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundImage: "url('/images/dark-marmor.webp')",
                backgroundSize: "cover",
              }}
            >
              <BookOpen className="h-12 w-12 text-accent-gold/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-cinzel font-bold text-lg text-white drop-shadow-lg">
              {entry.name}
            </h3>
          </div>
        </div>

        {/* Button */}
        <div className="p-4 pt-2">
          <Link
            href={detailUrl}
            onClick={() => onMarkAsRead?.()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-hero-border/50 bg-hero-dark/40 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/60 hover:border-hero-vibrant/60 transition-colors"
          >
            Du möchtest mehr dazu wissen?
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
