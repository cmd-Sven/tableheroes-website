"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Plus, Lightbulb, Search, X } from "lucide-react";
import { NPCGridCard } from "@/src/components/dashboard/NPCGridCard";
import { deleteNPC } from "@/src/app/dashboard/campaigns/[id]/npc-campaign-actions";
import { NarrativeNPCWizard } from "@/src/components/worlds/NarrativeNPCWizard";
import type { WorldTask } from "@/src/app/dashboard/worlds/world-tasks-actions";

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
  factions?: { id: string; name: string; type: string } | null;
};

type Props = {
  npcs: NPC[];
  worldId: string;
  worldName: string;
  pendingNpcTasks: WorldTask[];
  factions: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
};

export function WorldNPCsListClient({
  npcs,
  worldId,
  worldName,
  pendingNpcTasks,
  factions,
  locations,
}: Props) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredNpcs = useMemo(() => {
    if (!search.trim()) return npcs;
    const q = search.trim().toLowerCase();
    return npcs.filter(
      (n) =>
        n.name?.toLowerCase().includes(q) ||
        n.race?.toLowerCase().includes(q) ||
        n.role?.toLowerCase().includes(q)
    );
  }, [npcs, search]);

  // Entwürfe ausblenden, für die bereits ein NPC mit gleichem Namen existiert
  const visiblePendingNpcTasks = useMemo(() => {
    const existingNames = new Set(
      npcs
        .map((n) => (n.name || "").trim().toLowerCase())
        .filter((n) => n.length > 0)
    );
    return pendingNpcTasks.filter((t) => {
      const nameNorm = (t.proposed_name || "").trim().toLowerCase();
      if (!nameNorm) return true;
      return !existingNames.has(nameNorm);
    });
  }, [npcs, pendingNpcTasks]);

  const openWizard = (initialBriefing: string | null = null) => {
    setWizardPrefill(initialBriefing);
    setWizardOpen(true);
  };

  const handleWizardSuccess = (npcId: string) => {
    setWizardOpen(false);
    setWizardPrefill(null);
    router.push(`/dashboard/worlds/${worldId}/npcs/${npcId}`);
  };

  const handleDelete = async (npc: NPC) => {
    if (!confirm(`„${npc.name}" wirklich löschen?`)) return;
    try {
      await deleteNPC(npc.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Löschen.");
    }
  };

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
      {/* Messagebox: Offene NPC-Entwürfe */}
      {visiblePendingNpcTasks.length > 0 && (
        <div className="rounded-lg border border-accent-gold/40 bg-accent-gold/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-accent-gold">
            <Lightbulb className="h-5 w-5 shrink-0" />
            <span className="font-barlow font-bold text-sm uppercase">
              Du hast noch offene Entwürfe:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {visiblePendingNpcTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  openWizard(
                    [task.proposed_name, task.description].filter(Boolean).join("\n\n")
                  )
                }
                className="rounded border border-accent-gold/50 bg-background-dark/80 px-3 py-1.5 font-libre text-sm text-hero-vibrant hover:bg-accent-gold/20 transition-colors"
              >
                {task.proposed_name} – Jetzt vervollständigen
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header: X NPCs in [Weltname] + Button NPC erschaffen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-hero-dark">
        <h1 className="font-barlow font-extrabold text-2xl sm:text-3xl uppercase tracking-wide text-hero-vibrant">
          {npcs.length} NPCs in {worldName}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWizard(null)}
            className="flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark hover:bg-hero-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            NPC erschaffen
          </button>
          <Link
            href={`/dashboard/worlds/${worldId}/npcs/new`}
            className="flex items-center gap-2 rounded border border-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-400 hover:text-white transition-colors"
          >
            Formular
          </Link>
        </div>
      </div>

      <p className="font-libre text-sm text-gray-400 -mt-2">
        NPCs werden hier weltweit angelegt. Sichtbarkeit für Spieler steuerst du pro Kampagne im Tab „NPCs & Fraktionen“ (Auge-Symbol).
      </p>

      {/* Text-Suche: Name, Volk, Rolle */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen nach Name, Volk oder Rolle …"
          className="w-full rounded bg-slate-900 border border-hero-dark pl-10 pr-4 py-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none"
        />
      </div>

      {/* NPC-Grid */}
      {filteredNpcs.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-cinzel text-lg text-accent-gold mb-2">
            {search.trim() ? "Keine Treffer" : "Noch keine NPCs"}
          </p>
          <p className="font-libre text-sm text-gray-400">
            {search.trim()
              ? "Passe den Suchbegriff an."
              : "Klicke auf „NPC erschaffen“, um den Wizard zu starten."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNpcs.map((npc) => (
            <NPCGridCard
              key={npc.id}
              npc={npc as any}
              worldId={worldId}
              isGM={true}
              onDelete={handleDelete as any}
            />
          ))}
        </div>
      )}

      {/* Modal: Narrative NPC Wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-hero-border bg-background-dark shadow-2xl">
            <button
              type="button"
              onClick={() => { setWizardOpen(false); setWizardPrefill(null); }}
              className="absolute top-4 right-4 rounded p-1 text-gray-400 hover:text-white hover:bg-slate-700 z-10"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6">
              <NarrativeNPCWizard
                worldId={worldId}
                worldName={worldName}
                factions={factions}
                locations={locations}
                initialBriefing={wizardPrefill ?? undefined}
                onSuccess={handleWizardSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
