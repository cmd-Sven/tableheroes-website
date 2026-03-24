"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Trash2, MapPin, Edit2, Save, X, Loader2, ChevronRight as ChevronRightIcon } from "lucide-react";
import { updateLoreEntry, toggleLoreReveal, deleteLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { LoreHeaderImageSlider } from "./LoreImageSlider";
import { ImageBorderContainer } from "./ImageBorderContainer";

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

const getTypeBadgeColor = (type: string) => {
  const colors: Record<string, string> = {
    Stadt: "bg-blue-900/50 text-blue-300 border-blue-700",
    Region: "bg-green-900/50 text-green-300 border-green-700",
    Land: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    Gottheit: "bg-purple-900/50 text-purple-300 border-purple-700",
    Religion: "bg-indigo-900/50 text-indigo-300 border-indigo-700",
    Magie: "bg-pink-900/50 text-pink-300 border-pink-700",
    Artefakt: "bg-amber-900/50 text-amber-300 border-amber-700",
    Rasse: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
    Kultur: "bg-teal-900/50 text-teal-300 border-teal-700",
    Ereignis: "bg-red-900/50 text-red-300 border-red-700",
    Mythos: "bg-violet-900/50 text-violet-300 border-violet-700",
  };
  return colors[type] || "bg-gray-900/50 text-gray-300 border-gray-700";
};

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  is_revealed: boolean;
  additional_images?: Array<{ url: string; description: string }> | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  parent_id?: string | null;
};

type Props = {
  lore: LoreEntry;
  campaignId: string;
  isGM: boolean;
  breadcrumb?: Array<{ id: string; name: string; type: string }>;
  parentOptions?: Array<{ id: string; name: string; type: string }>;
  onLoreUpdate?: () => void;
};

