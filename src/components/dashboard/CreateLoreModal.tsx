"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Book, Sparkles, Loader2 } from "lucide-react";
import { createLoreEntry, updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { generateLore } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  parentOptions: Array<{ id: string; name: string; type: string }>;
  existingLore?: {
    id: string;
    name: string;
    type: string;
    parent_id: string | null;
    image_url: string | null;
    description: string | null;
    gm_notes: string | null;
    is_revealed: boolean;
  } | null;
};


export function CreateLoreModal({ campaignId, isOpen, onClose, parentOptions, existingLore }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Wir prüfen direkt hier, ob wir im Edit-Modus sind
  const isEditMode = !!existingLore;

  const [formData, setFormData] = useState({
    name: "",
    type: "Stadt",
    parent_id: null as string | null,
    image_url: "",
    description: "",
    gm_notes: "",
    is_revealed: false,
  });

  // Sync state when opening modal (Entscheidet zwischen Edit und Create)
  useEffect(() => {
    if (isOpen) {
      if (existingLore) {
        // EDIT MODE: Vorhandene Daten laden
        setFormData({
          name: existingLore.name || "",
          type: existingLore.type || "Stadt",
          parent_id: existingLore.parent_id || null,
          image_url: existingLore.image_url || "",
          description: existingLore.description || "",
          gm_notes: existingLore.gm_notes || "",
          is_revealed: existingLore.is_revealed || false,
        });
      } else {
        // CREATE MODE: Formular leeren
        setFormData({
          name: "",
          type: "Stadt",
          parent_id: null,
          image_url: "",
          description: "",
          gm_notes: "",
          is_revealed: false,
        });
      }
    }
  }, [isOpen, existingLore]);

  const handleAIGenerate = async () => {
    // Nur im Create Mode verfügbar
    if (isEditMode) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für den Lore-Eintrag:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateLore(campaignId, prompt);
      
      // Type Matching: Prüfe ob AI-Wert in den gültigen Typen existiert
      let matchedType = result.type || "Stadt";
      if (!VALID_LORE_TYPES.includes(matchedType as any)) {
        matchedType = "Stadt"; // Fallback
      }

      // Update Form Data
      setFormData((prev) => ({
        ...prev,
        name: result.name || prev.name,
        type: matchedType,
        description: result.description || prev.description,
        gm_notes: result.gm_notes || prev.gm_notes,
      }));
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
        // parent_id darf oft null sein (Datenbank-Feld), aber Textfelder in Server-Actions sind oft optional (string | undefined).
        const payload = {
            name: formData.name,
            type: formData.type,
            is_revealed: formData.is_revealed,
            parent_id: formData.parent_id || null, 
            image_url: formData.image_url || undefined, // Hier undefined nutzen!
            description: formData.description || undefined, // Hier auch!
            gm_notes: formData.gm_notes || undefined, // Und hier!
        };

        if (isEditMode && existingLore) {
          await updateLoreEntry(existingLore.id, payload);
        } else {
          await createLoreEntry({
            campaign_id: campaignId,
            ...payload,
          });
        }
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
                <Book className="h-6 w-6 text-accent-gold" />
            </div>
            <h2 className="font-cinzel font-bold text-2xl text-white">
              {isEditMode ? "Lore-Eintrag bearbeiten" : "Neuer Lore-Eintrag"}
            </h2>
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
        <form id="lore-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* AI Generation Button (nur im Create Mode) */}
          {!isEditMode && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating || isPending}
                className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    ✨ MIT KI AUSFÜLLEN
                  </>
                )}
              </button>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Name des Eintrags *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
              placeholder="z.B. Neverwinter, Das Große Schisma..."
            />
          </div>

          {/* Type & Parent */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Typ *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                {[...VALID_LORE_TYPES].sort().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Gehört zu...
              </label>
              <select
                value={formData.parent_id || ""}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                <option value="">-- Kein übergeordneter Ort (Haupt-Ebene) --</option>
                {parentOptions
                  // Verhindern, dass man sich selbst als Elternteil wählt (bei Edit)
                  .filter((opt) => !isEditMode || opt.id !== existingLore?.id)
                  .map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Bild URL (Optional)
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blue">
              Beschreibung (Spieler-sichtbar)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-blue resize-none"
              placeholder="Was sehen die Spieler auf den ersten Blick?"
            />
          </div>

          {/* GM Notes */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
              🔒 GM-Notizen (Nur für dich & KI)
            </label>
            <textarea
              value={formData.gm_notes}
              onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, is_revealed: e.target.checked })}
              className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
            />
            <label htmlFor="is_revealed" className="font-libre text-sm text-gray-300 cursor-pointer select-none">
              Für Spieler sichtbar (Kann jederzeit geändert werden)
            </label>
          </div>

        </form>

        {/* Footer (Fixed) */}
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="lore-form"
              disabled={isPending}
              className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
            >
              {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Eintrag erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}