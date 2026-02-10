"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { LoreSnippet } from "@/src/lib/types/dashboard-widgets";

const PLACEHOLDER =
  "Geheimnisse warten darauf, entdeckt zu werden… Tritt einer Kampagne bei und lass den Spielleiter Lore enthüllen.";

const NEW_BADGE_STYLE =
  "absolute top-2 right-2 z-10 rounded-full bg-accent-gold/90 px-2 py-0.5 font-barlow font-bold text-[10px] uppercase text-background-dark shadow-md";
const NEW_GLOW_STYLE = "shadow-[0_0_15px_rgba(212,175,55,0.5)] animate-pulse";

type Props = {
  snippet: LoreSnippet | null;
  hasNewContent?: boolean;
  onMarkAsRead?: () => void | Promise<void>;
};

export function LoreSnippetCard({
  snippet,
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

  if (!snippet) {
    return (
      <div className="w-full p-4">
        <div
          className="rounded-lg border border-hero-border/40 bg-hero-dark/20 p-4 text-center"
          style={{
            backgroundImage: "url('/images/dark-marmor.jpg')",
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

  const loreUrl = `/dashboard/campaigns/${snippet.campaignId}/lore/${snippet.id}`;

  return (
    <div className="w-full p-4" ref={ref}>
      <div
        className={`relative rounded-lg border border-hero-border/40 bg-hero-dark/20 overflow-hidden ${
          hasNewContent ? NEW_GLOW_STYLE : ""
        }`}
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        {hasNewContent && (
          <span className={NEW_BADGE_STYLE} aria-hidden>
            NEU
          </span>
        )}
        <div className="p-4 space-y-3">
          <h3 className="font-cinzel font-bold text-lg text-accent-gold">
            {snippet.name}
          </h3>
          <p className="font-libre text-sm text-gray-300 leading-relaxed line-clamp-4">
            {snippet.teaser}
          </p>
          <p className="font-barlow text-xs uppercase text-gray-500">
            {snippet.campaignName}
          </p>
          <Link
            href={loreUrl}
            onClick={() => onMarkAsRead?.()}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Mehr lesen
          </Link>
        </div>
      </div>
    </div>
  );
}
