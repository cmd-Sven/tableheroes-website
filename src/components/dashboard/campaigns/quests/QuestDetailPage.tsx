"use client";

import { useState, useTransition, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Trash2, ScrollText, User, MapPin, CheckCircle2, Edit2, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateQuest, toggleQuestReveal, deleteQuest, getQuestParticipants } from "@/src/app/dashboard/campaigns/[id]/quest-actions";

type Quest = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  rewards: string | null;
  gm_notes: string | null;
  image_url?: string | null;
  is_revealed: boolean;
  quest_giver_id?: string | null;
  location_id?: string | null;
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
  assigned_character?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    avatar_url: string | null;
  } | null;
};

type Props = {
  quest: Quest;
  campaignId: string;
  isGM: boolean;
  npcs?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; type: string }>;
};

// Inline Edit Field Component
type InlineEditFieldProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  canEdit: boolean;
  isPending: boolean;
  children: React.ReactNode;
  editComponent: React.ReactNode;
};

function InlineEditField({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  canEdit,
  isPending,
  children,
  editComponent,
}: InlineEditFieldProps) {
  return (
    <div className="group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              {editComponent}
              <div className="flex gap-2">
                <button
                  onClick={onSave}
                  disabled={isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-900/50 text-green-300 border border-green-700 hover:bg-green-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-barlow font-bold uppercase"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3" />
                      Speichern
                    </>
                  )}
                </button>
                <button
                  onClick={onCancel}
                  disabled={isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-barlow font-bold uppercase"
                >
                  <X className="h-3 w-3" />
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className={`${isPending ? "opacity-50" : ""} transition-opacity`}>
              {children}
            </div>
          )}
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-slate-500 hover:text-accent-gold hover:bg-hero-dark transition-colors"
            title="Bearbeiten"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

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

