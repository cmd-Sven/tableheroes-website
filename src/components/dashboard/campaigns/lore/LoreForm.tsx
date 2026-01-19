"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { createLoreEntry, updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { generateLore } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";

type AdditionalImage = {
  url: string;
  description: string;
};

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  image_url: string | null;
  additional_images?: AdditionalImage[] | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
};

type Props = {
  campaignId: string;
  initialData?: LoreEntry | null;
  parentOptions: Array<{ id: string; name: string; type: string }>;
  world?: { id: string; name: string } | null;
  onSuccess?: () => void;
};

export function LoreForm({ campaignId, initialData, parentOptions, world, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const isEditMode = !!initialData;

  // Special value to represent "world root" - when selected, parent_id should be null
  const WORLD_ROOT_VALUE = "__WORLD_ROOT__";

  const [formData, setFormData] = useState({
    name: "",
    type: "Stadt",
    parent_id: WORLD_ROOT_VALUE as string | null,
    image_url: "",
    additional_images: [] as AdditionalImage[],
    description: "",
    gm_notes: "",
    is_revealed: false,
  });

  // Sync state when initialData changes
  useEffect(() => {
    if (initialData) {
      // If parent_id is null, it means it's at world root level
      const parentId = initialData.parent_id === null ? WORLD_ROOT_VALUE : initialData.parent_id;
      setFormData({
        name: initialData.name || "",
        type: initialData.type || "Stadt",
        parent_id: parentId,
        image_url: initialData.image_url || "",
        additional_images: initialData.additional_images || [],
        description: initialData.description || "",
        gm_notes: initialData.gm_notes || "",
        is_revealed: initialData.is_revealed || false,
      });
    } else {
      setFormData({
        name: "",
        type: "Stadt",
        parent_id: WORLD_ROOT_VALUE,
        image_url: "",
        additional_images: [],
        description: "",
        gm_notes: "",
        is_revealed: false,
      });
    }
  }, [initialData]);

  const addAdditionalImage = () => {
    setFormData((prev) => ({
      ...prev,
      additional_images: [...prev.additional_images, { url: "", description: "" }],
    }));
  };

  const removeAdditionalImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index),
    }));
  };

  const updateAdditionalImage = (index: number, field: "url" | "description", value: string) => {
    setFormData((prev) => ({
      ...prev,
      additional_images: prev.additional_images.map((img, i) =>
        i === index ? { ...img, [field]: value } : img
      ),
    }));
  };

  const handleAIGenerate = async () => {
    if (isEditMode) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für den Lore-Eintrag:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateLore(campaignId, prompt);
      
      let matchedType = result.type || "Stadt";
      if (!VALID_LORE_TYPES.includes(matchedType as any)) {
        matchedType = "Stadt";
      }

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
        // If WORLD_ROOT_VALUE is selected, set parent_id to null (world root level)
        const parentId = formData.parent_id === WORLD_ROOT_VALUE ? null : (formData.parent_id || null);

        const payload = {
          name: formData.name,
          type: formData.type,
          is_revealed: formData.is_revealed,
          parent_id: parentId,
          image_url: formData.image_url || undefined,
          additional_images: formData.additional_images.filter((img) => img.url.trim() !== "") || null,
          description: formData.description || undefined,
          gm_notes: formData.gm_notes || undefined,
        };

        if (isEditMode && initialData) {
          await updateLoreEntry(initialData.id, payload);
        } else {
          await createLoreEntry({
            campaign_id: campaignId,
            ...payload,
          });
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/campaigns/${campaignId}?tab=lore`);
          router.refresh();
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Ein Fehler ist aufgetreten.");
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">
            {isEditMode ? "Lore-Eintrag bearbeiten" : "Neuer Lore-Eintrag"}
          </h1>
          {!isEditMode && (
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
          )}
        </div>

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
              value={formData.parent_id || WORLD_ROOT_VALUE}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || WORLD_ROOT_VALUE })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              {world && (
                <optgroup label="Welt-Fundament">
                  <option value={WORLD_ROOT_VALUE}>
                    {world.name} (Welt-Ebene)
                  </option>
                </optgroup>
              )}
              {parentOptions.length > 0 && (
                <optgroup label="Bestehende Orte & Regionen">
                  {parentOptions
                    .filter((opt) => !isEditMode || opt.id !== initialData?.id)
                    .map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.type})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Main Image URL - Required */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Hauptbild URL *
          </label>
          <input
            type="url"
            required
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            placeholder="https://example.com/image.jpg"
          />
          <p className="mt-1 text-xs text-gray-500 font-libre">
            Das Hauptbild wird oben groß im Landscape-Format angezeigt.
          </p>
        </div>

        {/* Additional Images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
              Zusätzliche Bilder (Optional)
            </label>
            <button
              type="button"
              onClick={addAdditionalImage}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors text-sm font-barlow font-bold uppercase"
            >
              <Plus className="h-4 w-4" />
              Bild hinzufügen
            </button>
          </div>
          {formData.additional_images.length > 0 && (
            <div className="space-y-3">
              {formData.additional_images.map((img, index) => (
                <div key={index} className="rounded border border-hero-border bg-slate-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-barlow font-bold text-sm text-gray-400">Bild {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(index)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-900/20 transition-colors"
                      title="Entfernen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="url"
                    value={img.url}
                    onChange={(e) => updateAdditionalImage(index, "url", e.target.value)}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white text-sm outline-none transition-all focus:border-accent-gold"
                    placeholder="https://example.com/image.jpg"
                  />
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) => updateAdditionalImage(index, "description", e.target.value)}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white text-sm outline-none transition-all focus:border-accent-gold"
                    placeholder="Kurze Beschreibung (optional)"
                  />
                </div>
              ))}
            </div>
          )}
          {formData.additional_images.length === 0 && (
            <p className="text-xs text-gray-500 font-libre italic">
              Keine zusätzlichen Bilder hinzugefügt. Klicke auf "Bild hinzufügen", um weitere Bilder mit Beschreibungen hinzuzufügen.
            </p>
          )}
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

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-hero-border/20">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
          >
            {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Eintrag erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}


