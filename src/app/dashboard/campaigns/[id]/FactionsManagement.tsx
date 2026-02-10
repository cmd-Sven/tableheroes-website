"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Shield, Search, Filter, X } from "lucide-react";
import { FactionGridCard } from "@/src/components/dashboard/FactionGridCard";
import { FactionDetailModal } from "@/src/components/dashboard/FactionDetailModal";
import { deleteFaction, toggleFactionReveal } from "./factions-actions";
import { VALID_FACTION_TYPES } from "@/src/lib/faction-types";
import { HeroButton } from "@/src/components/ui/HeroButton";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  member_count: number;
};

type NPC = {
  id: string;
  name: string;
  role: string | null;
  race: string | null;
  avatar_url: string | null;
  faction_id: string | null;
};

type Props = {
  campaignId: string;
  factions: Faction[];
  npcs?: NPC[];
  isGM: boolean;
};

export function FactionsManagement({ campaignId, factions, npcs = [], isGM }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleDelete = async (faction: Faction) => {
    try {
      await deleteFaction(faction.id);
    } catch (error: any) {
      alert(error.message || "Fehler beim Löschen.");
    }
  };

  const handleToggleVisibility = async (faction: Faction) => {
    try {
      await toggleFactionReveal(faction.id, faction.is_revealed);
    } catch (error: any) {
      alert(error.message || "Fehler beim Ändern der Sichtbarkeit.");
    }
  };

  // Filter logic
  const filteredFactions = useMemo(() => {
    let filtered = factions;

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((f) => f.type === typeFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query) ||
          f.type.toLowerCase().includes(query) ||
          f.current_status?.toLowerCase().includes(query)
      );
    }

    // Only show revealed entries for non-GM users
    if (!isGM) {
      filtered = filtered.filter((f) => f.is_revealed);
    }

    return filtered;
  }, [factions, typeFilter, searchQuery, isGM]);

  const handleInfoClick = (faction: Faction) => {
    setSelectedFaction(faction);
    setIsDetailModalOpen(true);
  };

  // Get members for selected faction
  const factionMembers = useMemo(() => {
    if (!selectedFaction) return [];
    return npcs.filter((npc) => npc.faction_id === selectedFaction.id);
  }, [selectedFaction, npcs]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-dark">
        <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent-gold" />
          Fraktionen ({factions.length})
        </h2>
        {isGM && (
          <HeroButton
            href={`/dashboard/campaigns/${campaignId}/factions/new`}
            size="sm"
            ariaLabel="Neue Fraktion erstellen"
            className="button-glint"
          >
            Neue Fraktion
          </HeroButton>
        )}
      </div>

      {/* Info Box (GM Only) */}
      {isGM && (
        <div className="mb-6 rounded border border-blue-700/30 bg-blue-900/20 p-4">
          <p className="font-libre text-sm text-blue-300 leading-relaxed">
            <strong className="font-bold">Fraktionen visualisieren Beziehungen:</strong> Erstelle Gilden, Orden, Königreiche oder Kulte. 
            Wenn du einen NPC erstellst, kannst du ihn einer Fraktion zuordnen – so behältst du den Überblick über Loyalitäten und Intrigen.
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input & Type Filter */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Fraktionen..."
              className="w-full pl-10 pr-10 py-2 rounded-md bg-slate-900 border border-hero-dark text-white placeholder-gray-500 focus:border-hero-vibrant focus:outline-none font-libre"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Filter Dropdown */}
          <div className="relative">
            <select
              value={typeFilter || ""}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="w-full pl-3 pr-10 py-2 rounded-md bg-slate-900 border border-hero-dark text-white focus:border-hero-vibrant focus:outline-none font-libre appearance-none cursor-pointer"
            >
              <option value="">Alle Typen</option>
              {[...VALID_FACTION_TYPES].sort().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {filteredFactions.length > 0 && (
        <div className="mb-4">
          <p className="font-libre text-sm text-gray-400">
            {filteredFactions.length} {filteredFactions.length === 1 ? "Fraktion gefunden" : "Fraktionen gefunden"}
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredFactions.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery || typeFilter ? (
            <>
              <Shield className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                Keine Fraktionen gefunden
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                {searchQuery
                  ? "Versuche andere Suchbegriffe."
                  : "Versuche einen anderen Filter."}
              </p>
              {(searchQuery || typeFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter(null);
                  }}
                  className="mt-4 px-4 py-2 rounded-md border border-hero-border bg-hero-dark text-white font-barlow font-bold text-xs uppercase hover:bg-hero-vibrant transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </>
          ) : (
            <>
              <Shield className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                {isGM ? "Noch keine Fraktionen" : "Keine Fraktionen verfügbar"}
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                {isGM 
                  ? "Erstelle deine erste Fraktion, um Beziehungen und Konflikte zu visualisieren."
                  : "Der Spielleiter hat noch keine Fraktionen für dich sichtbar gemacht."}
              </p>
              {isGM && (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/factions/new`}
                  className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Erste Fraktion erstellen
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        /* Faction Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFactions.map((faction) => (
            <FactionGridCard
              key={faction.id}
              faction={faction as any}
              campaignId={campaignId}
              onInfoClick={handleInfoClick as any}
              isGM={isGM}
              onDelete={isGM ? (handleDelete as any) : undefined}
              onToggleVisibility={isGM ? (handleToggleVisibility as any) : undefined}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <FactionDetailModal
        faction={selectedFaction}
        members={factionMembers}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFaction(null);
        }}
        isGM={isGM}
      />
    </div>
  );
}

