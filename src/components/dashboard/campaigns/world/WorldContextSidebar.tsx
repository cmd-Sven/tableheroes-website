"use client";

import React from "react";
import { Info, Sparkles } from "lucide-react";

type WorldData = {
  name: string;
  genre_style?: string | null;
  cosmology_type?: string | null;
  magic_level?: string | null;
  current_year?: number | null;
  main_conflict?: string | null;
  description?: string | null;
};

type Props = {
  world: WorldData | null;
};

export function WorldContextSidebar({ world }: Props) {
  if (!world) {
    return null;
  }

  return (
    <aside className="w-64 shrink-0 bg-background-card border border-hero-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-hero-border/30">
        <Sparkles className="h-5 w-5 text-accent-gold" />
        <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold">
          Welt-Kontext
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
            Welt
          </h4>
          <p className="font-libre text-sm text-gray-200">{world.name}</p>
        </div>

        {world.genre_style && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Genre/Stil
            </h4>
            <p className="font-libre text-sm text-gray-200">{world.genre_style}</p>
          </div>
        )}

        {world.cosmology_type && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Kosmologie
            </h4>
            <p className="font-libre text-sm text-gray-200">{world.cosmology_type}</p>
          </div>
        )}

        {world.magic_level && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Magie-Niveau
            </h4>
            <p className="font-libre text-sm text-gray-200">{world.magic_level}</p>
          </div>
        )}

        {world.current_year && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Aktuelles Jahr
            </h4>
            <p className="font-libre text-sm text-gray-200">{world.current_year}</p>
          </div>
        )}

        {world.main_conflict && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Zentraler Konflikt
            </h4>
            <p className="font-libre text-sm text-gray-200 leading-relaxed">
              {world.main_conflict}
            </p>
          </div>
        )}

        {world.description && (
          <div>
            <h4 className="font-barlow font-semibold text-xs uppercase text-accent-blood mb-1">
              Beschreibung
            </h4>
            <p className="font-libre text-xs text-gray-300 leading-relaxed">
              {world.description}
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-hero-border/30">
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="font-libre leading-relaxed">
              Diese Fakten werden automatisch bei der KI-Generierung berücksichtigt.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