export function LoreHeader({ lore: initialLore, campaignId, isGM, breadcrumb = [], parentOptions = [], onLoreUpdate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lore, setLore] = useState(initialLore);
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(lore.parent_id || null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null> = {};
        const value = editValues[field];
        updates[field] = value || null;
        
        await updateLoreEntry(lore.id, updates);
        
        setLore((prev) => ({ ...prev, [field]: value || null }));
        setEditingField(null);
        setEditValues({});
        router.refresh();
        onLoreUpdate?.();
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

  const handleSaveParent = () => {
    startTransition(async () => {
      try {
        await updateLoreEntry(lore.id, {
          parent_id: selectedParentId || null,
        });
        
        setLore((prev) => ({ 
          ...prev, 
          parent_id: selectedParentId || null,
          parent: selectedParentId ? parentOptions.find(p => p.id === selectedParentId) ? { id: selectedParentId, name: parentOptions.find(p => p.id === selectedParentId)!.name } : null : null
        }));
        setIsEditingParent(false);
        router.refresh();
        onLoreUpdate?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Speichern der Hierarchie.";
        alert(errorMessage);
      }
    });
  };

  const handleCancelParent = () => {
    setSelectedParentId(lore.parent_id || null);
    setIsEditingParent(false);
  };

  const handleRemoveParent = () => {
    if (!confirm("Möchten Sie die Zuordnung zu einem übergeordneten Ort wirklich entfernen? Dieser Ort wird dann zu einem Root-Element.")) {
      return;
    }
    
    startTransition(async () => {
      try {
        await updateLoreEntry(lore.id, {
          parent_id: null,
        });
        
        setLore((prev) => ({ 
          ...prev, 
          parent_id: null,
          parent: null
        }));
        
        router.refresh();
        onLoreUpdate?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Entfernen der Zuordnung.";
        alert(errorMessage);
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        await toggleLoreReveal(campaignId, lore.id, lore.is_revealed);
        setLore((prev) => ({ ...prev, is_revealed: !prev.is_revealed }));
        router.refresh();
        onLoreUpdate?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Ändern der Sichtbarkeit.";
        alert(errorMessage);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Möchtest du "${lore.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteLoreEntry(lore.id);
        router.push(`/dashboard/campaigns/${campaignId}?tab=lore`);
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Löschen des Eintrags.";
        alert(errorMessage);
      }
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=lore`}
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
                lore.is_revealed
                  ? "text-green-500 hover:text-green-600 hover:bg-green-900/20"
                  : "text-gray-500 hover:text-gray-400 hover:bg-gray-900/20"
              } disabled:opacity-50`}
              title={lore.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
            >
              {lore.is_revealed ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
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

      {/* Cinematic Header - Main Image with Overlays (min 400px height on desktop, centered top) */}
      {(() => {
        const allImages: Array<{ url: string; description: string }> = [
          ...(lore.image_url ? [{ url: lore.image_url, description: lore.name }] : []),
          ...(lore.additional_images || []),
        ].filter((img) => img.url?.trim());
        return allImages.length > 0 ? (
        <div className="relative isolate w-full overflow-hidden rounded-lg bg-background-card">
          {/* Im Flow: reserviert Höhe (nur absolute Kinder würden sonst 0px Höhe ergeben → Rahmen oben+unten übereinander) */}
          <div
            className="w-full min-h-[clamp(17rem,42vw,28rem)]"
            aria-hidden
          />
          {/* Main Image(s) - centered top */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <LoreHeaderImageSlider images={allImages} />
          </div>
          
          {/* Gradient Overlay for Text Readability */}
          <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-br from-black/50 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <ImageBorderContainer className="absolute inset-0 z-10 h-full min-h-full w-full">
            {/* Breadcrumb - Top Left (above title) */}
            {breadcrumb.length > 0 && (
              <motion.div 
                className="absolute top-12 left-12 z-20 flex items-center gap-2 text-sm text-gray-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                >
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {index > 0 && <ChevronRightIcon className="h-4 w-4" />}
                      <Link
                        href={`/dashboard/campaigns/${campaignId}/lore/${item.id}`}
                        className="hover:text-hero-vibrant transition-colors font-libre"
                      >
                        {item.name}
                      </Link>
                    </div>
                  ))}
              </motion.div>
            )}

            {/* Title - Top Left (or below breadcrumb) */}
            <motion.div 
              className={`absolute ${breadcrumb.length > 0 ? 'top-24' : 'top-12'} left-12 z-20 max-w-[60%]`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
            <InlineEditField
              isEditing={editingField === "name"}
              onEdit={() => handleStartEdit("name", lore.name)}
              onSave={() => handleSaveField("name")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <input
                  type="text"
                  value={editValues.name || ""}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900/95 p-3 font-cinzel font-bold text-2xl text-hero-vibrant outline-none focus:border-hero-vibrant backdrop-blur-sm"
                  autoFocus
                />
              }
            >
              <h1 className="font-cinzel font-bold text-3xl lg:text-4xl text-hero-vibrant drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {lore.name}
              </h1>
              </InlineEditField>
            </motion.div>

            {/* Type Badge - Top Right */}
            <div className="absolute top-12 right-12 z-20">
            <InlineEditField
              isEditing={editingField === "type"}
              onEdit={() => handleStartEdit("type", lore.type)}
              onSave={() => handleSaveField("type")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.type || ""}
                  onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                  className="rounded border border-hero-dark bg-slate-900/95 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant backdrop-blur-sm"
                >
                  {VALID_LORE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              }
            >
              <span
                className={`px-4 py-2 rounded text-sm font-barlow font-bold uppercase border backdrop-blur-sm drop-shadow-lg ${getTypeBadgeColor(
                  lore.type
                )}`}
              >
                {lore.type}
              </span>
              </InlineEditField>
            </div>

            {/* Parent Selection - Bottom Left (GM only) - ALWAYS VISIBLE if isGM */}
            {isGM && (
              <div className="absolute bottom-12 left-12 z-20">
              {isEditingParent ? (
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-hero-vibrant">
                  <label className="text-white text-xs font-barlow uppercase">Übergeordneter Ort:</label>
                  <select
                    value={selectedParentId || ""}
                    onChange={(e) => setSelectedParentId(e.target.value || null)}
                    className="rounded border border-hero-dark bg-slate-900 p-2 text-white text-sm outline-none focus:border-hero-vibrant min-w-[200px]"
                  >
                    <option value="">Keine Über-Region</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.type}: {option.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveParent}
                    disabled={isPending}
                    className="px-3 py-1 rounded bg-hero-vibrant text-black hover:bg-yellow-400 transition-colors disabled:opacity-50 text-xs font-barlow font-bold uppercase"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                  </button>
                  <button
                    onClick={handleCancelParent}
                    className="px-3 py-1 rounded border border-white/20 text-white hover:bg-white/10 transition-colors text-xs font-barlow font-bold uppercase"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {lore.parent ? (
                    <>
                      <Link
                        href={`/dashboard/campaigns/${campaignId}/lore/${lore.parent.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-barlow text-white border border-white/20 bg-black/40 backdrop-blur-sm hover:border-hero-vibrant hover:bg-hero-vibrant/20 transition-colors drop-shadow-lg"
                      >
                        <MapPin className="h-4 w-4" />
                        In: {lore.parent.name}
                      </Link>
                      <button
                        onClick={handleRemoveParent}
                        disabled={isPending}
                        className="p-2 rounded border border-red-500/50 bg-red-900/20 backdrop-blur-sm hover:border-red-500 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        title="Zuordnung entfernen"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingParent(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-barlow font-bold uppercase text-hero-vibrant border-2 border-hero-vibrant bg-hero-vibrant/20 backdrop-blur-sm hover:bg-hero-vibrant/30 transition-colors drop-shadow-lg"
                    >
                      <MapPin className="h-4 w-4" />
                      Geografie festlegen / Welt zuordnen
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingParent(true)}
                    className="p-2 rounded border border-white/20 bg-black/40 backdrop-blur-sm hover:border-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
                    title="Hierarchie bearbeiten"
                  >
                    <Edit2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}
            </div>
            )}
            {!isGM && lore.parent && (
              <div className="absolute bottom-12 left-12 z-20">
                <Link
                  href={`/dashboard/campaigns/${campaignId}/lore/${lore.parent.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-barlow text-white border border-white/20 bg-black/40 backdrop-blur-sm hover:border-hero-vibrant hover:bg-hero-vibrant/20 transition-colors drop-shadow-lg"
                >
                  <MapPin className="h-4 w-4" />
                  In: {lore.parent.name}
                </Link>
              </div>
            )}
          </ImageBorderContainer>
        </div>
      ) : (
        <ImageBorderContainer className="rounded-lg bg-background-card p-6">
          <div className="space-y-4">
            {/* Name */}
            <InlineEditField
              isEditing={editingField === "name"}
              onEdit={() => handleStartEdit("name", lore.name)}
              onSave={() => handleSaveField("name")}
              onCancel={handleCancelEdit}
              canEdit={isGM}
              isPending={isPending}
              editComponent={
                <input
                  type="text"
                  value={editValues.name || ""}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-cinzel font-bold text-2xl text-hero-vibrant outline-none focus:border-hero-vibrant"
                  autoFocus
                />
              }
            >
              <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">{lore.name}</h1>
            </InlineEditField>

            {/* Type */}
            <div className="flex flex-wrap items-center gap-2">
              <InlineEditField
                isEditing={editingField === "type"}
                onEdit={() => handleStartEdit("type", lore.type)}
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
                    {VALID_LORE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                }
              >
                <span
                  className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getTypeBadgeColor(
                    lore.type
                  )}`}
                >
                  {lore.type}
                </span>
              </InlineEditField>

              {/* Parent Selection (GM only) - ALWAYS VISIBLE if isGM */}
              {isGM && (
                <div className="flex items-center gap-2 text-sm">
                  {isEditingParent ? (
                    <div className="flex items-center gap-2">
                      <label className="text-gray-400 font-barlow text-xs uppercase">Übergeordneter Ort:</label>
                      <select
                        value={selectedParentId || ""}
                        onChange={(e) => setSelectedParentId(e.target.value || null)}
                        className="rounded border border-hero-dark bg-slate-900 p-2 text-white text-sm outline-none focus:border-hero-vibrant min-w-[200px]"
                      >
                        <option value="">Keine Über-Region</option>
                        {parentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.type}: {option.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveParent}
                        disabled={isPending}
                        className="px-3 py-1 rounded bg-hero-vibrant text-black hover:bg-yellow-400 transition-colors disabled:opacity-50 text-xs font-barlow font-bold uppercase"
                      >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                      </button>
                      <button
                        onClick={handleCancelParent}
                        className="px-3 py-1 rounded border border-hero-border text-gray-300 hover:bg-hero-dark/50 transition-colors text-xs font-barlow font-bold uppercase"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-barlow text-xs uppercase">Übergeordneter Ort:</span>
                      {lore.parent ? (
                        <>
                          <Link
                            href={`/dashboard/campaigns/${campaignId}/lore/${lore.parent.id}`}
                            className="text-hero-vibrant hover:underline font-libre"
                          >
                            {lore.parent.name}
                          </Link>
                          <button
                            onClick={handleRemoveParent}
                            disabled={isPending}
                            className="ml-2 p-1.5 rounded hover:bg-red-900/30 transition-colors border border-red-500/50 hover:border-red-500"
                            title="Zuordnung entfernen"
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-500 italic font-libre">Keine</span>
                      )}
                      <button
                        onClick={() => setIsEditingParent(true)}
                        className="ml-2 p-1.5 rounded hover:bg-hero-dark/50 transition-colors border border-hero-border hover:border-hero-vibrant"
                        title="Hierarchie bearbeiten"
                      >
                        <Edit2 className="h-4 w-4 text-gray-400 hover:text-hero-vibrant" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isGM && lore.parent && (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/lore/${lore.parent.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-barlow text-gray-300 border border-hero-border hover:border-hero-vibrant hover:text-hero-vibrant transition-colors"
                >
                  <MapPin className="h-3 w-3" />
                  In: {lore.parent.name}
                </Link>
              )}
            </div>
          </div>
        </ImageBorderContainer>
      );
      })()}
    </>
  );
}

