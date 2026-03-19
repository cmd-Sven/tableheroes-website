"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Loader2, ArrowLeft, Plus, X, Users } from "lucide-react";
import Link from "next/link";
import { createFaction, updateFaction, getFactions, getFactionRelations, generateFactionForWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { generateFaction } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS, FACTION_MEMBER_ROLES } from "@/src/lib/faction-types";
import { SmartLocationCombobox } from "@/src/components/dashboard/campaigns/npcs/SmartLocationCombobox";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { getAllLocations } from "@/src/app/dashboard/campaigns/[id]/location-actions";

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
  /** Vorbefüllung Name (z. B. aus World Task Board). Nur bei Erstellen. */
  defaultName?: string;
  /** Vorbefüllung Hauptsitz-Ort (z. B. von Orts-Detailseite). */
  defaultHqLocationId?: string;
  locations?: Location[];
  factions?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
};

export function FactionForm({ campaignId, worldId, initialData, defaultName, defaultHqLocationId, locations = [], factions = [], onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [allLocations, setAllLocations] = useState<Location[]>(locations);
  const [allFactions, setAllFactions] = useState<Array<{ id: string; name: string }>>(factions);
  const [factionRelations, setFactionRelations] = useState<FactionRelation[]>([]);
  const [plannedMembers, setPlannedMembers] = useState<PlannedMember[]>([]);

  const isEditMode = !!(initialData?.id);

  // Initialer State (defaultName z. B. von World Task Board; bei Edit initialData.name)
  const [formData, setFormData] = useState<FactionData>({
    name: (initialData?.id ? initialData.name : (defaultName ?? "")) || "",
    type: "Gilde",
    current_status: null,
    description: null,
    image_url: null,
    location_id: defaultHqLocationId ?? null,
    gm_notes: null,
    is_revealed: false,
    appearance: null,
    structure: null,
    philosophy: null,
    important_npcs_info: null,
  });

  // Lade Locations und Factions beim Mount (nur im Kampagnen-Kontext; bei worldId kommen sie von Server)
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
        setAllLocations(locationsData.map((loc: any) => ({ id: loc.id, name: loc.name, type: loc.type || "Ort" })));
        setAllFactions(factionsData.map((f: any) => ({ id: f.id, name: f.name })));
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
    };
    loadData();
  }, [campaignId, worldId, locations, factions]);

  // Lade bestehende Relations im Edit-Mode (nur mit campaignId; Relations sind kampagnen-spezifisch)
  useEffect(() => {
    const factionId = initialData?.id;
    if (!campaignId || !isEditMode || !factionId) return;
    const loadRelations = async () => {
      try {
        const relations = await getFactionRelations(campaignId, factionId);
        setFactionRelations(
          relations.map((rel: any) => ({
            target_faction_id: rel.partnerFactionId,
            relation_type: rel.relationType,
            description: rel.description || null,
          }))
        );
      } catch (error) {
        console.error("Fehler beim Laden der Beziehungen:", error);
      }
    };
    loadRelations();
  }, [isEditMode, initialData?.id, campaignId]);

  // Parst "Name - Rolle" Text (wie auf Detailseite) für Abwärtskompatibilität
  const parseMembersFromText = (text: string | null | undefined): PlannedMember[] => {
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
  };

  // Daten laden, wenn initialData vorhanden ist. Mitglieder = planned_members ODER aus important_npcs_info parsen (eine Quelle)
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
        appearance: initialData.appearance || null,
        structure: initialData.structure || null,
        philosophy: initialData.philosophy || null,
        important_npcs_info: initialData.important_npcs_info || null,
      });
      const pm = (initialData as { planned_members?: Array<{ name: string; role: string; npc_id?: string | null }> }).planned_members;
      if (Array.isArray(pm) && pm.length > 0) {
        setPlannedMembers(pm.map((m) => ({ name: m.name || "", role: m.role || "Mitglied", npc_id: m.npc_id ?? null })));
      } else if (initialData.important_npcs_info && initialData.important_npcs_info.trim() !== "") {
        setPlannedMembers(parseMembersFromText(initialData.important_npcs_info));
      }
    }
  }, [initialData]);

  const handleAIGenerate = async () => {
    if (isEditMode) return;
    if (!campaignId && !worldId) return;

    const prompt = window.prompt("Beschreibe kurz deine Idee für die Fraktion:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = campaignId
        ? await generateFaction(campaignId, prompt)
        : await generateFactionForWorld(worldId!, prompt);

      // Type & Status Matching
      let matchedType = result.type || "Gilde";
      if (!VALID_FACTION_TYPES.includes(matchedType as any)) {
        matchedType = "Gilde";
      }

      let matchedStatus = result.current_status || null;
      if (matchedStatus && !VALID_RELATIONSHIPS.includes(matchedStatus as any)) {
        matchedStatus = null;
      }

      const locationId = (result as any).headquarters_location_id ?? (result as any).location_id ?? null;

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
        location_id: locationId || prev.location_id,
      }));
      const aiPlanned = (result as { planned_members?: Array<{ name: string; role: string }> }).planned_members;
      if (Array.isArray(aiPlanned) && aiPlanned.length > 0) {
        setPlannedMembers(aiPlanned.slice(0, 3).map((m) => ({ name: m.name || "", role: m.role || "Mitglied" })));
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der KI-Generierung.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRelation = () => {
    setFactionRelations([
      ...factionRelations,
      {
        target_faction_id: "",
        relation_type: "Neutral",
        description: null,
      },
    ]);
  };

  const handleRemoveRelation = (index: number) => {
    setFactionRelations(factionRelations.filter((_, i) => i !== index));
  };

  const handleUpdateRelation = (index: number, field: keyof FactionRelation, value: string) => {
    setFactionRelations(
      factionRelations.map((rel, i) => (i === index ? { ...rel, [field]: value } : rel))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const filteredPlanned = plannedMembers.filter((m) => m.name.trim() !== "");
        const plannedPayload = filteredPlanned.map((m) => ({ name: m.name.trim(), role: m.role || "Mitglied", npc_id: m.npc_id ?? undefined }));
        // „Mitglieder“ und „Wichtige Persönlichkeiten“ sind dasselbe: eine Quelle (planned_members), important_npcs_info wird daraus abgeleitet
        const importantNpcsText = filteredPlanned.map((m) => `${m.name.trim()} - ${m.role || "Mitglied"}`).join("\n") || undefined;

        const payload = {
          name: formData.name.trim(),
          type: formData.type,
          current_status: formData.current_status || undefined,
          description: formData.description || undefined,
          image_url: formData.image_url || undefined,
          location_id: formData.location_id || undefined,
          gm_notes: formData.gm_notes || undefined,
          is_revealed: formData.is_revealed,
          appearance: formData.appearance || undefined,
          structure: formData.structure || undefined,
          philosophy: formData.philosophy || undefined,
          important_npcs_info: importantNpcsText,
          planned_members: plannedPayload,
          faction_relations: factionRelations.filter((rel) => rel.target_faction_id && rel.target_faction_id !== initialData?.id),
        };

        let result;
        if (isEditMode && initialData?.id) {
          await updateFaction(initialData.id, payload);
          result = { id: initialData.id };
        } else {
          result = await createFaction(
            worldId
              ? { world_id: worldId, ...payload }
              : { campaign_id: campaignId!, ...payload }
          );
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          if (worldId) {
            if (isEditMode && initialData?.id) {
              router.push(`/dashboard/worlds/${worldId}/factions/${initialData.id}/edit`);
            } else {
              router.push(`/dashboard/worlds/${worldId}/factions`);
            }
          } else if (campaignId) {
            if (isEditMode && initialData?.id) {
              router.push(`/dashboard/campaigns/${campaignId}/factions/${initialData.id}`);
            } else if (result?.id) {
              router.push(`/dashboard/campaigns/${campaignId}/factions/${result.id}`);
            } else {
              router.push(`/dashboard/campaigns/${campaignId}?tab=factions`);
            }
          }
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Ein Fehler ist aufgetreten.");
      }
    });
  };

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
      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Link
            href={worldId ? `/dashboard/worlds/${worldId}/factions` : `/dashboard/campaigns/${campaignId!}?tab=factions`}
            className="hover:text-hero-vibrant transition-colors font-barlow font-bold uppercase"
          >
            Fraktionen
          </Link>
          <span>/</span>
          {isEditMode && initialData && (
            <>
              <Link
                href={worldId ? `/dashboard/worlds/${worldId}/factions/${initialData.id}/edit` : `/dashboard/campaigns/${campaignId!}/factions/${initialData.id}`}
                className="hover:text-hero-vibrant transition-colors font-barlow font-bold uppercase"
              >
                {initialData.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-accent-gold font-barlow font-bold uppercase">
            {isEditMode ? "Bearbeiten" : "Erstellen"}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-hero-dark p-3 border-2 border-accent-gold/60">
            <Shield className="h-8 w-8 text-accent-gold" />
          </div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            {isEditMode ? "Fraktion bearbeiten" : "Neue Fraktion erstellen"}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Generation Button (nur im Create Mode, Kampagnen-Kontext) */}
        {!isEditMode && (campaignId || worldId) && (
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

        {/* Identität Sektion (Erscheinungsbild) */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Identität
          </h2>

          {/* Erscheinungsbild */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Erscheinungsbild
            </label>
            <textarea
              value={formData.appearance || ""}
              onChange={(e) => setFormData({ ...formData, appearance: e.target.value || null })}
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
              placeholder="Wappen, Uniformen, Slogans, Erkennungszeichen..."
            />
          </div>
        </div>

        {/* Innere Werte Sektion */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Innere Werte
          </h2>

          {/* Struktur */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Struktur
            </label>
            <textarea
              value={formData.structure || ""}
              onChange={(e) => setFormData({ ...formData, structure: e.target.value || null })}
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
              placeholder="z.B. Militärisch, Hierarchisch, Demokratisch..."
            />
          </div>

          {/* Philosophie/Ziele */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Philosophie / Ziele
            </label>
            <textarea
              value={formData.philosophy || ""}
              onChange={(e) => setFormData({ ...formData, philosophy: e.target.value || null })}
              rows={4}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
              placeholder="Grundsätze, Ziele, Weltanschauung der Fraktion..."
            />
          </div>
        </div>

        {/* Logistik Sektion */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Logistik
          </h2>

          {/* Stützpunkt */}
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Stützpunkt
            </label>
            <SmartLocationCombobox
              campaignId={campaignId ?? ""}
              locations={allLocations}
              value={formData.location_id || ""}
              onChange={(locationId) => setFormData({ ...formData, location_id: locationId || null })}
              placeholder="-- Kein Stützpunkt --"
              onLocationCreated={(location) => {
                setAllLocations([...allLocations, location]);
                setFormData({ ...formData, location_id: location.id });
              }}
            />
          </div>
        </div>

        {/* Mitglieder Sektion – geplante NPCs (Name + Rolle), später auf der Detailseite als TODO erstellbar */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2">
              Mitglieder
            </h2>
            <button
              type="button"
              onClick={() => setPlannedMembers([...plannedMembers, { name: "", role: "Mitglied", npc_id: null }])}
              className="flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold transition-colors hover:bg-accent-gold/40"
            >
              <Plus className="h-4 w-4" />
              Mitglied hinzufügen
            </button>
          </div>
          <p className="font-libre text-sm text-gray-400 mb-4">
            Diese Mitglieder erscheinen auf der Fraktions-Detailseite als Liste. Du kannst sie dort per „NPC generieren“ anlegen und mit der Fraktion verknüpfen.
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
                        plannedMembers.map((m, i) => (i === index ? { ...m, name: e.target.value } : m))
                      )
                    }
                    placeholder="Name des Mitglieds"
                    className="flex-1 min-w-0 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-white outline-none focus:border-accent-gold"
                  />
                  <select
                    value={member.role}
                    onChange={(e) =>
                      setPlannedMembers(
                        plannedMembers.map((m, i) => (i === index ? { ...m, role: e.target.value } : m))
                      )
                    }
                    className="rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-white outline-none focus:border-accent-gold min-w-[180px]"
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
                    className="p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors"
                    title="Entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-libre text-sm text-gray-400 italic">
              Noch keine geplanten Mitglieder. Mit „Mitglied hinzufügen“ Namen und Rolle eintragen – auf der Detailseite kannst du daraus NPCs erstellen.
            </p>
          )}
        </div>

        {/* Diplomatie Sektion */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2">
              Diplomatie
            </h2>
            <button
              type="button"
              onClick={handleAddRelation}
              className="flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold transition-colors hover:bg-accent-gold/40"
            >
              <Plus className="h-4 w-4" />
              Beziehung hinzufügen
            </button>
          </div>

          {factionRelations.length > 0 ? (
            <div className="space-y-3">
              {factionRelations.map((relation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-hero-border bg-hero-dark/30 p-4"
                >
                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
                        Fraktion
                      </label>
                      <select
                        value={relation.target_faction_id}
                        onChange={(e) =>
                          handleUpdateRelation(index, "target_faction_id", e.target.value)
                        }
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
                      >
                        <option value="">-- Fraktion wählen --</option>
                        {allFactions
                          .filter((f) => f.id !== initialData?.id)
                          .map((faction) => (
                            <option key={faction.id} value={faction.id}>
                              {faction.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
                        Beziehungstyp
                      </label>
                      <select
                        value={relation.relation_type}
                        onChange={(e) =>
                          handleUpdateRelation(index, "relation_type", e.target.value)
                        }
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold"
                      >
                        {[...VALID_RELATIONSHIPS].map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
                        Beschreibung (optional)
                      </label>
                      <textarea
                        value={relation.description || ""}
                        onChange={(e) =>
                          handleUpdateRelation(index, "description", e.target.value ?? "")
                        }
                        rows={2}
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-white outline-none transition-all focus:border-accent-gold resize-none"
                        placeholder="Details zur Beziehung..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRelation(index)}
                    className="mt-6 rounded border border-red-900/60 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                    title="Beziehung entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-libre text-sm text-gray-400 italic">
              Noch keine Beziehungen zu anderen Fraktionen definiert.
            </p>
          )}
        </div>

        {/* Öffentliche Informationen Sektion */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Öffentliche Informationen
          </h2>

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
            <MarkdownEditor
              value={formData.description || ""}
              onChange={(v) => setFormData({ ...formData, description: v || null })}
              minHeight="min-h-[400px]"
              placeholder="Eine kurze Beschreibung, die Spieler sehen können. Markdown: **fett**, *kursiv*, Listen, Überschriften, Zitate."
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
        </div>

        {/* GM-Notizen Sektion */}
        <div className="gothic-dashboard-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            🔒 GM-Notizen
          </h2>

          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
              Interne Notizen (Nur für dich)
            </label>
            <textarea
              value={formData.gm_notes || ""}
              onChange={(e) => setFormData({ ...formData, gm_notes: e.target.value || null })}
              rows={4}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold border-l-4 border-l-accent-gold resize-none"
              placeholder="Interne Notizen, Plottwists, Geheimnisse..."
            />
          </div>
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
            className="rounded bg-accent-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-accent-gold/20"
          >
            {isPending ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Fraktion erstellen"}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}

