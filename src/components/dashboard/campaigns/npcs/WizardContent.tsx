"use client";

import React, { useState } from "react";
import { X, ChevronLeft, Sparkles, Loader2, CheckCircle2, ArrowRight, Eye, HeartPulse, Scroll } from "lucide-react";
import { ContextNPCsWidget, type InferenceSuggestion } from "./NPCForm";
import { SmartLocationCombobox } from "./SmartLocationCombobox";
import { SmartFactionCombobox } from "./SmartFactionCombobox";
import { NameInput, RaceInput, RoleInput } from "./WizardInputs";
import { CheckResultsEditor } from "./CheckResultsEditor";
import { LOCATION_TYPES } from "@/src/lib/lore-types";
import { NpcPortraitUploadField } from "./NpcPortraitUploadField";
import type { ImageDisplaySettings } from "@/src/lib/image-display";

// Types
type WorldEntity = {
  name: string;
  type: string;
  parent_location_name?: string;
  headquarters_location_name?: string;
  isSelected: boolean;
  id?: string;
};

type WizardData = {
  name: string;
  race: string;
  role: string;
  status: string;
  alignment: string;
  briefing: string;
  faction_id: string;
  current_location_id: string;
  home_location_id: string;
  selectedContextNPCs: Array<{ npcId: string; relationType: string }>;
  inferenceSuggestions: Record<string, InferenceSuggestion[]>;
  selectedInferenceSuggestions: Set<string>;
  processedHooks?: Set<string>; // Set von Hook-Namen, die bereits verarbeitet wurden
  worldEntities?: {
    locations: WorldEntity[];
    factions: WorldEntity[];
  };
  aiGenerated?: {
    description?: string;
    appearance?: string;
    personality_traits?: string;
    gm_notes?: string;
    title?: string;
    narrative_hooks?: any[];
    discoveries?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      title: string;
      content: string;
      skill_check: string;
    }>;
    check_results?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }>;
  };
  finalData?: {
    description: string;
    appearance: string;
    personality_traits: string;
    gm_notes: string;
    title: string;
    image_url: string;
    is_revealed: boolean;
    check_results?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }>;
  };
};

type HookContext = {
  sourceNPCId?: string;
  sourceNPCName?: string;
  hook?: {
    name?: string;
    role?: string;
    description?: string;
    is_alive?: boolean;
  };
};

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

const NPC_STATUSES = [
  { value: "Alive", label: "🟢 Lebendig" },
  { value: "Deceased", label: "🔴 Verstorben" },
  { value: "Missing", label: "🟡 Vermisst" },
  { value: "Unknown", label: "⚪ Unbekannt" },
];

const RELATION_TYPES = [
  "Vater", "Mutter", "Sohn", "Tochter",
  "Mentor", "Schüler", "Partner", "Freund", "Feind",
  "Kollege", "Bekannter", "Vorgesetzter", "Untergebener",
  "Andere",
];

// Props für WizardContent
type WizardContentProps = {
  currentStep: number;
  wizardData: WizardData;
  embedded: boolean;
  isAnalyzingWorld: boolean;
  worldEntities: { locations: WorldEntity[]; factions: WorldEntity[] } | null;
  hookContext?: HookContext;
  isAnalyzingBriefing: boolean;
  foundNPCs: Array<{
    name: string;
    role: string;
    suggestedRelationType: string;
    context: string;
    existsInCampaign?: boolean;
  }>;
  campaignNPCs: Array<{ id: string; name: string }>;
  factionRelationship: string;
  isLoadingContext: boolean;
  contextNPCs: {
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  } | null;
  inferenceSuggestions: Record<string, InferenceSuggestion[]>;
  selectedInferenceSuggestions: Set<string>;
  isGenerating: boolean;
  isTransitioning: boolean;
  transitionMessage: string;
  isPending: boolean;
  handleNameChange: (value: string) => void;
  handleRaceChange: (value: string) => void;
  handleRoleChange: (value: string) => void;
  handleBriefingChange: (value: string) => void;
  updateWizardData: (updates: Partial<WizardData>) => void;
  updateFinalData: (updates: Partial<WizardData["finalData"]>) => void;
  setCurrentStep: (step: number) => void;
  handleStep1Next: () => void;
  handleStep2Next: () => void;
  handleStep4Generate: () => void;
  handleStep4Next: () => void;
  handleStep5Create: () => void;
  onClose: () => void;
  campaignId: string;
  factionsList: Array<{ id: string; name: string }>;
  locationsList: Array<{ id: string; name: string; type: string }>;
  setWorldEntities: React.Dispatch<React.SetStateAction<{
    locations: WorldEntity[];
    factions: WorldEntity[];
  } | null>>;
  setLocationsList: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; type: string }>>>;
  setFactionsList: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string }>>>;
  setInferenceSuggestions: React.Dispatch<React.SetStateAction<Record<string, InferenceSuggestion[]>>>;
  setSelectedInferenceSuggestions: React.Dispatch<React.SetStateAction<Set<string>>>;
  portraitFile: File | null;
  setPortraitFile: React.Dispatch<React.SetStateAction<File | null>>;
  portraitDisplay: ImageDisplaySettings;
  setPortraitDisplay: React.Dispatch<React.SetStateAction<ImageDisplaySettings>>;
};

