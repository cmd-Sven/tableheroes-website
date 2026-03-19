"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Plus, Search } from "lucide-react";
import { FactionGridCard } from "@/src/components/dashboard/FactionGridCard";
import { deleteFaction } from "@/src/app/dashboard/campaigns/[id]/factions-actions";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  member_count?: number;
};

type Props = {
  factions: Faction[];
  worldId: string;
};

export function WorldFactionsListClient({ factions, worldId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredFactions = useMemo(() => {
    if (!search.trim()) return factions;
    const q = search.trim().toLowerCase();
    return factions.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.type?.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)
    );
  }, [factions, search]);

  const handleDelete = async (faction: Faction) => {
    if (!confirm(`„${faction.name}" wirklich löschen?`)) return;
    try {
      await deleteFaction(faction.id);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fehler beim Löschen.";
      alert(msg);
    }
  };

  if (factions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-cinzel text-lg text-accent-gold mb-2">Noch keine Fraktionen</p>
        <p className="font-libre text-sm text-gray-400 mb-4">
          Fraktionen legst du hier für die ganze Welt an.
        </p>
        <Link
          href={`/dashboard/worlds/${worldId}/factions/new`}
          className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Erste Fraktion anlegen
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Fraktionen durchsuchen (Name, Typ, Beschreibung…)"
          className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
        />
      </div>

      {filteredFactions.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="font-cinzel text-lg text-accent-gold mb-2">Keine Treffer</p>
          <p className="font-libre text-sm text-gray-400">Passe den Suchbegriff an.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFactions.map((f) => (
            <FactionGridCard
              key={f.id}
              faction={f}
              worldId={worldId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
