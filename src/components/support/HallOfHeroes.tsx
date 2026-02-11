"use client";

import Image from "next/image";
import { Crown } from "lucide-react";
import type { BackerHero } from "@/src/lib/actions/support-actions";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

type Props = {
  backers: BackerHero[];
};

export function HallOfHeroes({ backers }: Props) {
  if (backers.length === 0) {
    return (
      <div className="text-center py-14">
        <Crown className="mx-auto h-12 w-12 text-accent-gold/30 mb-4" />
        <p className="font-cinzel font-bold text-xl text-accent-gold/60">
          Die Hallen der Ehre warten auf ihre ersten Helden&hellip;
        </p>
        <p className="font-libre text-sm text-gray-600 mt-2">
          Werde der Erste, der seinen Namen in die goldenen Tafeln einträgt.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-6">
      {backers.map((hero) => (
        <div
          key={hero.id}
          className="group flex flex-col items-center gap-3 rounded-xl border border-accent-gold/15 bg-black/20 px-6 py-6 transition-all duration-300 hover:-translate-y-2 hover:border-accent-gold/40 hover:shadow-[0_0_24px_rgba(202,185,38,0.15)] hover:bg-black/30"
          style={{ minWidth: 140, maxWidth: 170 }}
        >
          {/* Avatar mit goldenem Glow-Ring */}
          <div className="backer-avatar-ring relative h-20 w-20 shrink-0 rounded-full">
            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-accent-gold/60 bg-black/50 transition-all duration-300 group-hover:border-accent-gold">
              {hero.avatarUrl ? (
                <Image
                  src={hero.avatarUrl}
                  alt={hero.username}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-cinzel font-bold text-2xl text-accent-gold">
                  {hero.username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="text-center">
            <p className="font-cinzel font-bold text-sm text-white group-hover:text-accent-gold transition-colors">
              {hero.username}
            </p>
            <p className="font-barlow text-[10px] uppercase tracking-wider text-accent-gold/60 mt-0.5">
              Gilden-Patron
            </p>
          </div>

          {/* Seit */}
          <p className="font-barlow text-[9px] text-gray-600 uppercase">
            Seit {formatDate(hero.backerSince)}
          </p>
        </div>
      ))}
    </div>
  );
}
