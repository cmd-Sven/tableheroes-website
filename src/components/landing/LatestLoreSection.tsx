"use client";

import { useEffect, useState } from "react";
import { PublicSeoEntryCard } from "@/src/components/public/PublicSeoPanel";
import type { HomepageLoreGroup } from "@/src/lib/queries/public-seo-queries";

export function LatestLoreSection() {
  const [groups, setGroups] = useState<HomepageLoreGroup[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lore/landing");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) {
          setGroups(Array.isArray(data.groups) ? data.groups : []);
        }
      } catch {
        if (!cancelled) setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!groups || groups.length === 0) return null;

  return (
    <section
      id="lore-datenbank"
      className="relative py-14 md:py-20 overflow-hidden border-t border-hero-border/30"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        aria-hidden
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/80" aria-hidden />

      <div className="relative z-20 container mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <p className="font-barlow text-sm uppercase tracking-[0.2em] text-accent-gold mb-2">
            Welt &amp; Geschichten
          </p>
          <h2 className="font-cinzel text-3xl md:text-4xl text-hero-vibrant">
            Neueste Einträge in der Lore-Datenbank
          </h2>
          <p className="mt-3 text-gray-400 font-libre max-w-2xl mx-auto">
            Vom Spielleiter freigegebene Lore-Einträge — NSCs, Fraktionen und Weltwissen aus
            unseren Kampagnen.
          </p>
        </div>

        <div className="space-y-12">
          {groups.map((group) => (
            <div key={group.campaignId}>
              <h3 className="font-cinzel text-xl text-accent-gold/90 mb-5 border-b border-hero-border/40 pb-2">
                Kampagne {group.campaignName}
              </h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.entries.map((entry) => (
                  <PublicSeoEntryCard
                    key={entry.slug}
                    slug={entry.slug}
                    name={entry.name}
                    entitySubtype={entry.entitySubtype}
                    excerpt={entry.excerpt}
                    imageUrl={entry.imageUrl}
                    imageIsAiGenerated={entry.imageIsAiGenerated}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
