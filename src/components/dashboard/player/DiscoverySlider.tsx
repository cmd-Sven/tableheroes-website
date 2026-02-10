"use client";

import Image from "next/image";
import { MapPin, Users, User, ScrollText } from "lucide-react";
import type { DiscoveryItem } from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

type Props = {
  items: DiscoveryItem[];
};

const kindIcon = {
  lore: MapPin,
  faction: Users,
  npc: User,
};

const kindLabel = {
  lore: "Ort / Lore",
  faction: "Fraktion",
  npc: "NPC",
};

export function DiscoverySlider({ items }: Props) {
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

  return (
    <section>
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-accent-gold" />
        Neuentdeckungen
      </h2>
      <div className="overflow-x-auto pb-4 -mx-2 scrollbar-thin scrollbar-thumb-hero-border scrollbar-track-transparent">
        <div className="flex gap-4 min-w-max px-2">
          {items.map((item) => {
            const Icon = kindIcon[item.kind];
            const shortDesc = item.description
              ? item.description.slice(0, 80).trim() + (item.description.length > 80 ? "…" : "")
              : null;
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="flex-shrink-0 w-[220px] rounded-lg border border-hero-border/40 bg-gradient-to-b from-amber-950/30 to-background-card overflow-hidden shadow-lg"
              >
                <div className="relative h-28 bg-hero-dark/50">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="220px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="h-10 w-10 text-accent-gold/40" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-2 right-2">
                    <span className="inline-block rounded bg-black/60 px-2 py-0.5 text-xs font-barlow font-bold uppercase text-accent-gold">
                      {kindLabel[item.kind]}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-barlow font-bold text-sm uppercase text-white truncate" title={item.name}>
                    {item.name}
                  </p>
                  {item.type && (
                    <p className="text-xs text-gray-500 font-libre mb-1">{item.type}</p>
                  )}
                  {shortDesc && (
                    <p className="font-libre text-xs text-gray-400 line-clamp-2 leading-snug">
                      {shortDesc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
