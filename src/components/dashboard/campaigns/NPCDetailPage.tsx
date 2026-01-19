"use client";

import { useState, useTransition, useEffect } from "react";
import {
  ArrowLeft,
  Star,
  BookOpen,
  Eye,
  EyeOff,
  Edit2,
  Save,
  X,
  AlertCircle,
  Loader2,
  User,
  Heart,
  Users,
  MapPin,
  HeartPulse,
  Scroll,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  updateNPC,
  updateNPCNotes,
  toggleNPCFavorite,
  toggleNPCReveal,
  deleteNPC,
} from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { updateNPCCurrentLocation } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { SecretsManager } from "@/src/components/dashboard/campaigns/secrets/SecretsManager";
import { NarrativeHook } from "@/src/types/npc";
import { NPCHookWizard } from "@/src/components/dashboard/campaigns/npcs/NPCHookWizard";
import { NPCRelationsList } from "@/src/components/dashboard/campaigns/npcs/NPCRelationsList";
import { GothicSpotlightDescription } from "@/src/components/dashboard/campaigns/lore/GothicSpotlightDescription";
import {
  findNPCByName,
  checkNPCRelationExists,
  createNPCRelationManually,
} from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import { Sparkles } from "lucide-react";

type Quest = {
  id: string;
  title: string;
  status: string;
  type: string;
  description?: string | null;
  participant_role?: string;
};

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string | null;
  alignment: string | null;
  description: string | null;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  player_notes: string | null;
  image_url: string | null;
  is_revealed: boolean;
  is_favorite?: boolean;
  all_quests?: Quest[];
  faction_id?: string | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
  current_location?: {
    id: string;
    name: string;
    type: string;
  } | null;
  home_location?: {
    id: string;
    name: string;
    type: string;
  } | null;
  narrative_hooks?: NarrativeHook[] | null;
  is_secret_antagonist?: boolean;
  hidden_agenda?: string | null;
  true_nature?: string | null;
  check_results?: Array<{
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  }> | null;
};

type Props = {
  npc: NPC;
  campaignId: string;
  isGM: boolean;
  canEdit: boolean;
  userId: string;
  factions?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; type: string }>;
};

const NPC_STATUSES = [
  { value: "Alive", label: "🟢 Lebendig" },
  { value: "Deceased", label: "🔴 Verstorben" },
  { value: "Missing", label: "🟡 Vermisst" },
  { value: "Unknown", label: "⚪ Unbekannt" },
];

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

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
            <div
              className={`${isPending ? "opacity-50" : ""} transition-opacity`}
            >
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

