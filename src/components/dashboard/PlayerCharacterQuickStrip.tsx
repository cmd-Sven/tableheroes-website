"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import type { HeroSliderCharacter } from "@/src/components/dashboard/HeroSlider";

const STORAGE_KEY = "tableheroes-hide-dashboard-char-strip";

type Props = {
  characters: HeroSliderCharacter[];
};

export function PlayerCharacterQuickStrip({ characters }: Props) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHidden = () => {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!characters.length) return null;

  const withPortrait = characters.filter((c) => !!c.avatar_url?.trim());
  /** Zeige alle Charaktere; mit Bild besonders hilfreich — ohne Bild trotzdem Klasse/Stufe. */
  const list = characters;

  return (
    <section className="rounded-lg border border-hero-border/60 bg-background-card/90 px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-barlow font-bold text-xs uppercase tracking-wide text-gray-400">
          Deine Charaktere
          {withPortrait.length > 0 && (
            <span className="ml-2 font-libre font-normal normal-case text-gray-500">
              ({withPortrait.length} mit Bild)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={toggleHidden}
          className="inline-flex items-center gap-1 rounded border border-hero-border/40 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400 hover:border-hero-vibrant hover:text-hero-vibrant transition-colors"
          aria-expanded={!hidden}
        >
          {mounted && hidden ? (
            <>
              Einblenden <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ausblenden <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {(!mounted || !hidden) && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-hero-border scrollbar-track-transparent">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${c.campaignId}?tab=overview`}
              className="flex min-w-[220px] shrink-0 items-center gap-3 rounded-lg border border-hero-dark bg-hero-dark/40 px-3 py-2 transition-colors hover:border-hero-vibrant"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-hero-border/40 bg-black/30">
                {c.avatar_url?.trim() ? (
                  <Image
                    src={c.avatar_url.trim()}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={
                      c.avatar_url.startsWith("http://") ||
                      c.avatar_url.startsWith("data:") ||
                      c.avatar_url.includes("localhost") ||
                      c.avatar_url.includes("supabase.co")
                    }
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-7 w-7 text-accent-gold/45" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-barlow font-bold text-sm uppercase text-white truncate">
                  {c.name}
                </p>
                <p className="font-libre text-xs text-gray-400 truncate">
                  {c.class} · Stufe {c.level ?? 1}
                </p>
                <p className="font-libre text-[11px] text-gray-500 truncate">
                  {c.campaignName}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
