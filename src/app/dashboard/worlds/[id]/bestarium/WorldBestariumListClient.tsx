"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PawPrint, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { BeastCreatorWizard } from "@/src/components/worlds/BeastCreatorWizard";
import { deleteBestariumCreature, type BestariumCreatureRow } from "@/src/app/dashboard/worlds/world-bestarium-actions";

type LocationOpt = { id: string; name: string; type: string };
type LoreOpt = { id: string; name: string; type: string | null };

type Props = {
  creatures: BestariumCreatureRow[];
  worldId: string;
  worldName: string;
  locations: LocationOpt[];
  loreEntries: LoreOpt[];
};

export function WorldBestariumListClient({ creatures, worldId, worldName, locations, loreEntries }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return creatures;
    const q = search.trim().toLowerCase();
    return creatures.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        (c.creature_type ?? "").toLowerCase().includes(q) ||
        (c.alignment ?? "").toLowerCase().includes(q) ||
        (c.physical_description ?? "").toLowerCase().includes(q)
    );
  }, [creatures, search]);

  const handleDelete = async (c: BestariumCreatureRow) => {
    if (!confirm(`„${c.name}" wirklich löschen?`)) return;
    try {
      await deleteBestariumCreature(c.id, worldId);
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  };

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
      {wizardOpen && (
        <BeastCreatorWizard
          worldId={worldId}
          worldName={worldName}
          locations={locations}
          loreEntries={loreEntries}
          onClose={() => setWizardOpen(false)}
          onSaved={(id) => {
            setWizardOpen(false);
            router.push(`/dashboard/worlds/${worldId}/bestarium/${id}/edit`);
            router.refresh();
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-hero-dark">
        <h1 className="font-barlow font-extrabold text-2xl sm:text-3xl uppercase tracking-wide text-hero-vibrant flex items-center gap-2">
          <PawPrint className="h-7 w-7 text-accent-gold shrink-0" />
          Bestarium · {worldName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark hover:bg-hero-dark hover:text-white transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Beast-Creator
          </button>
          <Link
            href={`/dashboard/worlds/${worldId}/bestarium/new`}
            className="flex items-center gap-2 rounded border border-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manuell
          </Link>
        </div>
      </div>

      <p className="font-libre text-sm text-gray-400 -mt-2">
        Monster und Biester für D&amp;D 5e (und andere Systeme über das Feld „System“). Orte und Lore kannst du zuweisen und
        jederzeit bearbeiten.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Name, Typ, Gesinnung …"
          className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
        />
      </div>

      {creatures.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-cinzel text-lg text-accent-gold mb-2">Noch keine Kreaturen</p>
          <p className="font-libre text-sm text-gray-400 mb-4">
            Nutze den Beast-Creator oder lege eine Kreatur manuell an.
          </p>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Erste Kreatur (KI)
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 font-libre text-gray-400">Keine Treffer für diese Suche.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border border-hero-border/60 bg-background-dark/40 p-4 flex flex-col gap-2 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/dashboard/worlds/${worldId}/bestarium/${c.id}`} className="group flex-1 min-w-0">
                  <h2 className="font-cinzel font-bold text-lg text-accent-gold group-hover:text-hero-vibrant transition-colors truncate">
                    {c.name}
                  </h2>
                  <p className="font-libre text-xs text-gray-400 mt-1">
                    {[c.size_category, c.creature_type].filter(Boolean).join(" · ") || "—"}
                    {c.alignment ? ` · ${c.alignment}` : ""}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(c)}
                  className="shrink-0 p-2 rounded text-red-400 hover:bg-red-950/40"
                  title="Löschen"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="font-libre text-sm text-gray-300">
                RK {c.armor_class ?? "—"} · TP {c.hit_points ?? "—"} · CR {c.challenge_rating ?? "—"}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto pt-2">
                <Link
                  href={`/dashboard/worlds/${worldId}/bestarium/${c.id}/edit`}
                  className="text-xs font-barlow font-bold uppercase text-hero-vibrant hover:text-white"
                >
                  Bearbeiten
                </Link>
                <Link
                  href={`/dashboard/worlds/${worldId}/bestarium/${c.id}`}
                  className="text-xs font-barlow font-bold uppercase text-gray-500 hover:text-gray-300"
                >
                  Statblock
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