export function NPCDetailPage({
  npc: initialNpc,
  campaignId,
  isGM,
  canEdit,
  factions = [],
  locations = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [npc, setNpc] = useState(initialNpc);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "description" | "appearance" | "personality"
  >("description");

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const [isEditingGMNotes, setIsEditingGMNotes] = useState(false);
  const [isEditingPlayerNotes, setIsEditingPlayerNotes] = useState(false);
  const [gmNotes, setGmNotes] = useState(npc.gm_notes || "");
  const [playerNotes, setPlayerNotes] = useState(npc.player_notes || "");
  const [selectedHook, setSelectedHook] = useState<NarrativeHook | null>(null);
  const [hookSuccessFeedback, setHookSuccessFeedback] = useState<string | null>(
    null
  );
  const [isFavorite, setIsFavorite] = useState(npc.is_favorite || false);
  const [isRevealed, setIsRevealed] = useState(npc.is_revealed);
  // Lokaler State für narrative_hooks, damit wir sie sofort aktualisieren können
  const [narrativeHooks, setNarrativeHooks] = useState<NarrativeHook[]>(
    npc.narrative_hooks || []
  );
  // State für existierende NPCs (für Smart Links)
  const [existingNPCs, setExistingNPCs] = useState<
    Record<string, { id: string; name: string }>
  >({});
  // State für NPCs ohne Relation (für "Heilung")
  const [npcsWithoutRelation, setNpcsWithoutRelation] = useState<Set<string>>(
    new Set()
  );
  const [isLinkingRelation, setIsLinkingRelation] = useState<string | null>(
    null
  );

  // Lade existierende NPCs für Smart Links und prüfe fehlende Relationen
  useEffect(() => {
    const loadExistingNPCs = async () => {
      if (narrativeHooks.length === 0) return;

      const npcMap: Record<string, { id: string; name: string }> = {};
      const withoutRelation = new Set<string>();

      for (const hook of narrativeHooks) {
        if (hook.name) {
          try {
            const existing = await findNPCByName(campaignId, hook.name);
            if (existing && existing.id && existing.name) {
              npcMap[hook.name] = { id: existing.id, name: existing.name };

              // Prüfe, ob Relation bereits existiert
              const relationExists = await checkNPCRelationExists(
                campaignId,
                npc.id,
                existing.id
              );

              if (!relationExists) {
                withoutRelation.add(hook.name);
              }
            }
          } catch (error) {
            console.error(`Fehler beim Prüfen von NPC "${hook.name}":`, error);
          }
        }
      }

      setExistingNPCs(npcMap);
      setNpcsWithoutRelation(withoutRelation);
    };

    loadExistingNPCs();
  }, [narrativeHooks, campaignId, npc.id]);

  const handleToggleFavorite = () => {
    startTransition(async () => {
      try {
        await toggleNPCFavorite(npc.id, isFavorite);
        setIsFavorite(!isFavorite);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren der Favoriten.";
        alert(errorMessage);
      }
    });
  };

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null> = {};
        const value = editValues[field];

        // Handle special fields
        if (field === "faction_id" || field === "current_location_id") {
          updates[field] = value && value.trim() !== "" ? value : null;
        } else {
          updates[field] = value || null;
        }

        await updateNPC(npc.id, updates);

        // Update local state
        if (field === "faction_id") {
          const selectedFaction = factions.find((f) => f.id === value);
          setNpc((prev) => ({
            ...prev,
            faction_id: value || null,
            factions: selectedFaction
              ? { id: selectedFaction.id, name: selectedFaction.name, type: "" }
              : null,
          }));
        } else if (field === "current_location_id") {
          const selectedLocation = locations.find((l) => l.id === value);
          setNpc((prev) => ({
            ...prev,
            current_location_id: value || null,
            current_location: selectedLocation
              ? {
                  id: selectedLocation.id,
                  name: selectedLocation.name,
                  type: selectedLocation.type,
                }
              : null,
          }));
        } else {
          setNpc((prev) => ({ ...prev, [field]: value || null }));
        }

        setEditingField(null);
        setEditValues({});
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Speichern.";
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

  const handleSaveGMNotes = () => {
    startTransition(async () => {
      try {
        await updateNPCNotes(npc.id, { gm_notes: gmNotes });
        setIsEditingGMNotes(false);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Notizen.";
        alert(errorMessage);
      }
    });
  };

  const handleSavePlayerNotes = () => {
    startTransition(async () => {
      try {
        await updateNPCNotes(npc.id, { player_notes: playerNotes });
        setIsEditingPlayerNotes(false);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Notizen.";
        alert(errorMessage);
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        await toggleNPCReveal(npc.id, isRevealed);
        setIsRevealed(!isRevealed);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Ändern der Sichtbarkeit.";
        alert(errorMessage);
      }
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Möchtest du "${npc.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteNPC(npc.id);
        router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Löschen.";
        alert(errorMessage);
      }
    });
  };

  const getAlignmentColor = (alignment: string | null) => {
    if (!alignment) return "bg-gray-800/50 text-gray-300 border-gray-700";
    const colors: Record<string, string> = {
      "Lawful Good": "bg-blue-900/50 text-blue-300 border-blue-700",
      "Neutral Good": "bg-green-900/50 text-green-300 border-green-700",
      "Chaotic Good": "bg-emerald-900/50 text-emerald-300 border-emerald-700",
      "Lawful Neutral": "bg-slate-900/50 text-slate-300 border-slate-700",
      "True Neutral": "bg-gray-900/50 text-gray-300 border-gray-700",
      "Chaotic Neutral": "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      "Lawful Evil": "bg-red-900/50 text-red-300 border-red-700",
      "Neutral Evil": "bg-orange-900/50 text-orange-300 border-orange-700",
      "Chaotic Evil": "bg-purple-900/50 text-purple-300 border-purple-700",
    };
    return colors[alignment] || "bg-gray-800/50 text-gray-300 border-gray-700";
  };

  const activeQuests = (npc.all_quests || []).filter(
    (q) => q.status === "Active"
  );
  const completedQuests = (npc.all_quests || []).filter(
    (q) => q.status === "Completed"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=npcs`}
          className="flex items-center gap-2 text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-barlow font-bold uppercase">Zurück</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            disabled={isPending}
            className={`p-2 rounded transition-colors ${
              isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-500 hover:text-yellow-500"
            } disabled:opacity-50`}
            title={
              isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
            }
          >
            <Star className={`h-6 w-6 ${isFavorite ? "fill-current" : ""}`} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={handleToggleVisibility}
                disabled={isPending}
                className={`p-2 rounded transition-colors ${
                  isRevealed
                    ? "text-green-500 hover:text-green-600 hover:bg-green-900/20"
                    : "text-gray-500 hover:text-gray-400 hover:bg-gray-900/20"
                } disabled:opacity-50`}
                title={isRevealed ? "Für Spieler sichtbar" : "Verborgen"}
              >
                {isRevealed ? (
                  <Eye className="h-6 w-6" />
                ) : (
                  <EyeOff className="h-6 w-6" />
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="p-2 rounded transition-colors text-red-500 hover:text-red-600 hover:bg-red-900/20 disabled:opacity-50"
                title="Löschen"
              >
                <X className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* NPC Header Card with Image */}
      <div className="rounded-lg border border-hero-border bg-background-card p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image - Portrait Format (Editable) */}
          <div className="shrink-0">
            <InlineEditField
              isEditing={editingField === "image_url"}
              onEdit={() => handleStartEdit("image_url", npc.image_url)}
              onSave={() => handleSaveField("image_url")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <div className="w-48 h-64 lg:w-56 lg:h-72 rounded-xl border-2 border-hero-border bg-hero-dark/50 p-4">
                  <input
                    type="url"
                    value={editValues.image_url || ""}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        image_url: e.target.value,
                      })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-gray-200 outline-none focus:border-hero-vibrant"
                    placeholder="Bild-URL eingeben..."
                    autoFocus
                  />
                  {editValues.image_url && (
                    <div className="mt-3 relative w-full h-40 rounded overflow-hidden border border-hero-border">
                      <Image
                        src={editValues.image_url}
                        alt="Vorschau"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              }
            >
              {npc.image_url ? (
                <div className="relative w-48 h-64 lg:w-56 lg:h-72 rounded-xl overflow-hidden border-2 border-hero-border shadow-lg">
                  <Image
                    src={npc.image_url}
                    alt={npc.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-48 h-64 lg:w-56 lg:h-72 rounded-xl border-2 border-hero-border bg-hero-dark/50 flex items-center justify-center shadow-lg">
                  <User className="h-24 w-24 text-gray-500" />
                </div>
              )}
            </InlineEditField>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <InlineEditField
              isEditing={editingField === "name"}
              onEdit={() => handleStartEdit("name", npc.name)}
              onSave={() => handleSaveField("name")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <input
                  type="text"
                  value={editValues.name || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, name: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-cinzel font-bold text-2xl text-hero-vibrant outline-none focus:border-hero-vibrant"
                  autoFocus
                />
              }
            >
              <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">
                {npc.name}
              </h1>
            </InlineEditField>

            {/* Title */}
            {npc.title || editingField === "title" ? (
              <InlineEditField
                isEditing={editingField === "title"}
                onEdit={() => handleStartEdit("title", npc.title)}
                onSave={() => handleSaveField("title")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.title || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, title: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-semibold text-xl text-accent-gold outline-none focus:border-hero-vibrant"
                    placeholder="Titel (optional)"
                  />
                }
              >
                <p className="font-barlow font-semibold text-xl text-accent-gold">
                  {npc.title}
                </p>
              </InlineEditField>
            ) : canEdit ? (
              <button
                onClick={() => handleStartEdit("title", null)}
                className="text-gray-500 hover:text-accent-gold text-sm font-barlow italic"
              >
                + Titel hinzufügen
              </button>
            ) : null}

            {/* Role */}
            {npc.role || editingField === "role" ? (
              <InlineEditField
                isEditing={editingField === "role"}
                onEdit={() => handleStartEdit("role", npc.role)}
                onSave={() => handleSaveField("role")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.role || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, role: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-gray-200 italic outline-none focus:border-hero-vibrant"
                    placeholder="Rolle (optional)"
                  />
                }
              >
                <p className="font-libre text-gray-400 italic">{npc.role}</p>
              </InlineEditField>
            ) : canEdit ? (
              <button
                onClick={() => handleStartEdit("role", null)}
                className="text-gray-500 hover:text-gray-400 text-sm font-libre italic"
              >
                + Rolle hinzufügen
              </button>
            ) : null}

            {/* Race */}
            <div className="flex items-center gap-4 flex-wrap">
              <InlineEditField
                isEditing={editingField === "race"}
                onEdit={() => handleStartEdit("race", npc.race)}
                onSave={() => handleSaveField("race")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.race || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, race: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-gray-200 outline-none focus:border-hero-vibrant"
                    placeholder="Rasse"
                  />
                }
              >
                <p className="font-libre text-gray-400">
                  <span className="text-gray-500">Rasse:</span>{" "}
                  {npc.race || "Nicht angegeben"}
                </p>
              </InlineEditField>

              {/* Status */}
              <InlineEditField
                isEditing={editingField === "status"}
                onEdit={() => handleStartEdit("status", npc.status)}
                onSave={() => handleSaveField("status")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <select
                    value={editValues.status || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, status: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                  >
                    {NPC_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                }
              >
                {npc.status && (
                  <span
                    className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${
                      npc.status === "Alive"
                        ? "bg-green-900/50 text-green-300 border-green-700"
                        : npc.status === "Deceased"
                        ? "bg-red-900/50 text-red-300 border-red-700"
                        : "bg-gray-900/50 text-gray-300 border-gray-700"
                    }`}
                  >
                    {npc.status}
                  </span>
                )}
              </InlineEditField>

              {/* Alignment (GM only) */}
              {isGM && (
                <InlineEditField
                  isEditing={editingField === "alignment"}
                  onEdit={() => handleStartEdit("alignment", npc.alignment)}
                  onSave={() => handleSaveField("alignment")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <select
                      value={editValues.alignment || ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          alignment: e.target.value,
                        })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                    >
                      <option value="">-- Keine Gesinnung --</option>
                      {ALIGNMENTS.map((alignment) => (
                        <option key={alignment} value={alignment}>
                          {alignment}
                        </option>
                      ))}
                    </select>
                  }
                >
                  {npc.alignment && (
                    <span
                      className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getAlignmentColor(
                        npc.alignment
                      )}`}
                    >
                      {npc.alignment}
                    </span>
                  )}
                </InlineEditField>
              )}
            </div>

            {/* Faction */}
            <InlineEditField
              isEditing={editingField === "faction_id"}
              onEdit={() =>
                handleStartEdit("faction_id", npc.factions?.id || null)
              }
              onSave={() => handleSaveField("faction_id")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.faction_id || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, faction_id: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Keine Fraktion --</option>
                  {factions.map((faction) => (
                    <option key={faction.id} value={faction.id}>
                      {faction.name}
                    </option>
                  ))}
                </select>
              }
            >
              {npc.factions ? (
                <div className="flex items-center gap-2">
                  <span className="font-libre text-gray-400">Fraktion:</span>
                  <span className="font-libre text-accent-gold font-semibold">
                    {npc.factions.name}
                  </span>
                </div>
              ) : canEdit ? (
                <button
                  onClick={() => handleStartEdit("faction_id", null)}
                  className="text-gray-500 hover:text-accent-gold text-sm font-libre"
                >
                  + Fraktion hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">
                  Keine Fraktion
                </p>
              )}
            </InlineEditField>

            {/* Location */}
            <InlineEditField
              isEditing={editingField === "current_location_id"}
              onEdit={() =>
                handleStartEdit(
                  "current_location_id",
                  npc.current_location?.id || null
                )
              }
              onSave={() => handleSaveField("current_location_id")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.current_location_id || ""}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      current_location_id: e.target.value,
                    })
                  }
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
              {npc.current_location ? (
                <div className="flex items-center gap-2">
                  <span className="font-libre text-gray-400">
                    Aktueller Ort:
                  </span>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/locations/${npc.current_location.id}`}
                    className="font-libre text-hero-vibrant hover:underline"
                  >
                    {npc.current_location.name}
                  </Link>
                  {canEdit && (
                    <TravelQuickAction
                      npcId={npc.id}
                      currentLocationId={npc.current_location.id}
                      locations={locations}
                      campaignId={campaignId}
                      onUpdate={() => router.refresh()}
                    />
                  )}
                </div>
              ) : canEdit ? (
                <button
                  onClick={() => handleStartEdit("current_location_id", null)}
                  className="text-gray-500 hover:text-hero-vibrant text-sm font-libre"
                >
                  + Ort hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">
                  Kein Ort angegeben
                </p>
              )}
            </InlineEditField>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Container - Pergament Design */}
          <div
            className="rounded-lg overflow-hidden shadow-xl transition-shadow duration-300 relative"
            style={{
              border: "2px solid rgba(202, 185, 38, 0.5)",
              backgroundImage: "url('/images/grunge-paper-background.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            {/* Tab Headers */}
            <div className="flex border-b border-hero-border bg-hero-dark/30 relative z-10">
              <button
                onClick={() => setActiveTab("description")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "description"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <BookOpen className="h-5 w-5" />
                Beschreibung
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "appearance"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <Eye className="h-5 w-5" />
                Aussehen
              </button>
              <button
                onClick={() => setActiveTab("personality")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "personality"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <Heart className="h-5 w-5" />
                Persönlichkeit
              </button>
            </div>

            {/* Tab Content */}
            {/* Description Tab */}
            {activeTab === "description" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Beschreibung
                </h2>
                <InlineEditField
                  isEditing={editingField === "description"}
                  onEdit={() => handleStartEdit("description", npc.description)}
                  onSave={() => handleSaveField("description")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <textarea
                      value={editValues.description || ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900/50 p-3 font-libre text-[#e5e5e5] leading-relaxed outline-none focus:border-hero-vibrant resize-none min-h-[200px]"
                      placeholder="Beschreibung..."
                    />
                  }
                >
                  <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                    {npc.description || "Keine Beschreibung vorhanden."}
                  </p>
                </InlineEditField>
              </GothicSpotlightDescription>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Aussehen
                </h2>
                <InlineEditField
                  isEditing={editingField === "appearance"}
                  onEdit={() => handleStartEdit("appearance", npc.appearance)}
                  onSave={() => handleSaveField("appearance")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <textarea
                      value={editValues.appearance || ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          appearance: e.target.value,
                        })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900/50 p-3 font-libre text-[#e5e5e5] leading-relaxed outline-none focus:border-hero-vibrant resize-none min-h-[200px]"
                      placeholder="Aussehen beschreiben..."
                    />
                  }
                >
                  <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                    {npc.appearance || "Keine Beschreibung vorhanden."}
                  </p>
                </InlineEditField>
              </GothicSpotlightDescription>
            )}

            {/* Personality Tab */}
            {activeTab === "personality" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Persönlichkeit
                </h2>
                <InlineEditField
                  isEditing={editingField === "personality_traits"}
                  onEdit={() =>
                    handleStartEdit(
                      "personality_traits",
                      npc.personality_traits
                    )
                  }
                  onSave={() => handleSaveField("personality_traits")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <textarea
                      value={editValues.personality_traits || ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          personality_traits: e.target.value,
                        })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900/50 p-3 font-libre text-[#e5e5e5] leading-relaxed outline-none focus:border-hero-vibrant resize-none min-h-[200px]"
                      placeholder="Persönlichkeit beschreiben..."
                    />
                  }
                >
                  <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                    {npc.personality_traits || "Keine Beschreibung vorhanden."}
                  </p>
                </InlineEditField>
              </GothicSpotlightDescription>
            )}
          </div>

          {/* Narrative Hooks - Story Opportunities */}
          {narrativeHooks && narrativeHooks.length > 0 && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/grunge-paper-background.jpg')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* Dark Overlay for readability */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  Story Opportunities
                </h2>
                <p className="font-libre text-gray-400 text-sm mb-4">
                  Personen und Rollen, die in der Hintergrundgeschichte erwähnt
                  wurden und als NPCs erstellt werden können.
                </p>
                <div className="space-y-3">
                  {narrativeHooks.map((hook, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${
                        hook.is_alive
                          ? "border-hero-border bg-hero-dark/30"
                          : "border-gray-700 bg-gray-900/30 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-cinzel font-bold text-lg text-accent-gold">
                              {hook.name || "Unbenannter NPC"}
                            </h3>
                            {!hook.is_alive && (
                              <span className="px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase bg-red-900/50 text-red-300 border border-red-700">
                                Verstorben
                              </span>
                            )}
                          </div>
                          <p className="font-libre text-gray-300 mb-1">
                            <span className="text-gray-500">Beziehung:</span>{" "}
                            <span className="font-semibold text-hero-vibrant">
                              {hook.role}
                            </span>
                          </p>
                          <p className="font-libre text-gray-400 text-sm">
                            {hook.description}
                          </p>
                        </div>
                        {hook.is_alive && canEdit && (
                          <>
                            {hook.name && existingNPCs[hook.name] ? (
                              <div className="flex flex-col gap-2 items-end">
                                <Link
                                  href={`/dashboard/campaigns/${campaignId}/npcs/${
                                    existingNPCs[hook.name].id
                                  }`}
                                  className="px-4 py-2 rounded bg-hero-vibrant/20 text-hero-vibrant border border-hero-vibrant hover:bg-hero-vibrant/30 transition-colors font-barlow font-bold uppercase text-sm whitespace-nowrap flex items-center gap-2"
                                >
                                  <User className="h-4 w-4" />
                                  Profil von {existingNPCs[hook.name].name}{" "}
                                  ansehen
                                </Link>
                                {npcsWithoutRelation.has(hook.name) && (
                                  <button
                                    onClick={async () => {
                                      if (
                                        !hook.name ||
                                        !existingNPCs[hook.name]
                                      )
                                        return;
                                      setIsLinkingRelation(hook.name);
                                      try {
                                        await createNPCRelationManually(
                                          campaignId,
                                          npc.id,
                                          existingNPCs[hook.name].id,
                                          hook.role,
                                          hook.description
                                        );
                                        // Entferne aus "ohne Relation" Set
                                        setNpcsWithoutRelation((prev) => {
                                          const next = new Set(prev);
                                          next.delete(hook.name!);
                                          return next;
                                        });
                                        router.refresh();
                                      } catch (error: unknown) {
                                        const errorMessage =
                                          error instanceof Error
                                            ? error.message
                                            : "Fehler beim Verknüpfen der Relation.";
                                        alert(errorMessage);
                                      } finally {
                                        setIsLinkingRelation(null);
                                      }
                                    }}
                                    disabled={isLinkingRelation === hook.name}
                                    className="px-3 py-1.5 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/50 hover:bg-accent-gold/30 transition-colors font-barlow font-bold uppercase text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {isLinkingRelation === hook.name ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Verknüpfe...
                                      </>
                                    ) : (
                                      <>
                                        <Users className="h-3 w-3" />
                                        Relation jetzt manuell verknüpfen
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedHook(hook)}
                                className="px-4 py-2 rounded bg-hero-vibrant/20 text-hero-vibrant border border-hero-vibrant hover:bg-hero-vibrant/30 transition-colors font-barlow font-bold uppercase text-sm whitespace-nowrap"
                              >
                                NPC erstellen
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NPC Relations */}
          <div
            className="rounded-lg relative overflow-hidden shadow-xl transition-shadow duration-300"
            style={{
              border: "2px solid rgba(202, 185, 38, 0.5)",
              backgroundImage: "url('/images/grunge-paper-background.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <GothicSpotlightDescription
              backgroundImageUrl={npc.image_url || undefined}
            >
              <NPCRelationsList
                campaignId={campaignId}
                npcId={npc.id}
                canEdit={isGM}
                factionId={npc.faction_id ?? null}
                currentLocationId={npc.current_location_id ?? null}
              />
            </GothicSpotlightDescription>
          </div>

          {/* Secrets Manager */}
          <div
            className="rounded-lg relative overflow-hidden shadow-xl transition-shadow duration-300"
            style={{
              border: "2px solid rgba(202, 185, 38, 0.5)",
              backgroundImage: "url('/images/grunge-paper-background.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="relative z-10">
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <SecretsManager
                  entityId={npc.id}
                  entityType="npc"
                  campaignId={campaignId}
                  isGM={isGM}
                />
              </GothicSpotlightDescription>
            </div>
          </div>

          {/* Quests Section */}
          {(activeQuests.length > 0 || completedQuests.length > 0) && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/grunge-paper-background.jpg')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* Dark Overlay for readability */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  Quests
                </h2>

                {activeQuests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                      Aktive Quests
                    </h3>
                    <div className="space-y-2">
                      {activeQuests.map((quest) => (
                        <Link
                          key={quest.id}
                          href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}`}
                          className="block rounded border border-hero-border bg-hero-dark/50 p-3 hover:bg-hero-dark transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-cinzel font-bold text-white">
                                {quest.title}
                              </p>
                              {quest.participant_role && (
                                <p className="font-libre text-xs text-gray-400 mt-1">
                                  Rolle: {quest.participant_role}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase bg-blue-900/50 text-blue-300 border border-blue-700">
                              {quest.type}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {completedQuests.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                      Abgeschlossene Quests
                    </h3>
                    <div className="space-y-2">
                      {completedQuests.map((quest) => (
                        <Link
                          key={quest.id}
                          href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}`}
                          className="block rounded border border-hero-border bg-hero-dark/50 p-3 hover:bg-hero-dark transition-colors opacity-75"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-cinzel font-bold text-white">
                              {quest.title}
                            </p>
                            <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase bg-green-900/50 text-green-300 border border-green-700">
                              Abgeschlossen
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Notes */}
        <div className="space-y-6">
          {/* GM Notes */}
          {isGM && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  GM-Notizen
                </h2>
                {!isEditingGMNotes ? (
                  <button
                    onClick={() => setIsEditingGMNotes(true)}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-hero-dark transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveGMNotes}
                      disabled={isPending}
                      className="p-1.5 rounded text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                      title="Speichern"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingGMNotes(false);
                        setGmNotes(npc.gm_notes || "");
                      }}
                      className="p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors"
                      title="Abbrechen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {isEditingGMNotes ? (
                <textarea
                  value={gmNotes}
                  onChange={(e) => setGmNotes(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant resize-none min-h-[150px]"
                  placeholder="GM-Notizen hier eingeben..."
                />
              ) : (
                <p
                  className={`font-libre text-gray-200 leading-relaxed whitespace-pre-wrap ${
                    isPending ? "opacity-50" : ""
                  }`}
                >
                  {npc.gm_notes || "Keine GM-Notizen vorhanden."}
                </p>
              )}
            </div>
          )}

          {/* Spielleiter-Geheimnisse (nur für GM) */}
          {isGM &&
            (npc.is_secret_antagonist ||
              npc.hidden_agenda ||
              npc.true_nature) && (
              <div className="rounded-lg border-2 border-accent-blood/50 bg-slate-900/80 p-6 relative">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-accent-blood/30">
                  <AlertCircle className="h-5 w-5 text-accent-blood" />
                  <h2 className="font-barlow font-bold text-xl uppercase text-accent-blood">
                    🔒 Spielleiter-Geheimnisse
                  </h2>
                </div>

                {/* Secret Antagonist Badge */}
                {npc.is_secret_antagonist && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded border-2 border-accent-blood/50 bg-accent-blood/10">
                    <AlertCircle className="h-4 w-4 text-accent-blood" />
                    <span className="font-barlow font-bold text-sm uppercase text-accent-blood">
                      Geheimer Antagonist
                    </span>
                  </div>
                )}

                {/* Hidden Agenda */}
                {npc.hidden_agenda && (
                  <div className="mb-4">
                    <h3 className="font-barlow font-semibold text-sm uppercase text-accent-blood mb-2">
                      Versteckte Agenda
                    </h3>
                    <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {npc.hidden_agenda}
                    </p>
                  </div>
                )}

                {/* True Nature */}
                {npc.true_nature && (
                  <div>
                    <h3 className="font-barlow font-semibold text-sm uppercase text-accent-blood mb-2">
                      Wahre Natur (Interne Persönlichkeit)
                    </h3>
                    <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {npc.true_nature}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Proben & Informationen (nur für GM) */}
          {isGM && npc.check_results && npc.check_results.length > 0 && (
            <div className="rounded-lg border-2 border-accent-gold/50 bg-slate-900/80 p-6 relative">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-accent-gold/30">
                <Eye className="h-5 w-5 text-accent-gold" />
                <h2 className="font-barlow font-bold text-xl uppercase text-accent-gold">
                  Proben & Informationen
                </h2>
              </div>

              <div className="space-y-6">
                {(() => {
                  // Gruppiere nach Typ
                  const grouped = npc.check_results.reduce((acc, result) => {
                    if (!acc[result.type]) {
                      acc[result.type] = [];
                    }
                    acc[result.type].push(result);
                    return acc;
                  }, {} as Record<string, typeof npc.check_results>);

                  // Sortiere innerhalb jeder Gruppe nach DC
                  Object.keys(grouped).forEach((type) => {
                    grouped[type].sort((a, b) => a.dc - b.dc);
                  });

                  const typeConfig = {
                    Wahrnehmung: {
                      icon: Eye,
                      color: "text-blue-400",
                      bgColor: "bg-blue-900/20",
                      borderColor: "border-blue-700/50",
                    },
                    "Motiv erkennen": {
                      icon: HeartPulse,
                      color: "text-red-400",
                      bgColor: "bg-red-900/20",
                      borderColor: "border-red-700/50",
                    },
                    Wissen: {
                      icon: Scroll,
                      color: "text-yellow-400",
                      bgColor: "bg-yellow-900/20",
                      borderColor: "border-yellow-700/50",
                    },
                  };

                  return Object.entries(grouped).map(([type, results]) => {
                    const config = typeConfig[type as keyof typeof typeConfig];
                    const Icon = config.icon;

                    return (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-hero-border/30">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <h3 className="font-barlow font-semibold text-lg text-accent-blood">
                            {type}
                          </h3>
                          <span className="ml-auto text-xs text-gray-400 font-barlow">
                            {results.length}{" "}
                            {results.length === 1 ? "Ergebnis" : "Ergebnisse"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {results.map((result, idx) => (
                            <div
                              key={idx}
                              className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <Icon className={`h-5 w-5 ${config.color}`} />
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 rounded bg-hero-dark/50 text-accent-gold font-barlow font-bold text-sm border border-accent-gold/50">
                                    DC {result.dc}
                                  </span>
                                  {result.is_critical && (
                                    <span className="px-3 py-1 rounded bg-accent-blood/20 text-accent-blood font-barlow font-bold text-xs border border-accent-blood/50">
                                      Kritisch
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {result.result}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Player Notes */}
          <div className="rounded-lg border border-hero-border bg-background-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Spieler-Notizen
              </h2>
              {!isEditingPlayerNotes ? (
                <button
                  onClick={() => setIsEditingPlayerNotes(true)}
                  className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-hero-dark transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSavePlayerNotes}
                    disabled={isPending}
                    className="p-1.5 rounded text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                    title="Speichern"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPlayerNotes(false);
                      setPlayerNotes(npc.player_notes || "");
                    }}
                    className="p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors"
                    title="Abbrechen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 font-libre mb-2">
              Diese Notizen sind für die Gruppe und den GM sichtbar.
            </p>
            {isEditingPlayerNotes ? (
              <textarea
                value={playerNotes}
                onChange={(e) => setPlayerNotes(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant resize-none min-h-[150px]"
                placeholder="Spieler-Notizen hier eingeben..."
              />
            ) : (
              <p
                className={`font-libre text-gray-200 leading-relaxed whitespace-pre-wrap ${
                  isPending ? "opacity-50" : ""
                }`}
              >
                {npc.player_notes || "Keine Spieler-Notizen vorhanden."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hook Wizard Modal */}
      {selectedHook && (
        <NPCHookWizard
          hook={selectedHook}
          sourceNPC={{
            id: npc.id,
            name: npc.name,
            faction_id: npc.faction_id || null,
          }}
          campaignId={campaignId}
          factions={factions}
          locations={locations}
          onClose={() => setSelectedHook(null)}
          onSuccess={() => {
            // Entferne den Hook aus dem lokalen State, damit er sofort aus der Liste verschwindet
            setNarrativeHooks((prev) =>
              prev.filter(
                (h) =>
                  !(
                    (h.name === selectedHook.name ||
                      (!h.name && !selectedHook.name)) &&
                    h.role === selectedHook.role &&
                    h.description === selectedHook.description
                  )
              )
            );
            const hookName = selectedHook.name || "Unbenannt";
            setSelectedHook(null);
            // Visuelles Feedback: Zeige Erfolgs-Toast
            setHookSuccessFeedback(`NPC "${hookName}" erfolgreich erstellt!`);
            setTimeout(() => setHookSuccessFeedback(null), 3000);
            // Optional: Router refresh für vollständige Synchronisation
            router.refresh();
          }}
        />
      )}

      {/* Success Toast für Hook-Generierung */}
      {hookSuccessFeedback && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="rounded-lg bg-hero-vibrant/95 text-black px-6 py-4 shadow-2xl border-2 border-hero-vibrant flex items-center gap-3 min-w-[300px]">
            <div className="shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="font-barlow font-bold text-base flex-1">
              {hookSuccessFeedback}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick Action Component für Reise
type TravelQuickActionProps = {
  npcId: string;
  currentLocationId: string;
  locations: Array<{ id: string; name: string; type: string }>;
  campaignId: string;
  onUpdate: () => void;
};

function TravelQuickAction({
  npcId,
  currentLocationId,
  locations,
  onUpdate,
}: TravelQuickActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateNPCCurrentLocation(npcId, selectedLocationId || null);
        setIsOpen(false);
        setSearchQuery("");
        setSelectedLocationId("");
        onUpdate();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren des Aufenthaltsorts."
        );
      }
    });
  };

  // Filter locations by search query
  const filteredLocations = locations
    .filter((l) => l.id !== currentLocationId)
    .filter((l) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(query) ||
        l.type.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 p-1.5 rounded border border-hero-border bg-hero-dark/40 hover:bg-hero-dark/60 transition-colors text-accent-gold hover:text-hero-vibrant"
        title="Reise"
      >
        <MapPin className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
              setSelectedLocationId("");
            }}
          />

          {/* Popover */}
          <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-lg border border-hero-border bg-background-card p-4 shadow-lg">
            <h3 className="font-barlow font-bold text-sm uppercase text-hero-vibrant mb-3">
              Reise
            </h3>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ort suchen..."
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant mb-3"
              autoFocus
            />

            {/* Location List */}
            <div className="max-h-64 overflow-y-auto mb-3 border border-hero-dark rounded">
              {filteredLocations.length > 0 ? (
                <div className="divide-y divide-hero-dark">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocationId(location.id)}
                      className={`w-full text-left px-3 py-2 font-libre text-sm hover:bg-hero-dark/50 transition-colors ${
                        selectedLocationId === location.id
                          ? "bg-hero-vibrant/20 text-hero-vibrant"
                          : "text-gray-300"
                      }`}
                    >
                      <div className="font-semibold">{location.name}</div>
                      <div className="text-xs text-gray-400">
                        {location.type}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 text-center text-gray-400 text-sm font-libre">
                  Keine Orte gefunden
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isPending || !selectedLocationId}
                className="flex-1 rounded border border-hero-border bg-hero-vibrant px-3 py-1.5 font-barlow font-bold text-sm uppercase text-white hover:bg-hero-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "..." : "Speichern"}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                  setSelectedLocationId("");
                }}
                disabled={isPending}
                className="rounded border border-hero-border bg-hero-dark/40 px-3 py-1.5 font-barlow font-bold text-sm uppercase text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
