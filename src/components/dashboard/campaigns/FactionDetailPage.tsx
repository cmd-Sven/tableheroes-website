"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Shield,
  Edit2,
  Save,
  X,
  AlertCircle,
  BookOpen,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Trash2,
  Scroll,
  Plus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  updateFaction,
  updateFactionNotes,
  toggleFactionReveal,
  deleteFaction,
  createFactionLore,
} from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { SecretsManager } from "@/src/components/dashboard/campaigns/secrets/SecretsManager";
import { GothicSpotlightDescription } from "@/src/components/dashboard/campaigns/lore/GothicSpotlightDescription";

type Location = {
  id: string;
  name: string;
  type: string;
};

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string | null;
  image_url: string | null;
  is_revealed: boolean;
  user_id?: string;
};

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  is_revealed: boolean;
};

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  image_url: string | null;
  location_id: string | null;
  lore_id: string | null;
  gm_notes: string | null;
  player_notes: string | null;
  is_revealed: boolean;
  locations?: Location | null;
  lore_entry?: LoreEntry | null;
  npcs?: NPC[];
};

type Props = {
  faction: Faction;
  campaignId: string;
  isGM: boolean;
  userId: string;
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

const FACTION_TYPES = [
  "Gilde",
  "Fraktion",
  "Orden",
  "Kult",
  "Königreich",
  "Organisation",
  "Religion",
  "Politik",
  "Militär",
  "Regierung",
];

const FACTION_STATUSES = [
  "Im Krieg",
  "Feindlich",
  "Verbündet",
  "Freundlich",
  "Neutral",
];

export function FactionDetailPage({
  faction: initialFaction,
  campaignId,
  isGM,
  userId,
  locations = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [faction, setFaction] = useState(initialFaction);

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const [isEditingGMNotes, setIsEditingGMNotes] = useState(false);
  const [isEditingPlayerNotes, setIsEditingPlayerNotes] = useState(false);
  const [gmNotes, setGmNotes] = useState(faction.gm_notes || "");
  const [playerNotes, setPlayerNotes] = useState(faction.player_notes || "");

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null> = {};
        const value = editValues[field];

        // Handle special fields
        if (field === "location_id") {
          updates[field] = value && value.trim() !== "" ? value : null;
        } else {
          updates[field] = value || null;
        }

        await updateFaction(faction.id, updates);

        // Update local state
        if (field === "location_id") {
          const selectedLocation = locations.find((l) => l.id === value);
          setFaction((prev) => ({
            ...prev,
            location_id: value || null,
            locations: selectedLocation
              ? {
                  id: selectedLocation.id,
                  name: selectedLocation.name,
                  type: selectedLocation.type,
                }
              : null,
          }));
        } else {
          setFaction((prev) => ({ ...prev, [field]: value || null }));
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
        await updateFactionNotes(faction.id, { gm_notes: gmNotes });
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
        await updateFactionNotes(faction.id, { player_notes: playerNotes });
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
        await toggleFactionReveal(faction.id, faction.is_revealed);
        setFaction((prev) => ({ ...prev, is_revealed: !prev.is_revealed }));
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
        `Möchtest du "${faction.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteFaction(faction.id);
        router.push(`/dashboard/campaigns/${campaignId}?tab=factions`);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Löschen der Fraktion.";
        alert(errorMessage);
      }
    });
  };

  const handleCreateLore = () => {
    startTransition(async () => {
      try {
        const result = await createFactionLore(
          faction.id,
          faction.name,
          campaignId
        );

        if (result.success && result.loreId) {
          router.refresh();
          router.push(
            `/dashboard/campaigns/${campaignId}/lore/${result.loreId}/edit`
          );
        } else {
          alert(result.error || "Fehler beim Erstellen des Lore-Eintrags.");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Erstellen des Lore-Eintrags.";
        alert(errorMessage);
      }
    });
  };

  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return "bg-gray-800/50 text-gray-300 border-gray-700";
    const colors: Record<string, string> = {
      "Im Krieg": "bg-red-900/50 text-red-300 border-red-700",
      Feindlich: "bg-orange-900/50 text-orange-300 border-orange-700",
      Verbündet: "bg-green-900/50 text-green-300 border-green-700",
      Freundlich: "bg-blue-900/50 text-blue-300 border-blue-700",
      Neutral: "bg-gray-900/50 text-gray-300 border-gray-700",
    };
    return colors[status] || "bg-gray-800/50 text-gray-300 border-gray-700";
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Gilde: "bg-blue-900/50 text-blue-300 border-blue-700",
      Fraktion: "bg-purple-900/50 text-purple-300 border-purple-700",
      Orden: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      Kult: "bg-red-900/50 text-red-300 border-red-700",
      Königreich: "bg-green-900/50 text-green-300 border-green-700",
      Organisation: "bg-gray-900/50 text-gray-300 border-gray-700",
      Religion: "bg-indigo-900/50 text-indigo-300 border-indigo-700",
      Politik: "bg-amber-900/50 text-amber-300 border-amber-700",
      Militär: "bg-slate-900/50 text-slate-300 border-slate-700",
      Regierung: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
    };
    return colors[type] || "bg-slate-800/50 text-slate-300 border-slate-600";
  };

  const visibleNPCs = (faction.npcs || []).filter(
    (npc) => isGM || npc.is_revealed || npc.user_id === userId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=factions`}
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
                faction.is_revealed
                  ? "text-green-500 hover:text-green-600 hover:bg-green-900/20"
                  : "text-gray-500 hover:text-gray-400 hover:bg-gray-900/20"
              } disabled:opacity-50`}
              title={faction.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
            >
              {faction.is_revealed ? (
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
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>

      {/* Faction Header Card with Image */}
      <div className="rounded-lg border border-hero-border bg-background-card p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image - Portrait Format */}
          <div className="shrink-0">
            {faction.image_url ? (
              <div className="relative w-48 h-64 lg:w-56 lg:h-72 rounded-xl overflow-hidden border-2 border-hero-border shadow-lg">
                <Image
                  src={faction.image_url}
                  alt={faction.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-48 h-64 lg:w-56 lg:h-72 rounded-xl border-2 border-hero-border bg-hero-dark/50 flex items-center justify-center shadow-lg">
                <Shield className="h-24 w-24 text-gray-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <InlineEditField
              isEditing={editingField === "name"}
              onEdit={() => handleStartEdit("name", faction.name)}
              onSave={() => handleSaveField("name")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
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
                {faction.name}
              </h1>
            </InlineEditField>

            {/* Type */}
            <InlineEditField
              isEditing={editingField === "type"}
              onEdit={() => handleStartEdit("type", faction.type)}
              onSave={() => handleSaveField("type")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.type || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, type: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                >
                  {FACTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              }
            >
              <span
                className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getTypeBadgeColor(
                  faction.type
                )}`}
              >
                {faction.type}
              </span>
            </InlineEditField>

            {/* Status */}
            <InlineEditField
              isEditing={editingField === "current_status"}
              onEdit={() =>
                handleStartEdit("current_status", faction.current_status)
              }
              onSave={() => handleSaveField("current_status")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.current_status || ""}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      current_status: e.target.value,
                    })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Kein Status --</option>
                  {FACTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              }
            >
              {faction.current_status && (
                <span
                  className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getStatusBadgeColor(
                    faction.current_status
                  )}`}
                >
                  {faction.current_status}
                </span>
              )}
            </InlineEditField>

            {/* Location */}
            <InlineEditField
              isEditing={editingField === "location_id"}
              onEdit={() =>
                handleStartEdit("location_id", faction.locations?.id || null)
              }
              onSave={() => handleSaveField("location_id")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.location_id || ""}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      location_id: e.target.value,
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
              {faction.locations ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent-gold" />
                  <span className="font-libre text-gray-400">
                    Ansässig in:{" "}
                  </span>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${faction.locations.id}`}
                    className="font-libre text-accent-gold font-semibold hover:underline"
                  >
                    {faction.locations.name}
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
                <p className="font-libre text-gray-500 text-sm">Unbekannt</p>
              )}
            </InlineEditField>

            {/* Lore Entry Button */}
            <div>
              {faction.lore_entry ? (
                isGM || faction.lore_entry.is_revealed ? (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${faction.lore_entry.id}`}
                    className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                  >
                    <Scroll className="h-4 w-4" />
                    📖 Zum Lore-Eintrag
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded border border-gray-700/50 bg-gray-900/50 px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-500 opacity-50 cursor-not-allowed">
                    <Scroll className="h-4 w-4" />
                    Noch nicht entdeckt
                  </div>
                )
              ) : (
                isGM && (
                  <button
                    onClick={handleCreateLore}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />➕ Lore-Eintrag erstellen
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div
            className="rounded-lg shadow-xl transition-shadow duration-300 relative"
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
                backgroundImageUrl={faction.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Beschreibung
                </h2>
                <InlineEditField
                  isEditing={editingField === "description"}
                  onEdit={() =>
                    handleStartEdit("description", faction.description)
                  }
                  onSave={() => handleSaveField("description")}
                  onCancel={handleCancelEdit}
                  canEdit={isGM}
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
                    {faction.description || "Keine Beschreibung vorhanden."}
                  </p>
                </InlineEditField>
              </GothicSpotlightDescription>
            </div>
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
                backgroundImageUrl={faction.image_url || undefined}
              >
                <SecretsManager
                  entityId={faction.id}
                  entityType="faction"
                  campaignId={campaignId}
                  isGM={isGM}
                />
              </GothicSpotlightDescription>
            </div>
          </div>

          {/* Members Section */}
          {visibleNPCs.length > 0 && (
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
                  <Users className="h-6 w-6" />
                  Mitglieder ({visibleNPCs.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleNPCs.map((npc) => (
                    <Link
                      key={npc.id}
                      href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                      className="flex items-center gap-3 rounded border border-hero-border bg-hero-dark/50 p-3 hover:bg-hero-dark hover:shadow-lg hover:shadow-accent-gold/20 transition-all"
                    >
                      {npc.image_url ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                          <Image
                            src={npc.image_url}
                            alt={npc.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-hero-vibrant/20 flex items-center justify-center shrink-0">
                          <Users className="h-6 w-6 text-hero-vibrant" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-cinzel font-bold text-white truncate">
                          {npc.name}
                        </p>
                        {npc.title && (
                          <p className="font-libre text-xs text-gray-400 truncate">
                            {npc.title}
                          </p>
                        )}
                        {npc.role && (
                          <p className="font-libre text-xs text-gray-500 italic truncate">
                            {npc.role}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Notes */}
        <div className="space-y-6">
          {/* GM Notes */}
          {isGM && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/dark-wood.jpg')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* Dark Overlay for readability */}
              <div className="absolute inset-0 bg-black/50 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    GM-Notizen
                  </h2>
                  {!isEditingGMNotes ? (
                    <button
                      onClick={() => setIsEditingGMNotes(true)}
                      className="p-1.5 rounded text-slate-500 hover:text-accent-gold hover:bg-hero-dark transition-colors"
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
                          setGmNotes(faction.gm_notes || "");
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
                  <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {faction.gm_notes || "Keine GM-Notizen vorhanden."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Player Notes */}
          <div
            className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
            style={{
              border: "2px solid rgba(202, 185, 38, 0.5)",
              backgroundImage: "url('/images/dark-wood.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Spieler-Notizen
                </h2>
                {!isEditingPlayerNotes ? (
                  <button
                    onClick={() => setIsEditingPlayerNotes(true)}
                    className="p-1.5 rounded text-slate-500 hover:text-accent-gold hover:bg-hero-dark transition-colors"
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
                        setPlayerNotes(faction.player_notes || "");
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
                <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {faction.player_notes || "Keine Spieler-Notizen vorhanden."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
