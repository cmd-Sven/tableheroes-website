"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Shield, Sparkles, Loader2 } from "lucide-react";
import { createFaction, updateFaction } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { generateFaction } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS } from "@/src/lib/faction-types";

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  existingFaction?: {
    id: string;
    name: string;
    type: string;
    current_status: string | null;
    description: string | null;
    gm_notes: string | null;
    is_revealed: boolean;
  } | null;
};


export function CreateFactionModal({ campaignId, isOpen, onClose, existingFaction }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Modus erkennen
  const isEditMode = !!existingFaction;

  // Initialer State (leer)
  const [formData, setFormData] = useState({
    name: "",
    type: "Gilde",
    current_status: "",
    description: "",
    gm_notes: "",
    is_revealed: false,
  });

  // WICHTIG: Daten laden, wenn das Modal geöffnet wird (Fix für leere Felder beim Bearbeiten)
  useEffect(() => {
    if (isOpen) {
      if (existingFaction) {
        // Edit Mode: Vorhandene Daten setzen (Null zu Leerstring konvertieren für Inputs)
        setFormData({
          name: existingFaction.name || "",
          type: existingFaction.type || "Gilde",
          current_status: existingFaction.current_status || "",
          description: existingFaction.description || "",
          gm_notes: existingFaction.gm_notes || "",
          is_revealed: existingFaction.is_revealed || false,
        });
      } else {
        // Create Mode: Alles zurücksetzen
        setFormData({
          name: "",
          type: "Gilde",
          current_status: "",
          description: "",
          gm_notes: "",
          is_revealed: false,
        });
      }
    }
  }, [isOpen, existingFaction]);

  const handleAIGenerate = async () => {
    // Nur im Create Mode verfügbar
    if (isEditMode) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für die Fraktion:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateFaction(campaignId, prompt);
      
      // Type & Status Matching: Prüfe ob AI-Werte in den Dropdowns existieren
      let matchedType = result.type || "Gilde";
      if (!VALID_FACTION_TYPES.includes(matchedType as any)) {
        matchedType = "Gilde"; // Fallback
      }

      let matchedStatus = result.current_status || "";
      if (matchedStatus && !VALID_RELATIONSHIPS.includes(matchedStatus as any)) {
        matchedStatus = ""; // Fallback zu leer
      }

      // Update Form Data
      setFormData((prev) => ({
        ...prev,
        name: result.name || prev.name,
        type: matchedType,
        current_status: matchedStatus,
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
        // FIX: Wir nutzen 'undefined' statt 'null' für leere Textfelder
        // Das behebt den TypeScript Fehler "Type 'null' is not assignable to type 'string | undefined'"
        const payload = {
            ...formData,
            current_status: formData.current_status || undefined,
            description: formData.description || undefined,
            gm_notes: formData.gm_notes || undefined,
        };

        if (isEditMode && existingFaction) {
          await updateFaction(existingFaction.id, payload);
        } else {
          await createFaction({
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
      <div className="relative w-full max-w-2xl rounded-lg border border-hero-gold/30 bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-border/30">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-hero-dark p-2">
                <Shield className="h-6 w-6 text-accent-gold" />
            </div>
            <h2 className="font-cinzel font-bold text-2xl text-white">
              {isEditMode ? "Fraktion bearbeiten" : "Neue Fraktion erstellen"}
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
        <form id="faction-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
              Name der Fraktion *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
              placeholder="z.B. Die Schattengilde"
            />
          </div>

          {/* Type & Status */}
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
                {[...VALID_FACTION_TYPES].sort().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Aktueller Status
              </label>
              <select
                value={formData.current_status}
                onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                <option value="">-- Kein Status --</option>
                {[...VALID_RELATIONSHIPS].sort().map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blue">
              Beschreibung (Spieler-sichtbar)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-blue resize-none"
              placeholder="Eine kurze Beschreibung, die Spieler sehen können..."
            />
          </div>

          {/* GM Notes */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
              🔒 GM-Notizen (Nur für dich)
            </label>
            <textarea
              value={formData.gm_notes}
              onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value })}
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold border-l-4 border-l-accent-gold resize-none"
              placeholder="Interne Notizen, Plottwists, Geheimnisse..."
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
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark/50">
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
              form="faction-form"
              disabled={isPending}
              className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
            >
              {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Fraktion erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}