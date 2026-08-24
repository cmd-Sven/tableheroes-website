"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Users } from 'lucide-react';
import { toggleNPCFavorite } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function NPCCarousel({ residents, isGM, campaignId, title }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>(
    Object.fromEntries((residents || []).map((npc: any) => [npc.id, npc.is_favorite || false]))
  );

  const handleToggleFavorite = (npcId: string, currentState: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !currentState;
    setFavoriteStates((prev) => ({ ...prev, [npcId]: newState }));

    startTransition(async () => {
      try {
        await toggleNPCFavorite(npcId, currentState);
        router.refresh();
      } catch (error) {
        // Revert on error
        setFavoriteStates((prev) => ({ ...prev, [npcId]: currentState }));
        console.error("Error toggling favorite:", error);
      }
    });
  };

  if (!residents || residents.length === 0) return null;

  return (
    <section 
      className="mt-8 p-6 rounded-xl border-2 border-accent-gold/30 shadow-2xl relative overflow-hidden"
      style={{ 
        backgroundImage: "url('/images/dark-marmor.webp')", 
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6)",
      }}
    >
      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="relative z-10">
        <h3 className="text-2xl font-barlow font-semibold text-accent-blood border-b border-hero-border pb-2 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" />
          {title || "Bewohner & Ansässige"}
        </h3>
        <div 
          className="flex overflow-x-auto gap-4 pb-4 snap-x"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {residents.map((npc: any) => {
            const isFavorite = favoriteStates[npc.id] || false;
            return (
              <Link 
                href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`} 
                key={npc.id} 
                className="min-w-[200px] snap-start group relative rounded-lg border-2 border-accent-gold/50 p-4 transition-all hover:scale-105 shrink-0"
                style={{ 
                  backgroundImage: "url('/images/scroll-paper.webp')", 
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                }}
              >
                {/* Favorite Button - Top Right */}
                <button
                  onClick={(e) => handleToggleFavorite(npc.id, isFavorite, e)}
                  disabled={isPending}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-yellow-500 transition-colors shadow-md disabled:opacity-50"
                  title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                >
                  <Star
                    className={`h-4 w-4 transition-all ${
                      isFavorite ? "fill-current text-yellow-500" : ""
                    }`}
                  />
                </button>

                {/* NPC Image */}
                {npc.image_url ? (
                  <div className="relative w-full aspect-square mb-2 rounded overflow-hidden border border-accent-gold/30">
                    <Image
                      src={npc.image_url}
                      alt={npc.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square mb-2 rounded bg-gray-800/50 border border-accent-gold/30 flex items-center justify-center">
                    <Users className="h-10 w-10 text-gray-600" />
                  </div>
                )}

                {/* NPC Info */}
                <div className="text-gray-900 font-cinzel font-bold text-center mb-1 group-hover:text-accent-gold transition-colors">
                  {npc.name}
                </div>
                {npc.role && (
                  <div className="text-gray-700 text-sm italic text-center font-libre">
                    {npc.role}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Hide scrollbar for webkit browsers */}
      <style dangerouslySetInnerHTML={{ __html: `
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </section>
  );
}
