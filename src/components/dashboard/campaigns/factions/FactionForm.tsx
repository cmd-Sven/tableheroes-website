"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createFaction, updateFaction } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { generateFaction } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS } from "@/src/lib/faction-types";

type Location = {
  id: string;
  name: string;
  type: string;
};

type FactionData = {
  id?: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  image_url: string | null;
  location_id: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
};

type Props = {
  campaignId: string;
  initialData?: FactionData | null;
  locations?: Location[];
  onSuccess?: () => void;
};

export function FactionForm({ campaignId, initialData, locations = [], onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const isEditMode = !!initialData;

  // Initialer State
  const [formData, setFormData] = useState<FactionData>({
    name: "",
    type: "Gilde",
    current_status: null,
    description: null,
    image_url: null,
    location_id: null,
    gm_notes: null,
    is_revealed: false,
  });

  // Daten laden, wenn initialData vorhanden ist
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        type: initialData.type || "Gilde",
        current_status: initialData.current_status || null,
        description: initialData.description || null,
        image_url: initialData.image_url || null,
        location_id: initialData.location_id || null,
        gm_notes: initialData.gm_notes || null,
        is_revealed: initialData.is_revealed || false,
      });
    }
  }, [initialData]);

  const handleAIGenerate = async () => {
    // Nur im Create Mode verfügbar
    if (isEditMode) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für die Fraktion:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateFaction(campaignId, prompt);

      // Type & Status Matching
      let matchedType = result.type || "Gilde";
      if (!VALID_FACTION_TYPES.includes(matchedType as any)) {
        matchedType = "Gilde";
      }

      let matchedStatus = result.current_status || null;
      if (matchedStatus && !VALID_RELATIONSHIPS.includes(matchedStatus as any)) {
        matchedStatus = null;
      }

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
        const payload = {
          name: formData.name,
          type: formData.type,
          current_status: formData.current_status || undefined,
          description: formData.description || undefined,
          image_url: formData.image_url || undefined,
          location_id: formData.location_id || undefined,
          gm_notes: formData.gm_notes || undefined,
          is_revealed: formData.is_revealed,
        };

        let result;
        if (isEditMode && initialData?.id) {
          // Edit Mode
          await updateFaction(initialData.id, payload);
          result = { id: initialData.id };
        } else {
          // Create Mode
          result = await createFaction({
            campaign_id: campaignId,
            ...payload,
          });
        }

        // Success handling
        if (onSuccess) {
          onSuccess();
        } else {
          // Cache invalidieren
          router.refresh();
          
          if (isEditMode && initialData?.id) {
            // Edit Mode -> Zurück zur Detailseite
            router.push(`/dashboard/campaigns/${campaignId}/factions/${initialData.id}`);
          } else if (result?.id) {
            // Create Mode -> Zur neuen Detailseite (wenn ID vorhanden)
            router.push(`/dashboard/campaigns/${campaignId}/factions/${result.id}`);
          } else {
            // Fallback: Zur Liste
            router.push(`/dashboard/campaigns/${campaignId}?tab=factions`);
          }
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Ein Fehler ist aufgetreten.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=factions`}
          className="hover:text-hero-vibrant transition-colors"
        >
          Fraktionen
        </Link>
        <span>/</span>
        {isEditMode && initialData && (
          <>
            <Link
              href={`/dashboard/campaigns/${campaignId}/factions/${initialData.id}`}
              className="hover:text-hero-vibrant transition-colors"
            >
              {initialData.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-white">Bearbeiten</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-hero-dark p-2">
          <Shield className="h-6 w-6 text-accent-gold" />
        </div>
        <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">
          {isEditMode ? "Fraktion bearbeiten" : "Neue Fraktion erstellen"}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Generation Button (nur im Create Mode) */}
        {!isEditMode && (
          <div className="flex justify-end">
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
              value={formData.current_status || ""}
              onChange={(e) =>
                setFormData({ ...formData, current_status: e.target.value || null })
              }
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

        {/* Location */}
        {locations.length > 0 && (
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Standort
            </label>
            <select
              value={formData.location_id || ""}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value || null })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              <option value="">-- Kein Standort --</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Image URL */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Bild-URL
          </label>
          <input
            type="url"
            value={formData.image_url || ""}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value || null })}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
            placeholder="https://..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blue">
            Beschreibung (Spieler-sichtbar)
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
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
            value={formData.gm_notes || ""}
            onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value || null })}
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

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-hero-border">
          <Link
            href={
              isEditMode && initialData
                ? `/dashboard/campaigns/${campaignId}/factions/${initialData.id}`
                : `/dashboard/campaigns/${campaignId}?tab=factions`
            }
            className="rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
          >
            {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Fraktion erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}

