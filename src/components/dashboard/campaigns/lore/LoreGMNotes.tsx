"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit2, Save, X, Loader2 } from "lucide-react";
import { updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type Props = {
  lore: { id: string; gm_notes: string | null };
  isGM: boolean;
  onUpdate?: () => void;
};

export function LoreGMNotes({ lore: initialLore, isGM, onUpdate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditingGMNotes, setIsEditingGMNotes] = useState(false);
  const [gmNotes, setGmNotes] = useState(initialLore.gm_notes || "");

  const handleSaveGMNotes = () => {
    startTransition(async () => {
      try {
        await updateLoreEntry(initialLore.id, { gm_notes: gmNotes });
        setIsEditingGMNotes(false);
        router.refresh();
        onUpdate?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Speichern der Notizen.";
        alert(errorMessage);
      }
    });
  };

  if (!isGM) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-accent-gold/50 bg-accent-gold/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-semibold text-xl text-accent-gold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            🔒 GM-Notizen
          </h3>
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
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setIsEditingGMNotes(false);
                  setGmNotes(initialLore.gm_notes || "");
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
            className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant resize-none min-h-[200px]"
            placeholder="GM-Notizen hier eingeben..."
          />
        ) : (
          <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
            {initialLore.gm_notes || "Keine GM-Notizen vorhanden."}
          </p>
        )}
      </div>
    </div>
  );
}

