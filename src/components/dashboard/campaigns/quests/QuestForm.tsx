"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { createQuest, updateQuest, getQuestParticipants, syncQuestParticipants } from "@/src/app/dashboard/campaigns/[id]/quest-actions";
import { generateQuest } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { markChronicleInboxItemImported } from "@/src/app/dashboard/campaigns/[id]/chronicle-inbox-actions";
import type { ChronicleImportRef } from "@/src/lib/session-chronicle/chronicle-import-types";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
};

type Member = {
  id: string;
  character_id: string | null;
  user?: {
    username: string;
  } | null;
  character_data?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status: string;
  } | null;
  characters?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status: string;
  } | null;
};

type Quest = {
  id: string;
  title: string;
  type: string;
  status: string;
  quest_giver_id: string | null;
  location_id: string | null;
  assigned_character_id?: string | null;
  description: string | null;
  rewards: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
};

type Props = {
  campaignId: string;
  initialData?: Quest | null;
  defaultQuestGiverId?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  chronicleImport?: ChronicleImportRef;
  npcs: Array<{ id: string; name: string; title: string | null; role: string | null }>;
  locations: Array<{ id: string; name: string; type: string }>;
  characters?: Character[];
  members?: Member[];
  onSuccess?: () => void;
};

const QUEST_TYPES = [
  "Main Quest",
  "Side Quest",
  "Fetch Quest",
  "Kill Quest",
  "Escort Quest",
  "Mystery Quest",
  "Other",
];

const QUEST_STATUSES = [
  "Active",
  "Completed",
  "Failed",
  "Draft",
];

type Participant = {
  id?: string;
  npc_id: string;
  role_description: string;
};

