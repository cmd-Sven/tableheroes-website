"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Map, LayoutGrid, List, Plus, Search, Sparkles } from "lucide-react";
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
  created_at?: string;
};

type Props = {
  locations: LoreEntry[];
  worldId: string;
  worldName: string;
};

type ViewMode = "overview" | "grid";

export function WorldLocationsListClient({ locations, worldId, worldName }: Props) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.trim().toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(q) ||
        loc.type?.toLowerCase().includes(q) ||
        (loc.description ?? "").toLowerCase().includes(q),
    );
  }, [locations, search]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hero-dark">
        <h1 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <Map className="h-5 w-5 text-accent-gold" />
          Orte ({locations.length})
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/worlds/${worldId}/locations/create`}
            className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/20 transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            Mit KI-Wizard
          </Link>
          <GraphicButton
            href={`/dashboard/worlds/${worldId}/locations/new`}
            imagePath="/images/button-green-wood.png"
            hoverImagePath="/images/button-green-wood_hover.png"
            width={192}
            height={68}
          >
            <Plus className="h-5 w-5 inline mr-1" />
            Neuer Ort
          </GraphicButton>
        </div>
      </div>

      <p className="font-libre text-sm text-gray-400">
        Geografische Orte dieser Welt — als Hierarchie (Region → Stadt → Gebäude) oder Kartenraster.
        Sichtbarkeit für Spieler steuerst du pro Kampagne im Tab „Welt & Lore“.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="font-libre text-xs text-gray-500">{filteredLocations.length} Treffer</p>
        ) : null}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Orte durchsuchen (Name, Typ, Beschreibung…)"
          className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
        />
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12">
          <Map className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">Noch keine Orte</p>
          <p className="font-libre text-sm text-gray-400 mb-4">
            Lege den ersten Ort an (z. B. Region, Stadt, Gebäude).
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/dashboard/worlds/${worldId}/locations/create`}
              className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/20 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Mit KI-Wizard erstellen
            </Link>
            <Link
              href={`/dashboard/worlds/${worldId}/locations/new`}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Manuell anlegen
            </Link>
          </div>
        </div>
      ) : viewMode === "overview" ? (
        <LoreCategoryOverview
          entries={locations}
          worldId={worldId}
          searchQuery={search}
          scope="locations"
        />
      ) : filteredLocations.length === 0 ? (
        <div className="text-center py-12">
          <Map className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">Keine Treffer</p>
          <p className="font-libre text-sm text-gray-400">Passe den Suchbegriff an.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLocations.map((loc) => (
            <LoreGridCard
              key={loc.id}
              lore={{ ...loc, is_revealed: true } as any}
              campaignId={worldId}
              isGM={true}
              onDelete={undefined}
              onToggleVisibility={undefined}
              detailHref={`/dashboard/worlds/${worldId}/locations/${loc.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