export function QuestDetailPage({ quest: initialQuest, campaignId, isGM, npcs = [], locations = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quest, setQuest] = useState(initialQuest);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  
  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Load participants on mount
  useEffect(() => {
    setIsLoadingParticipants(true);
    getQuestParticipants(quest.id)
      .then((data) => {
        setParticipants(data || []);
      })
      .catch((error) => {
        console.error("Error loading participants:", error);
      })
      .finally(() => {
        setIsLoadingParticipants(false);
      });
  }, [quest.id]);

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null> = {};
        const value = editValues[field];
        
        // Handle special fields
        if (field === "quest_giver_id" || field === "location_id") {
          updates[field] = value && value.trim() !== "" ? value : null;
        } else {
          updates[field] = value || null;
        }
        
        await updateQuest(quest.id, updates);
        
        // Update local state
        if (field === "quest_giver_id") {
          const selectedGiver = npcs.find((n) => n.id === value);
          setQuest((prev) => ({
            ...prev,
            quest_giver_id: value || null,
            quest_giver: selectedGiver ? { id: selectedGiver.id, name: selectedGiver.name, title: null } : null,
          }));
        } else if (field === "location_id") {
          const selectedLocation = locations.find((l) => l.id === value);
          setQuest((prev) => ({
            ...prev,
            location_id: value || null,
            location: selectedLocation ? { id: selectedLocation.id, name: selectedLocation.name, type: selectedLocation.type } : null,
          }));
        } else {
          setQuest((prev) => ({ ...prev, [field]: value || null }));
        }
        
        setEditingField(null);
        setEditValues({});
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Speichern.";
        alert(errorMessage);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleStartEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue || "" });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        await toggleQuestReveal(quest.id, quest.is_revealed);
        setQuest((prev) => ({ ...prev, is_revealed: !prev.is_revealed }));
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Ändern der Sichtbarkeit.";
        alert(errorMessage);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Möchtest du "${quest.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteQuest(quest.id);
        router.push(`/dashboard/campaigns/${campaignId}?tab=quests`);
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Löschen der Quest.";
        alert(errorMessage);
      }
    });
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Main Quest": "bg-purple-900/50 text-purple-300 border-purple-700",
      "Side Quest": "bg-blue-900/50 text-blue-300 border-blue-700",
      "Fetch Quest": "bg-green-900/50 text-green-300 border-green-700",
      "Kill Quest": "bg-red-900/50 text-red-300 border-red-700",
      "Escort Quest": "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      "Mystery Quest": "bg-indigo-900/50 text-indigo-300 border-indigo-700",
      "Other": "bg-slate-800/50 text-slate-300 border-slate-600",
    };
    return colors[type] || colors["Other"];
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "Completed") {
      return "bg-green-900/50 text-green-300 border-green-700";
    }
    if (status === "Failed") {
      return "bg-red-900/50 text-red-300 border-red-700";
    }
    if (status === "Draft") {
      return "bg-gray-900/50 text-gray-300 border-gray-700";
    }
    return "bg-blue-900/50 text-blue-300 border-blue-700"; // Active
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=quests`}
          className="flex items-center gap-2 text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-barlow font-bold uppercase">Zurück</span>
        </Link>

        {/* GM Actions */}
        {isGM && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVisibility}
              disabled={isPending}
              className={`p-2 rounded transition-colors ${
                quest.is_revealed
                  ? "text-green-500 hover:text-green-600 hover:bg-green-900/20"
                  : "text-gray-500 hover:text-gray-400 hover:bg-gray-900/20"
              } disabled:opacity-50`}
              title={quest.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
            >
              {quest.is_revealed ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-2 rounded transition-colors text-red-500 hover:text-red-600 hover:bg-red-900/20 disabled:opacity-50"
              title="Löschen"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>

      {/* Quest Header Card with Image */}
      <div className="rounded-lg border border-hero-border bg-background-card p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image - Portrait Format */}
          {quest.image_url && (
            <div className="shrink-0">
              <div className="relative w-48 h-64 lg:w-56 lg:h-72 rounded-xl overflow-hidden border-2 border-hero-border shadow-lg">
                <Image
                  src={quest.image_url}
                  alt={quest.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <InlineEditField
              isEditing={editingField === "title"}
              onEdit={() => handleStartEdit("title", quest.title)}
              onSave={() => handleSaveField("title")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <input
                  type="text"
                  value={editValues.title || ""}
                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-cinzel font-bold text-2xl text-hero-vibrant outline-none focus:border-hero-vibrant"
                  autoFocus
                />
              }
            >
              <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">{quest.title}</h1>
            </InlineEditField>

            {/* Type and Status */}
            <div className="flex flex-wrap items-center gap-2">
              <InlineEditField
                isEditing={editingField === "type"}
                onEdit={() => handleStartEdit("type", quest.type)}
                onSave={() => handleSaveField("type")}
                onCancel={handleCancelEdit}
                canEdit={isGM}
                isPending={isPending}
                editComponent={
                  <select
                    value={editValues.type || ""}
                    onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                  >
                    {QUEST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                }
              >
                <span
                  className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getTypeBadgeColor(
                    quest.type
                  )}`}
                >
                  {quest.type}
                </span>
              </InlineEditField>

              <InlineEditField
                isEditing={editingField === "status"}
                onEdit={() => handleStartEdit("status", quest.status)}
                onSave={() => handleSaveField("status")}
                onCancel={handleCancelEdit}
                canEdit={isGM}
                isPending={isPending}
                editComponent={
                  <select
                    value={editValues.status || ""}
                    onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                  >
                    {QUEST_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                }
              >
                <span
                  className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getStatusBadgeColor(
                    quest.status
                  )}`}
                >
                  {quest.status}
                </span>
              </InlineEditField>
            </div>

            {/* Quest Giver */}
            <InlineEditField
              isEditing={editingField === "quest_giver_id"}
              onEdit={() => handleStartEdit("quest_giver_id", quest.quest_giver?.id || null)}
              onSave={() => handleSaveField("quest_giver_id")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.quest_giver_id || ""}
                  onChange={(e) => setEditValues({ ...editValues, quest_giver_id: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Kein Auftraggeber --</option>
                  {npcs.map((npc) => (
                    <option key={npc.id} value={npc.id}>
                      {npc.name}
                    </option>
                  ))}
                </select>
              }
            >
              {quest.quest_giver ? (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent-gold" />
                  <span className="font-libre text-gray-400">Auftraggeber: </span>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/npcs/${quest.quest_giver.id}`}
                    className="font-libre text-hero-vibrant hover:underline"
                  >
                    {quest.quest_giver.name}
                  </Link>
                </div>
              ) : isGM ? (
                <button
                  onClick={() => handleStartEdit("quest_giver_id", null)}
                  className="text-gray-500 hover:text-hero-vibrant text-sm font-libre"
                >
                  + Auftraggeber hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">Kein Auftraggeber</p>
              )}
            </InlineEditField>

            {/* Location */}
            <InlineEditField
              isEditing={editingField === "location_id"}
              onEdit={() => handleStartEdit("location_id", quest.location?.id || null)}
              onSave={() => handleSaveField("location_id")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.location_id || ""}
                  onChange={(e) => setEditValues({ ...editValues, location_id: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Kein Ort --</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              }
            >
              {quest.location ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent-gold" />
                  <span className="font-libre text-gray-400">Ort: </span>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${quest.location.id}`}
                    className="font-libre text-hero-vibrant hover:underline"
                  >
                    {quest.location.name}
                  </Link>
                </div>
              ) : isGM ? (
                <button
                  onClick={() => handleStartEdit("location_id", null)}
                  className="text-gray-500 hover:text-hero-vibrant text-sm font-libre"
                >
                  + Ort hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">Kein Ort</p>
              )}
            </InlineEditField>

            {/* Assigned Character */}
            {quest.assigned_character && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent-gold" />
                <span className="font-libre text-gray-400">Zugewiesen an: </span>
                <span className="font-libre text-hero-vibrant">{quest.assigned_character.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Description */}
        <div className="rounded-lg border border-hero-border bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Beschreibung
          </h2>
          <InlineEditField
            isEditing={editingField === "description"}
            onEdit={() => handleStartEdit("description", quest.description)}
            onSave={() => handleSaveField("description")}
            onCancel={handleCancelEdit}
            canEdit={isGM}
            isPending={isPending}
            editComponent={
              <textarea
                value={editValues.description || ""}
                onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-gray-200 leading-relaxed outline-none focus:border-hero-vibrant resize-none min-h-[200px]"
                placeholder="Beschreibung..."
              />
            }
          >
            <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {quest.description || "Keine Beschreibung vorhanden."}
            </p>
          </InlineEditField>
        </div>

        {/* Rewards */}
        <div className="rounded-lg border border-hero-border bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Belohnungen
          </h2>
          <InlineEditField
            isEditing={editingField === "rewards"}
            onEdit={() => handleStartEdit("rewards", quest.rewards)}
            onSave={() => handleSaveField("rewards")}
            onCancel={handleCancelEdit}
            canEdit={isGM}
            isPending={isPending}
            editComponent={
              <textarea
                value={editValues.rewards || ""}
                onChange={(e) => setEditValues({ ...editValues, rewards: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-gray-200 leading-relaxed outline-none focus:border-hero-vibrant resize-none min-h-[150px]"
                placeholder="Belohnungen..."
              />
            }
          >
            <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {quest.rewards || "Keine Belohnungen angegeben."}
            </p>
          </InlineEditField>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Beteiligte NPCs
            </h2>
            <div className="space-y-2">
              {participants.map((participant: any) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 p-3 rounded border border-hero-border bg-hero-dark/50"
                >
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/npcs/${participant.npc_id}`}
                    className="font-libre text-hero-vibrant hover:underline"
                  >
                    {participant.npcs?.name || "Unbekannter NPC"}
                  </Link>
                  {participant.role_description && (
                    <span className="font-libre text-gray-400 text-sm">
                      - {participant.role_description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GM Notes */}
        {isGM && quest.gm_notes && (
          <div className="rounded-lg border-2 border-accent-gold/50 bg-accent-gold/5 p-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-gold mb-2 flex items-center gap-2">
              🔒 GM-Notizen
            </h3>
            <div className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {quest.gm_notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