export function QuestForm({ campaignId, initialData, defaultQuestGiverId, defaultTitle, defaultDescription, chronicleImport, npcs, locations, characters = [], members = [], onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    title: "",
    type: "Side Quest",
    status: "Active",
    quest_giver_id: "",
    location_id: "",
    assigned_character_id: "",
    description: "",
    rewards: "",
    gm_notes: "",
    is_revealed: false,
  });

  const [questTargetType, setQuestTargetType] = useState<"group" | "personal">("group");
  const [aiPrompt, setAiPrompt] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Sync state when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        type: initialData.type || "Side Quest",
        status: initialData.status || "Active",
        quest_giver_id: initialData.quest_giver_id || "",
        location_id: initialData.location_id || "",
        assigned_character_id: initialData.assigned_character_id || "",
        description: initialData.description || "",
        rewards: initialData.rewards || "",
        gm_notes: initialData.gm_notes || "",
        is_revealed: initialData.is_revealed || false,
      });
      setQuestTargetType(initialData.assigned_character_id ? "personal" : "group");
      loadParticipants();
    } else {
      setFormData({
        title: defaultTitle || "",
        type: "Side Quest",
        status: "Active",
        quest_giver_id: defaultQuestGiverId || "",
        location_id: "",
        assigned_character_id: "",
        description: defaultDescription || "",
        rewards: "",
        gm_notes: "",
        is_revealed: false,
      });
      setQuestTargetType("group");
      setParticipants([]);
    }
  }, [initialData, defaultQuestGiverId, defaultTitle, defaultDescription]);

  const loadParticipants = async () => {
    if (!initialData?.id) return;
    try {
      const data = await getQuestParticipants(initialData.id);
      setParticipants(
        (data || []).map((p: any) => ({
          id: p.id,
          npc_id: p.npc_id,
          role_description: p.role_description || "",
        }))
      );
    } catch (error: any) {
      console.error("Error loading participants:", error);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { npc_id: "", role_description: "" }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: "npc_id" | "role_description", value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert("Bitte gib eine Quest-Idee ein.");
      return;
    }

    setIsGenerating(true);
    try {
      const contextIds: { questGiverId?: string; locationId?: string; targetCharacterId?: string } = {};
      if (formData.quest_giver_id) {
        contextIds.questGiverId = formData.quest_giver_id;
      }
      if (formData.location_id) {
        contextIds.locationId = formData.location_id;
      }
      if (questTargetType === "personal" && formData.assigned_character_id) {
        contextIds.targetCharacterId = formData.assigned_character_id;
      }

      const generated = await generateQuest(campaignId, contextIds, aiPrompt);
      const validType = QUEST_TYPES.includes(generated.type) ? generated.type : "Side Quest";
      
      setFormData({
        ...formData,
        title: generated.title || "",
        type: validType,
        description: generated.description || "",
        rewards: generated.rewards || "",
        gm_notes: generated.gm_notes || "",
        quest_giver_id: generated.quest_giver_id || formData.quest_giver_id || "",
        location_id: generated.location_id || formData.location_id || "",
      });
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der KI-Generierung.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          title: formData.title,
          type: formData.type,
          status: formData.status,
          quest_giver_id: formData.quest_giver_id || null,
          location_id: formData.location_id || null,
          assigned_character_id: questTargetType === "personal" ? (formData.assigned_character_id || null) : null,
          description: formData.description || undefined,
          rewards: formData.rewards || undefined,
          gm_notes: formData.gm_notes || undefined,
          is_revealed: formData.is_revealed,
        };

        let questId: string;
        if (isEditMode && initialData) {
          await updateQuest(initialData.id, payload);
          questId = initialData.id;
        } else {
          const newQuest = await createQuest({
            campaign_id: campaignId,
            ...payload,
          });
          questId = newQuest.id;
        }

        // Sync participants
        const validParticipants = participants
          .filter((p) => p.npc_id && p.npc_id !== formData.quest_giver_id)
          .map((p) => ({
            npc_id: p.npc_id,
            role_description: p.role_description || null,
          }));
        
        await syncQuestParticipants(questId, validParticipants);

        if (chronicleImport && !isEditMode) {
          try {
            await markChronicleInboxItemImported(
              chronicleImport.sessionId,
              chronicleImport.kind,
              chronicleImport.index,
              questId,
            );
          } catch (importErr) {
            console.warn("[QuestForm] Chronicle-Import markieren fehlgeschlagen:", importErr);
          }
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/campaigns/${campaignId}?tab=quests`);
          router.refresh();
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Ein Fehler ist aufgetreten.");
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">
            {isEditMode ? "Quest bearbeiten" : "Neue Quest erstellen"}
          </h1>
          {!isEditMode && (
            <div className="rounded border border-accent-gold/30 bg-gradient-to-br from-yellow-950/20 to-background-dark p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-accent-gold" />
                <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold">
                  Quest mit KI entwerfen
                </h3>
              </div>
              <div className="space-y-3">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="z.B. 'Die Spieler müssen ein gestohlenes Artefakt aus einer verfluchten Ruine bergen'"
                />
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full rounded bg-accent-gold px-4 py-2 font-barlow font-bold uppercase text-sm text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Generiere...
                    </>
                  ) : (
                    "✨ Quest mit KI entwerfen"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quest Target Type */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Quest-Ziel
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="questTargetType"
                value="group"
                checked={questTargetType === "group"}
                onChange={() => {
                  setQuestTargetType("group");
                  setFormData({ ...formData, assigned_character_id: "" });
                }}
                className="w-4 h-4 text-accent-gold border-hero-dark bg-slate-900 focus:ring-accent-gold focus:ring-2"
              />
              <span className="font-libre text-white">Gruppen-Quest</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="questTargetType"
                value="personal"
                checked={questTargetType === "personal"}
                onChange={() => setQuestTargetType("personal")}
                className="w-4 h-4 text-accent-gold border-hero-dark bg-slate-900 focus:ring-accent-gold focus:ring-2"
              />
              <span className="font-libre text-white">Persönliche Quest</span>
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Quest-Titel *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
            placeholder="z.B. Das gestohlene Artefakt"
          />
        </div>

        {/* Type & Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Quest-Typ *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              {QUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              {QUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quest Giver & Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Quest-Geber
            </label>
            <select
              value={formData.quest_giver_id}
              onChange={(e) => setFormData({ ...formData, quest_giver_id: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              <option value="">-- Kein Quest-Geber --</option>
              {npcs
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.name}{npc.title ? ` (${npc.title})` : npc.role ? ` (${npc.role})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Ort
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              <option value="">-- Kein Ort --</option>
              {locations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Assigned Character */}
        {questTargetType === "personal" && (
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Für welchen Charakter? *
            </label>
            <select
              required={questTargetType === "personal"}
              value={formData.assigned_character_id}
              onChange={(e) => setFormData({ ...formData, assigned_character_id: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              <option value="">-- Charakter auswählen --</option>
              {members && members.length > 0 ? (
                members
                  .filter((m) => {
                    const char = m.character_data || m.characters;
                    return m.character_id && char;
                  })
                  .map((m) => {
                    const char = m.character_data || m.characters;
                    const charName = char?.name || "Unbekannter Charakter";
                    const userName = m.user?.username || "Spieler";
                    return (
                      <option key={m.character_id} value={m.character_id || ""}>
                        {charName} ({userName})
                      </option>
                    );
                  })
              ) : characters && characters.length > 0 ? (
                characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} - Lvl {char.level} {char.race} {char.class}
                  </option>
                ))
              ) : (
                <option disabled>Keine Charaktere verfügbar</option>
              )}
            </select>
          </div>
        )}

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
              Weitere Beteiligte / NPCs
            </label>
            <button
              type="button"
              onClick={addParticipant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant transition-colors"
            >
              <Plus className="h-3 w-3" />
              NPC hinzufügen
            </button>
          </div>

          {participants.length === 0 ? (
            <p className="text-xs text-gray-500 font-libre italic">Noch keine weiteren NPCs hinzugefügt.</p>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={participant.npc_id}
                    onChange={(e) => updateParticipant(index, "npc_id", e.target.value)}
                    className="flex-1 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                  >
                    <option value="">-- NPC auswählen --</option>
                    {npcs
                      .filter((npc) => npc.id !== formData.quest_giver_id && !participants.some((p, i) => i !== index && p.npc_id === npc.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((npc) => (
                        <option key={npc.id} value={npc.id}>
                          {npc.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={participant.role_description}
                    onChange={(e) => updateParticipant(index, "role_description", e.target.value)}
                    placeholder="Rolle/Beschreibung"
                    className="flex-1 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                  />
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="p-2 rounded border border-red-700 bg-red-900/50 text-red-300 hover:bg-red-900/70 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Beschreibung
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
            placeholder="Beschreibe die Quest..."
          />
        </div>

        {/* Rewards */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Belohnungen
          </label>
          <textarea
            value={formData.rewards}
            onChange={(e) => setFormData({ ...formData, rewards: e.target.value })}
            rows={3}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
            placeholder="z.B. 500 Gold, Magischer Ring..."
          />
        </div>

        {/* GM Notes */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
            🔒 GM-Notizen
          </label>
          <textarea
            value={formData.gm_notes}
            onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value })}
            rows={3}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold border-l-4 border-l-accent-gold resize-none"
            placeholder="Geheimnisse, Hooks, Notizen..."
          />
        </div>

        {/* Reveal Checkbox */}
        <div className="flex items-center gap-3 rounded border border-hero-border/30 bg-slate-900/50 p-4">
          <input
            type="checkbox"
            id="is_revealed"
            checked={formData.is_revealed}
            onChange={(e) => setFormData({ ...formData, is_revealed: e.target.checked })}
            className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
          />
          <label htmlFor="is_revealed" className="font-libre text-sm text-gray-300 cursor-pointer select-none">
            Für Spieler sichtbar
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-hero-border/20">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
          >
            {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Quest erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}



