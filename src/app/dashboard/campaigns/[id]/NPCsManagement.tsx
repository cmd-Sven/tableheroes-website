"use client";

import { useState, useMemo } from "react";
import { User, Search, X, ScrollText, Book } from "lucide-react";
import Link from "next/link";
import { NPCGridCard } from "@/src/components/dashboard/NPCGridCard";
import { deleteNPC, toggleNPCReveal } from "./npc-actions";

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string | null;
  description: string | null;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  faction_id: string | null;
  is_revealed: boolean;
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type Faction = {
  id: string;
  name: string;
};

type Props = {
  campaignId: string;
  /** Welt-ID der Kampagne – für GM-Link „Zum Welt-Editor“. */
  worldId?: string;
  npcs: NPC[];
  factions: Faction[];
  isGM: boolean;
};

export function NPCsManagement({ campaignId, worldId, npcs, factions, isGM }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState<string>("Alle");
  const [statusFilter, setStatusFilter] = useState<string>("Alle");
  const [raceFilter, setRaceFilter] = useState<string>("Alle");
  const [onlyQuestGivers, setOnlyQuestGivers] = useState(false);

  const handleDelete = async (npc: NPC) => {
    try {
      await deleteNPC(npc.id);
    } catch (error: any) {
      alert(error.message || "Fehler beim Löschen.");
    }
  };

  const handleToggleVisibility = async (npc: NPC) => {
    try {
      await toggleNPCReveal(campaignId, npc.id, npc.is_revealed);
    } catch (error: any) {
      alert(error.message || "Fehler beim Ändern der Sichtbarkeit.");
    }
  };

  // Get unique values for filters
  const uniqueRaces = useMemo(() => {
    const races = new Set(npcs.map((n) => n.race).filter(Boolean) as string[]);
    return Array.from(races).sort();
  }, [npcs]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(npcs.map((n) => n.status).filter(Boolean) as string[]);
    return Array.from(statuses).sort();
  }, [npcs]);

  // Filter and Sort logic
  const filteredAndSortedNPCs = useMemo(() => {
    let filtered = npcs;

    // Apply faction filter
    if (factionFilter !== "Alle") {
      filtered = filtered.filter((n) => n.faction_id === factionFilter);
    }

    // Apply status filter
    if (statusFilter !== "Alle") {
      filtered = filtered.filter((n) => n.status === statusFilter);
    }

    // Apply race filter
    if (raceFilter !== "Alle") {
      filtered = filtered.filter((n) => n.race === raceFilter);
    }

    // Nur Questgeber: nur NPCs mit mindestens einer aktiven Quest als Geber
    if (onlyQuestGivers) {
      filtered = filtered.filter((n) => (n as any).has_active_quest_as_giver === true);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.description?.toLowerCase().includes(query) ||
          n.role?.toLowerCase().includes(query) ||
          n.race?.toLowerCase().includes(query) ||
          n.factions?.name.toLowerCase().includes(query)
      );
    }

    // Only show revealed entries for non-GM users
    if (!isGM) {
      filtered = filtered.filter((n) => n.is_revealed);
    }

    // Sort: 1. NPCs with active quests, 2. Favorited NPCs, 3. Alphabetically
    filtered.sort((a, b) => {
      // Priority 1: Active quests
      const aHasQuest = (a as any).has_active_quest ? 1 : 0;
      const bHasQuest = (b as any).has_active_quest ? 1 : 0;
      if (aHasQuest !== bHasQuest) return bHasQuest - aHasQuest;

      // Priority 2: Favorites
      const aIsFavorite = (a as any).is_favorite ? 1 : 0;
      const bIsFavorite = (b as any).is_favorite ? 1 : 0;
      if (aIsFavorite !== bIsFavorite) return bIsFavorite - aIsFavorite;

      // Priority 3: Alphabetically
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [npcs, factionFilter, statusFilter, raceFilter, searchQuery, onlyQuestGivers, isGM]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-dark">
        <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <User className="h-5 w-5 text-accent-gold" />
          NPCs ({npcs.length})
        </h2>
        {isGM && worldId && (
          <Link
            href={`/dashboard/worlds/${worldId}/npcs`}
            className="flex items-center gap-2 rounded bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
          >
            <Book className="h-4 w-4" />
            Zum Welt-Editor
          </Link>
        )}
      </div>

      {isGM && worldId && (
        <div className="mb-6 rounded border border-blue-700/30 bg-blue-900/20 p-4">
          <p className="font-libre text-sm text-blue-300 leading-relaxed">
            NPCs gehören zur <strong>Welt</strong>, nicht zur Kampagne. Hier siehst du alle NPCs dieser Welt; mit dem Auge-Symbol machst du sie für Spieler <strong>in dieser Kampagne</strong> sichtbar. Neue NPCs legst du in der <strong>Welt-Verwaltung</strong> an („Zum Welt-Editor“).
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach NPCs..."
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

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Faction Filter */}
          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Fraktion
            </label>
            <select
              value={factionFilter}
              onChange={(e) => setFactionFilter(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white text-sm font-libre outline-none focus:border-hero-vibrant"
            >
              <option value="Alle">Alle</option>
              {factions.map((faction) => (
                <option key={faction.id} value={faction.id}>
                  {faction.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white text-sm font-libre outline-none focus:border-hero-vibrant"
            >
              <option value="Alle">Alle</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Race Filter */}
          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Rasse
            </label>
            <select
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-hero-dark p-2 text-white text-sm font-libre outline-none focus:border-hero-vibrant"
            >
              <option value="Alle">Alle</option>
              {uniqueRaces.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
          </div>

          {/* Nur Questgeber */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer h-[34px] font-barlow font-bold text-xs uppercase text-gray-400 hover:text-accent-gold transition-colors">
              <input
                type="checkbox"
                checked={onlyQuestGivers}
                onChange={(e) => setOnlyQuestGivers(e.target.checked)}
                className="w-4 h-4 rounded border-hero-dark bg-slate-900 text-accent-gold focus:ring-accent-gold focus:ring-2"
              />
              <ScrollText className="h-4 w-4 text-accent-gold" />
              Nur Questgeber
            </label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {filteredAndSortedNPCs.length > 0 && (
        <div className="mb-4">
          <p className="font-libre text-sm text-gray-400">
            {filteredAndSortedNPCs.length} {filteredAndSortedNPCs.length === 1 ? "NPC gefunden" : "NPCs gefunden"}
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedNPCs.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery || factionFilter !== "Alle" || statusFilter !== "Alle" || raceFilter !== "Alle" || onlyQuestGivers ? (
            <>
              <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                Keine NPCs gefunden
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                {searchQuery
                  ? "Versuche andere Suchbegriffe."
                  : "Versuche andere Filter."}
              </p>
              {(searchQuery || factionFilter !== "Alle" || statusFilter !== "Alle" || raceFilter !== "Alle" || onlyQuestGivers) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFactionFilter("Alle");
                    setStatusFilter("Alle");
                    setRaceFilter("Alle");
                    setOnlyQuestGivers(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-md border border-hero-border bg-hero-dark text-white font-barlow font-bold text-xs uppercase hover:bg-hero-vibrant transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </>
          ) : (
            <>
              <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                {isGM ? "Noch keine NPCs" : "Eure Helden wissen noch nichts über diese Welt..."}
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                {isGM
                  ? "NPCs legst du in der Welt-Verwaltung an („Zum Welt-Editor“). Danach kannst du sie hier mit dem Auge für Spieler sichtbar machen."
                  : "Der Spielleiter hat noch keine NPCs für euch sichtbar gemacht."}
              </p>
              {isGM && worldId && (
                <Link
                  href={`/dashboard/worlds/${worldId}/npcs`}
                  className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
                >
                  <Book className="h-4 w-4" />
                  Zum Welt-Editor
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        /* NPC Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedNPCs.map((npc) => (
            <NPCGridCard
              key={npc.id}
              npc={npc as any}
              campaignId={campaignId}
              worldId={isGM && worldId ? worldId : undefined}
              isGM={isGM}
              onDelete={isGM ? (handleDelete as any) : undefined}
              onToggleVisibility={isGM ? (handleToggleVisibility as any) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

