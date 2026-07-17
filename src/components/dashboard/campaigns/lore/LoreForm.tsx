"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { createLoreEntry, updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { generateLore } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { LOCATION_TYPES, LORE_TYPES, isLocationType } from "@/src/lib/lore-types";
import { StoriesAndLegendsEditor } from "./StoriesAndLegendsEditor";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import {
  DEFAULT_IMAGE_DISPLAY,
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import { buildNpcPortraitMeta } from "@/src/lib/npc-portrait-meta";
import { uploadLoreImage } from "@/src/lib/profile-media";
import { LoreMainImageField } from "./LoreMainImageField";
import { getDeitiesByWorld, saveDeityFromLore, type DeityRelationshipInput } from "@/src/app/dashboard/worlds/deity-actions";
import { saveReligionFromLore, type ReligionHolidayInput, type ReligionImportantFigureInput } from "@/src/app/dashboard/worlds/religion-actions";
import { markChronicleInboxItemImported } from "@/src/app/dashboard/campaigns/[id]/chronicle-inbox-actions";
import type { ChronicleImportRef } from "@/src/lib/session-chronicle/chronicle-import-types";

type AdditionalImage = {
  url: string;
  description: string;
  display?: ImageDisplaySettings;
};

type StorySection = { dc: number; skill: string; content: string; is_revealed: boolean };

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  image_url: string | null;
  image_display?: unknown;
  image_is_ai_generated?: boolean | null;
  image_upload_rights_confirmed?: boolean | null;
  additional_images?: AdditionalImage[] | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  stories_and_legends?: StorySection[] | null;
  // Verknüpfungen (nur für World-Lore relevant)
  religion_ids?: string[] | null;
  language_ids?: string[] | null;
  race_ids?: string[] | null;
  culture_id?: string | null;
  race_subtypes?: string | null;
  race_traits?: string | null;
};

type Props = {
  campaignId?: string;
  worldId?: string;
  initialData?: LoreEntry | null;
  parentOptions: Array<{ id: string; name: string; type: string }>;
  /** Optionen für Religion/Sprache/Kultur-Dropdowns (z.B. bei Orten). Falls nicht gesetzt, wird parentOptions verwendet. */
  religionLanguageCultureOptions?: Array<{ id: string; name: string; type: string }>;
  world?: { id: string; name: string } | null;
  createMode?: "location" | "lore";
  initialParentId?: string;
  initialType?: string;
  /** Vorbelegter Name (z. B. aus einem Weltenbau-Task) */
  initialName?: string;
  /** Vorbelegte Beschreibung (z. B. Session-Chronist) */
  initialDescription?: string;
  /** Nach Session-Chronist-Import: Vorschlag als importiert markieren */
  chronicleImport?: ChronicleImportRef;
  /** Vorbelegte Gottheitsdaten beim Bearbeiten einer bestehenden Gottheit */
  initialDeityFields?: {
    epithet?: string | null;
    symbol_description?: string | null;
    symbol_image_url?: string | null;
    domain?: string | null;
    dark_side?: string | null;
  } | null;
  /** Vorbelegte Gottheit für eine Religion (deity_id aus religions) */
  initialReligionDeityId?: string | null;
  onSuccess?: () => void;
  successRedirectHref?: string;
};

