"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Shield, Search } from "lucide-react";
import { updateCharacterByGM } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import {
  getCharacterFactionReputations,
  upsertCharacterFactionReputation,
  deleteCharacterFactionReputation,
  type FactionReputation,
} from "@/src/app/dashboard/campaigns/[id]/reputation-actions";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  status?: string;
  biography?: string | null;
  character_relationships?: Array<{
    id: string;
    relationship_type: string;
    description: string | null;
    npcs: {
      id: string;
      name: string;
      role: string | null;
      title: string | null;
    } | null;
  }>;
};

type NPC = {
  id: string;
  name: string;
  role: string | null;
  title: string | null;
};

type Faction = { id: string; name: string };

type Props = {
  character: Character;
  campaignId: string;
  npcs: NPC[];
  factions?: Faction[];
};

export function GMCharacterEditorPage({
  character,
  campaignId,
  npcs,
  factions = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reputations, setReputations] = useState<FactionReputation[]>([]);
  const [loadingReputations, setLoadingReputations] = useState(true);
  const [repPending, setRepPending] = useState(false);
  const [newRepFactionId, setNewRepFactionId] = useState("");
  const [newRepValue, setNewRepValue] = useState(0);
  const [newRepRank, setNewRepRank] = useState("");
  const [status, setStatus] = useState(character.status || "Alive");
  const [level, setLevel] = useState(character.level || 1);
  const [biography, setBiography] = useState(character.biography || "");
  const [relationships, setRelationships] = useState<
    Array<{
      id?: string;
      npc_id: string;
      relationship_type: string;
      description: string;
    }>
  >(
    (character.character_relationships || []).map((rel) => ({
      id: rel.id,
      npc_id: rel.npcs?.id || "",
      relationship_type: rel.relationship_type,
      description: rel.description || "",
    }))
  );

  const [npcSearch, setNpcSearch] = useState<Record<number, string>>({});
  const [factionSearch, setFactionSearch] = useState("");

  useEffect(() => {
    if (character.id) {
      setLoadingReputations(true);
      getCharacterFactionReputations(character.id, campaignId)
        .then(setReputations)
        .finally(() => setLoadingReputations(false));
    }
  }, [character.id, campaignId]);

  const handleAddRelationship = () => {
    setRelationships([
      ...relationships,
      { npc_id: "", relationship_type: "", description: "" },
    ]);
  };

  const handleRemoveRelationship = (index: number) => {
    setRelationships(relationships.filter((_, i) => i !== index));
  };

  const handleUpdateRelationship = (
    index: number,
    field: "npc_id" | "relationship_type" | "description",
    value: string
  ) => {
    const updated = [...relationships];
    updated[index] = { ...updated[index], [field]: value };
    setRelationships(updated);
  };

  const handleSave = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        await updateCharacterByGM({
          character_id: character.id,
          campaign_id: campaignId,
          status: status as "Alive" | "Dead" | "Archived" | "Paused",
          level,
          biography: biography || null,
          relationships: relationships.filter(
            (r) => r.npc_id && r.relationship_type
          ),
        });
        router.push(`/dashboard/campaigns/${campaignId}?tab=members`);
        router.refresh();
      } catch (error: unknown) {
        alert((error as Error).message || "Fehler beim Speichern der Änderungen.");
      }
    });
  };

  const handleAddReputation = async () => {
    if (!newRepFactionId || repPending) return;
    setRepPending(true);
    try {
      await upsertCharacterFactionReputation({
        campaign_id: campaignId,
        character_id: character.id,
        faction_id: newRepFactionId,
        reputation: newRepValue,
        rank: newRepRank.trim() || null,
      });
      const list = await getCharacterFactionReputations(character.id, campaignId);
      setReputations(list);
      setNewRepFactionId("");
      setNewRepValue(0);
      setNewRepRank("");
      setFactionSearch("");
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const handleDeleteReputation = async (repId: string) => {
    if (repPending) return;
    setRepPending(true);
    try {
      await deleteCharacterFactionReputation({ campaign_id: campaignId, reputation_id: repId });
      setReputations((prev) => prev.filter((r) => r.id !== repId));
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const handleUpdateReputation = async (rep: FactionReputation, updates: { reputation?: number; rank?: string | null }) => {
    if (repPending) return;
    setRepPending(true);
    try {
      await upsertCharacterFactionReputation({
        campaign_id: campaignId,
        character_id: character.id,
        faction_id: rep.faction_id,
        reputation: updates.reputation ?? rep.reputation,
        rank: updates.rank !== undefined ? updates.rank : rep.rank,
      });
      setReputations((prev) =>
        prev.map((r) =>
          r.id === rep.id
            ? { ...r, reputation: updates.reputation ?? r.reputation, rank: updates.rank !== undefined ? updates.rank : r.rank }
            : r
        )
      );
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const factionsWithoutRep = factions.filter((f) => !reputations.some((r) => r.faction_id === f.id));
  const filteredFactionsForAdd = factionSearch.trim()
    ? factionsWithoutRep.filter((f) =>
        f.name.toLowerCase().includes(factionSearch.trim().toLowerCase())
      )
    : factionsWithoutRep;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
          Charakter verwalten
        </h1>
        <p className="font-libre text-lg text-gray-300 mt-2">
          {character.name} — {character.class}, {character.race}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Linke Spalte: Status, Level, Biografie */}
        <div className="space-y-6">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Charakter-Status
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  disabled={isPending}
                >
                  <option value="Alive">Lebend</option>
                  <option value="Dead">Tot</option>
                  <option value="Archived">Archiviert</option>
                  <option value="Paused">Pausiert</option>
                </select>
                {status === "Dead" && (
                  <p className="mt-2 font-libre text-sm text-yellow-400 italic">
                    Wenn der Status auf „Tot“ gesetzt wird, kann der Spieler einen neuen Charakter erstellen.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Level
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Hintergrundgeschichte / Biografie
            </h2>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={12}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-4 font-libre text-white outline-none transition-all focus:border-accent-gold resize-y"
              placeholder="Die Hintergrundgeschichte des Charakters…"
              disabled={isPending}
            />
            <p className="mt-2 text-sm text-gray-500 font-libre italic">
              Der GM kann die Biografie bearbeiten, um Notizen zu machen oder Inhalte anzupassen.
            </p>
          </div>
        </div>

        {/* Rechte Spalte: Beziehungen & Ruf */}
        <div className="space-y-6">
          {/* Beziehungen */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Beziehungen & Kontakte
              </h2>
              <button
                type="button"
                onClick={handleAddRelationship}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded border border-hero-border bg-hero-dark font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Beziehung hinzufügen
              </button>
            </div>

            {relationships.length === 0 ? (
              <p className="font-libre text-gray-500 italic text-center py-8 border border-hero-border/30 rounded bg-background-dark">
                Noch keine Beziehungen definiert.
              </p>
            ) : (
              <div className="space-y-4">
                {relationships.map((rel, index) => {
                  const availableForThis = npcs.filter(
                    (npc) =>
                      !relationships.some(
                        (r, i) => i !== index && r.npc_id === npc.id
                      ) || rel.npc_id === npc.id
                  );
                  const search = npcSearch[index] ?? "";
                  const filteredNPCs = search.trim()
                    ? availableForThis.filter((n) =>
                        n.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                        (n.title ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                        (n.role ?? "").toLowerCase().includes(search.trim().toLowerCase())
                      )
                    : availableForThis;

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-hero-border bg-hero-dark/30 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              NPC suchen
                            </label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                  setNpcSearch((prev) => ({ ...prev, [index]: e.target.value }))
                                }
                                placeholder="Name, Rolle oder Titel eingeben…"
                                className="w-full pl-10 pr-3 py-2 rounded border border-hero-dark bg-slate-900/80 text-sm font-libre text-white outline-none focus:border-accent-gold"
                                disabled={isPending}
                              />
                            </div>
                            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-hero-dark bg-background-dark">
                              {filteredNPCs.length === 0 ? (
                                <p className="p-3 text-sm text-gray-500 italic">Keine passenden NPCs</p>
                              ) : (
                                filteredNPCs
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((npc) => (
                                    <button
                                      key={npc.id}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateRelationship(index, "npc_id", npc.id);
                                        setNpcSearch((prev) => ({ ...prev, [index]: "" }));
                                      }}
                                      className={`w-full px-3 py-2 text-left text-sm font-libre hover:bg-hero-dark/50 transition-colors ${
                                        rel.npc_id === npc.id
                                          ? "bg-hero-vibrant/20 text-hero-vibrant border-l-2 border-hero-vibrant"
                                          : "text-gray-200"
                                      }`}
                                    >
                                      {npc.name}
                                      {npc.title ? ` (${npc.title})` : npc.role ? ` — ${npc.role}` : ""}
                                    </button>
                                  ))
                              )}
                            </div>
                            {rel.npc_id && (
                              <p className="mt-1 text-xs text-accent-gold">
                                Ausgewählt: {npcs.find((n) => n.id === rel.npc_id)?.name ?? "—"}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              Beziehungstyp
                            </label>
                            <input
                              type="text"
                              value={rel.relationship_type}
                              onChange={(e) =>
                                handleUpdateRelationship(index, "relationship_type", e.target.value)
                              }
                              placeholder="z.B. Mentor, Feind, Verbündeter"
                              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                              disabled={isPending}
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              Beschreibung (optional)
                            </label>
                            <input
                              type="text"
                              value={rel.description}
                              onChange={(e) =>
                                handleUpdateRelationship(index, "description", e.target.value)
                              }
                              placeholder="Kurze Beschreibung der Beziehung"
                              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                              disabled={isPending}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelationship(index)}
                          disabled={isPending}
                          className="p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0"
                          title="Entfernen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ruf bei Fraktionen */}
          {factions.length > 0 && (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent-gold" />
                Ruf bei Fraktionen
              </h2>

              {factionsWithoutRep.length > 0 && (
                <div className="mb-6 p-4 rounded border border-hero-border bg-hero-dark/30 space-y-3">
                  <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
                    Neue Fraktion hinzufügen
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      value={factionSearch}
                      onChange={(e) => setFactionSearch(e.target.value)}
                      placeholder="Fraktion suchen…"
                      className="w-full pl-10 pr-3 py-2 rounded border border-hero-dark bg-slate-900/80 text-sm font-libre text-white outline-none focus:border-accent-gold"
                      disabled={repPending}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border border-hero-dark bg-background-dark">
                    {filteredFactionsForAdd.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500 italic">Keine passenden Fraktionen</p>
                    ) : (
                      filteredFactionsForAdd.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setNewRepFactionId(f.id);
                            setFactionSearch("");
                          }}
                          className={`w-full px-3 py-2 text-left text-sm font-libre hover:bg-hero-dark/50 transition-colors ${
                            newRepFactionId === f.id
                              ? "bg-hero-vibrant/20 text-hero-vibrant"
                              : "text-gray-200"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))
                    )}
                  </div>
                  {newRepFactionId && (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <span className="font-libre text-sm text-accent-gold">
                        Ausgewählt: {factions.find((f) => f.id === newRepFactionId)?.name ?? "—"}
                      </span>
                      <input
                        type="text"
                        value={newRepRank}
                        onChange={(e) => setNewRepRank(e.target.value)}
                        placeholder="Rang (z.B. Explorer)"
                        className="w-36 rounded border border-hero-dark bg-slate-900/80 px-2 py-1.5 text-sm font-libre text-white outline-none focus:border-accent-gold"
                        disabled={repPending}
                      />
                      <input
                        type="number"
                        min={-100}
                        max={100}
                        value={newRepValue}
                        onChange={(e) => setNewRepValue(parseInt(e.target.value) || 0)}
                        className="w-20 rounded border border-hero-dark bg-slate-900/80 px-2 py-1.5 text-sm text-center text-white"
                        disabled={repPending}
                      />
                      <button
                        type="button"
                        onClick={handleAddReputation}
                        disabled={repPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant disabled:opacity-50"
                      >
                        {repPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loadingReputations ? (
                <p className="font-libre text-gray-500 italic py-4">Lade Ruf…</p>
              ) : reputations.length === 0 ? (
                <p className="font-libre text-gray-500 italic py-6 border border-hero-border/30 rounded bg-background-dark text-center">
                  Noch kein Ruf bei Fraktionen. Der Spieler sieht hier seine Beziehungen zu Fraktionen.
                </p>
              ) : (
                <div className="space-y-3">
                  {reputations.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex flex-wrap items-center gap-4 p-4 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <span className="font-libre font-semibold text-white min-w-[140px]">{rep.faction_name}</span>
                      <input
                        key={`${rep.id}-rank-${rep.rank ?? ""}`}
                        type="text"
                        defaultValue={rep.rank ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (rep.rank ?? "")) handleUpdateReputation(rep, { rank: v || null });
                        }}
                        placeholder="Rang (z.B. Explorer)"
                        className="w-36 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                        disabled={repPending}
                      />
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={rep.reputation}
                        onChange={(e) => handleUpdateReputation(rep, { reputation: parseInt(e.target.value) || 0 })}
                        disabled={repPending}
                        className="flex-1 min-w-[100px] accent-hero-vibrant"
                      />
                      <span
                        className={`font-barlow font-bold w-12 text-center text-lg ${
                          rep.reputation > 0 ? "text-green-400" : rep.reputation < 0 ? "text-red-400" : "text-gray-400"
                        }`}
                      >
                        {rep.reputation}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReputation(rep.id)}
                        disabled={repPending}
                        className="p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Entfernen"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-hero-dark bg-background-card p-6">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=members`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Abbrechen
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-8 py-3 rounded bg-hero-vibrant font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Speichere…
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Speichern
            </>
          )}
        </button>
      </div>
    </div>
  );
}
