"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { GothicSpotlightDescription } from "./GothicSpotlightDescription";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { SmartText } from "@/src/components/ui/SmartText";
import { useWorldEntities } from "@/src/hooks/useWorldEntities";

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

type Props = {
  lore: { id: string; description: string | null; image_url: string | null; world_id?: string };
  campaignId?: string | null;
  isGM: boolean;
  onUpdate?: () => void;
};

export function LoreDescription({ lore, campaignId, isGM, onUpdate }: Props) {
  const router = useRouter();
  const worldId = lore.world_id ?? null;
  const { entities } = useWorldEntities(worldId);
  const [isPending, startTransition] = useTransition();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null> = {};
        const value = editValues[field];
        updates[field] = value || null;
        
        await updateLoreEntry(lore.id, updates);
        
        setEditingField(null);
        setEditValues({});
        router.refresh();
        onUpdate?.();
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

  return (
    <div 
      style={{ border: "3px solid #B8860B" }} 
      className="rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.8)] transition-shadow duration-300"
    >
      <GothicSpotlightDescription backgroundImageUrl={lore.image_url || undefined}>
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Beschreibung
        </h2>
        <InlineEditField
          isEditing={editingField === "description"}
          onEdit={() => handleStartEdit("description", lore.description)}
          onSave={() => handleSaveField("description")}
          onCancel={handleCancelEdit}
          canEdit={isGM}
          isPending={isPending}
          editComponent={
            <MarkdownEditor
              value={editValues.description || ""}
              onChange={(v) => setEditValues({ ...editValues, description: v })}
              minHeight="min-h-[450px]"
              entities={entities}
              campaignId={campaignId}
              worldId={worldId}
            />
          }
        >
          <SmartText
            text={lore.description || ""}
            entities={entities}
            campaignId={campaignId}
            worldId={worldId}
            emptyMessage="Keine Beschreibung vorhanden."
          />
        </InlineEditField>
      </GothicSpotlightDescription>
    </div>
  );
}