export function LoreForm({
  campaignId,
  worldId,
  initialData,
  parentOptions,
  religionLanguageCultureOptions,
  world,
  createMode,
  initialParentId,
  initialType,
  initialName,
  initialDescription,
  initialDeityFields,
  chronicleImport,
  onSuccess,
  successRedirectHref,
}: Props) {
  const router = useRouter();
  const rlcOptions = religionLanguageCultureOptions ?? parentOptions;
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [deityFields, setDeityFields] = useState({
    epithet: "",
    symbol_description: "",
    symbol_image_url: "",
    domain: "",
    dark_side: "",
  });
  const [deityRelations, setDeityRelations] = useState<DeityRelationshipInput[]>([]);
  const [availableDeities, setAvailableDeities] = useState<Array<{ id: string; name: string; epithet: string | null }>>([]);
  const [religionFields, setReligionFields] = useState({
    interpretation: "",
    priest_title: "",
    cleric_title: "",
    paladin_title: "",
    order_notes: "",
    magic_relation: "",
    relics: "",
  });
  const [religionHolidays, setReligionHolidays] = useState<ReligionHolidayInput[]>([]);
  const [religionFigures, setReligionFigures] = useState<ReligionImportantFigureInput[]>([]);
  const [selectedReligionIds, setSelectedReligionIds] = useState<string[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [selectedRaceIds, setSelectedRaceIds] = useState<string[]>([]);
  const [selectedCultureId, setSelectedCultureId] = useState<string | null>(null);
  const [selectedDeityId, setSelectedDeityId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
  const [urlRightsConfirmed, setUrlRightsConfirmed] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  
  const isEditMode = !!initialData;
  const isLocation = createMode === "location" || (initialData && isLocationType(initialData.type));
  const typeOptions = (createMode === "location" || (initialData && isLocationType(initialData.type)))
    ? [...LOCATION_TYPES]
    : [...LORE_TYPES];
  const WORLD_ROOT_VALUE = "__WORLD_ROOT__";
  const defaultType = createMode === "location" ? "Ort" : "Kultur";
  const resolvedType = initialType && (createMode === "location" ? (LOCATION_TYPES as readonly string[]).includes(initialType) : (LORE_TYPES as readonly string[]).includes(initialType))
    ? initialType
    : defaultType;

  const [formData, setFormData] = useState({
    name: initialName || "",
    type: resolvedType,
    parent_id: (initialParentId || WORLD_ROOT_VALUE) as string | null,
    image_url: "",
    image_display: { ...DEFAULT_IMAGE_DISPLAY } as ImageDisplaySettings,
    additional_images: [] as AdditionalImage[],
    description: initialDescription || "",
    gm_notes: "",
    stories_and_legends: [] as StorySection[],
    race_subtypes: "",
    race_traits: "",
  });

  useEffect(() => {
    if (initialData) {
      const parentId = initialData.parent_id === null ? WORLD_ROOT_VALUE : initialData.parent_id;
      setFormData({
        name: initialData.name || "",
        type: initialData.type || defaultType,
        parent_id: parentId,
        image_url: initialData.image_url || "",
        additional_images: (initialData.additional_images || []).map((img) => ({
          url: img.url,
          description: img.description,
          display: normalizeImageDisplay((img as AdditionalImage).display ?? null),
        })),
        image_display: normalizeImageDisplay(initialData.image_display ?? null),
        description: initialData.description || "",
        gm_notes: initialData.gm_notes || "",
        stories_and_legends: initialData.stories_and_legends || [],
        race_subtypes: initialData.race_subtypes || "",
        race_traits: initialData.race_traits || "",
      });
      setSelectedReligionIds(initialData.religion_ids || []);
      setSelectedLanguageIds(initialData.language_ids || []);
      setSelectedRaceIds(initialData.race_ids || []);
      setSelectedCultureId(initialData.culture_id || null);
      setImageFile(null);
      setUploadRightsConfirmed(false);
      setUrlRightsConfirmed(initialData.image_upload_rights_confirmed === true);
      setIsAiGenerated(initialData.image_is_ai_generated === true);
      // Falls wir eine bestehende Gottheit bearbeiten, Felder aus deities-Tabelle übernehmen
      if (initialData.type === "Gottheit" && initialDeityFields) {
        setDeityFields({
          epithet: initialDeityFields.epithet ?? "",
          symbol_description: initialDeityFields.symbol_description ?? "",
          symbol_image_url: initialDeityFields.symbol_image_url ?? "",
          domain: initialDeityFields.domain ?? "",
          dark_side: initialDeityFields.dark_side ?? "",
        });
      }
      if (initialData.type === "Religion" && initialDeityFields === null) {
        // Religionen bekommen ihre Gottheit aus initialReligionDeityId
        // (kommt aus der Tabelle religions.deity_id)
      }
    } else {
      setFormData({
        name: initialName || "",
        type: resolvedType,
        parent_id: initialParentId || WORLD_ROOT_VALUE,
        image_url: "",
        additional_images: [],
        description: "",
        gm_notes: "",
        stories_and_legends: [],
        race_subtypes: "",
        race_traits: "",
        image_display: { ...DEFAULT_IMAGE_DISPLAY },
      });
      setSelectedReligionIds([]);
      setSelectedLanguageIds([]);
      setSelectedRaceIds([]);
      setSelectedCultureId(null);
      setSelectedDeityId(null);
      setImageFile(null);
      setUploadRightsConfirmed(false);
      setUrlRightsConfirmed(false);
      setIsAiGenerated(false);
    }
  }, [initialData, defaultType, resolvedType, initialParentId, initialDeityFields]);

  // Initial deity selection für Religionen (z. B. aus URL-Parametern oder bestehender Zuordnung)
  useEffect(() => {
    if (initialData && initialData.type === "Religion") {
      return;
    }
    if (!initialData && initialName && !selectedDeityId && worldId) {
      // keine Auto-Magic hier – initialReligionDeityId wird explizit über Props gesetzt
    }
  }, [initialData, initialName, selectedDeityId, worldId]);

  // God-/Religion-Wizard: vorhandene Gottheiten einer Welt laden (für Beziehungen / Zuordnung)
  useEffect(() => {
    if (!worldId) return;
    if (formData.type !== "Gottheit" && formData.type !== "Religion") return;

    let cancelled = false;
    (async () => {
      try {
        const list = await getDeitiesByWorld(worldId);
        if (!cancelled) {
          setAvailableDeities(list);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Gottheiten:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [worldId, formData.type]);

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

  const updateAdditionalImageDisplay = (index: number, display: ImageDisplaySettings) => {
    setFormData((prev) => ({
      ...prev,
      additional_images: prev.additional_images.map((img, i) =>
        i === index ? { ...img, display: normalizeImageDisplay(display) } : img
      ),
    }));
  };

  const handleAIGenerate = async () => {
    if (isEditMode) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für den Lore-Eintrag:");
    if (!prompt || !prompt.trim()) return;
    if (!campaignId) {
      alert("Kampagne erforderlich für KI-Generierung.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateLore(campaignId, prompt);
      
      let matchedType = result.type || defaultType;
      if (!typeOptions.includes(matchedType as never)) {
        matchedType = defaultType;
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

        const effectiveWorldId = worldId || world?.id;
        let resolvedImageUrl = formData.image_url.trim() || null;

        if (imageFile) {
          if (!effectiveWorldId) {
            throw new Error("Welt-Kontext fehlt für den Bild-Upload.");
          }
          const upload = await uploadLoreImage(imageFile, {
            worldId: effectiveWorldId,
            loreId: initialData?.id,
          });
          if ("error" in upload) throw new Error(upload.error);
          resolvedImageUrl = upload.publicUrl;
        }

        const imageMetaFields: {
          image_is_ai_generated?: boolean;
          image_upload_rights_confirmed?: boolean | null;
        } = {};

        if (imageFile) {
          const portraitMeta = buildNpcPortraitMeta({
            imageUrl: resolvedImageUrl,
            portraitFile: imageFile,
            portraitIsAiGenerated: false,
            uploadRightsConfirmed,
          });
          imageMetaFields.image_is_ai_generated = portraitMeta.image_is_ai_generated;
          imageMetaFields.image_upload_rights_confirmed =
            portraitMeta.image_upload_rights_confirmed;
        } else if (!resolvedImageUrl && initialData?.image_url) {
          imageMetaFields.image_is_ai_generated = false;
          imageMetaFields.image_upload_rights_confirmed = null;
        } else if (resolvedImageUrl) {
          const portraitMeta = buildNpcPortraitMeta({
            imageUrl: resolvedImageUrl,
            portraitFile: null,
            portraitIsAiGenerated: isAiGenerated,
            uploadRightsConfirmed: false,
            urlRightsConfirmed,
          });
          imageMetaFields.image_is_ai_generated = portraitMeta.image_is_ai_generated;
          imageMetaFields.image_upload_rights_confirmed =
            portraitMeta.image_upload_rights_confirmed;
        }

        const payload: Record<string, unknown> = {
          name: formData.name,
          type: formData.type,
          parent_id: parentId,
          image_url: resolvedImageUrl || undefined,
          ...imageMetaFields,
          additional_images:
            formData.additional_images
              .filter((img) => img.url.trim() !== "")
              .map((img) => ({
                url: img.url.trim(),
                description: (img.description || "").trim(),
                display: normalizeImageDisplay(img.display ?? DEFAULT_IMAGE_DISPLAY),
              })) || null,
          image_display: resolvedImageUrl
            ? normalizeImageDisplay(formData.image_display)
            : null,
          description: formData.description || undefined,
          gm_notes: formData.gm_notes || undefined,
          race_subtypes: formData.race_subtypes || undefined,
          race_traits: formData.race_traits || undefined,
        };
        if (isLocation && formData.stories_and_legends.length > 0) {
          payload.stories_and_legends = formData.stories_and_legends;
        }

        // Verknüpfungen zu Religionen/Sprachen/Rassen/Kultur
        const cleanReligionIds = selectedReligionIds.filter((id) => id && id.trim().length > 0);
        const cleanLanguageIds = selectedLanguageIds.filter((id) => id && id.trim().length > 0);
        const cleanRaceIds = selectedRaceIds.filter((id) => id && id.trim().length > 0);

        // Für Kulturen: Religionen, Sprachen, Rassen
        if (formData.type === "Kultur") {
          payload.religion_ids = cleanReligionIds;
          payload.language_ids = cleanLanguageIds;
          payload.race_ids = cleanRaceIds;
        }

        // Für Rassen: Kulturzuordnung (Sprachen werden serverseitig ggf. aus der Kultur übernommen)
        if (formData.type === "Rasse") {
          payload.culture_id = selectedCultureId || null;
        }

        // Für Orts-Typen: Religionen & Sprachen & optionale Kultur
        if (isLocation) {
          payload.religion_ids = cleanReligionIds;
          payload.language_ids = cleanLanguageIds;
          payload.culture_id = selectedCultureId || null;
        }

        if (isEditMode && initialData) {
          await updateLoreEntry(initialData.id, payload);
        } else {
          const created = await createLoreEntry({
            ...(worldId ? { world_id: worldId } : campaignId ? { campaign_id: campaignId } : {}),
            ...payload,
          } as any);

          if (chronicleImport && created?.id) {
            try {
              await markChronicleInboxItemImported(
                chronicleImport.sessionId,
                chronicleImport.kind,
                chronicleImport.index,
                String(created.id),
              );
            } catch (importErr) {
              console.warn("[LoreForm] Chronicle-Import markieren fehlgeschlagen:", importErr);
            }
          }
        }

        // Wenn es sich um eine Gottheit in einer Welt handelt, parallel in der Götter-Tabelle speichern
        if (worldId && formData.type === "Gottheit") {
          try {
            await saveDeityFromLore({
              worldId,
              name: formData.name,
              epithet: deityFields.epithet,
              symbol_description: deityFields.symbol_description,
              symbol_image_url: deityFields.symbol_image_url,
              domain: deityFields.domain,
              dark_side: deityFields.dark_side,
              relationships: deityRelations,
            });
          } catch (err: any) {
            console.error(err);
            alert(err.message || "Gottheit konnte nicht gespeichert werden.");
          }
        }

        // Wenn es sich um eine Religion in einer Welt handelt, parallel in der Religions-Tabelle speichern
        if (worldId && formData.type === "Religion") {
          try {
            await saveReligionFromLore({
              worldId,
              deityId: selectedDeityId || null,
              name: formData.name,
              interpretation: religionFields.interpretation,
              priest_title: religionFields.priest_title,
              cleric_title: religionFields.cleric_title,
              paladin_title: religionFields.paladin_title,
              order_notes: religionFields.order_notes,
              magic_relation: religionFields.magic_relation,
              relics: religionFields.relics,
              holidays: religionHolidays,
              important_figures: religionFigures,
            });
          } catch (err: any) {
            console.error(err);
            alert(err.message || "Religion konnte nicht gespeichert werden.");
          }
        }

        if (onSuccess) {
          onSuccess();
        } else if (successRedirectHref) {
          router.push(successRedirectHref);
          router.refresh();
        } else if (campaignId) {
          router.push(`/dashboard/campaigns/${campaignId}?tab=lore`);
          router.refresh();
        } else if (worldId) {
          router.push(`/dashboard/worlds/${worldId}/lore`);
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
          {!isEditMode && campaignId && (
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
              {typeOptions.map((type) => (
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

        {/* God-Wizard Zusatzfelder für Gottheiten */}
        {worldId && formData.type === "Gottheit" && (
          <div className="rounded-md border border-hero-border bg-background-card/60 p-4 space-y-4">
            <h2 className="font-barlow font-semibold text-accent-gold text-sm uppercase tracking-wide border-b border-hero-border pb-2">
              Gottheits‑Wizard
            </h2>

            {/* Schritt 1: Name & Zusatzbezeichnung */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 1:</span>{" "}
                Name der Gottheit & Zusatzbezeichnung.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Name der Gottheit
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Zusatzbezeichnung (z.B. „Gott des Windes“)
                  </label>
                  <input
                    type="text"
                    value={deityFields.epithet}
                    onChange={(e) => setDeityFields({ ...deityFields, epithet: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Hüter der Stürme"
                  />
                </div>
              </div>
            </div>

            {/* Schritt 2: Symbol / Wappen */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 2:</span>{" "}
                Symbol, Wappen oder Zeichen.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Beschreibung des Symbols
                  </label>
                  <textarea
                    rows={3}
                    value={deityFields.symbol_description}
                    onChange={(e) => setDeityFields({ ...deityFields, symbol_description: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                    placeholder="Wie sieht das Zeichen auf Bannern, Altären oder Amuletten aus?"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Bild‑URL des Symbols (optional)
                  </label>
                  <input
                    type="url"
                    value={deityFields.symbol_image_url}
                    onChange={(e) => setDeityFields({ ...deityFields, symbol_image_url: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="https://example.com/symbol.jpg"
                  />
                  <p className="mt-1 text-[10px] text-gray-500 font-libre">
                    Dieses Bild kann später in Pantheon‑Übersichten oder Handouts erscheinen.
                  </p>
                </div>
              </div>
            </div>

            {/* Schritt 3: Domäne & Kehrseite */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 3:</span>{" "}
                Wofür steht die Gottheit & was ist ihre Kehrseite?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Wofür steht die Gottheit? (Domäne)
                  </label>
                  <textarea
                    rows={3}
                    value={deityFields.domain}
                    onChange={(e) => setDeityFields({ ...deityFields, domain: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                    placeholder="z.B. Schutz von Reisenden, Stürme, Gerechtigkeit, Geheimnisse..."
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Kehrseite / dunkle Facette
                  </label>
                  <textarea
                    rows={3}
                    value={deityFields.dark_side}
                    onChange={(e) => setDeityFields({ ...deityFields, dark_side: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                    placeholder="Welche Schattenseiten oder extreme Ausprägungen gibt es?"
                  />
                </div>
              </div>
            </div>

            {/* Schritt 4: Beziehungen zu anderen Gottheiten */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 4:</span>{" "}
                Beziehungen zu anderen Gottheiten (Kind, Vater, Mutter, Verwandt, Rivalen, Feinde).
              </p>
              <div className="space-y-2">
                {deityRelations.length > 0 && (
                  <ul className="space-y-1">
                    {deityRelations.map((rel, idx) => {
                      const target = availableDeities.find((d) => d.id === rel.target_deity_id);
                      const label =
                        rel.relation_type === "child"
                          ? "Kind"
                          : rel.relation_type === "father"
                          ? "Vater"
                          : rel.relation_type === "mother"
                          ? "Mutter"
                          : rel.relation_type === "kin"
                          ? "Verwandt"
                          : rel.relation_type === "rival"
                          ? "Rivale"
                          : "Feind";
                      return (
                        <li
                          key={`${rel.target_deity_id}-${rel.relation_type}-${idx}`}
                          className="flex items-center justify-between rounded border border-hero-border/60 bg-black/40 px-2 py-1.5"
                        >
                          <span className="font-libre text-xs text-gray-200">
                            <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">
                              {label}
                            </span>{" "}
                            zu{" "}
                            <span className="text-accent-gold">
                              {target ? target.name : "Unbekannte Gottheit"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDeityRelations((current) =>
                                current.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-900/30 transition-colors"
                            title="Beziehung entfernen"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="grid gap-2 sm:grid-cols-[2fr,2fr,auto] items-end mt-2">
                  <div>
                    <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                      Andere Gottheit auswählen
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) return;
                        // Temporär im Relations-Array mit Standardtyp "kin"
                        setDeityRelations((current) => [
                          ...current,
                          { target_deity_id: targetId, relation_type: "kin" },
                        ]);
                      }}
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    >
                      <option value="">— Gottheit wählen —</option>
                      {availableDeities
                        .filter((d) => d.name !== formData.name)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {d.epithet ? ` – ${d.epithet}` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                      Beziehungstyp (für neu hinzugefügte)
                    </label>
                    <select
                      onChange={(e) => {
                        const type = e.target.value as DeityRelationshipInput["relation_type"];
                        // Letzte Relation im Array (sofern vorhanden) auf neuen Typ setzen
                        setDeityRelations((current) => {
                          if (current.length === 0) return current;
                          const copy = [...current];
                          copy[copy.length - 1] = {
                            ...copy[copy.length - 1],
                            relation_type: type,
                          };
                          return copy;
                        });
                      }}
                      defaultValue="kin"
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    >
                      <option value="child">Kind</option>
                      <option value="father">Vater</option>
                      <option value="mother">Mutter</option>
                      <option value="kin">Verwandt</option>
                      <option value="rival">Rivalen</option>
                      <option value="enemy">Feinde</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <p className="text-[10px] font-libre text-gray-500">
                      Füge zuerst eine Gottheit hinzu und passe dann den Typ an.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rassen-spezifische Felder */}
        {formData.type === "Rasse" && (
          <div className="rounded-md border border-hero-border bg-background-card/70 p-4 space-y-4">
            <h2 className="font-barlow font-semibold text-accent-gold text-sm uppercase tracking-wide border-b border-hero-border pb-2">
              Rassen‑Details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                  Unterarten / Unterrassen
                </label>
                <textarea
                  rows={4}
                  value={formData.race_subtypes}
                  onChange={(e) =>
                    setFormData({ ...formData, race_subtypes: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="Liste von Unterarten oder Unterrassen, z.B. Waldelf, Dunkelelf, Hochelf..."
                />
              </div>
              <div>
                <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                  Besondere Merkmale
                </label>
                <textarea
                  rows={4}
                  value={formData.race_traits}
                  onChange={(e) =>
                    setFormData({ ...formData, race_traits: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="Physische/kulturelle Merkmale. Optional am Ende: <<<RACE_BONUSES {JSON} >>> für Attribute/Features."
                />
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mechanische Boni: JSON-Block mit <code className="text-accent-gold">v:1</code>,{" "}
                  <code className="text-accent-gold">abilityBonuses</code>,{" "}
                  <code className="text-accent-gold">features</code>, Proficiencies — wird am Charakterblatt angewendet.
                </p>
              </div>
            </div>

            {/* Kultur-Zuordnung für Rassen – Sprachen werden serverseitig aus der Kultur übernommen */}
            <div>
              <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                Zugehörige Kultur
              </label>
              {parentOptions.some((p) => p.type === "Kultur") ? (
                <select
                  value={selectedCultureId || ""}
                  onChange={(e) =>
                    setSelectedCultureId(e.target.value ? e.target.value : null)
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                >
                  <option value="">— Keine Kultur zugeordnet —</option>
                  {parentOptions
                    .filter((p) => p.type === "Kultur")
                    .map((cult) => (
                      <option key={cult.id} value={cult.id}>
                        {cult.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p className="font-libre text-[11px] text-gray-500">
                  Lege zuerst Kulturen als Lore-Einträge an, um sie hier zu verknüpfen.
                </p>
              )}
              <p className="mt-1 text-[10px] text-gray-500 font-libre">
                Sprachen, die in der gewählten Kultur hinterlegt sind, werden bei neuen Rassen automatisch übernommen.
              </p>
            </div>
          </div>
        )}

        {/* Verknüpfung von Religionen/Sprachen/Kulturen – Orts-Ebene */}
        {isLocation && (
          <div className="rounded-md border border-hero-border bg-background-card/60 p-4 space-y-3">
            <h2 className="font-barlow font-semibold text-accent-gold text-sm uppercase tracking-wide border-b border-hero-border pb-2">
              Glauben & Kultur dieses Ortes
            </h2>
            <p className="font-libre text-xs text-gray-400">
              Lege fest, welche Religionen und Sprachen an diesem Ort präsent sind und (optional) welche Kultur hier dominiert.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Religionen an diesem Ort
                </label>
                {rlcOptions.some((p) => p.type === "Religion") ? (
                  <select
                    multiple
                    value={selectedReligionIds}
                    onChange={(e) =>
                      setSelectedReligionIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                      )
                    }
                    className="w-full h-24 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {rlcOptions
                      .filter((p) => p.type === "Religion")
                      .map((rel) => (
                        <option key={rel.id} value={rel.id}>
                          {rel.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Religionen als Lore-Einträge an, um sie hier zuzuweisen.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mehrfachauswahl mit Strg/Cmd + Klick.
                </p>
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Gesprochene Sprachen
                </label>
                {rlcOptions.some((p) => p.type === "Sprache") ? (
                  <select
                    multiple
                    value={selectedLanguageIds}
                    onChange={(e) =>
                      setSelectedLanguageIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                      )
                    }
                    className="w-full h-24 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {rlcOptions
                      .filter((p) => p.type === "Sprache")
                      .map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Sprachen als Lore-Einträge an, um sie hier zuzuweisen.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mehrfachauswahl mit Strg/Cmd + Klick.
                </p>
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Dominante Kultur (optional)
                </label>
                {rlcOptions.some((p) => p.type === "Kultur") ? (
                  <select
                    value={selectedCultureId || ""}
                    onChange={(e) =>
                      setSelectedCultureId(e.target.value ? e.target.value : null)
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    <option value="">— Keine spezifische Kultur —</option>
                    {rlcOptions
                      .filter((p) => p.type === "Kultur")
                      .map((cult) => (
                        <option key={cult.id} value={cult.id}>
                          {cult.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Kulturen als Lore-Einträge an, um sie hier zuzuweisen.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Verknüpfung auf Kultur-Ebene */}
        {formData.type === "Kultur" && (
          <div className="rounded-md border border-hero-border bg-background-card/60 p-4 space-y-3">
            <h2 className="font-barlow font-semibold text-accent-gold text-sm uppercase tracking-wide border-b border-hero-border pb-2">
              Verknüpfungen dieser Kultur
            </h2>
            <p className="font-libre text-xs text-gray-400">
              Lege fest, welche Religionen, Sprachen und Rassen typischerweise zu dieser Kultur gehören.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Religionen dieser Kultur
                </label>
                {parentOptions.some((p) => p.type === "Religion") ? (
                  <select
                    multiple
                    value={selectedReligionIds}
                    onChange={(e) =>
                      setSelectedReligionIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                      )
                    }
                    className="w-full h-24 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {parentOptions
                      .filter((p) => p.type === "Religion")
                      .map((rel) => (
                        <option key={rel.id} value={rel.id}>
                          {rel.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Religionen als Lore-Einträge an.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mehrfachauswahl mit Strg/Cmd + Klick.
                </p>
              </div>
              <div>
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Sprachen dieser Kultur
                </label>
                {parentOptions.some((p) => p.type === "Sprache") ? (
                  <select
                    multiple
                    value={selectedLanguageIds}
                    onChange={(e) =>
                      setSelectedLanguageIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                      )
                    }
                    className="w-full h-24 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {parentOptions
                      .filter((p) => p.type === "Sprache")
                      .map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Sprachen als Lore-Einträge an.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mehrfachauswahl mit Strg/Cmd + Klick.
                </p>
              </div>
              <div>
                <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                  Rassen dieser Kultur
                </label>
                {parentOptions.some((p) => p.type === "Rasse") ? (
                  <select
                    multiple
                    value={selectedRaceIds}
                    onChange={(e) =>
                      setSelectedRaceIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                      )
                    }
                    className="w-full h-24 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {parentOptions
                      .filter((p) => p.type === "Rasse")
                      .map((race) => (
                        <option key={race.id} value={race.id}>
                          {race.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="font-libre text-[11px] text-gray-500">
                    Lege zuerst Rassen als Lore-Einträge an.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 font-libre">
                  Mehrfachauswahl mit Strg/Cmd + Klick.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Religions-Wizard für Religionen */}
        {worldId && formData.type === "Religion" && (
          <div className="rounded-md border border-hero-border bg-background-card/60 p-4 space-y-4">
            <h2 className="font-barlow font-semibold text-accent-gold text-sm uppercase tracking-wide border-b border-hero-border pb-2">
              Religions‑Wizard
            </h2>

            {/* Schritt 1: Name & Interpretation */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 1:</span>{" "}
                Name der Religion, zugehörige Gottheit & Interpretation der Gottheit.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Name der Religion
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Kirche des Ewigen Sturms"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                      Zugehörige Gottheit (optional)
                    </label>
                    {availableDeities.length > 0 ? (
                      <select
                        value={selectedDeityId || ""}
                        onChange={(e) =>
                          setSelectedDeityId(e.target.value ? e.target.value : null)
                        }
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                      >
                        <option value="">— Keine direkte Zuordnung —</option>
                        {availableDeities.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {d.epithet ? ` – ${d.epithet}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-libre text-[11px] text-gray-500">
                        Lege zuerst eine Gottheit an, um sie hier zu verknüpfen.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                      Interpretation der Gottheit
                    </label>
                    <textarea
                      rows={3}
                      value={religionFields.interpretation}
                      onChange={(e) =>
                        setReligionFields({ ...religionFields, interpretation: e.target.value })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                      placeholder="Wie versteht diese Religion die Gottheit? Was ist ihr Fokus?"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Schritt 2: Rollen & Ordnung */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 2:</span>{" "}
                Titel in der Kirche & Ordnung der Religion.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                    Priesterbezeichnung
                  </label>
                  <input
                    type="text"
                    value={religionFields.priest_title}
                    onChange={(e) =>
                      setReligionFields({ ...religionFields, priest_title: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Hohepriester, Orakel..."
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                    Klerikerbezeichnung
                  </label>
                  <input
                    type="text"
                    value={religionFields.cleric_title}
                    onChange={(e) =>
                      setReligionFields({ ...religionFields, cleric_title: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Priester, Bruder, Schwester..."
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                    Paladinbezeichnung
                  </label>
                  <input
                    type="text"
                    value={religionFields.paladin_title}
                    onChange={(e) =>
                      setReligionFields({ ...religionFields, paladin_title: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Inquisitor, Tempelritter..."
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                  Weitere Anmerkungen zur Ordnung der Religion
                </label>
                <textarea
                  rows={3}
                  value={religionFields.order_notes}
                  onChange={(e) =>
                    setReligionFields({ ...religionFields, order_notes: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                  placeholder="Hier kannst du Hierarchie, Orden, Sekten oder innere Konflikte skizzieren."
                />
              </div>
            </div>

            {/* Schritt 3: Magie & Reliquien */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 3:</span>{" "}
                Bezug zur Magie & heilige Reliquien.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Bezug zur Magie
                  </label>
                  <textarea
                    rows={3}
                    value={religionFields.magic_relation}
                    onChange={(e) =>
                      setReligionFields({ ...religionFields, magic_relation: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                    placeholder="Wie steht die Religion zu Magie, Wundern, verbotenen Künsten?"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                    Wichtige Reliquien
                  </label>
                  <textarea
                    rows={3}
                    value={religionFields.relics}
                    onChange={(e) =>
                      setReligionFields({ ...religionFields, relics: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                    placeholder="Heilige Gegenstände, Orte, Artefakte..."
                  />
                </div>
              </div>
            </div>

            {/* Schritt 4: Feiertage */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 4:</span>{" "}
                Besondere Feiertage (Datum/Zeitraum, Name, Bedeutung & Tradition).
              </p>

              {religionHolidays.length > 0 && (
                <div className="space-y-2">
                  {religionHolidays.map((h, idx) => (
                    <div
                      key={`${h.name}-${idx}`}
                      className="rounded border border-hero-border bg-black/40 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-barlow font-bold text-xs uppercase text-accent-gold">
                          Feiertag {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReligionHolidays((current) =>
                              current.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-900/30 transition-colors"
                          title="Feiertag entfernen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                            Datum / Zeitraum
                          </label>
                          <input
                            type="text"
                            value={h.date}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReligionHolidays((current) =>
                                current.map((item, i) =>
                                  i === idx ? { ...item, date: value } : item
                                )
                              );
                            }}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                            placeholder="z.B. 1. Vollmond im Frühling"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                            Name des Feiertages
                          </label>
                          <input
                            type="text"
                            value={h.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReligionHolidays((current) =>
                                current.map((item, i) =>
                                  i === idx ? { ...item, name: value } : item
                                )
                              );
                            }}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                            placeholder="z.B. Nacht der Erneuerung"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                          Bedeutung & Tradition
                        </label>
                        <textarea
                          rows={3}
                          value={h.description}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReligionHolidays((current) =>
                              current.map((item, i) =>
                                i === idx ? { ...item, description: value } : item
                              )
                            );
                          }}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                          placeholder="Welche Rituale, Bräuche und Geschichten sind mit diesem Tag verbunden?"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setReligionHolidays((current) => [
                      ...current,
                      { date: "", name: "", description: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow font-bold text-[11px] uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Feiertag hinzufügen
                </button>
              </div>
            </div>

            {/* Schritt 5: Wichtige Persönlichkeiten */}
            <div className="space-y-2">
              <p className="font-libre text-xs text-gray-400">
                <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">Schritt 5:</span>{" "}
                Wichtige Persönlichkeiten dieser Religion (Oberhaupt, Propheten, Heilige, Ordensführer, ...).
              </p>

              {religionFigures.length > 0 && (
                <div className="space-y-2">
                  {religionFigures.map((p, idx) => (
                    <div
                      key={`${p.name}-${idx}`}
                      className="rounded border border-hero-border bg-black/40 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-barlow font-bold text-xs uppercase text-accent-gold">
                          Person {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReligionFigures((current) =>
                              current.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-900/30 transition-colors"
                          title="Person entfernen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                            Name
                          </label>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReligionFigures((current) =>
                                current.map((item, i) =>
                                  i === idx ? { ...item, name: value } : item
                                )
                              );
                            }}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                            placeholder="z.B. Hohepriesterin Sarelia"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                            Rolle / Titel
                          </label>
                          <input
                            type="text"
                            value={p.title}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReligionFigures((current) =>
                                current.map((item, i) =>
                                  i === idx ? { ...item, title: value } : item
                                )
                              );
                            }}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold"
                            placeholder="z.B. Oberhaupt, Prophet, Ordensmeister..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block font-barlow font-bold text-[11px] uppercase text-gray-300">
                          Bedeutung & Hintergrund
                        </label>
                        <textarea
                          rows={3}
                          value={p.description}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReligionFigures((current) =>
                              current.map((item, i) =>
                                i === idx ? { ...item, description: value } : item
                              )
                            );
                          }}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
                          placeholder="Warum ist diese Person für den Glauben wichtig? Welche Entscheidungen, Wunder oder Skandale sind mit ihr verknüpft?"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setReligionFigures((current) => [
                      ...current,
                      { name: "", title: "", description: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow font-bold text-[11px] uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Person hinzufügen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Image */}
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Hauptbild (optional)
          </label>
          <p className="mb-3 font-libre text-xs text-gray-500">
            Querformat im Header. Per URL oder lokalem Upload — für öffentliche Lore-Seiten
            Bildrechte bestätigen oder als KI-generiert kennzeichnen.
          </p>
          <LoreMainImageField
            imageUrl={formData.image_url}
            onImageUrlChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
            imageFile={imageFile}
            onImageFileChange={(file) => {
              setImageFile(file);
              if (file) setUploadRightsConfirmed(false);
            }}
            imageDisplay={formData.image_display}
            onImageDisplayChange={(image_display) =>
              setFormData((prev) => ({ ...prev, image_display }))
            }
            isAiGenerated={isAiGenerated}
            onIsAiGeneratedChange={setIsAiGenerated}
            uploadRightsConfirmed={uploadRightsConfirmed}
            onUploadRightsConfirmedChange={setUploadRightsConfirmed}
            urlRightsConfirmed={urlRightsConfirmed}
            onUrlRightsConfirmedChange={setUrlRightsConfirmed}
          />
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
                  {img.url.trim() ? (
                    <ImageUrlDisplayEditor
                      value={img.display ?? DEFAULT_IMAGE_DISPLAY}
                      onChange={(d) => updateAdditionalImageDisplay(index, d)}
                      previewUrl={img.url}
                      previewAspectClassName="aspect-video"
                      className="mt-2"
                    />
                  ) : null}
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
            {isLocation ? "Beschreibung (oberflächlich, was man beim Betreten sieht)" : "Beschreibung (Spieler-sichtbar)"}
          </label>
          <MarkdownEditor
            value={formData.description}
            onChange={(v) => setFormData({ ...formData, description: v })}
            minHeight="min-h-[400px]"
            placeholder={isLocation ? "Oberflächliche Beschreibung des Ortes beim Betreten. Markdown: **fett**, *kursiv*, Listen, Überschriften." : "Was sehen die Spieler auf den ersten Blick? Markdown möglich."}
          />
        </div>

        {(isLocation || formData.type === "Rasse") && (
          <div className="mt-6">
            <StoriesAndLegendsEditor
              sections={formData.stories_and_legends}
              onChange={(sections) => setFormData({ ...formData, stories_and_legends: sections })}
            />
          </div>
        )}

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