// WizardContent als separate Komponente
export function WizardContent({
  currentStep,
  wizardData,
  embedded,
  isAnalyzingWorld,
  worldEntities,
  hookContext,
  isAnalyzingBriefing,
  foundNPCs,
  campaignNPCs,
  factionRelationship,
  isLoadingContext,
  contextNPCs,
  inferenceSuggestions,
  selectedInferenceSuggestions,
  isGenerating,
  isTransitioning,
  transitionMessage,
  isPending,
  handleNameChange,
  handleRaceChange,
  handleRoleChange,
  handleBriefingChange,
  updateWizardData,
  updateFinalData,
  setCurrentStep,
  handleStep1Next,
  handleStep2Next,
  handleStep4Generate,
  handleStep4Next,
  handleStep5Create,
  onClose,
  campaignId,
  factionsList,
  locationsList,
  setWorldEntities,
  setLocationsList,
  setFactionsList,
  setInferenceSuggestions,
  setSelectedInferenceSuggestions,
  portraitFile,
  setPortraitFile,
  portraitDisplay,
  setPortraitDisplay,
}: WizardContentProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-hero-border bg-background-card">
        <h2 className="font-cinzel font-bold text-2xl text-hero-vibrant">
          NPC mit KI erstellen
        </h2>
        {embedded ? (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-hero-dark text-white font-barlow font-bold uppercase hover:bg-hero-dark/80 transition-colors border border-hero-border"
          >
            Abbrechen
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-hero-dark transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-4 border-b border-hero-border bg-background-card">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-barlow font-bold transition-all ${
                    currentStep === step
                      ? "bg-hero-vibrant text-black"
                      : currentStep > step
                      ? "bg-hero-vibrant/50 text-white"
                      : "bg-hero-dark text-gray-400 border-2 border-hero-border"
                  }`}
                >
                  {currentStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
                </div>
                <span
                  className={`font-barlow font-semibold text-sm ${
                    currentStep >= step ? "text-hero-vibrant" : "text-gray-500"
                  }`}
                >
                  {step === 1 && "Identität"}
                  {step === 2 && "Welt-Kontext"}
                  {step === 3 && "Soziales Umfeld"}
                  {step === 4 && "KI-Generierung"}
                  {step === 5 && "Finalisierung"}
                </span>
              </div>
              {step < 5 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? "bg-hero-vibrant" : "bg-hero-border"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Schritt 1: Identität & wichtigste Fakten (Orte + NPC-Verknüpfung + Briefing; KI erst später) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
              Identität & Briefing
            </h3>
            <p className="font-libre text-gray-400 text-sm">
              Zuerst die wichtigsten Fakten und das Briefing festlegen. Aussehen und Beschreibung erstellt die KI erst in Schritt 4.
            </p>

            {/* Name & Rasse */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Name des NPCs *
                </label>
                <NameInput
                  value={wizardData.name}
                  onChange={handleNameChange}
                />
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Rasse
                </label>
                <RaceInput
                  value={wizardData.race}
                  onChange={handleRaceChange}
                />
              </div>
            </div>

            {/* Rolle & Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Rolle / Beruf
                </label>
                <RoleInput
                  value={wizardData.role}
                  onChange={handleRoleChange}
                />
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Status
                </label>
                <select
                  value={wizardData.status}
                  onChange={(e) => updateWizardData({ status: e.target.value })}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                >
                  {NPC_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gesinnung */}
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Gesinnung
              </label>
              <select
                value={wizardData.alignment}
                onChange={(e) => updateWizardData({ alignment: e.target.value })}
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
              >
                <option value="">-- Keine Gesinnung --</option>
                {ALIGNMENTS.map((alignment) => (
                  <option key={alignment} value={alignment}>
                    {alignment}
                  </option>
                ))}
              </select>
            </div>

            {/* Wichtigste Fakten: Wohnort, Aufenthaltsort, Fraktion */}
            <div className="rounded-lg border border-hero-border bg-background-card p-4 space-y-4">
              <h4 className="font-cinzel font-bold text-accent-gold">Wichtigste Fakten</h4>
              <p className="text-xs text-gray-400 font-libre">
                Wohnort und Aufenthaltsort festlegen, damit die KI keine erfundenen Orte nutzt.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SmartLocationCombobox
                  campaignId={campaignId}
                  locations={locationsList}
                  value={wizardData.home_location_id}
                  onChange={(locationId) => updateWizardData({ home_location_id: locationId })}
                  label="Wohnort / Heimatort"
                  onLocationCreated={(newLocation) => {
                    setLocationsList((prev) => [...prev, newLocation]);
                  }}
                />
                <SmartLocationCombobox
                  campaignId={campaignId}
                  locations={locationsList}
                  value={wizardData.current_location_id}
                  onChange={(locationId) => updateWizardData({ current_location_id: locationId })}
                  label="Aktueller Aufenthaltsort"
                  onLocationCreated={(newLocation) => {
                    setLocationsList((prev) => [...prev, newLocation]);
                  }}
                />
              </div>
              <SmartFactionCombobox
                campaignId={campaignId}
                factions={factionsList}
                locations={locationsList}
                value={wizardData.faction_id}
                onChange={(factionId) => updateWizardData({ faction_id: factionId })}
                label="Fraktion"
                onFactionCreated={(newFaction) => {
                  setFactionsList((prev) => [...prev, newFaction]);
                }}
              />
            </div>

            {/* Bereits existierende NPC verbinden */}
            <div className="rounded-lg border border-hero-border bg-background-card p-4 space-y-3">
              <h4 className="font-cinzel font-bold text-accent-gold">Bereits existierenden NPC verbinden</h4>
              <p className="text-xs text-gray-400 font-libre">
                Optional: Verknüpfe diesen NPC mit einem bereits angelegten Charakter und gib die Beziehungsart an.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    NPC
                  </label>
                  <select
                    value={wizardData.selectedContextNPCs[0]?.npcId ?? ""}
                    onChange={(e) => {
                      const npcId = e.target.value;
                      const currentRelation = wizardData.selectedContextNPCs[0]?.relationType ?? "Andere";
                      if (!npcId) {
                        updateWizardData({ selectedContextNPCs: [] });
                      } else {
                        updateWizardData({
                          selectedContextNPCs: [{ npcId, relationType: currentRelation }],
                        });
                      }
                    }}
                    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  >
                    <option value="">— Kein NPC —</option>
                    {campaignNPCs.map((npc) => (
                      <option key={npc.id} value={npc.id}>
                        {npc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Beziehungsart
                  </label>
                  <select
                    value={wizardData.selectedContextNPCs[0]?.relationType ?? "Andere"}
                    onChange={(e) => {
                      const relationType = e.target.value;
                      const npcId = wizardData.selectedContextNPCs[0]?.npcId;
                      if (!npcId) return;
                      updateWizardData({
                        selectedContextNPCs: [{ npcId, relationType }],
                      });
                    }}
                    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  >
                    {RELATION_TYPES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Briefing mit Anweisung */}
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
                Briefing / Charakter-Anweisungen
              </label>
              <textarea
                value={wizardData.briefing}
                onChange={(e) => handleBriefingChange(e.target.value)}
                rows={4}
                placeholder="z.B.: Persönlichkeit (z. B. zurückhaltend, charismatisch), besondere Merkmale (Narbe, Akzent), Motivation und Ziele. Die KI nutzt das erst in Schritt 4 für Aussehen und Beschreibung."
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-y placeholder:text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500 font-libre">
                Kurz beschreiben: <strong>Persönlichkeit</strong>, <strong>besondere Merkmale</strong>, <strong>Motivation</strong>. Erst danach erstellt die KI in Schritt 4 Aussehen und Beschreibung.
              </p>
            </div>

            {/* Hinweis: KI kommt erst in Schritt 4 */}
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-amber-200/90 text-sm font-libre">
              <strong className="font-barlow uppercase text-amber-400">Ablauf:</strong> Nach Schritt 2 und 3 startest du in Schritt 4 die KI-Generierung für Aussehen und Beschreibung. Vorher müssen Aufenthaltsort und Heimatort gesetzt sein.
            </div>
          </div>
        )}

        {/* Schritt 2: Welt-Kontext bestätigen */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
              Welt-Kontext bestätigen
            </h3>

            {isAnalyzingWorld ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
                <span className="ml-3 font-libre text-gray-400">Analysiere Briefing...</span>
              </div>
            ) : worldEntities && (worldEntities.locations.length > 0 || worldEntities.factions.length > 0) ? (
              <div className="space-y-6">
                <p className="font-libre text-gray-300">
                  Die KI hat folgende Orte und Fraktionen in deinem Briefing erkannt. Wähle aus, welche automatisch erstellt werden sollen:
                </p>

                {/* Locations */}
                {worldEntities.locations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-cinzel font-bold text-lg text-accent-gold">Orte</h4>
                    {worldEntities.locations.map((loc, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-lg border border-hero-border bg-background-card">
                        <input
                          type="checkbox"
                          checked={loc.isSelected}
                          onChange={(e) => {
                            setWorldEntities(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                locations: prev.locations.map((l, i) => i === idx ? { ...l, isSelected: e.target.checked } : l),
                              };
                            });
                          }}
                          className="w-5 h-5 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-barlow font-semibold text-white">{loc.name}</span>
                            <select
                              value={loc.type}
                              onChange={(e) => {
                                setWorldEntities(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    locations: prev.locations.map((l, i) => i === idx ? { ...l, type: e.target.value } : l),
                                  };
                                });
                              }}
                              className="px-2 py-1 rounded border border-hero-dark bg-slate-900 text-white text-sm"
                            >
                              {LOCATION_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          {loc.parent_location_name && (
                            <p className="text-sm text-gray-400 mt-1">
                              Liegt in: {loc.parent_location_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Factions */}
                {worldEntities.factions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-cinzel font-bold text-lg text-accent-gold">Fraktionen</h4>
                    {worldEntities.factions.map((faction, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-lg border border-hero-border bg-background-card">
                        <input
                          type="checkbox"
                          checked={faction.isSelected}
                          onChange={(e) => {
                            setWorldEntities(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                factions: prev.factions.map((f, i) => i === idx ? { ...f, isSelected: e.target.checked } : f),
                              };
                            });
                          }}
                          className="w-5 h-5 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-barlow font-semibold text-white">{faction.name}</span>
                            <select
                              value={faction.type}
                              onChange={(e) => {
                                setWorldEntities(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    factions: prev.factions.map((f, i) => i === idx ? { ...f, type: e.target.value } : f),
                                  };
                                });
                              }}
                              className="px-2 py-1 rounded border border-hero-dark bg-slate-900 text-white text-sm"
                            >
                              <option value="Gilde">Gilde</option>
                              <option value="Militär">Militär</option>
                              <option value="Politik">Politik</option>
                              <option value="Religion">Religion</option>
                              <option value="Stamm">Stamm</option>
                              <option value="Söldner">Söldner</option>
                              <option value="Regierung">Regierung</option>
                              <option value="Kult">Kult</option>
                              <option value="Akademie">Akademie</option>
                              <option value="Organisation">Organisation</option>
                              <option value="Königreich">Königreich</option>
                              <option value="Allianz">Allianz</option>
                              <option value="Orden">Orden</option>
                              <option value="Andere">Andere</option>
                            </select>
                          </div>
                          {faction.headquarters_location_name && (
                            <p className="text-sm text-gray-400 mt-1">
                              Hauptsitz: {faction.headquarters_location_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-hero-border bg-background-card p-8 text-center">
                <p className="font-libre text-gray-400">
                  Keine neuen Orte oder Fraktionen im Briefing erkannt. Du kannst direkt fortfahren.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Schritt 3: Soziales Umfeld */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
              Soziales Umfeld
            </h3>
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-amber-200/90 text-sm font-libre">
              <strong className="font-barlow uppercase text-amber-400">Vor der KI-Generierung:</strong> Aufenthaltsort und Heimatort müssen festgelegt sein, damit die KI keine erfundenen Orte verwendet.
            </div>

            {hookContext?.sourceNPCName && (
              <div className="rounded-lg border border-accent-gold/50 bg-accent-gold/10 p-4 mb-6">
                <p className="font-libre text-gray-300">
                  <span className="font-semibold text-accent-gold">Story-Hook:</span>{" "}
                  {hookContext.sourceNPCName} ({hookContext.hook?.role}) ist bereits als Beziehung vorausgewählt.
                </p>
              </div>
            )}

            {/* Lade-Animation während Briefing-Analyse */}
            {isAnalyzingBriefing && (
              <div className="relative flex items-center justify-center py-24 mb-6 rounded-lg border border-hero-border bg-[#0a1f16] backdrop-blur-sm">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Loader2 className="h-16 w-16 animate-spin text-accent-gold" />
                  <span className="font-libre text-xl text-white font-semibold">Analysiere Briefing...</span>
                </div>
              </div>
            )}

            {/* Gefundene NPCs im Briefing */}
            {!isAnalyzingBriefing && foundNPCs.length > 0 && (
              <div className="rounded-lg border border-hero-border bg-background-card p-6 mb-6">
                <h4 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
                  Gefundene Charaktere im Text
                </h4>
                <div className="space-y-3">
                  {foundNPCs.map((npc, idx) => {
                    const existingNPC = campaignNPCs.find(
                      (c) => c.name.toLowerCase().trim() === npc.name.toLowerCase().trim()
                    );
                    const isExisting = npc.existsInCampaign || !!existingNPC;
                    const hookKey = npc.name.toLowerCase().trim();
                    const isProcessed = wizardData.processedHooks?.has
                      ? wizardData.processedHooks.has(hookKey)
                      : false;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-hero-border bg-hero-dark/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-barlow font-semibold text-white">{npc.name}</span>
                            {npc.role && (
                              <span className="text-sm text-gray-400">({npc.role})</span>
                            )}
                            {isExisting && (
                              <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300 text-xs font-barlow font-semibold border border-blue-700">
                                Existiert bereits
                              </span>
                            )}
                          </div>
                          {npc.context && (
                            <p className="text-sm text-gray-400 mt-1">{npc.context}</p>
                          )}
                        </div>
                        {isExisting && existingNPC ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateWizardData({
                                selectedContextNPCs: [
                                  ...wizardData.selectedContextNPCs,
                                  { npcId: existingNPC.id, relationType: npc.suggestedRelationType || "Andere" },
                                ],
                              });
                              alert(`"${npc.name}" wurde als Beziehung hinzugefügt.`);
                            }}
                            className="ml-4 px-4 py-2 rounded border border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant font-barlow font-bold text-sm uppercase hover:bg-hero-vibrant/30 transition-colors"
                          >
                            Verknüpfen
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessed}
                            onClick={() => {
                              // Lokalen Hook-Status aktualisieren, damit der Button seinen Zustand ändert
                              const next = new Set(wizardData.processedHooks ?? new Set<string>());
                              next.add(hookKey);
                              updateWizardData({
                                processedHooks: next as any,
                              });
                            }}
                            className={`ml-4 px-4 py-2 rounded font-barlow font-bold text-sm uppercase transition-colors border ${
                              isProcessed
                                ? "border-emerald-500 text-emerald-300 bg-transparent cursor-default"
                                : "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant hover:bg-hero-vibrant/30"
                            }`}
                          >
                            {isProcessed ? "✅ Hook angelegt" : "[+] Als Hook anlegen"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fraktions-Beziehungshinweis */}
            {factionRelationship && (
              <div className="rounded-lg border border-hero-border bg-background-card p-4 mb-6">
                <p className="font-libre text-gray-300">
                  <span className="font-semibold text-accent-gold">Hinweis:</span>{" "}
                  Die ausgewählte Fraktion hat eine <span className="font-semibold">{factionRelationship}</span> Beziehung zu anderen Fraktionen im Briefing.
                  {factionRelationship === "Feindlich" && " NPCs dieser Fraktion werden automatisch als 'Feind' vorgeschlagen."}
                </p>
              </div>
            )}

            {isLoadingContext ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
                <span className="ml-3 font-libre text-gray-400">Lade mögliche Kontakte...</span>
              </div>
            ) : contextNPCs ? (
              <ContextNPCsWidget
                campaignId={campaignId}
                contextNPCs={contextNPCs}
                selectedContextNPCs={wizardData.selectedContextNPCs}
                selectedFactionId={wizardData.faction_id || null}
                factionRelationship={factionRelationship}
                onSelectNPC={(npcId, relationType) => {
                  updateWizardData({
                    selectedContextNPCs: (() => {
                      const existing = wizardData.selectedContextNPCs.findIndex((s) => s.npcId === npcId);
                      if (existing >= 0) {
                        if (relationType) {
                          const updated = [...wizardData.selectedContextNPCs];
                          updated[existing] = { npcId, relationType };
                          return updated;
                        } else {
                          return wizardData.selectedContextNPCs.filter((s) => s.npcId !== npcId);
                        }
                      } else if (relationType) {
                        return [...wizardData.selectedContextNPCs, { npcId, relationType }];
                      }
                      return wizardData.selectedContextNPCs;
                    })(),
                  });
                }}
                onInferenceSuggestionsChange={(suggestions) => {
                  setInferenceSuggestions(suggestions);
                  updateWizardData({
                    inferenceSuggestions: suggestions,
                  });
                }}
                onSelectedSuggestionsChange={(selected) => {
                  setSelectedInferenceSuggestions(selected);
                  updateWizardData({
                    selectedInferenceSuggestions: selected,
                  });
                }}
              />
            ) : (
              <div className="rounded-lg border border-hero-border bg-background-card p-8 text-center">
                <p className="font-libre text-gray-400">
                  Wähle in Schritt 1 einen Ort oder eine Fraktion aus, um mögliche Kontakte zu sehen.
                </p>
              </div>
            )}

            {/* Weiter-Button für Schritt 3: nur wenn Heimatort und Aufenthaltsort gesetzt */}
            {!wizardData.current_location_id || !wizardData.home_location_id ? (
              <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 pt-6 border-t border-hero-border">
                <p className="font-libre text-amber-200/90 text-sm mb-4">
                  Bitte wähle <strong>Aufenthaltsort</strong> und <strong>Heimatort</strong>, bevor du zur KI-Generierung gehst.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 rounded bg-gray-700 text-white font-barlow font-bold uppercase hover:bg-gray-600 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 inline-block mr-2" />
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-8 py-4 rounded bg-gray-600 text-gray-400 font-barlow font-bold uppercase cursor-not-allowed"
                  >
                    Story generieren (Orte fehlen)
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-hero-border">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 rounded bg-gray-700 text-white font-barlow font-bold uppercase hover:bg-gray-600 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 inline-block mr-2" />
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 hover:shadow-none transition-all group relative overflow-hidden button-glint"
                >
                  <span className="relative z-10 flex items-center">
                    Story generieren
                    <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schritt 4: KI-Generierung & Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
              KI-Generierung & Review
            </h3>

            {isGenerating || isTransitioning ? (
              <div className="relative flex items-center justify-center py-24 mb-6 rounded-lg border border-hero-border bg-[#0a1f16] backdrop-blur-sm">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Loader2 className="h-16 w-16 animate-spin text-accent-gold" />
                  <span className="font-libre text-xl text-white font-semibold">
                    {isGenerating ? "KI generiert die Geschichte..." : transitionMessage || "Lade..."}
                  </span>
                </div>
              </div>
            ) : !wizardData.aiGenerated ? (
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 text-accent-gold mx-auto mb-4" />
                <p className="font-libre text-gray-300 mb-6">
                  Die KI wird jetzt eine Biografie, Aussehen und Persönlichkeit für{" "}
                  <span className="font-semibold text-hero-vibrant">{wizardData.name}</span> generieren.
                </p>
                <button
                  type="button"
                  onClick={handleStep4Generate}
                  disabled={isGenerating}
                  className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group relative overflow-hidden button-glint"
                >
                  <span className="relative z-10 flex items-center">
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 inline-block animate-spin mr-2" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 inline-block mr-2" />
                        Mit KI generieren
                      </>
                    )}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-background-card border border-hero-border rounded-lg p-6">
                  <h4 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
                    ✨ Generierte Inhalte
                  </h4>
                  <p className="font-libre text-sm text-gray-400 mb-4">
                    Überprüfe und bearbeite die generierten Texte, bevor du fortfährst.
                  </p>
                </div>
                
                <div>
                  <label className="mb-2 block font-barlow font-bold text-base uppercase text-accent-gold">
                    📖 Biografie / Beschreibung (Spieler-sichtbar)
                  </label>
                  <textarea
                    value={wizardData.finalData?.description || wizardData.aiGenerated?.description || ""}
                    onChange={(e) => updateFinalData({ description: e.target.value })}
                    rows={6}
                    className="w-full rounded border-2 border-hero-border bg-slate-900 p-4 font-libre text-white text-base leading-relaxed outline-none transition-all focus:border-accent-gold resize-y"
                    placeholder="Die KI generiert hier eine ausführliche Biografie..."
                  />
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-barlow font-bold text-base uppercase text-accent-gold">
                      👤 Aussehen
                    </label>
                    <textarea
                      value={wizardData.finalData?.appearance || wizardData.aiGenerated?.appearance || ""}
                      onChange={(e) => updateFinalData({ appearance: e.target.value })}
                      rows={8}
                      className="w-full rounded border-2 border-hero-border bg-slate-900 p-4 font-libre text-white text-base leading-relaxed outline-none transition-all focus:border-accent-gold resize-y"
                      placeholder="Die KI generiert hier eine detaillierte Beschreibung des Aussehens..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-barlow font-bold text-base uppercase text-accent-gold">
                      🎭 Persönlichkeit
                    </label>
                    <textarea
                      value={wizardData.finalData?.personality_traits || wizardData.aiGenerated?.personality_traits || ""}
                      onChange={(e) => updateFinalData({ personality_traits: e.target.value })}
                      rows={8}
                      className="w-full rounded border-2 border-hero-border bg-slate-900 p-4 font-libre text-white text-base leading-relaxed outline-none transition-all focus:border-accent-gold resize-y"
                      placeholder="Die KI generiert hier eine Beschreibung der Persönlichkeit..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="mb-2 block font-barlow font-bold text-base uppercase text-accent-gold">
                    🔒 GM-Notizen (Nur für Game Master sichtbar)
                  </label>
                  <textarea
                    value={wizardData.finalData?.gm_notes || wizardData.aiGenerated?.gm_notes || ""}
                    onChange={(e) => updateFinalData({ gm_notes: e.target.value })}
                    rows={5}
                    className="w-full rounded border-2 border-hero-border bg-slate-900 p-4 font-libre text-white text-base leading-relaxed outline-none transition-all focus:border-accent-gold resize-y border-l-4 border-l-accent-gold"
                    placeholder="Zusätzliche Notizen für den Game Master..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schritt 5: Finalisierung */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
              Finalisierung & Speichern
            </h3>

            <div className="bg-hero-dark/30 rounded-lg p-4 border border-hero-border">
              <p className="font-libre text-gray-300 mb-4">
                Der NPC <span className="font-semibold text-hero-vibrant">{wizardData.name}</span> wird jetzt erstellt.
              </p>
              {wizardData.selectedContextNPCs.length > 0 && (
                <div className="mt-4">
                  <p className="font-barlow font-semibold text-sm text-gray-400 mb-2">
                    Folgende Beziehungen werden automatisch erstellt:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {wizardData.selectedContextNPCs.map((ctx) => {
                      const npc = [
                        ...(contextNPCs?.sameLocation || []),
                        ...(contextNPCs?.nearbyLocations || []),
                        ...(contextNPCs?.sameFaction || []),
                      ].find((n) => n.id === ctx.npcId);
                      return (
                        <li key={ctx.npcId}>
                          {npc?.name || "Unbekannter NPC"} - {ctx.relationType}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Portrait (optional)
              </label>
              <NpcPortraitUploadField
                imageUrl={wizardData.finalData?.image_url || ""}
                portraitFile={portraitFile}
                onPortraitFileChange={setPortraitFile}
                imageDisplay={portraitDisplay}
                onImageDisplayChange={setPortraitDisplay}
                onClearImage={() => {
                  setPortraitFile(null);
                  updateFinalData({ image_url: "" });
                }}
                previewAspectClassName="aspect-[3/4] max-w-[200px]"
                compact
              />
            </div>

            <div className="flex items-center gap-3 rounded border border-hero-border/30 bg-slate-900/50 p-4">
              <input
                type="checkbox"
                id="is_revealed"
                checked={wizardData.finalData?.is_revealed || false}
                onChange={(e) => updateFinalData({ is_revealed: e.target.checked })}
                className="h-5 w-5 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
              />
              <label htmlFor="is_revealed" className="font-libre text-sm text-gray-300 cursor-pointer select-none">
                Für Spieler sichtbar
              </label>
            </div>

            {/* Entdeckungen & Wissen */}
            {wizardData.aiGenerated?.discoveries && wizardData.aiGenerated.discoveries.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
                  🔍 Entdeckungen & Wissen
                </h4>
                <div className="space-y-3">
                  {wizardData.aiGenerated.discoveries.map((discovery, idx) => {
                    const getIcon = () => {
                      switch (discovery.type) {
                        case "Wahrnehmung":
                          return <Eye className="h-5 w-5 text-blue-400" />;
                        case "Motiv erkennen":
                          return <HeartPulse className="h-5 w-5 text-red-400" />;
                        case "Wissen":
                          return <Scroll className="h-5 w-5 text-yellow-400" />;
                        default:
                          return <Eye className="h-5 w-5 text-gray-400" />;
                      }
                    };

                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-hero-border bg-background-card p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getIcon()}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-barlow font-semibold text-white">
                                {discovery.title}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-hero-dark/50 text-xs text-gray-400 font-barlow font-semibold border border-hero-border">
                                {discovery.type}
                              </span>
                              {discovery.skill_check && (
                                <span className="px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold text-xs font-barlow font-semibold border border-accent-gold/50">
                                  {discovery.skill_check}
                                </span>
                              )}
                            </div>
                            <p className="font-libre text-sm text-gray-300 leading-relaxed">
                              {discovery.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 font-libre italic">
                  Diese Entdeckungen werden automatisch als Secrets für diesen NPC gespeichert.
                </p>
              </div>
            )}

            {/* Ergebnisse für Spielerproben (check_results) – GM nutzt sie bei Spielerwürfen */}
            {(wizardData.aiGenerated?.check_results && wizardData.aiGenerated.check_results.length > 0) ||
            (wizardData.finalData?.check_results && wizardData.finalData.check_results.length > 0) ? (
              <div className="mt-6">
                <CheckResultsEditor
                  checkResults={wizardData.finalData?.check_results || wizardData.aiGenerated?.check_results || []}
                  onChange={(results) => updateFinalData({ check_results: results })}
                  isGM={true}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-hero-border bg-background-card">
        <button
          type="button"
          onClick={currentStep > 1 ? () => setCurrentStep(currentStep - 1) : onClose}
          className="px-6 py-3 rounded bg-hero-dark text-white font-barlow font-bold uppercase hover:bg-hero-dark/80 transition-colors border border-hero-border"
        >
          <ChevronLeft className="h-4 w-4 inline-block mr-2" />
          {currentStep > 1 ? "Zurück" : "Abbrechen"}
        </button>

        <div className="flex gap-3">
          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleStep1Next}
              disabled={!wizardData.name.trim() || isTransitioning}
              className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600 transition-all group relative overflow-hidden button-glint"
            >
              <span className="relative z-10 flex items-center">
                Weiter zum sozialen Umfeld
                <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          )}

          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleStep2Next}
              disabled={isTransitioning}
              className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all group relative overflow-hidden button-glint"
            >
              <span className="relative z-10 flex items-center">
                Weiter zum sozialen Umfeld
                <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          )}

          {currentStep === 4 && wizardData.aiGenerated && (
            <button
              type="button"
              onClick={handleStep4Next}
              className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 hover:shadow-none transition-all group relative overflow-hidden button-glint"
            >
              <span className="relative z-10 flex items-center">
                Weiter zur Finalisierung
                <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          )}

          {currentStep === 5 && (
            <button
              type="button"
              onClick={handleStep5Create}
              disabled={isPending || !wizardData.finalData}
              className="px-8 py-4 rounded bg-amber-600 text-black font-barlow font-bold uppercase shadow-lg hover:bg-amber-500 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600 transition-all group relative overflow-hidden button-glint"
            >
              <span className="relative z-10 flex items-center">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 inline-block animate-spin mr-2" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    NPC & Beziehungen erstellen
                    <CheckCircle2 className="h-4 w-4 inline-block ml-2" />
                  </>
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

