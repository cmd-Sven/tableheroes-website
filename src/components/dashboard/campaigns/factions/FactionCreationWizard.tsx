"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Sparkles,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  MapPin,
  Users,
  Handshake,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import {
  createFaction,
  updateFaction,
  getFactions,
  getFactionRelations,
  generateFactionForWorld,
} from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { generateFaction } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS, FACTION_MEMBER_ROLES } from "@/src/lib/faction-types";
import { SmartLocationCombobox } from "@/src/components/dashboard/campaigns/npcs/SmartLocationCombobox";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { getAllLocations } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import {
  DEFAULT_IMAGE_DISPLAY,
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import { buildNpcPortraitMeta } from "@/src/lib/npc-portrait-meta";
import { NpcPortraitUploadField } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitUploadField";
import { uploadFactionEmblem } from "@/src/lib/profile-media";

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
  image_display?: ImageDisplaySettings | null;
  image_is_ai_generated?: boolean | null;
  image_upload_rights_confirmed?: boolean | null;
  location_id: string | null;
  hq_location_id: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  appearance?: string | null;
  structure?: string | null;
  philosophy?: string | null;
  important_npcs_info?: string | null;
};

type PlannedMember = { name: string; role: string; npc_id?: string | null };

type FactionRelation = {
  target_faction_id: string;
  relation_type: string;
  description?: string | null;
};

type Props = {
  campaignId?: string;
  worldId?: string;
  initialData?: FactionData | null;
  defaultName?: string;
  defaultHqLocationId?: string;
  locations?: Location[];
  factions?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
};

const stepTransition = { type: "tween" as const, duration: 0.3 };

function parseMembersFromText(text: string | null | undefined): PlannedMember[] {
  if (!text || !text.trim()) return [];
  const members: PlannedMember[] = [];
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([^–—\-:]+)[:\-–—]\s*(.+)$/);
    const name = m ? m[1].trim() : line;
    const role = m ? m[2].trim() : "Mitglied";
    if (name.length > 0) members.push({ name, role, npc_id: null });
  }
  if (members.length === 0 && text.trim()) members.push({ name: text.trim(), role: "Mitglied", npc_id: null });
  return members;
}

function WorldLocationSelect({
  locations,
  value,
  onChange,
  placeholder,
}: {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
    >
      <option value="">{placeholder}</option>
      {locations.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.type}: {loc.name}
        </option>
      ))}
    </select>
  );
}

