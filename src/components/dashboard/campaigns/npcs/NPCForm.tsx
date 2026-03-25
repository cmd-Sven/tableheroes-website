"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { createNPC, updateNPC, getNPCsByContext, searchAllNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { createSecret } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";
import { regenerateNPCSection, type RerollSection } from "@/src/app/dashboard/worlds/world-npc-actions";
import { generateNPC, generateNpcDetailsFromHook } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { NarrativeHook } from "@/src/types/npc";
import Image from "next/image";
import { Users, MapPin, UsersRound, Search, AlertCircle } from "lucide-react";
import { AIGenerationWizard } from "./AIGenerationWizard";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { CheckResultsEditor } from "./CheckResultsEditor";
import { suggestInferenceRelationsForTarget } from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import {
  DEFAULT_IMAGE_DISPLAY,
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";

type NPC = {
  id?: string;
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
  image_url: string | null;
  faction_id: string | null;
  current_location_id: string | null;
  home_location_id: string | null;
  narrative_hooks?: NarrativeHook[] | null;
};

type Props = {
  /** Kampagnen-Kontext (für Erstellen/Bearbeiten in Kampagne). */
  campaignId?: string;
  /** Welt-Kontext (GM-Zentrale: Erstellen/Bearbeiten nur mit world_id). */
  worldId?: string;
  initialData?: NPC | null;
  factions: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
  onSuccess?: () => void;
  onCreated?: (npcId: string) => void | Promise<void>;
  hookContext?: {
    sourceNPCName: string;
    hook: NarrativeHook;
  };
  /** Optionale Vorbelegung für die Rolle (z.B. \"Gott\" aus der World-Roadmap). */
  defaultRole?: string;
  /** Optionale Vorbelegung für current_location_id und home_location_id (z.B. von Orts-Detailseite). */
  defaultLocationId?: string;
  /** Optionale Vorbelegung Name/Fraktion/Beschreibung (z.B. von Fraktions-Detail „NPC anlegen“). */
  defaultName?: string;
  defaultFactionId?: string;
  defaultDescription?: string;
  /** Vorgeschlagenes Geheimnis aus dem KI-Wizard; wird beim Erstellen gespeichert, wenn campaignId gesetzt ist. */
  suggestedSecret?: { title: string; content: string } | null;
};

const NPC_STATUSES = [
  { value: "Alive", label: "🟢 Lebendig", color: "text-green-300" },
  { value: "Deceased", label: "🔴 Verstorben", color: "text-red-300" },
  { value: "Missing", label: "🟡 Vermisst", color: "text-yellow-300" },
  { value: "Unknown", label: "⚪ Unbekannt", color: "text-gray-300" },
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

export function NPCForm({ campaignId, worldId, initialData, hookContext, factions, locations, onSuccess, onCreated, defaultRole, defaultLocationId, defaultName, defaultFactionId, defaultDescription, suggestedSecret }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [rerollSection, setRerollSection] = useState<RerollSection | null>(null);
  const isEditMode = !!(initialData?.id && initialData.id.trim() !== "");
  const showAdvancedSections = isEditMode || !!hookContext || !!initialData;

  // Context NPCs State
  const [imageDisplay, setImageDisplay] = useState<ImageDisplaySettings>({ ...DEFAULT_IMAGE_DISPLAY });

  const [contextNPCs, setContextNPCs] = useState<{
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  } | null>(null);
  const [selectedContextNPCs, setSelectedContextNPCs] = useState<
    Array<{ npcId: string; relationType: string }>
  >([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    title: string;
    role: string;
    race: string;
    religions: string;
    deities: string;
    languages: string;
    status: string;
    alignment: string;
    description: string;
    appearance: string;
    personality_traits: string;
    gm_notes: string;
    image_url: string;
    faction_id: string;
    current_location_id: string;
    home_location_id: string;
    narrative_hooks: NarrativeHook[];
    is_secret_antagonist: boolean;
    hidden_agenda: string;
    true_nature: string;
    check_results: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }>;
  }>({
    name: defaultName ?? "",
    title: "",
    role: defaultRole || "",
    race: "",
    religions: "",
    deities: "",
    languages: "",
    status: "Alive",
    alignment: "",
    description: defaultDescription ?? "",
    appearance: "",
    personality_traits: "",
    gm_notes: "",
    image_url: "",
    faction_id: defaultFactionId ?? "",
    current_location_id: defaultLocationId ?? "",
    home_location_id: defaultLocationId ?? "",
    narrative_hooks: [],
    is_secret_antagonist: false,
    hidden_agenda: "",
    true_nature: "",
    check_results: [],
  });

  // Load context NPCs when location or faction changes
  useEffect(() => {
    if (!campaignId) {
      setContextNPCs(null);
      setSelectedContextNPCs([]);
      return;
    }
    if (!isEditMode && (formData.current_location_id || formData.faction_id)) {
      setIsLoadingContext(true);
      const loadContextNPCs = async () => {
        try {
          const context = await getNPCsByContext(
            campaignId,
            formData.current_location_id || null,
            formData.faction_id || null,
            initialData?.id || null
          );
          setContextNPCs(context);
        } catch (error) {
          console.error("Fehler beim Laden der Kontext-NPCs:", error);
          setContextNPCs({ sameLocation: [], nearbyLocations: [], sameFaction: [] });
        } finally {
          setIsLoadingContext(false);
        }
      };
      loadContextNPCs();
    } else {
      setContextNPCs(null);
      setSelectedContextNPCs([]);
    }
  }, [formData.current_location_id, formData.faction_id, campaignId, isEditMode]);

  // Sync state when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        title: initialData.title || "",
        role: initialData.role || "",
        race: initialData.race || "",
        religions: Array.isArray((initialData as any).religions) ? ((initialData as any).religions as string[]).join(", ") : "",
        deities: Array.isArray((initialData as any).deities) ? ((initialData as any).deities as string[]).join(", ") : "",
        languages: Array.isArray((initialData as any).languages) ? ((initialData as any).languages as string[]).join(", ") : "",
        status: initialData.status || "Alive",
        alignment: initialData.alignment || "",
        description: initialData.description || "",
        appearance: initialData.appearance || "",
        personality_traits: initialData.personality_traits || "",
        gm_notes: initialData.gm_notes || "",
        image_url: initialData.image_url || "",
        faction_id: initialData.faction_id || "",
        current_location_id: initialData.current_location_id || "",
        home_location_id: initialData.home_location_id || "",
        narrative_hooks: initialData.narrative_hooks || [],
        is_secret_antagonist: (initialData as any).is_secret_antagonist || false,
        hidden_agenda: (initialData as any).hidden_agenda || "",
        true_nature: (initialData as any).true_nature || "",
        check_results: (initialData as any).check_results || [],
      });
      setImageDisplay(normalizeImageDisplay((initialData as { image_display?: unknown }).image_display));
    } else {
      setFormData({
        name: "",
        title: "",
        role: "",
        race: "",
        religions: "",
        deities: "",
        languages: "",
        status: "Alive",
        alignment: "",
        description: "",
        appearance: "",
        personality_traits: "",
        gm_notes: "",
        image_url: "",
        faction_id: "",
        current_location_id: "",
        home_location_id: "",
        narrative_hooks: [],
        is_secret_antagonist: false,
        hidden_agenda: "",
        true_nature: "",
        check_results: [],
      });
      setImageDisplay({ ...DEFAULT_IMAGE_DISPLAY });
    }
  }, [initialData]);

  // handleAIGenerate wurde entfernt - jetzt wird der AIGenerationWizard verwendet

  const handleRerollSection = (section: RerollSection) => {
    if (!worldId) return;
    setRerollSection(section);
    regenerateNPCSection(worldId, section, {
      name: formData.name,
      role: formData.role || undefined,
      description: formData.description,
      appearance: formData.appearance,
      personality_traits: formData.personality_traits,
    })
      .then((result) => {
        if (result[section] != null) {
          setFormData((prev) => ({ ...prev, [section]: result[section]! }));
        }
      })
      .catch((e: any) => alert(e?.message || "Fehler beim Neugenerieren."))
      .finally(() => setRerollSection(null));
  };

  const handleFillDetailsFromHook = async () => {
    if (!hookContext) return;

    // Prüfe, ob ein Name eingegeben wurde (nicht leer und nicht "Unbekannt")
    const currentName = formData.name?.trim();
    if (!currentName || currentName.toLowerCase() === "unbekannt") {
      alert("Bitte geben Sie zuerst einen Namen für den NPC ein (nicht 'Unbekannt'), bevor Sie die Details mit KI füllen.");
      return;
    }
    if (!campaignId) {
      alert("Kampagne erforderlich für KI-Generierung.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateNpcDetailsFromHook(
        campaignId,
        hookContext.sourceNPCName,
        hookContext.hook,
        currentName // Übergib den aktuellen Namen aus dem Formular
      );

      // WICHTIG: Setze explizit die Rolle aus dem Hook
      // WICHTIG: Initialisiere description mit Hook-Text + KI-Details
      setFormData((prev) => {
        // Basis-Text aus Hook (kann bereits im initialData vorhanden sein)
        const hookBaseText = `${hookContext.hook.role} von ${hookContext.sourceNPCName}. ${hookContext.hook.description}`;
        
        // Prüfe, ob description bereits den Hook-Text enthält
        const hasHookText = prev.description && prev.description.includes(hookContext.hook.description);
        
        // Kombiniere: Hook-Text (falls noch nicht vorhanden) + KI-Details
        let newDescription = prev.description || hookBaseText;
        if (result.description) {
          // Wenn Hook-Text bereits vorhanden, füge KI-Details hinzu
          if (hasHookText) {
            newDescription = `${prev.description}\n\n${result.description}`;
          } else {
            // Wenn noch kein Hook-Text, füge beides hinzu
            newDescription = `${hookBaseText}\n\n${result.description}`;
          }
        } else if (!prev.description) {
          // Fallback: Nur Hook-Text, wenn noch nichts vorhanden
          newDescription = hookBaseText;
        }

        return {
          ...prev,
          // Rolle aus Hook übernehmen (z.B. "Heilerin") - IMMER setzen
          role: hookContext.hook.role || prev.role,
          // Aussehen von KI generieren (nur wenn noch leer)
          appearance: result.appearance || prev.appearance,
          // Persönlichkeit von KI generieren (nur wenn noch leer)
          personality_traits: result.personality_traits || prev.personality_traits,
          // Description: Hook-Text + KI-Details
          description: newDescription,
        };
      });
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler beim KI-Details-Generieren.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        // Normalize empty strings to null for foreign keys
        // WICHTIG: Trim whitespace und konvertiere leere Strings zu null
        const normalizedFactionId = formData.faction_id && String(formData.faction_id).trim() !== "" 
          ? String(formData.faction_id).trim() 
          : null;
        const normalizedCurrentLocationId = formData.current_location_id && String(formData.current_location_id).trim() !== "" 
          ? String(formData.current_location_id).trim() 
          : null;
        const normalizedHomeLocationId = formData.home_location_id && String(formData.home_location_id).trim() !== "" 
          ? String(formData.home_location_id).trim() 
          : null;

        console.log("🔍 [NPCForm] Form submission:", {
          original_current_location_id: formData.current_location_id,
          normalized_current_location_id: normalizedCurrentLocationId,
          original_home_location_id: formData.home_location_id,
          normalized_home_location_id: normalizedHomeLocationId,
        });

        const payload: any = {
          name: formData.name,
          title: formData.title || undefined,
          role: formData.role || undefined,
          race: formData.race || undefined,
          religions: formData.religions
            ? formData.religions.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
            : undefined,
          deities: formData.deities
            ? formData.deities.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
            : undefined,
          languages: formData.languages
            ? formData.languages.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
            : undefined,
          status: formData.status || "Alive",
          alignment: formData.alignment || undefined,
          description: formData.description || undefined,
          appearance: formData.appearance || undefined,
          personality_traits: formData.personality_traits || undefined,
          gm_notes: formData.gm_notes || undefined,
          image_url: formData.image_url || undefined,
          image_display: formData.image_url.trim()
            ? normalizeImageDisplay(imageDisplay)
            : null,
          faction_id: normalizedFactionId,
          current_location_id: normalizedCurrentLocationId,
          home_location_id: normalizedHomeLocationId,
          narrative_hooks: formData.narrative_hooks && formData.narrative_hooks.length > 0 ? formData.narrative_hooks : undefined,
          is_secret_antagonist: formData.is_secret_antagonist,
          hidden_agenda: formData.hidden_agenda || undefined,
          true_nature: formData.true_nature || undefined,
          check_results: formData.check_results && formData.check_results.length > 0 ? formData.check_results : undefined,
        };

        if (isEditMode && initialData?.id && initialData.id.trim() !== "") {
          await updateNPC(initialData.id, payload);
          
          if (onSuccess) {
            onSuccess();
          } else if (worldId) {
            router.push(`/dashboard/worlds/${worldId}/npcs`);
            router.refresh();
          } else if (campaignId) {
            router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
            router.refresh();
          }
        } else {
          const createPayload: any = {
            ...payload,
          };
          if (worldId) {
            createPayload.world_id = worldId;
          } else if (campaignId) {
            createPayload.campaign_id = campaignId;
          }

          const createdNPC = await createNPC(createPayload);

          if (createdNPC?.id && onCreated) {
            await onCreated(createdNPC.id);
          }

          if (createdNPC?.id && campaignId && suggestedSecret?.content?.trim()) {
            try {
              await createSecret(
                campaignId,
                createdNPC.id,
                "npc",
                suggestedSecret.content.trim(),
                suggestedSecret.title?.trim() || undefined
              );
            } catch (secretErr: any) {
              console.warn("Optionales Geheimnis konnte nicht angelegt werden:", secretErr?.message);
            }
          }

          if (onSuccess) {
            onSuccess();
          } else if (worldId) {
            router.push(`/dashboard/worlds/${worldId}/npcs`);
            router.refresh();
          } else if (campaignId) {
            router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
            router.refresh();
          }
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
        <div className="mb-6">
          <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant mb-6">
            {isEditMode ? "NPC bearbeiten" : "Neuen NPC erstellen"}
          </h1>
          
          {/* Prominenter KI-Button (nur im Kampagnen-Kontext, Create-Modus ohne Hook) */}
          {!isEditMode && !hookContext && campaignId && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                disabled={isGenerating || isPending}
                className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-hero-vibrant bg-hero-vibrant px-8 py-4 font-barlow font-bold text-lg uppercase text-black transition-all hover:bg-yellow-400 hover:shadow-lg hover:shadow-hero-vibrant/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-6 w-6" />
                ✨ MIT KI ERSTELLEN
              </button>
            </div>
          )}

          {/* Details mit KI aus Hook-Kontext füllen */}
          {hookContext && !isEditMode && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleFillDetailsFromHook}
                disabled={
                  isGenerating || 
                  isPending || 
                  !formData.name?.trim() || 
                  formData.name.trim().toLowerCase() === "unbekannt"
                }
                className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-hero-vibrant bg-hero-vibrant px-8 py-4 font-barlow font-bold text-lg uppercase text-black transition-all hover:bg-yellow-400 hover:shadow-lg hover:shadow-hero-vibrant/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !formData.name?.trim() || formData.name.trim().toLowerCase() === "unbekannt"
                    ? "Bitte geben Sie zuerst einen Namen ein (nicht 'Unbekannt')"
                    : "Details mit KI aus Hook-Kontext füllen"
                }
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Fülle Details...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6" />
                    Details mit KI füllen
                  </>
                )}
              </button>
            </div>
          )}

          {/* Trennung: "ODER MANUELL ANLEGEN" (nur im Create-Modus) */}
          {!isEditMode && (
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-hero-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background-dark px-4 font-barlow font-semibold text-sm uppercase text-gray-400">
                  ODER MANUELL ANLEGEN
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Name & Race */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Name des NPCs *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold"
              placeholder="z.B. Gundren Steinfaust"
            />
          </div>

          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Rasse
            </label>
            <input
              type="text"
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              placeholder="z.B. Mensch, Zwerg, Elf"
            />
          </div>
        </div>

        {/* Role & Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Rolle / Titel
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              placeholder="z.B. Magister der Energie, Schmied"
            />
          </div>

          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              {NPC_STATUSES.map((status) => (
                <option key={status.value} value={status.value} className={status.color}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Faction */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Zugehörigkeit / Fraktion
          </label>
          <select
            value={formData.faction_id}
            onChange={(e) => setFormData({ ...formData, faction_id: e.target.value })}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
          >
            <option value="">-- Keine Fraktion --</option>
            {factions.map((faction) => (
              <option key={faction.id} value={faction.id}>
                {faction.name}
              </option>
            ))}
          </select>
        </div>

        {/* Aktueller Aufenthaltsort (nur im Create-Modus, im Edit-Modus beide Orte zeigen) */}
        {isEditMode ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Heimatort / Wohnsitz
              </label>
              <select
                value={formData.home_location_id}
                onChange={(e) => setFormData({ ...formData, home_location_id: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                <option value="">-- Kein Heimatort --</option>
                {locations
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Aktueller Aufenthaltsort
              </label>
              <select
                value={formData.current_location_id}
                onChange={(e) => setFormData({ ...formData, current_location_id: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                <option value="">-- Kein Ort --</option>
                {locations
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Aktueller Aufenthaltsort
            </label>
            <select
              value={formData.current_location_id}
              onChange={(e) => setFormData({ ...formData, current_location_id: e.target.value })}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
            >
              <option value="">-- Kein Ort --</option>
              {locations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Context NPCs Widget (nur im Create-Modus) */}
        {!isEditMode && (contextNPCs || isLoadingContext) && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6">
            {isLoadingContext ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
                <span className="ml-3 font-libre text-gray-400">Lade mögliche Kontakte...</span>
              </div>
            ) : contextNPCs && (
              <ContextNPCsWidget
                campaignId={campaignId ?? ""}
                contextNPCs={contextNPCs}
                selectedContextNPCs={selectedContextNPCs}
                onSelectNPC={(npcId, relationType) => {
                  setSelectedContextNPCs((prev) => {
                    const existing = prev.findIndex((s) => s.npcId === npcId);
                    if (existing >= 0) {
                      if (relationType) {
                        // Update relation type
                        const updated = [...prev];
                        updated[existing] = { npcId, relationType };
                        return updated;
                      } else {
                        // Remove
                        return prev.filter((s) => s.npcId !== npcId);
                      }
                    } else if (relationType) {
                      // Add new
                      return [...prev, { npcId, relationType }];
                    }
                    return prev;
                  });
                }}
              />
            )}
          </div>
        )}

        {/* Erweiterte Felder (Edit- & KI-Modus) */}
        {showAdvancedSections && (
          <>
            {/* Alignment & Image URL */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Gesinnung / Alignment
                </label>
                <select
                  value={formData.alignment}
                  onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                >
                  <option value="">-- Keine Gesinnung --</option>
                  {ALIGNMENTS.map((alignment) => (
                    <option key={alignment} value={alignment}>
                      {alignment}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Bild URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.image_url.trim() ? (
                  <div className="mt-3">
                    <ImageUrlDisplayEditor
                      value={imageDisplay}
                      onChange={setImageDisplay}
                      previewUrl={formData.image_url}
                      previewAspectClassName="aspect-[3/4] max-w-[220px]"
                    />
                  </div>
                ) : null}
              </div>
            </div>

                {worldId && !isEditMode && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-barlow font-bold text-xs uppercase text-gray-500 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent-gold" />
                  Sektion neu generieren:
                </span>
                {(["appearance", "personality_traits", "description"] as const).map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => handleRerollSection(section)}
                    disabled={!!rerollSection}
                    className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow font-bold text-xs uppercase text-gray-400 hover:text-accent-gold hover:border-accent-gold/50 disabled:opacity-50"
                  >
                    {rerollSection === section ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {section === "appearance" ? "Aussehen" : section === "personality_traits" ? "Persönlichkeit" : "Beschreibung"}
                  </button>
                ))}
              </div>
            )}

                <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Aussehen
                </label>
                <textarea
                  value={formData.appearance}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  rows={4}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="Beschreibung des Aussehens..."
                />
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Persönlichkeit
                </label>
                <textarea
                  value={formData.personality_traits}
                  onChange={(e) => setFormData({ ...formData, personality_traits: e.target.value })}
                  rows={4}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="Charaktereigenschaften, Verhalten..."
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blue">
                Beschreibung (Spieler-sichtbar)
              </label>
              <MarkdownEditor
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                minHeight="min-h-[400px]"
                placeholder="Eine kurze Beschreibung, die Spieler sehen können. Markdown: **fett**, *kursiv*, Listen, Überschriften, Zitate."
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
                placeholder="Interne Notizen, Motivationen, Geheimnisse..."
              />
            </div>

            {/* Spieler-Notizen: pro Kampagne auf der NPC-Detailseite (campaign_notes) */}

            {/* Spielleiter-Geheimnisse Sektion */}
            <div className="rounded-lg border-2 border-accent-blood/50 bg-slate-900/80 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-accent-blood/30">
                <AlertCircle className="h-5 w-5 text-accent-blood" />
                <h3 className="font-barlow font-bold text-lg uppercase text-accent-blood">
                  🔒 Spielleiter-Geheimnisse
                </h3>
              </div>

              {/* Secret Antagonist Toggle */}
              <div className="flex items-center gap-3 rounded border border-accent-blood/30 bg-slate-800/50 p-4">
                <input
                  type="checkbox"
                  id="is_secret_antagonist"
                  checked={formData.is_secret_antagonist}
                  onChange={(e) => setFormData({ ...formData, is_secret_antagonist: e.target.checked })}
                  className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-accent-blood focus:ring-2 focus:ring-accent-blood cursor-pointer"
                />
                <label htmlFor="is_secret_antagonist" className="font-libre text-sm text-gray-300 cursor-pointer select-none">
                  Geheimer Antagonist (NPC versteckt seine wahre Natur)
                </label>
              </div>

              {/* Hidden Agenda */}
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blood">
                  Versteckte Agenda
                </label>
                <textarea
                  value={formData.hidden_agenda}
                  onChange={(e) => setFormData({ ...formData, hidden_agenda: e.target.value })}
                  rows={3}
                  className="w-full rounded border-2 border-accent-blood/50 bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-blood resize-none"
                  placeholder="Was ist die versteckte Agenda des NPCs? Was will er wirklich erreichen?"
                />
              </div>

              {/* True Nature */}
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-blood">
                  Wahre Natur (Interne Persönlichkeit)
                </label>
                <textarea
                  value={formData.true_nature}
                  onChange={(e) => setFormData({ ...formData, true_nature: e.target.value })}
                  rows={4}
                  className="w-full rounded border-2 border-accent-blood/50 bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-blood resize-none"
                  placeholder="Die wahre, interne Persönlichkeit des NPCs (nur für GM sichtbar). Wie verhält er sich wirklich, wenn niemand zusieht?"
                />
                <p className="mt-2 text-xs text-gray-400 font-libre italic">
                  Diese Information wird nur für den Spielleiter angezeigt und kann von der KI verwendet werden, um konsistente Verhaltensweisen zu generieren.
                </p>
              </div>
            </div>

            {/* Ergebnisse für Spielerproben – was Spieler bei Würfen über den NPC entdecken */}
            <CheckResultsEditor
              checkResults={formData.check_results}
              onChange={(results) => setFormData({ ...formData, check_results: results })}
              isGM={true}
            />
          </>
        )}

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
            {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "NPC erstellen"}
          </button>
        </div>
      </form>

      {/* AI Generation Wizard (nur mit campaignId) */}
      {showWizard && campaignId && (
        <AIGenerationWizard
          campaignId={campaignId}
          factions={factions}
          locations={locations}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            if (onSuccess) {
              onSuccess();
            } else if (worldId) {
              router.push(`/dashboard/worlds/${worldId}/npcs`);
              router.refresh();
            } else {
              router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}

// Context NPCs Widget Component (exported for use in AIGenerationWizard)
export type InferenceSuggestion = {
  targetNpcId: string;
  relationType: string;
  reason: string;
  targetName: string;
};

export type ContextNPCsWidgetProps = {
  campaignId: string;
  contextNPCs: {
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  };
  selectedContextNPCs: Array<{ npcId: string; relationType: string }>;
  onSelectNPC: (npcId: string, relationType: string | null) => void;
  onInferenceSuggestionsChange?: (suggestions: Record<string, InferenceSuggestion[]>) => void;
  onSelectedSuggestionsChange?: (selected: Set<string>) => void;
  selectedFactionId?: string | null;
  factionRelationship?: string;
};

const RELATION_TYPES = [
  "Nachbar",
  "Rivale",
  "Vorgesetzter",
  "Untergebener",
  "Freund",
  "Feind",
  "Kollege",
  "Mentor",
  "Schüler",
  "Familienmitglied",
  "Vater",
  "Mutter",
  "Sohn",
  "Tochter",
  "Bruder",
  "Schwester",
  "Ehepartner",
  "Schwiegereltern",
  "Schwiegerkind",
  "Schwager/Schwägerin",
  "Geschäftspartner",
  "Andere",
];

export function ContextNPCsWidget({
  campaignId,
  contextNPCs,
  selectedContextNPCs,
  onSelectNPC,
  onInferenceSuggestionsChange,
  onSelectedSuggestionsChange,
  selectedFactionId,
  factionRelationship,
}: ContextNPCsWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allNPCs, setAllNPCs] = useState<Array<{
    id: string;
    name: string;
    image_url: string | null;
    role: string | null;
    location_name: string | null;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllNPCs, setShowAllNPCs] = useState(false);

  const hasAnyNPCs =
    contextNPCs.sameLocation.length > 0 ||
    contextNPCs.nearbyLocations.length > 0 ||
    contextNPCs.sameFaction.length > 0;

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAllNPCs([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAllNPCs(campaignId, searchQuery);
        setAllNPCs(results);
        setShowAllNPCs(true);
      } catch (error) {
        console.error("Fehler bei der NPC-Suche:", error);
        setAllNPCs([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, campaignId]);

  // State für Vorschläge: key = npcId, value = Array von Vorschlägen
  const [inferenceSuggestions, setInferenceSuggestions] = useState<Record<string, InferenceSuggestion[]>>({});
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<Record<string, boolean>>({});

  const getRelationType = (npcId: string) => {
    return selectedContextNPCs.find((s) => s.npcId === npcId)?.relationType || null;
  };

  // Lade Vorschläge, wenn ein Relationstyp gewählt wird
  useEffect(() => {
    const loadSuggestions = async () => {
      const newSuggestions: Record<string, InferenceSuggestion[]> = {};
      const loadingStates: Record<string, boolean> = {};

      for (const selected of selectedContextNPCs) {
        if (selected.relationType && selected.relationType !== "Andere") {
          loadingStates[selected.npcId] = true;
          try {
            const suggestions = await suggestInferenceRelationsForTarget(
              campaignId,
              selected.npcId,
              selected.relationType
            );
            if (suggestions.length > 0) {
              newSuggestions[selected.npcId] = suggestions;
              // Standardmäßig alle Vorschläge aktivieren
              suggestions.forEach((s) => {
                const key = `${selected.npcId}-${s.targetNpcId}`;
                setSelectedSuggestions((prev) => {
                  const next = new Set(prev).add(key);
                  if (onSelectedSuggestionsChange) {
                    onSelectedSuggestionsChange(next);
                  }
                  return next;
                });
              });
            }
          } catch (error) {
            console.error("Fehler beim Laden der Vorschläge:", error);
          } finally {
            loadingStates[selected.npcId] = false;
          }
        }
      }

      setInferenceSuggestions(newSuggestions);
      setIsLoadingSuggestions(loadingStates);
      
      // Benachrichtige Parent über Änderungen
      if (onInferenceSuggestionsChange) {
        onInferenceSuggestionsChange(newSuggestions);
      }
    };

    loadSuggestions();
  }, [selectedContextNPCs, campaignId, onInferenceSuggestionsChange]);

  const toggleSuggestion = (npcId: string, targetNpcId: string) => {
    const key = `${npcId}-${targetNpcId}`;
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // Benachrichtige Parent über Änderungen
      if (onSelectedSuggestionsChange) {
        onSelectedSuggestionsChange(next);
      }
      return next;
    });
  };

  const getGroupBadge = (group: "sameLocation" | "nearbyLocations" | "sameFaction") => {
    switch (group) {
      case "sameLocation":
        return { icon: "📍", label: "Ort", color: "bg-blue-900/30 text-blue-300 border-blue-700" };
      case "nearbyLocations":
        return { icon: "🗺️", label: "Umgebung", color: "bg-purple-900/30 text-purple-300 border-purple-700" };
      case "sameFaction":
        return { icon: "🛡️", label: "Fraktion", color: "bg-amber-900/30 text-amber-300 border-amber-700" };
    }
  };

  const renderNPCCard = (
    npc: { id: string; name: string; image_url: string | null; role: string | null; location_name?: string | null },
    group: "sameLocation" | "nearbyLocations" | "sameFaction"
  ) => {
    const isSelected = selectedContextNPCs.some((s) => s.npcId === npc.id);
    const currentRelation = getRelationType(npc.id);
    const badge = getGroupBadge(group);
    const selectRef = useRef<HTMLSelectElement>(null);

    const handleAddNPC = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Inferenz-Logik für Feinde: Wenn Fraktion feindlich ist, schlage "Feind" vor
      let suggestedType = "Andere";
      if (factionRelationship === "Feindlich" && group === "sameFaction") {
        // Wenn die ausgewählte Fraktion feindlich ist und der NPC zur gleichen Fraktion gehört, ist er ein Feind
        suggestedType = "Feind";
      } else if (factionRelationship === "Feindlich" && selectedFactionId) {
        // Wenn die ausgewählte Fraktion feindlich ist, schlage "Feind" vor
        suggestedType = "Feind";
      }
      onSelectNPC(npc.id, suggestedType);
      // Focus dropdown after a short delay to ensure it's rendered
      setTimeout(() => {
        selectRef.current?.focus();
      }, 100);
    };

    const handleRemoveNPC = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectNPC(npc.id, null);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectNPC(npc.id, e.target.value || null);
    };

    const handleSelectClick = (e: React.MouseEvent<HTMLSelectElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevent card clicks from bubbling up
      e.stopPropagation();
    };

    return (
      <div
        key={npc.id}
        onClick={handleCardClick}
        className={`group relative flex h-full flex-col rounded-lg border-2 border-[#704214] bg-[#f4e4bc] text-black p-3 text-sm transition-transform hover:scale-102 ${
          isSelected
            ? "border-hero-vibrant shadow-lg shadow-hero-vibrant/20"
            : ""
        }`}
      >
        <div className="flex flex-1 flex-col gap-3">
          {/* Header: Avatar + Name + Badge */}
          <div className="flex items-start gap-4">
            {npc.image_url ? (
              <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border-2 border-[#704214]">
                <Image
                  src={npc.image_url}
                  alt={npc.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-lg bg-[#e8d5b7] flex items-center justify-center border-2 border-[#704214]">
                <Users className="h-10 w-10 text-[#704214]" />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-cinzel font-semibold text-lg text-black mb-1 wrap-break-word">
                    {npc.name}
                    {(npc as any).location_name && (group as string) === "all" && (
                      <span className="ml-2 font-libre text-sm font-normal text-gray-600">
                        ({(npc as any).location_name})
                      </span>
                    )}
                  </h4>
                  {npc.role && (
                    <p className="font-libre text-sm text-gray-700 mb-2 wrap-break-word">
                      {npc.role}
                    </p>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-barlow font-semibold border ${badge.color}`}>
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                </div>
                <a
                  href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-2 rounded hover:bg-gray-100 transition-colors"
                  title="NPC-Profil in neuem Tab öffnen"
                >
                  <Search className="h-4 w-4 text-gray-600" />
                </a>
              </div>
            </div>
          </div>

          {/* Relation Dropdown (wenn ausgewählt) */}
          {isSelected && (
            <div className="pt-2 border-t border-[#704214] space-y-3">
              <div>
                  <label className="block mb-2 font-barlow font-bold text-xs uppercase text-black">
                    Beziehungstyp:
                  </label>
                <select
                  ref={selectRef}
                  value={currentRelation || ""}
                  onChange={handleSelectChange}
                  onClick={handleSelectClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full rounded border-2 border-[#704214] bg-white text-black px-3 py-2.5 text-sm font-libre outline-none focus:border-hero-vibrant focus:ring-2 focus:ring-hero-vibrant/20 transition-all cursor-pointer"
                >
                  <option value="">Beziehung wählen...</option>
                  {RELATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vorschläge für transitive Beziehungen */}
              {isLoadingSuggestions[npc.id] && (
                <div className="flex items-center gap-2 text-xs text-black">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Lade Vorschläge...</span>
                </div>
              )}

              {!isLoadingSuggestions[npc.id] && inferenceSuggestions[npc.id] && inferenceSuggestions[npc.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#704214]">
                  <label className="block mb-2 font-barlow font-bold text-xs uppercase text-black">
                    💡 Vorgeschlagene automatische Verknüpfungen:
                  </label>
                  <div className="space-y-2">
                    {inferenceSuggestions[npc.id].map((suggestion) => {
                      const key = `${npc.id}-${suggestion.targetNpcId}`;
                      const isChecked = selectedSuggestions.has(key);
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer hover:bg-[#e8d5b7] p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSuggestion(npc.id, suggestion.targetNpcId)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-[#704214] bg-white text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-libre text-sm text-black">
                              <span className="font-semibold">{suggestion.targetName}</span>
                              {" als "}
                              <span className="font-semibold">{suggestion.relationType}</span>
                              {" verknüpfen"}
                            </span>
                            <p className="text-xs text-[#704214] mt-0.5 italic">{suggestion.reason}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={isSelected ? handleRemoveNPC : handleAddNPC}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-lg font-bold transition-all ${
                isSelected
                  ? "border-red-800 bg-red-900/60 text-red-200 hover:bg-red-900/80"
                  : "border-hero-vibrant/60 bg-hero-vibrant/15 text-hero-vibrant hover:bg-hero-vibrant/30"
              }`}
              aria-label={isSelected ? "Beziehung entfernen" : "Beziehung hinzufügen"}
            >
              {isSelected ? "✕" : "+"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border-2 border-hero-border bg-background-card p-6 shadow-lg">
      <div className="mb-6">
        <h3 className="font-barlow font-semibold text-2xl text-accent-blood border-b-2 border-hero-border pb-3 mb-3">
          Mögliche Kontakte im Umfeld
        </h3>
        <p className="font-libre text-sm text-gray-300 leading-relaxed mb-4">
          Wähle NPCs aus, die als Kontext für die KI-Generierung verwendet werden sollen. Die KI wird diese Beziehungen bei der Erstellung des neuen NPCs berücksichtigen.
        </p>
        
        {/* Suchfeld für globale NPC-Suche */}
        <div className="mb-4">
          <label className="block mb-2 font-barlow font-bold text-sm uppercase text-accent-gold">
            🔍 NPC nach Namen suchen (alle Kampagnen-NPCs)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="NPC nach Namen suchen..."
              className="w-full pl-10 pr-4 py-3 rounded border-2 border-hero-border bg-slate-900/80 text-white font-libre outline-none transition-all focus:border-accent-gold"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Am selben Ort */}
        {contextNPCs.sameLocation.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-hero-border/50">
              <MapPin className="h-6 w-6 text-blue-400" />
              <h4 className="font-cinzel font-bold text-xl text-accent-gold">
                Am selben Ort
              </h4>
              <span className="ml-auto font-barlow font-semibold text-sm text-gray-400">
                {contextNPCs.sameLocation.length} {contextNPCs.sameLocation.length === 1 ? "NPC" : "NPCs"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contextNPCs.sameLocation.map((npc: any) =>
                renderNPCCard(npc, "sameLocation")
              )}
            </div>
          </div>
        )}

        {/* In der Umgebung */}
        {contextNPCs.nearbyLocations.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-hero-border/50">
              <MapPin className="h-6 w-6 text-purple-400" />
              <h4 className="font-cinzel font-bold text-xl text-accent-gold">
                In der Umgebung
              </h4>
              <span className="ml-auto font-barlow font-semibold text-sm text-gray-400">
                {contextNPCs.nearbyLocations.length} {contextNPCs.nearbyLocations.length === 1 ? "NPC" : "NPCs"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contextNPCs.nearbyLocations.map((npc: any) =>
                renderNPCCard(npc, "nearbyLocations")
              )}
            </div>
          </div>
        )}

        {/* In der gleichen Fraktion */}
        {contextNPCs.sameFaction.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-hero-border/50">
              <UsersRound className="h-6 w-6 text-amber-400" />
              <h4 className="font-cinzel font-bold text-xl text-accent-gold">
                In der gleichen Fraktion
              </h4>
              <span className="ml-auto font-barlow font-semibold text-sm text-gray-400">
                {contextNPCs.sameFaction.length} {contextNPCs.sameFaction.length === 1 ? "NPC" : "NPCs"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contextNPCs.sameFaction.map((npc: any) =>
                renderNPCCard(npc, "sameFaction")
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

