"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  ScrollText,
  Sparkles,
  Plus,
  Trash2,
  User,
  Star,
  Loader2,
  Check,
} from "lucide-react";
import {
  createQuest,
  updateQuest,
  getQuestParticipants,
  syncQuestParticipants,
  getQuestAnchors,
} from "@/src/app/dashboard/campaigns/[id]/quest-actions";
import type { QuestAnchor } from "@/src/types/quest";
import { generateQuest } from "@/src/app/dashboard/campaigns/[id]/ai-actions";

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

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  npcs: Array<{
    id: string;
    name: string;
    title: string | null;
    role: string | null;
  }>;
  locations: Array<{ id: string; name: string; type: string }>;
  characters?: Character[];
  members?: Member[];
  /** Wenn gesetzt (z.B. von NPC-Detailseite): Questgeber fest, Anker sofort laden */
  defaultQuestGiverId?: string;
  defaultQuestGiverName?: string;
  existingQuest?: {
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
  } | null;
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

const QUEST_STATUSES = ["Active", "Completed"];

export function CreateQuestModal({
  campaignId,
  isOpen,
  onClose,
  npcs,
  locations,
  characters = [],
  members = [],
  defaultQuestGiverId,
  defaultQuestGiverName,
  existingQuest,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const isEditMode = !!existingQuest;

  // Debug: Log received members
  console.log("🔍 [CreateQuestModal] Received members:", members);
  console.log("🔍 [CreateQuestModal] Received characters:", characters);

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

  // Quest Type: "group" or "personal"
  const [questTargetType, setQuestTargetType] = useState<"group" | "personal">(
    "group",
  );

  const [aiPrompt, setAiPrompt] = useState("");

  // Erzählerische Anker (Priorität: ignore | include | prioritize)
  const [questAnchors, setQuestAnchors] = useState<QuestAnchor[]>([]);
  const [anchorPriorities, setAnchorPriorities] = useState<
    Record<string, "ignore" | "include" | "prioritize">
  >({});
  const [isLoadingAnchors, setIsLoadingAnchors] = useState(false);

  // Beteiligte NPCs
  type Participant = {
    id?: string; // Für Edit-Mode (wenn bereits in DB)
    npc_id: string;
    role_description: string;
  };
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Lade Erzählerische Anker wenn Quest-Geber oder Ort sich ändert
  useEffect(() => {
    if (!isOpen || isEditMode) return;
    const qg = formData.quest_giver_id || null;
    const loc = formData.location_id || null;
    if (!qg && !loc) {
      setQuestAnchors([]);
      setAnchorPriorities({});
      return;
    }
    setIsLoadingAnchors(true);
    getQuestAnchors(campaignId, qg, loc)
      .then((anchors) => {
        setQuestAnchors(anchors);
        setAnchorPriorities({});
      })
      .catch(() => setQuestAnchors([]))
      .finally(() => setIsLoadingAnchors(false));
  }, [
    isOpen,
    isEditMode,
    campaignId,
    formData.quest_giver_id,
    formData.location_id,
  ]);

  const setAnchorPriority = (
    anchorId: string,
    value: "ignore" | "include" | "prioritize",
  ) => {
    setAnchorPriorities((prev) => ({ ...prev, [anchorId]: value }));
  };

  // Sync state when opening modal (Edit vs Create)
  useEffect(() => {
    if (isOpen) {
      if (existingQuest) {
        // EDIT MODE: Vorhandene Daten laden
        setFormData({
          title: existingQuest.title || "",
          type: existingQuest.type || "Side Quest",
          status: existingQuest.status || "Active",
          quest_giver_id: existingQuest.quest_giver_id || "",
          location_id: existingQuest.location_id || "",
          assigned_character_id: existingQuest.assigned_character_id || "",
          description: existingQuest.description || "",
          rewards: existingQuest.rewards || "",
          gm_notes: existingQuest.gm_notes || "",
          is_revealed: existingQuest.is_revealed || false,
        });
        setQuestTargetType(
          existingQuest.assigned_character_id ? "personal" : "group",
        );
        setAiPrompt("");

        // Lade bestehende Teilnehmer
        loadParticipants();
      } else {
        // CREATE MODE: Leeren, ggf. festen Questgeber setzen (von NPC-Seite)
        setFormData({
          title: "",
          type: "Side Quest",
          status: "Active",
          quest_giver_id: defaultQuestGiverId || "",
          location_id: "",
          assigned_character_id: "",
          description: "",
          rewards: "",
          gm_notes: "",
          is_revealed: false,
        });
        setQuestTargetType("group");
        setAiPrompt("");
        setParticipants([]);
      }
    }
  }, [isOpen, existingQuest, defaultQuestGiverId]);

  const loadParticipants = async () => {
    if (!existingQuest?.id) return;
    try {
      const data = await getQuestParticipants(existingQuest.id);
      setParticipants(
        (data || []).map((p: any) => ({
          id: p.id,
          npc_id: p.npc_id,
          role_description: p.role_description || "",
        })),
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

  const updateParticipant = (
    index: number,
    field: "npc_id" | "role_description",
    value: string,
  ) => {
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
      // Übergebe die bereits ausgewählten IDs an die KI
      const contextIds: {
        questGiverId?: string;
        locationId?: string;
        targetCharacterId?: string;
      } = {};
      if (formData.quest_giver_id) {
        contextIds.questGiverId = formData.quest_giver_id;
      }
      if (formData.location_id) {
        contextIds.locationId = formData.location_id;
      }
      if (questTargetType === "personal" && formData.assigned_character_id) {
        contextIds.targetCharacterId = formData.assigned_character_id;
      }

      const includeIds = Object.entries(anchorPriorities)
        .filter(([, v]) => v === "include" || v === "prioritize")
        .map(([id]) => id);
      const prioritizeIds = Object.entries(anchorPriorities)
        .filter(([, v]) => v === "prioritize")
        .map(([id]) => id);
      const priorities =
        questAnchors.length > 0 &&
        (includeIds.length > 0 || prioritizeIds.length > 0)
          ? {
              include: includeIds,
              prioritize: prioritizeIds,
              anchors: questAnchors,
            }
          : undefined;

      const generated = await generateQuest(
        campaignId,
        contextIds,
        aiPrompt,
        priorities,
      );

      const validType = QUEST_TYPES.includes(generated.type)
        ? generated.type
        : "Side Quest";
      const objectives = Array.isArray(generated.objectives)
        ? generated.objectives
        : [];
      const rivalHook =
        typeof generated.rival_quest_hook === "string"
          ? generated.rival_quest_hook
          : "";
      let gmNotes = generated.gm_notes || "";
      if (objectives.length > 0) {
        gmNotes =
          (gmNotes ? gmNotes + "\n\n" : "") +
          "Ziele:\n" +
          objectives.map((o: string) => `- ${o}`).join("\n");
      }
      if (rivalHook.trim()) {
        gmNotes =
          (gmNotes ? gmNotes + "\n\n" : "") +
          "Gegen-Quest-Hook (Konkurrenz):\n" +
          rivalHook.trim();
      }

      setFormData({
        ...formData,
        title: generated.title || "",
        type: validType,
        description: generated.description || "",
        rewards: generated.rewards || "",
        gm_notes: gmNotes,
        quest_giver_id:
          generated.quest_giver_id || formData.quest_giver_id || "",
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
        // FIX: TypeScript erwartet 'undefined' für optionale Strings, nicht 'null'.
        const payload = {
          title: formData.title,
          type: formData.type,
          status: formData.status,
          quest_giver_id: formData.quest_giver_id || null,
          location_id: formData.location_id || null,
          assigned_character_id:
            questTargetType === "personal"
              ? formData.assigned_character_id || null
              : null,
          description: formData.description || undefined,
          rewards: formData.rewards || undefined,
          gm_notes: formData.gm_notes || undefined,
          is_revealed: formData.is_revealed,
        };

        let questId: string;
        if (isEditMode && existingQuest) {
          await updateQuest(existingQuest.id, payload);
          questId = existingQuest.id;
        } else {
          const newQuest = await createQuest({
            campaign_id: campaignId,
            ...payload,
          });
          questId = newQuest.id;
        }

        // Speichere/Lösche Teilnehmer
        const validParticipants = participants
          .filter((p) => p.npc_id && p.npc_id !== formData.quest_giver_id) // Filtere Quest-Geber raus
          .map((p) => ({
            npc_id: p.npc_id,
            role_description: p.role_description || null,
          }));

        await syncQuestParticipants(questId, validParticipants);

        onClose();
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Ein Fehler ist aufgetreten.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-lg border border-hero-gold/30 bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-border/30">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-hero-dark p-2">
              <ScrollText className="h-6 w-6 text-accent-gold" />
            </div>
            <h2 className="font-cinzel font-bold text-2xl text-white">
              {isEditMode
                ? "Quest bearbeiten"
                : defaultQuestGiverName
                ? `Neue Quest für ${defaultQuestGiverName} entwerfen`
                : "Neue Quest erstellen"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 transition-colors hover:bg-hero-dark hover:text-white"
            disabled={isPending || isGenerating}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form
          id="quest-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* AI Generation Section */}
          {!isEditMode && (
            <div className="rounded border border-accent-gold/30 bg-gradient-to-br from-yellow-950/20 to-background-dark p-4 mb-6">
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
                  {isGenerating ? "Generiere..." : "✨ Quest mit KI entwerfen"}
                </button>
                <p className="text-xs text-gray-500 font-libre">
                  Tipp: Wähle zuerst einen Quest-Geber oder Ort aus.
                  Priorisierte Anker werden als Haupt-Plot-Punkte markiert.
                </p>
              </div>
            </div>
          )}

          {/* Quest Target Type (Group vs Personal) */}
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
                  onChange={(e) => {
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
                  onChange={(e) => setQuestTargetType("personal")}
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
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
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
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
              {defaultQuestGiverId && defaultQuestGiverName ? (
                <div className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-accent-gold shrink-0" />
                  <span className="text-hero-vibrant font-semibold">
                    {defaultQuestGiverName}
                  </span>
                  <span className="text-gray-400 text-sm">(fest)</span>
                </div>
              ) : (
                <>
                  <select
                    value={formData.quest_giver_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quest_giver_id: e.target.value,
                      })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  >
                    <option value="">-- Kein Quest-Geber --</option>
                    {npcs
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                          {n.title
                            ? ` (${n.title})`
                            : n.role
                            ? ` (${n.role})`
                            : ""}
                        </option>
                      ))}
                  </select>
                  {npcs.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500 font-libre">
                      Noch keine NPCs vorhanden. Erstelle zuerst NPCs im Tab
                      "NPCs".
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Ort
              </label>
              <select
                value={formData.location_id}
                onChange={(e) =>
                  setFormData({ ...formData, location_id: e.target.value })
                }
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
              {locations.length === 0 && (
                <p className="mt-1 text-xs text-gray-500 font-libre">
                  Noch keine Orte vorhanden. Erstelle zuerst Orte im Tab "Welt &
                  Lore".
                </p>
              )}
            </div>
          </div>

          {/* Erzählerische Anker (KI-Kontext) – unter Quest-Geber & Ort */}
          {(formData.quest_giver_id || formData.location_id) && (
            <div className="rounded border border-hero-border/50 bg-background-dark/60 p-4">
              <h4 className="font-barlow font-semibold text-sm uppercase text-accent-gold mb-2">
                Erzählerische Anker (KI-Kontext)
              </h4>
              <p className="text-xs text-gray-400 font-libre mb-3">
                Wähle, welche Infos einbezogen oder priorisiert werden sollen:
                Einbeziehen (Check) oder Priorisieren (Stern).
              </p>
              {isLoadingAnchors ? (
                <div className="flex items-center gap-2 py-6 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-libre">Lade Anker…</span>
                </div>
              ) : questAnchors.length === 0 ? (
                <p className="text-xs text-gray-500 font-libre italic py-4">
                  Keine Anker gefunden für diesen Quest-Geber bzw. Ort.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {questAnchors.map((anchor) => {
                    const priority = anchorPriorities[anchor.id] ?? "ignore";
                    const isPrioritized = priority === "prioritize";
                    const isIncluded = priority === "include" || isPrioritized;
                    return (
                      <div
                        key={anchor.id}
                        className="flex items-start gap-3 rounded border border-hero-border/40 p-3 bg-zinc-900/50"
                        style={{
                          boxShadow: isPrioritized
                            ? "0 0 12px rgba(202, 185, 38, 0.25)"
                            : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setAnchorPriority(
                                anchor.id,
                                isIncluded && !isPrioritized
                                  ? "ignore"
                                  : "include",
                              )
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-barlow uppercase transition-colors ${
                              priority === "include"
                                ? "bg-hero-dark text-hero-vibrant border border-hero-border"
                                : "bg-gray-800/50 text-gray-400 hover:text-hero-vibrant border border-transparent"
                            }`}
                            title="Einbeziehen (wird als Kontext mitgesendet)"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Einbeziehen
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAnchorPriority(
                                anchor.id,
                                isPrioritized ? "include" : "prioritize",
                              )
                            }
                            disabled={priority === "ignore"}
                            className={`p-1.5 rounded transition-colors ${
                              isPrioritized
                                ? "text-accent-gold"
                                : "text-gray-500 hover:text-accent-gold/70"
                            } ${
                              priority === "ignore"
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                            title="Priorisieren (Haupt-Plot-Punkt)"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                isPrioritized ? "fill-current" : ""
                              }`}
                            />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-barlow font-bold text-sm text-accent-gold block mb-1">
                            {anchor.label}
                          </span>
                          <p className="text-xs text-gray-400 font-libre line-clamp-2">
                            {anchor.summary}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Assigned Character (Personal Quest) - Only show when "Personal" is selected */}
          {questTargetType === "personal" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Für welchen Charakter? *
              </label>
              <select
                required={questTargetType === "personal"}
                value={formData.assigned_character_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_character_id: e.target.value,
                  })
                }
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
              >
                <option value="">-- Charakter auswählen --</option>
                {/* First try to use members array (if provided) */}
                {members && members.length > 0 ? (
                  members
                    // Filter: Zeige jeden Member, der technisch einen Charakter hat
                    .filter((m) => {
                      const char =
                        (m as any).character_data ||
                        (m as any).characters ||
                        (m as any).character;
                      // Zeige jeden Member, der technisch einen Charakter hat
                      return m.character_id && char;
                    })
                    .map((m) => {
                      // Safe Access für Name und Username
                      const char =
                        (m as any).character_data ||
                        (m as any).characters ||
                        (m as any).character;
                      const charName = char?.name || "Unbekannter Charakter";
                      const userName =
                        m.user?.username ||
                        (m as any).users?.username ||
                        "Spieler";
                      return (
                        <option
                          key={m.character_id}
                          value={m.character_id || ""}
                        >
                          {charName} ({userName})
                        </option>
                      );
                    })
                ) : characters && characters.length > 0 ? (
                  // Fallback to characters array (if provided)
                  characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} - Lvl {char.level} {char.race} {char.class}
                    </option>
                  ))
                ) : (
                  <option disabled>Keine Charaktere verfügbar</option>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500 font-libre">
                Die KI wird eine maßgeschneiderte Quest basierend auf der
                Biografie und den Beziehungen dieses Charakters erstellen.
              </p>
            </div>
          )}

          {/* Weitere Beteiligte / NPCs */}
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
              <p className="text-xs text-gray-500 font-libre italic">
                Noch keine weiteren NPCs hinzugefügt.
              </p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => {
                  // Verfügbare NPCs (nicht der Quest-Geber und nicht bereits ausgewählt)
                  const availableNPCs = npcs.filter(
                    (npc) =>
                      npc.id !== formData.quest_giver_id &&
                      (participant.npc_id === npc.id ||
                        !participants.some(
                          (p, i) => i !== index && p.npc_id === npc.id,
                        )),
                  );

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <div className="flex-1 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                            NPC
                          </label>
                          <select
                            value={participant.npc_id}
                            onChange={(e) =>
                              updateParticipant(index, "npc_id", e.target.value)
                            }
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                            required
                          >
                            <option value="">-- NPC wählen --</option>
                            {availableNPCs
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((npc) => (
                                <option key={npc.id} value={npc.id}>
                                  {npc.name}
                                  {npc.title
                                    ? ` (${npc.title})`
                                    : npc.role
                                    ? ` (${npc.role})`
                                    : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                            Rolle/Beschreibung
                          </label>
                          <input
                            type="text"
                            value={participant.role_description}
                            onChange={(e) =>
                              updateParticipant(
                                index,
                                "role_description",
                                e.target.value,
                              )
                            }
                            placeholder="z.B. Informant, Händler"
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        className="mt-6 p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors"
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

          {/* Description */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blue">
              Beschreibung (Spieler-sichtbar)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-blue resize-none"
              placeholder="Was sehen die Spieler auf den ersten Blick?"
            />
          </div>

          {/* Rewards */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Belohnungen
            </label>
            <input
              type="text"
              value={formData.rewards}
              onChange={(e) =>
                setFormData({ ...formData, rewards: e.target.value })
              }
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              placeholder="z.B. 100 Gold, 1 Seltenes Item, 500 XP"
            />
          </div>

          {/* GM Notes */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
              🔒 GM-Notizen (Nur für dich & KI)
            </label>
            <textarea
              value={formData.gm_notes}
              onChange={(e) =>
                setFormData({ ...formData, gm_notes: e.target.value })
              }
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold border-l-4 border-l-accent-gold resize-none"
              placeholder="Geheimnisse, Hooks für die KI, wahre Absichten..."
            />
          </div>

          {/* Reveal Checkbox */}
          <div className="flex items-center gap-3 rounded border border-hero-border/30 bg-slate-900/50 p-4 hover:bg-slate-900/80 transition-colors">
            <input
              type="checkbox"
              id="is_revealed"
              checked={formData.is_revealed}
              onChange={(e) =>
                setFormData({ ...formData, is_revealed: e.target.checked })
              }
              className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
            />
            <label
              htmlFor="is_revealed"
              className="font-libre text-sm text-gray-300 cursor-pointer select-none"
            >
              Für Spieler sichtbar (Kann jederzeit geändert werden)
            </label>
          </div>
        </form>

        {/* Footer (Fixed) */}
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark/50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending || isGenerating}
              className="rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="quest-form"
              disabled={isPending || isGenerating}
              className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
            >
              {isPending
                ? "Speichern..."
                : isEditMode
                ? "Änderungen speichern"
                : "Quest erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
