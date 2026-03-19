"use client";

import { useState, useMemo, useTransition } from "react";
import { Book, Filter, Map as MapIcon, Search, X } from "lucide-react";
import Link from "next/link";
import { LoreGridCard } from "@/src/components/dashboard/LoreGridCard";
import { deleteLoreEntry, toggleLoreReveal } from "./lore-actions";
import { VALID_LORE_TYPES, TYPE_MAPPING } from "@/src/lib/lore-types";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  image_url: string | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  children?: LoreEntry[];
};

type Props = {
  campaignId: string;
  /** Welt-ID der Kampagne – für GM-Link „Zum Welt-Editor“. */
  worldId?: string;
  loreEntries: LoreEntry[];
  isGM: boolean;
};

// UI Filter Categories
const FILTER_CATEGORIES = [
  "Alle",
  "Location",
  "Religion",
  "Culture",
  "Organization",
  "History",
  "Magic",
  "Other",
] as const;

export function LoreManagement({ campaignId, worldId, loreEntries, isGM }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("Alle");
  const [searchQuery, setSearchQuery] = useState("");
  const [specificTypeFilter, setSpecificTypeFilter] = useState<string | null>(null);

  const handleDelete = async (lore: LoreEntry) => {
    try {
      await deleteLoreEntry(lore.id);
    } catch (error: any) {
      alert(error.message || "Fehler beim Löschen.");
    }
  };

  const handleToggleVisibility = async (lore: LoreEntry) => {
    try {
      await toggleLoreReveal(campaignId, lore.id, lore.is_revealed);
    } catch (error: any) {
      alert(error.message || "Fehler beim Ändern der Sichtbarkeit.");
    }
  };

  // Flatten entries (remove hierarchy for grid view)
  const flatEntries = useMemo(() => {
    const flatten = (entries: LoreEntry[]): LoreEntry[] => {
      const result: LoreEntry[] = [];
      entries.forEach((entry) => {
        result.push(entry);
        if (entry.children && entry.children.length > 0) {
          result.push(...flatten(entry.children));
        }
      });
      return result;
    };
    return flatten(loreEntries);
  }, [loreEntries]);

  // Filter logic: Hierarchie: Suche → spezifischer Filter → Tab-Filter
  const filteredLore = useMemo(() => {
    let filtered = flatEntries;

    // 1. Spezifischer Typ-Filter (höchste Priorität)
    if (specificTypeFilter) {
      filtered = filtered.filter((entry) => entry.type === specificTypeFilter);
    } else {
      // 2. Tab-Filter (nur wenn kein spezifischer Filter aktiv ist)
      if (activeFilter !== "Alle") {
        const mappedTypes = TYPE_MAPPING[activeFilter] || [];
        if (mappedTypes.length > 0) {
          filtered = filtered.filter((entry) => mappedTypes.includes(entry.type));
        } else if (activeFilter === "Other") {
          // "Other" = alles was nicht in den anderen Kategorien ist
          const allMappedTypes = Object.values(TYPE_MAPPING).flat();
          filtered = filtered.filter((entry) => !allMappedTypes.includes(entry.type));
        }
      }
    }

    // 3. Suche (immer zusätzlich, UND-Verknüpfung)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query) ||
          entry.type.toLowerCase().includes(query)
      );
    }

    // Only show revealed entries for non-GM users
    if (!isGM) {
      filtered = filtered.filter((entry) => entry.is_revealed);
    }

    // Enrich with parent names
    return filtered.map((entry) => {
      const parentName = entry.parent_id
        ? flatEntries.find((e) => e.id === entry.parent_id)?.name || null
        : null;
      return {
        ...entry,
        parentName,
      };
    });
  }, [flatEntries, activeFilter, searchQuery, specificTypeFilter, isGM]);


  // Get parent options for dropdown (all lore entries, sorted alphabetically)
  const parentOptions = useMemo(() => {
    return flatEntries
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        type: entry.type,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [flatEntries]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-dark">
        <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <Book className="h-5 w-5 text-accent-gold" />
          Welt & Lore ({loreEntries.length})
        </h2>
      </div>

      {/* Info Box (GM Only): Sichtbarkeit pro Kampagne, Erstellung in der Welt-Verwaltung */}
      {isGM && (
        <div className="mb-6 rounded border border-blue-700/30 bg-blue-900/20 p-4">
          <p className="font-libre text-sm text-blue-300 leading-relaxed mb-3">
            <strong className="font-bold">Sichtbarkeit für diese Kampagne:</strong> Schalte Einträge mit dem Auge-Symbol für Spieler frei.
            Neue Orte und Lore legst du in der <strong>Welt-Verwaltung</strong> an.
          </p>
          {worldId && (
            <Link
              href={`/dashboard/worlds/${worldId}/lore`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-dark transition-colors"
            >
              <Book className="h-4 w-4" />
              Zum Welt-Editor
            </Link>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input & Specific Type Filter */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Wissen..."
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

          {/* Specific Type Filter */}
          <div className="relative">
            <select
              value={specificTypeFilter || ""}
              onChange={(e) => setSpecificTypeFilter(e.target.value || null)}
              className="w-full pl-3 pr-10 py-2 rounded-md bg-slate-900 border border-hero-dark text-white focus:border-hero-vibrant focus:outline-none font-libre appearance-none cursor-pointer"
            >
              <option value="">Alle Typen</option>
              {[...VALID_LORE_TYPES].sort().map((type) => (
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

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="h-4 w-4" />
            <span className="font-barlow font-bold text-xs uppercase">Kategorie:</span>
          </div>
          {FILTER_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                if (!specificTypeFilter) {
                  setActiveFilter(category);
                }
              }}
              disabled={!!specificTypeFilter}
              className={`rounded px-3 py-1 font-barlow font-bold text-xs uppercase transition-colors ${
                specificTypeFilter
                  ? "opacity-50 pointer-events-none bg-slate-800 text-gray-500 cursor-not-allowed"
                  : activeFilter === category
                  ? "bg-hero-vibrant text-white"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {filteredLore.length > 0 && (
        <div className="mb-4">
          <p className="font-libre text-sm text-gray-400">
            {filteredLore.length} {filteredLore.length === 1 ? "Eintrag gefunden" : "Einträge gefunden"}
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredLore.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery || activeFilter !== "Alle" ? (
            // Filtered Empty State
            <>
              <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                Keine Einträge gefunden
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                {searchQuery
                  ? "Versuche andere Suchbegriffe."
                  : "Versuche einen anderen Filter."}
              </p>
              {(searchQuery || activeFilter !== "Alle" || specificTypeFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("Alle");
                    setSpecificTypeFilter(null);
                  }}
                  className="mt-4 px-4 py-2 rounded-md border border-hero-border bg-hero-dark text-white font-barlow font-bold text-xs uppercase hover:bg-hero-vibrant transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </>
          ) : isGM && loreEntries.length === 0 ? (
            // Full Empty State (Dual Path)
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex flex-col items-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border-2 border-hero-border">
                  <MapIcon className="h-8 w-8 text-accent-gold" />
                </div>
                <h3 className="font-cinzel font-bold text-2xl text-accent-gold mb-2">
                  Deine Welt ist noch ein unbeschriebenes Blatt.
                </h3>
                <p className="font-libre text-gray-400 mb-6">
                  Beginne deine Welt zu erschaffen - manuell oder mit KI-Unterstützung.
                </p>
              </div>

              <p className="font-libre text-gray-400 mb-4">
                Neue Einträge legst du in der <strong>Welt-Verwaltung</strong> an: Dashboard → Welten → deine Welt auswählen → Lore / Orte verwalten.
              </p>
              <Link
                href="/dashboard/worlds"
                className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors"
              >
                <MapIcon className="h-4 w-4" />
                Zur Welt-Verwaltung
              </Link>
            </div>
          ) : (
            // Player Empty State (Simple)
            <>
              <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="font-cinzel text-lg text-accent-gold mb-2">
                Keine Lore-Einträge verfügbar
              </p>
              <p className="font-libre text-sm text-gray-400 mb-4">
                Der Spielleiter hat noch keine Lore für dich sichtbar gemacht.
              </p>
            </>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLore.map((lore) => (
            <LoreGridCard
              key={lore.id}
              lore={lore as any}
              campaignId={campaignId}
              isGM={isGM}
              onDelete={isGM ? (handleDelete as any) : undefined}
              onToggleVisibility={isGM ? (handleToggleVisibility as any) : undefined}
              detailHref={undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

