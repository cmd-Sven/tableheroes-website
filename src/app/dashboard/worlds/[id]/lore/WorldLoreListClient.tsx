"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Book, Plus, Search } from "lucide-react";
import { LoreGridCard } from "@/src/components/dashboard/LoreGridCard";
import { GraphicButton } from "@/src/components/dashboard/campaigns/lore/GraphicButton";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url?: string | null;
  is_revealed?: boolean;
  parent_id?: string | null;
  created_at?: string;
};

type Props = {
  loreEntries: LoreEntry[];
  worldId: string;
};

export function WorldLoreListClient({ loreEntries, worldId }: Props) {
  const [search, setSearch] = useState("");

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return loreEntries;
    const q = search.trim().toLowerCase();
    return loreEntries.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
    );
  }, [loreEntries, search]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-hero-dark">
        <h1 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <Book className="h-5 w-5 text-accent-gold" />
          Lore & Einträge ({loreEntries.length})
        </h1>
        <GraphicButton
          href={`/dashboard/worlds/${worldId}/lore/new`}
          imagePath="/images/button-green-wood.png"
          hoverImagePath="/images/button-green-wood_hover.png"
          width={192}
          height={68}
        >
          <Plus className="h-5 w-5 inline mr-1" />
          Neuer Eintrag
        </GraphicButton>
      </div>

      <p className="font-libre text-sm text-gray-400 mb-4">
        Hier siehst du alle Lore-Einträge und Orte dieser Welt. Sichtbarkeit für Spieler steuerst du pro Kampagne im Tab „Welt & Lore“ (Auge-Symbol).
      </p>

      {/* Filter */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Lore durchsuchen (Name, Typ, Beschreibung…)"
          className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">
            {loreEntries.length === 0 ? "Noch keine Einträge" : "Keine Treffer"}
          </p>
          <p className="font-libre text-sm text-gray-400 mb-4">
            {loreEntries.length === 0
              ? "Lege den ersten Ort oder Lore-Eintrag an."
              : "Passe den Suchbegriff an."}
          </p>
          {loreEntries.length === 0 && (
            <Link
              href={`/dashboard/worlds/${worldId}/lore/new`}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ersten Eintrag anlegen
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEntries.map((lore) => (
            <LoreGridCard
              key={lore.id}
              lore={lore as any}
              campaignId={worldId}
              isGM={true}
              onDelete={undefined}
              onToggleVisibility={undefined}
              detailHref={`/dashboard/worlds/${worldId}/lore/${lore.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
