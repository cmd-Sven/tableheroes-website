"use client";

import { useState, useTransition, useEffect } from "react";
import { X, ScrollText, User, MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { addQuestParticipant, deleteQuestParticipant, getQuestParticipants } from "@/src/app/dashboard/campaigns/[id]/quest-actions";

type Quest = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  rewards: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  quest_giver?: {
    id: string;
    name: string;
    title: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type QuestParticipant = {
  id: string;
  npc_id: string;
  role_description: string | null;
  npcs?: {
    id: string;
    name: string;
    title: string | null;
    role: string | null;
  };
};

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
};

type Props = {
  quest: Quest | null;
  isOpen: boolean;
  onClose: () => void;
  npcs: NPC[];
  isGM: boolean;
};

export function QuestDetailModal({ quest, isOpen, onClose, npcs, isGM }: Props) {
  const [participants, setParticipants] = useState<QuestParticipant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedNPCId, setSelectedNPCId] = useState("");
  const [participantRole, setParticipantRole] = useState("");

  // Load participants when modal opens
  useEffect(() => {
    if (isOpen && quest) {
      loadParticipants();
    } else {
      setParticipants([]);
      setShowAddParticipant(false);
      setSelectedNPCId("");
      setParticipantRole("");
    }
  }, [isOpen, quest]);

  const loadParticipants = async () => {
    if (!quest) return;
    setIsLoadingParticipants(true);
    try {
      const data = await getQuestParticipants(quest.id);
      setParticipants(data || []);
    } catch (error: any) {
      console.error("Error loading participants:", error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleAddParticipant = () => {
    if (!quest || !selectedNPCId) return;
    startTransition(async () => {
      try {
        await addQuestParticipant(quest.id, selectedNPCId, participantRole || null);
        await loadParticipants();
        setShowAddParticipant(false);
        setSelectedNPCId("");
        setParticipantRole("");
      } catch (error: any) {
        alert(error.message || "Fehler beim Hinzufügen des Teilnehmers.");
      }
    });
  };

  const handleDeleteParticipant = (participantId: string) => {
    if (!confirm("Teilnehmer wirklich entfernen?")) return;
    startTransition(async () => {
      try {
        await deleteQuestParticipant(participantId);
        await loadParticipants();
      } catch (error: any) {
        alert(error.message || "Fehler beim Löschen des Teilnehmers.");
      }
    });
  };

  if (!isOpen || !quest) return null;

  // Get available NPCs (not already participants and not the quest giver)
  const availableNPCs = npcs.filter(
    (npc) =>
      npc.id !== quest.quest_giver?.id &&
      !participants.some((p) => p.npc_id === npc.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-background-card border border-hero-border rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-accent-gold" />
            <h2 className="font-cinzel font-bold text-2xl text-white">{quest.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:text-white hover:bg-hero-dark transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Type & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark text-hero-vibrant">
              {quest.type}
            </span>
            <span
              className={`px-3 py-1 rounded text-xs font-barlow font-bold uppercase border ${
                quest.status === "Completed"
                  ? "bg-green-900/50 text-green-300 border-green-700"
                  : "bg-blue-900/50 text-blue-300 border-blue-700"
              }`}
            >
              {quest.status === "Completed" ? "Abgeschlossen" : "Aktiv"}
            </span>
          </div>

          {/* Quest Giver */}
          {quest.quest_giver && (
            <div>
              <h3 className="font-barlow font-bold text-sm uppercase text-gray-300 mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-accent-gold" />
                Quest-Geber
              </h3>
              <p className="font-libre text-gray-200">
                {quest.quest_giver.name}
                {quest.quest_giver.title && ` (${quest.quest_giver.title})`}
              </p>
            </div>
          )}

          {/* Location */}
          {quest.location && (
            <div>
              <h3 className="font-barlow font-bold text-sm uppercase text-gray-300 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-gold" />
                Ort
              </h3>
              <p className="font-libre text-gray-200">
                {quest.location.name} ({quest.location.type})
              </p>
            </div>
          )}

          {/* Beteiligte NPCs (GM Only) */}
          {isGM && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-barlow font-bold text-sm uppercase text-gray-300 flex items-center gap-2">
                  <User className="h-4 w-4 text-accent-gold" />
                  Beteiligte NPCs
                </h3>
                {!showAddParticipant && (
                  <button
                    onClick={() => setShowAddParticipant(true)}
                    disabled={isPending || availableNPCs.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                    NPC hinzufügen
                  </button>
                )}
              </div>

              {/* Add Participant Form */}
              {showAddParticipant && (
                <div className="mb-4 p-4 rounded border border-hero-border bg-hero-dark/30 space-y-3">
                  <div>
                    <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                      NPC auswählen
                    </label>
                    <select
                      value={selectedNPCId}
                      onChange={(e) => setSelectedNPCId(e.target.value)}
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                    >
                      <option value="">-- NPC wählen --</option>
                      {availableNPCs
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
                    <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                      Rolle (optional, z.B. "Informant", "Händler")
                    </label>
                    <input
                      type="text"
                      value={participantRole}
                      onChange={(e) => setParticipantRole(e.target.value)}
                      placeholder="z.B. Informant"
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddParticipant}
                      disabled={isPending || !selectedNPCId}
                      className="flex-1 px-3 py-2 rounded bg-hero-vibrant text-xs font-barlow font-bold uppercase text-white hover:bg-hero-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          Hinzufügen...
                        </>
                      ) : (
                        "Hinzufügen"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddParticipant(false);
                        setSelectedNPCId("");
                        setParticipantRole("");
                      }}
                      className="px-3 py-2 rounded border border-hero-border text-xs font-barlow font-bold uppercase text-gray-300 hover:bg-hero-dark transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Participants List */}
              {isLoadingParticipants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
                </div>
              ) : participants.length === 0 ? (
                <p className="text-sm font-libre text-gray-500 italic">
                  Noch keine beteiligten NPCs.
                </p>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-accent-gold" />
                        <span className="font-libre text-gray-200">
                          {participant.npcs?.name || "Unbekannter NPC"}
                          {participant.npcs?.title && ` (${participant.npcs.title})`}
                          {participant.role_description && (
                            <span className="text-gray-400 italic"> - {participant.role_description}</span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteParticipant(participant.id)}
                        disabled={isPending}
                        className="p-1.5 rounded text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
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

          {/* Description */}
          {quest.description && (
            <div>
              <h3 className="font-barlow font-bold text-sm uppercase text-gray-300 mb-2">
                Beschreibung
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {quest.description}
              </p>
            </div>
          )}

          {/* Rewards */}
          {quest.rewards && (
            <div>
              <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
                Belohnungen
              </h3>
              <p className="font-libre text-gray-200">{quest.rewards}</p>
            </div>
          )}

          {/* GM Notes */}
          {isGM && quest.gm_notes && (
            <div>
              <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
                🔒 GM-Notizen
              </h3>
              <p className="font-libre text-gray-400 leading-relaxed whitespace-pre-wrap bg-black/20 p-3 rounded border border-hero-border/10">
                {quest.gm_notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark">
          <button
            onClick={onClose}
            className="w-full rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

