"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Save, Plus, Trash2, Loader2, Shield } from "lucide-react";
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
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  campaignId: string;
  npcs: NPC[];
  factions?: Faction[];
};

export function GMCharacterEditor({
  isOpen,
  onClose,
  character,
  campaignId,
  npcs,
  factions = [],
}: Props) {
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

  useEffect(() => {
    if (isOpen && character.id) {
      setLoadingReputations(true);
      getCharacterFactionReputations(character.id, campaignId)
        .then(setReputations)
        .finally(() => setLoadingReputations(false));
    }
  }, [isOpen, character.id, campaignId]);

  if (!isOpen) return null;

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
        onClose();
        window.location.reload();
      } catch (error: any) {
        alert(error.message || "Fehler beim Speichern der Änderungen.");
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

  const availableNPCs = npcs.filter(
    (npc) =>
      !relationships.some(
        (rel, idx) => rel.npc_id === npc.id && relationships[idx].npc_id === npc.id
      ) || relationships.some((rel) => rel.npc_id === npc.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/95 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-border/30">
          <div>
            <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
              Charakter verwalten
            </h2>
            <p className="font-libre text-sm text-gray-400 mt-1">
              {character.name} ({character.class}, {character.race})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 transition-colors hover:bg-hero-dark hover:text-white"
            disabled={isPending}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Charakter-Status
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
              <p className="mt-2 font-libre text-xs text-yellow-400 italic">
                ⚠️ Wenn der Status auf "Tot" gesetzt wird, kann der Spieler einen neuen Charakter erstellen.
              </p>
            )}
          </div>

          {/* Level */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Level
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              disabled={isPending}
            />
          </div>

          {/* Biography */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Hintergrundgeschichte / Biografie
            </label>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={8}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-y"
              placeholder="Die Hintergrundgeschichte des Charakters..."
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-gray-500 font-libre italic">
              Der GM kann die Biografie bearbeiten, um Notizen zu machen oder Inhalte anzupassen.
            </p>
          </div>

          {/* Relationships */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
                Beziehungen & Kontakte
              </label>
              <button
                type="button"
                onClick={handleAddRelationship}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Beziehung hinzufügen
              </button>
            </div>

            {relationships.length === 0 ? (
              <p className="font-libre text-sm text-gray-500 italic text-center py-4 border border-hero-border/30 rounded bg-background-dark">
                Noch keine Beziehungen definiert.
              </p>
            ) : (
              <div className="space-y-3">
                {relationships.map((rel, index) => {
                  const availableForThis = npcs.filter(
                    (npc) =>
                      !relationships.some(
                        (r, i) => i !== index && r.npc_id === npc.id
                      ) || rel.npc_id === npc.id
                  );

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <div className="flex-1 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                            NPC
                          </label>
                          <select
                            value={rel.npc_id}
                            onChange={(e) =>
                              handleUpdateRelationship(index, "npc_id", e.target.value)
                            }
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                            disabled={isPending}
                          >
                            <option value="">-- NPC wählen --</option>
                            {availableForThis
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((npc) => (
                                <option key={npc.id} value={npc.id}>
                                  {npc.name}
                                  {npc.title ? ` (${npc.title})` : npc.role ? ` (${npc.role})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                            Beziehungstyp
                          </label>
                          <input
                            type="text"
                            value={rel.relationship_type}
                            onChange={(e) =>
                              handleUpdateRelationship(
                                index,
                                "relationship_type",
                                e.target.value
                              )
                            }
                            placeholder="z.B. Mentor, Feind"
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                            Beschreibung (Optional)
                          </label>
                          <input
                            type="text"
                            value={rel.description}
                            onChange={(e) =>
                              handleUpdateRelationship(index, "description", e.target.value)
                            }
                            placeholder="Kurze Beschreibung"
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRelationship(index)}
                        disabled={isPending}
                        className="mt-6 p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ruf bei Fraktionen */}
          {factions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 font-barlow font-bold text-sm uppercase text-gray-300">
                  <Shield className="h-4 w-4 text-accent-gold" />
                  Ruf bei Fraktionen
                </label>
                {factionsWithoutRep.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={newRepFactionId}
                      onChange={(e) => setNewRepFactionId(e.target.value)}
                      className="rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                      disabled={repPending}
                    >
                      <option value="">-- Fraktion wählen --</option>
                      {factionsWithoutRep.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newRepRank}
                      onChange={(e) => setNewRepRank(e.target.value)}
                      placeholder="Rang (z.B. Explorer)"
                      className="w-28 rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                      disabled={repPending}
                    />
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={newRepValue}
                      onChange={(e) => setNewRepValue(parseInt(e.target.value) || 0)}
                      className="w-20 rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white text-center"
                      disabled={repPending}
                    />
                    <button
                      type="button"
                      onClick={handleAddReputation}
                      disabled={!newRepFactionId || repPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant disabled:opacity-50"
                    >
                      {repPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Hinzufügen
                    </button>
                  </div>
                )}
              </div>
              {loadingReputations ? (
                <p className="font-libre text-sm text-gray-500 italic py-2">Lade Ruf…</p>
              ) : reputations.length === 0 ? (
                <p className="font-libre text-sm text-gray-500 italic py-4 border border-hero-border/30 rounded bg-background-dark">
                  Noch kein Ruf bei Fraktionen. Der Spieler sieht hier seine Beziehungen zu Fraktionen (z.B. nach einem Diebstahl bei Elder-Suns: negativer Ruf).
                </p>
              ) : (
                <div className="space-y-2">
                  {reputations.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex flex-wrap items-center gap-3 p-3 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <span className="font-libre font-semibold text-white min-w-[120px]">{rep.faction_name}</span>
                      <input
                        key={`${rep.id}-rank-${rep.rank ?? ""}`}
                        type="text"
                        defaultValue={rep.rank ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (rep.rank ?? "")) handleUpdateReputation(rep, { rank: v || null });
                        }}
                        placeholder="Rang (z.B. Explorer)"
                        className="w-28 rounded border border-hero-dark bg-slate-900/80 p-1.5 text-sm font-libre text-white outline-none focus:border-accent-gold"
                        disabled={repPending}
                      />
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={rep.reputation}
                        onChange={(e) => handleUpdateReputation(rep, { reputation: parseInt(e.target.value) || 0 })}
                        disabled={repPending}
                        className="flex-1 min-w-[80px] accent-hero-vibrant"
                      />
                      <span
                        className={`font-barlow font-bold w-10 text-center ${
                          rep.reputation > 0 ? "text-green-400" : rep.reputation < 0 ? "text-red-400" : "text-gray-400"
                        }`}
                      >
                        {rep.reputation}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReputation(rep.id)}
                        disabled={repPending}
                        className="p-1.5 rounded text-red-400 hover:bg-red-900/20"
                        title="Entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-6 py-2 rounded border border-hero-border font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2 rounded bg-hero-vibrant font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Speichern
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

