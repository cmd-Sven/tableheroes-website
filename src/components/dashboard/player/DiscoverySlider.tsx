"use client";

import Image from "next/image";
import { MapPin, Users, User, ScrollText } from "lucide-react";
import type { DiscoveryItem } from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

type Props = {
  items: DiscoveryItem[];
  campaignId: string;
};

const kindIcon = {
  lore: MapPin,
  faction: Users,
  npc: User,
};

/** Kurz-Label für die Kategoriezeile */
const kindCategoryLabel = {
  lore: "Lore / Ort",
  faction: "Fraktion",
  npc: "NPC",
};

function discoveryHref(campaignId: string, item: DiscoveryItem): string {
  if (item.kind === "lore") {
    return `/dashboard/campaigns/${campaignId}/lore/${item.id}`;
  }
  if (item.kind === "faction") {
    return `/dashboard/campaigns/${campaignId}/factions/${item.id}`;
  }
  return `/dashboard/campaigns/${campaignId}/npcs/${item.id}`;
}

export function DiscoverySlider({ items, campaignId }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-hero-dark bg-background-card p-8 text-center">
        <ScrollText className="mx-auto h-12 w-12 text-accent-gold/50" />
        <p className="font-cinzel font-bold text-xl text-accent-gold mt-4">
          Die Welt wartet darauf, von euch entdeckt zu werden…
        </p>
        <p className="font-libre text-gray-500 mt-2 text-sm">
          Sobald der Spielleiter Orte, Fraktionen oder NPCs enthüllt, erscheinen sie hier.
        </p>
      </section>
    );
  }

  const loop = [...items, ...items];

  return (
    <section>
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-accent-gold" />
        Neuentdeckungen
      </h2>
      <div className="group/marquee relative overflow-hidden rounded-lg border border-hero-border/50 bg-background-card/80 py-4">
        <div
          className="flex gap-4 w-max pl-4 animate-discoveryMarquee motion-reduce:animate-none group-hover/marquee:[animation-play-state:paused]"
          style={{
            animationDuration: `${Math.max(28, items.length * 6)}s`,
          }}
        >
          {loop.map((item, index) => {
            const Icon = kindIcon[item.kind];
            const href = discoveryHref(campaignId, item);
            return (
              <a
                key={`${item.kind}-${item.id}-${index}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-shrink-0 w-[160px] rounded-lg border border-hero-border/40 bg-hero-dark/40 overflow-hidden shadow-md outline-none transition-transform duration-300 hover:scale-105 hover:border-accent-gold/60 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-hero-vibrant"
              >
                <div className="relative h-[100px] bg-hero-dark/50">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      className="object-cover object-top"
                      sizes="160px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="h-10 w-10 text-accent-gold/35" />
                    </div>
                  )}
                </div>
                <div className="px-2.5 py-2 border-t border-hero-border/30">
                  <p className="font-barlow font-bold text-[10px] uppercase tracking-wide text-accent-gold/90 mb-1">
                    {kindCategoryLabel[item.kind]}
                  </p>
                  <p
                    className="font-barlow font-bold text-xs uppercase text-white truncate leading-tight"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
