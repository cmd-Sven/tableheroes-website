"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Book, LayoutGrid, List, Plus, Search } from "lucide-react";
import { LoreGridCard } from "@/src/components/dashboard/LoreGridCard";
import { LoreCategoryOverview } from "@/src/components/dashboard/campaigns/lore/LoreCategoryOverview";
import { GraphicButton } from "@/src/components/dashboard/campaigns/lore/GraphicButton";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url?: string | null;
  is_revealed?: boolean;
  parent_id?: string | null;
  culture_id?: string | null;
  race_ids?: string[] | null;
  created_at?: string;
};

type Props = {
  loreEntries: LoreEntry[];
  worldId: string;
};

type ViewMode = "overview" | "grid";

export function WorldLoreListClient({ loreEntries, worldId }: Props) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return loreEntries;
    const q = search.trim().toLowerCase();
    return loreEntries.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q),
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
        Hier siehst du alle Lore-Einträge dieser Welt — als Kategorie-Übersicht oder Kartenraster.
        Sichtbarkeit für Spieler steuerst du pro Kampagne im Tab „Welt & Lore“ (Auge-Symbol).
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded border border-hero-dark bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setViewMode("overview")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-barlow text-xs font-bold uppercase transition-colors ${
              viewMode === "overview"
                ? "bg-hero-vibrant text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Übersicht
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-barlow text-xs font-bold uppercase transition-colors ${
              viewMode === "grid"
                ? "bg-hero-vibrant text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Karten
          </button>
        </div>
        {search.trim() ? (
          <p className="font-libre text-xs text-gray-500">
            {filteredEntries.length} Treffer
          </p>
        ) : null}
      </div>

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

      {loreEntries.length === 0 ? (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">Noch keine Einträge</p>
          <p className="font-libre text-sm text-gray-400 mb-4">
            Lege den ersten Lore-Eintrag an.
          </p>
          <Link
            href={`/dashboard/worlds/${worldId}/lore/new`}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ersten Eintrag anlegen
          </Link>
        </div>
      ) : viewMode === "overview" ? (
        <LoreCategoryOverview
          entries={loreEntries}
          worldId={worldId}
          searchQuery={search}
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">Keine Treffer</p>
          <p className="font-libre text-sm text-gray-400">Passe den Suchbegriff an.</p>
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