export function FactionCreationWizard({
  campaignId,
  worldId,
  initialData,
  defaultName,
  defaultHqLocationId,
  locations = [],
  factions = [],
  onSuccess,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(1);
  const [allLocations, setAllLocations] = useState<Location[]>(locations);
  const [allFactions, setAllFactions] = useState<Array<{ id: string; name: string }>>(factions);
  const [factionRelations, setFactionRelations] = useState<FactionRelation[]>([]);
  const [plannedMembers, setPlannedMembers] = useState<PlannedMember[]>([]);

  const isEditMode = !!(initialData?.id);
  const hasDiplomacy = Boolean(campaignId);
  const totalSteps = hasDiplomacy ? 6 : 5;

  const [formData, setFormData] = useState<FactionData>({
    name: (initialData?.id ? initialData.name : (defaultName ?? "")) || "",
    type: "Gilde",
    current_status: null,
    description: null,
    image_url: null,
    image_display: { ...DEFAULT_IMAGE_DISPLAY },
    location_id: null,
    hq_location_id: defaultHqLocationId ?? null,
    gm_notes: null,
    is_revealed: false,
    appearance: null,
    structure: null,
    philosophy: null,
    important_npcs_info: null,
  });
  const [isAiGenerated, setIsAiGenerated] = useState(initialData?.image_is_ai_generated === true);
  const [urlRightsConfirmed, setUrlRightsConfirmed] = useState(
    initialData?.image_upload_rights_confirmed === true,
  );
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);

  const effectiveWorldId = worldId ?? null;

  const backHref = worldId
    ? `/dashboard/worlds/${worldId}/factions`
    : `/dashboard/campaigns/${campaignId!}?tab=factions`;

  useEffect(() => {
    if (worldId) {
      setAllLocations(locations);
      setAllFactions(factions);
      return;
    }
    if (!campaignId) return;
    const loadData = async () => {
      try {
        const [locationsData, factionsData] = await Promise.all([
          getAllLocations(campaignId),
          getFactions(campaignId),
        ]);
        setAllLocations(
          locationsData.map((loc: { id: string; name: string; type?: string }) => ({
            id: loc.id,
            name: loc.name,
            type: loc.type || "Ort",
          })),
        );
        setAllFactions(factionsData.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })));
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
    };
    loadData();
  }, [campaignId, worldId, locations, factions]);

  useEffect(() => {
    const factionId = initialData?.id;
    if (!campaignId || !isEditMode || !factionId) return;
    const loadRelations = async () => {
      try {
        const relations = await getFactionRelations(campaignId, factionId);
        setFactionRelations(
          relations.map((rel) => ({
            target_faction_id: rel.partnerFactionId,
            relation_type: rel.relationType,
            description: rel.description || null,
          })),
        );
      } catch (error) {
        console.error("Fehler beim Laden der Beziehungen:", error);
      }
    };
    loadRelations();
  }, [isEditMode, initialData?.id, campaignId]);

  useEffect(() => {
    if (!initialData) return;
    setFormData({
      name: initialData.name || "",
      type: initialData.type || "Gilde",
      current_status: initialData.current_status || null,
      description: initialData.description || null,
      image_url: initialData.image_url || null,
      image_display: normalizeImageDisplay(initialData.image_display ?? null),
      location_id: initialData.location_id || null,
      hq_location_id: initialData.hq_location_id ?? initialData.location_id ?? null,
      gm_notes: initialData.gm_notes || null,
      is_revealed: initialData.is_revealed || false,
      appearance: initialData.appearance || null,
      structure: initialData.structure || null,
      philosophy: initialData.philosophy || null,
      important_npcs_info: initialData.important_npcs_info || null,
    });
    setIsAiGenerated(initialData.image_is_ai_generated === true);
    setUrlRightsConfirmed(initialData.image_upload_rights_confirmed === true);
    const pm = (initialData as { planned_members?: PlannedMember[] }).planned_members;
    if (Array.isArray(pm) && pm.length > 0) {
      setPlannedMembers(
        pm.map((m) => ({ name: m.name || "", role: m.role || "Mitglied", npc_id: m.npc_id ?? null })),
      );
    } else if (initialData.important_npcs_info?.trim()) {
      setPlannedMembers(parseMembersFromText(initialData.important_npcs_info));
    }
  }, [initialData]);

  const stepLabels = useMemo(
    () =>
      hasDiplomacy
        ? ["Identität", "Erscheinung", "Logistik", "Mitglieder", "Diplomatie", "Bild & Öffentlich"]
        : ["Identität", "Erscheinung", "Logistik", "Mitglieder", "Bild & Öffentlich"],
    [hasDiplomacy],
  );

  const handleAIGenerate = async () => {
    if (isEditMode || (!campaignId && !worldId)) return;
    const prompt = window.prompt("Beschreibe kurz deine Idee für die Fraktion:");
    if (!prompt?.trim()) return;

    setIsGenerating(true);
    try {
      const result = campaignId
        ? await generateFaction(campaignId, prompt)
        : await generateFactionForWorld(worldId!, prompt);

      let matchedType = result.type || "Gilde";
      if (!VALID_FACTION_TYPES.includes(matchedType as (typeof VALID_FACTION_TYPES)[number])) {
        matchedType = "Gilde";
      }

      let matchedStatus = result.current_status || null;
      if (matchedStatus && !VALID_RELATIONSHIPS.includes(matchedStatus as (typeof VALID_RELATIONSHIPS)[number])) {
        matchedStatus = null;
      }

      const hqId =
        (result as { headquarters_location_id?: string }).headquarters_location_id ??
        (result as { hq_location_id?: string }).hq_location_id ??
        (result as { location_id?: string }).location_id ??
        null;
      const homeId = (result as { location_id?: string }).location_id ?? null;

      setFormData((prev) => ({
        ...prev,
        name: result.name || prev.name,
        type: matchedType,
        current_status: matchedStatus,
        description: result.description || prev.description,
        gm_notes: result.gm_notes || prev.gm_notes,
        appearance: result.appearance || prev.appearance || null,
        structure: result.structure || prev.structure || null,
        philosophy: result.philosophy || prev.philosophy || null,
        important_npcs_info: result.important_npcs_info || prev.important_npcs_info || null,
        location_id: homeId || prev.location_id,
        hq_location_id: hqId || prev.hq_location_id,
      }));

      const aiPlanned = (result as { planned_members?: Array<{ name: string; role: string }> }).planned_members;
      if (Array.isArray(aiPlanned) && aiPlanned.length > 0) {
        setPlannedMembers(aiPlanned.slice(0, 3).map((m) => ({ name: m.name || "", role: m.role || "Mitglied" })));
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Fehler bei der KI-Generierung.";
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRelation = () => {
    setFactionRelations([
      ...factionRelations,
      { target_faction_id: "", relation_type: "Neutral", description: null },
    ]);
  };

  const handleRemoveRelation = (index: number) => {
    setFactionRelations(factionRelations.filter((_, i) => i !== index));
  };

  const handleUpdateRelation = (index: number, field: keyof FactionRelation, value: string) => {
    setFactionRelations(factionRelations.map((rel, i) => (i === index ? { ...rel, [field]: value } : rel)));
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1 && !formData.name.trim()) {
      alert("Bitte gib einen Namen für die Fraktion ein.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    startTransition(async () => {
      try {
        const filteredPlanned = plannedMembers.filter((m) => m.name.trim() !== "");
        const plannedPayload = filteredPlanned.map((m) => ({
          name: m.name.trim(),
          role: m.role || "Mitglied",
          npc_id: m.npc_id ?? undefined,
        }));
        const importantNpcsText =
          filteredPlanned.map((m) => `${m.name.trim()} - ${m.role || "Mitglied"}`).join("\n") || undefined;

        let resolvedImageUrl = formData.image_url?.trim() || null;
        if (portraitFile) {
          if (!effectiveWorldId) {
            throw new Error("Welt-Kontext fehlt für den Wappen-Upload.");
          }
          const upload = await uploadFactionEmblem(portraitFile, {
            worldId: effectiveWorldId,
            factionId: initialData?.id,
          });
          if ("error" in upload) throw new Error(upload.error);
          resolvedImageUrl = upload.publicUrl;
        }

        const imageMeta = buildNpcPortraitMeta({
          imageUrl: resolvedImageUrl,
          portraitFile,
          portraitIsAiGenerated: isAiGenerated,
          uploadRightsConfirmed,
          urlRightsConfirmed,
        });

        const payload = {
          name: formData.name.trim(),
          type: formData.type,
          current_status: formData.current_status || undefined,
          description: formData.description || undefined,
          image_url: resolvedImageUrl || undefined,
          image_display: resolvedImageUrl
            ? normalizeImageDisplay(formData.image_display ?? null)
            : undefined,
          image_is_ai_generated: imageMeta.image_is_ai_generated,
          image_upload_rights_confirmed: imageMeta.image_upload_rights_confirmed,
          location_id: formData.location_id || undefined,
          hq_location_id: formData.hq_location_id || undefined,
          gm_notes: formData.gm_notes || undefined,
          is_revealed: formData.is_revealed,
          appearance: formData.appearance || undefined,
          structure: formData.structure || undefined,
          philosophy: formData.philosophy || undefined,
          important_npcs_info: importantNpcsText,
          planned_members: plannedPayload,
          faction_relations: factionRelations.filter(
            (rel) => rel.target_faction_id && rel.target_faction_id !== initialData?.id,
          ),
        };

        let result: { id?: string } | undefined;
        if (isEditMode && initialData?.id) {
          await updateFaction(initialData.id, {
            ...payload,
            campaign_id: campaignId,
          });
          result = { id: initialData.id };
        } else {
          result = await createFaction(
            worldId
              ? { world_id: worldId, ...payload }
              : { campaign_id: campaignId!, ...payload },
          );
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          if (worldId) {
            router.push(
              isEditMode && initialData?.id
                ? `/dashboard/worlds/${worldId}/factions/${initialData.id}`
                : `/dashboard/worlds/${worldId}/factions`,
            );
          } else if (campaignId) {
            router.push(
              isEditMode && initialData?.id
                ? `/dashboard/campaigns/${campaignId}/factions/${initialData.id}`
                : result?.id
                  ? `/dashboard/campaigns/${campaignId}/factions/${result.id}`
                  : `/dashboard/campaigns/${campaignId}?tab=factions`,
            );
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
        alert(msg);
      }
    });
  };

  const renderLocationField = (
    field: "location_id" | "hq_location_id",
    label: string,
    placeholder: string,
  ) => (
    <div>
      <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">{label}</label>
      {campaignId ? (
        <SmartLocationCombobox
          campaignId={campaignId}
          locations={allLocations}
          value={formData[field] || ""}
          onChange={(locationId) => setFormData({ ...formData, [field]: locationId || null })}
          placeholder={placeholder}
          onLocationCreated={(location) => {
            setAllLocations([...allLocations, location]);
            setFormData({ ...formData, [field]: location.id });
          }}
        />
      ) : (
        <WorldLocationSelect
          locations={allLocations}
          value={formData[field] || ""}
          onChange={(id) => setFormData({ ...formData, [field]: id || null })}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const isFinalStep = step === totalSteps;

  return (
    <div
      className="min-h-screen p-6 relative"
      style={{
        backgroundImage: "url('/images/scroll-paper.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Link href={backHref} className="hover:text-hero-vibrant transition-colors font-barlow font-bold uppercase">
            Fraktionen
          </Link>
          <span>/</span>
          <span className="text-accent-gold font-barlow font-bold uppercase">
            {isEditMode ? "Bearbeiten" : "Erstellen"}
          </span>
        </div>

        <div className="rounded-lg border border-hero-dark bg-background-card/95 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between border-b border-hero-border pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-hero-dark p-2 border border-accent-gold/60">
                <Shield className="h-6 w-6 text-accent-gold" />
              </div>
              <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
                {isEditMode ? "Fraktion bearbeiten" : "Fraktions-Architekt"}
              </h1>
            </div>
            <span className="font-barlow font-bold text-sm uppercase text-gray-400">
              Schritt {step} von {totalSteps}
            </span>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1 font-barlow text-[10px] font-bold uppercase ${
                    isActive
                      ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                      : isDone
                        ? "border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant"
                        : "border-hero-border/40 text-gray-500"
                  }`}
                >
                  {isDone ? "✓ " : ""}
                  {label}
                </span>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                  Schritt 1: Identität
                </h2>
                {!isEditMode && (campaignId || worldId) && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={isGenerating || isPending}
                      className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Generiere…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> Mit KI ausfüllen
                        </>
                      )}
                    </button>
                  </div>
                )}
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Name der Fraktion *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
                    placeholder="z.B. Die Schattengilde"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">Typ *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
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
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
                    >
                      <option value="">— Kein Status —</option>
                      {[...VALID_RELATIONSHIPS].sort().map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                  Schritt 2: Erscheinung & Werte
                </h2>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Erscheinungsbild
                  </label>
                  <textarea
                    value={formData.appearance || ""}
                    onChange={(e) => setFormData({ ...formData, appearance: e.target.value || null })}
                    rows={3}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold resize-none"
                    placeholder="Wappen, Uniformen, Slogans, Erkennungszeichen…"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">Struktur</label>
                  <textarea
                    value={formData.structure || ""}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value || null })}
                    rows={3}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold resize-none"
                    placeholder="z.B. Militärisch, Hierarchisch, Demokratisch…"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Philosophie / Ziele
                  </label>
                  <textarea
                    value={formData.philosophy || ""}
                    onChange={(e) => setFormData({ ...formData, philosophy: e.target.value || null })}
                    rows={4}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold resize-none"
                    placeholder="Grundsätze, Ziele, Weltanschauung…"
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Schritt 3: Logistik
                </h2>
                <p className="font-libre text-sm text-gray-400">
                  Heimatort = Einflussgebiet der Fraktion. Hauptquartier = physischer Sitz (Festung, Gildehaus, Tempel…).
                </p>
                {renderLocationField("location_id", "Heimatort", "— Kein Heimatort —")}
                {renderLocationField("hq_location_id", "Hauptquartier", "— Kein Hauptquartier —")}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-hero-border pb-2">
                  <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Schritt 4: Mitglieder
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setPlannedMembers([...plannedMembers, { name: "", role: "Mitglied", npc_id: null }])
                    }
                    className="flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/40"
                  >
                    <Plus className="h-4 w-4" /> Hinzufügen
                  </button>
                </div>
                <p className="font-libre text-sm text-gray-400">
                  Geplante Mitglieder erscheinen auf der Detailseite als TODO – dort kannst du NPCs generieren.
                </p>
                {plannedMembers.length > 0 ? (
                  <div className="space-y-3">
                    {plannedMembers.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border border-hero-border bg-hero-dark/30 p-3"
                      >
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) =>
                            setPlannedMembers(
                              plannedMembers.map((m, i) => (i === index ? { ...m, name: e.target.value } : m)),
                            )
                          }
                          placeholder="Name"
                          className="flex-1 min-w-0 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-white outline-none focus:border-accent-gold"
                        />
                        <select
                          value={member.role}
                          onChange={(e) =>
                            setPlannedMembers(
                              plannedMembers.map((m, i) => (i === index ? { ...m, role: e.target.value } : m)),
                            )
                          }
                          className="rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-white outline-none focus:border-accent-gold min-w-[160px]"
                        >
                          {FACTION_MEMBER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setPlannedMembers(plannedMembers.filter((_, i) => i !== index))}
                          className="p-1.5 rounded text-red-400 hover:bg-red-900/30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-libre text-sm text-gray-400 italic">Noch keine geplanten Mitglieder.</p>
                )}
              </motion.div>
            )}

            {hasDiplomacy && step === 5 && (
              <motion.div
                key="step5-diplomacy"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-hero-border pb-2">
                  <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                    <Handshake className="h-5 w-5" />
                    Schritt 5: Diplomatie
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddRelation}
                    className="flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/40"
                  >
                    <Plus className="h-4 w-4" /> Beziehung
                  </button>
                </div>
                <p className="font-libre text-sm text-gray-400">
                  Beziehungen zu anderen Fraktionen gelten nur für diese Kampagne.
                </p>
                {factionRelations.length > 0 ? (
                  <div className="space-y-3">
                    {factionRelations.map((relation, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border border-hero-border bg-hero-dark/30 p-4"
                      >
                        <div className="flex-1 grid gap-3 sm:grid-cols-2">
                          <select
                            value={relation.target_faction_id}
                            onChange={(e) => handleUpdateRelation(index, "target_faction_id", e.target.value)}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none focus:border-accent-gold"
                          >
                            <option value="">— Fraktion wählen —</option>
                            {allFactions
                              .filter((f) => f.id !== initialData?.id)
                              .map((faction) => (
                                <option key={faction.id} value={faction.id}>
                                  {faction.name}
                                </option>
                              ))}
                          </select>
                          <select
                            value={relation.relation_type}
                            onChange={(e) => handleUpdateRelation(index, "relation_type", e.target.value)}
                            className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none focus:border-accent-gold"
                          >
                            {[...VALID_RELATIONSHIPS].map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={relation.description || ""}
                            onChange={(e) => handleUpdateRelation(index, "description", e.target.value)}
                            rows={2}
                            placeholder="Details zur Beziehung…"
                            className="sm:col-span-2 w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none focus:border-accent-gold resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelation(index)}
                          className="mt-1 rounded border border-red-900/60 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-libre text-sm text-gray-400 italic">Noch keine Beziehungen definiert.</p>
                )}
              </motion.div>
            )}

            {((hasDiplomacy && step === 6) || (!hasDiplomacy && step === 5)) && (
              <motion.div
                key="step-final"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={stepTransition}
                className="space-y-6"
              >
                <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Schritt {totalSteps}: Wappen & Öffentlich
                </h2>
                <div className="space-y-4">
                  <p className="font-libre text-sm text-gray-400">
                    Das Wappen erscheint auf der Fraktions-Detailseite und auf der Session-Bühne.
                  </p>
                  <NpcPortraitUploadField
                    imageUrl={formData.image_url || ""}
                    portraitFile={portraitFile}
                    onPortraitFileChange={(file) => {
                      setPortraitFile(file);
                      if (file) {
                        setFormData((prev) => ({ ...prev, image_url: "" }));
                        setIsAiGenerated(false);
                        setUrlRightsConfirmed(false);
                      }
                    }}
                    imageDisplay={formData.image_display ?? DEFAULT_IMAGE_DISPLAY}
                    onImageDisplayChange={(image_display) =>
                      setFormData((prev) => ({ ...prev, image_display }))
                    }
                    onClearImage={() => {
                      setPortraitFile(null);
                      setFormData((prev) => ({
                        ...prev,
                        image_url: null,
                        image_display: { ...DEFAULT_IMAGE_DISPLAY },
                      }));
                      setIsAiGenerated(false);
                      setUrlRightsConfirmed(false);
                      setUploadRightsConfirmed(false);
                    }}
                    previewAspectClassName="aspect-square max-w-[220px]"
                    previewAlt="Fraktions-Wappen Vorschau"
                    emptyIcon="flag"
                    uploadHint="Wappen oder Symbol hochladen (JPEG/PNG/WebP, max. 5 MB). Wird in TableHeroes gespeichert und auf Detail- & Bühnenkarten angezeigt."
                    isAiGenerated={isAiGenerated}
                    onIsAiGeneratedChange={setIsAiGenerated}
                    uploadRightsConfirmed={uploadRightsConfirmed}
                    onUploadRightsConfirmedChange={setUploadRightsConfirmed}
                    urlRightsConfirmed={urlRightsConfirmed}
                    onUrlRightsConfirmedChange={setUrlRightsConfirmed}
                  />
                  {!portraitFile ? (
                    <div className="rounded border border-hero-border/40 bg-slate-900/40 p-4 space-y-2">
                      <label className="block font-barlow font-bold text-xs uppercase text-gray-400">
                        Alternativ: Bild-URL
                      </label>
                      <input
                        type="url"
                        value={formData.image_url || ""}
                        onChange={(e) => {
                          const nextUrl = e.target.value || null;
                          setFormData({ ...formData, image_url: nextUrl });
                          if (!nextUrl?.trim()) {
                            setIsAiGenerated(false);
                            setUrlRightsConfirmed(false);
                          }
                        }}
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
                        placeholder="https://…"
                      />
                      <p className="font-libre text-xs text-gray-500">
                        Externe URL — bitte KI-Kennzeichnung oder Nutzungsrechte bestätigen (erscheint oben
                        nach Eingabe).
                      </p>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Beschreibung (Spieler-sichtbar)
                  </label>
                  <MarkdownEditor
                    value={formData.description || ""}
                    onChange={(v) => setFormData({ ...formData, description: v || null })}
                    minHeight="min-h-[240px]"
                    placeholder="Kurze Beschreibung für Spieler…"
                  />
                </div>
                <div className="flex items-center gap-3 rounded border border-hero-border/30 bg-slate-900/50 p-4">
                  <input
                    type="checkbox"
                    id="is_revealed"
                    checked={formData.is_revealed}
                    onChange={(e) => setFormData({ ...formData, is_revealed: e.target.checked })}
                    className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
                  />
                  <label htmlFor="is_revealed" className="font-libre text-sm text-gray-300 cursor-pointer">
                    Für Spieler sichtbar
                  </label>
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
                    GM-Notizen (intern)
                  </label>
                  <textarea
                    value={formData.gm_notes || ""}
                    onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value || null })}
                    rows={4}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold border-l-4 border-l-accent-gold resize-none"
                    placeholder="Plottwists, Geheimnisse…"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-hero-border pt-4">
            <div className="flex gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:bg-hero-dark disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </button>
              ) : (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:bg-hero-dark"
                >
                  Abbrechen
                </Link>
              )}
            </div>
            <div>
              {isFinalStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded bg-accent-gold px-6 py-2 font-barlow font-bold uppercase text-black hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-accent-gold/20"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Speichern…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {isEditMode ? "Änderungen speichern" : "Fraktion erstellen"}
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
                >
                  Weiter <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
