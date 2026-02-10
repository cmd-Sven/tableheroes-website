"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import { generateNPC, analyzeWorldContext, analyzeBriefingForNPCs } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { createNPC, getNPCsByContext, getNPCsForAnalysis, getNPCNarrativeHooks } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { createNPCRelationManually, createNPCRelation, createNPCRelationFromHook, updateHookRelationsToNPC } from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import { createLocationQuick, getLocationDetailsForAI } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { createFactionQuick, getFactionDetailsForAI } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { createSecret } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";
import { type InferenceSuggestion } from "./NPCForm";
import { useRouter } from "next/navigation";
import { WizardContent } from "./WizardContent";
import { createClient } from "@/src/lib/supabase/client";

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
    player_notes: string;
    is_revealed: boolean;
    check_results?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }>;
  };
};

type Props = {
  campaignId: string;
  factions: Array<{ id: string; name: string; appearance?: string | null; structure?: string | null; philosophy?: string | null }>;
  locations: Array<{ id: string; name: string; type: string }>;
  onClose: () => void;
  onSuccess?: () => void;
  hookContext?: {
    sourceNPCId?: string;
    sourceNPCName?: string;
    hook?: {
      name?: string;
      role?: string;
      description?: string;
      is_alive?: boolean;
    };
  };
  embedded?: boolean;
  // Optional: Standard-Fraktion für neue NPCs (z.B. aus Fraktions-Detailansicht)
  defaultFactionId?: string;
  // Optional: zusätzlicher Prefix für das Briefing (z.B. Fraktions-Kontext)
  defaultBriefingPrefix?: string;
  /** Vorbefüllung aus GM Inbox (Spieler-NPC-Wunsch) */
  prefillName?: string;
  prefillRole?: string;
  prefillDescription?: string;
};

export function AIGenerationWizard({
  campaignId,
  factions,
  locations,
  onClose,
  onSuccess,
  hookContext,
  embedded = false,
  defaultFactionId,
  defaultBriefingPrefix,
  prefillName,
  prefillRole,
  prefillDescription,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [contextNPCs, setContextNPCs] = useState<{
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  } | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [inferenceSuggestions, setInferenceSuggestions] = useState<Record<string, InferenceSuggestion[]>>({});
  const [selectedInferenceSuggestions, setSelectedInferenceSuggestions] = useState<Set<string>>(new Set());
  const [locationsList, setLocationsList] = useState(locations);
  const [factionsList, setFactionsList] = useState(factions);
  const [isAnalyzingWorld, setIsAnalyzingWorld] = useState(false);
  const [worldEntities, setWorldEntities] = useState<{
    locations: WorldEntity[];
    factions: WorldEntity[];
  } | null>(null);
  const [foundNPCs, setFoundNPCs] = useState<Array<{
    name: string;
    role: string;
    suggestedRelationType: string;
    context: string;
    existsInCampaign?: boolean;
  }>>([]);
  const [isAnalyzingBriefing, setIsAnalyzingBriefing] = useState(false);
  const [factionRelationship, setFactionRelationship] = useState<string>("");
  const [campaignNPCs, setCampaignNPCs] = useState<Array<{ id: string; name: string }>>([]);

  // Synchronize lists with props when they change
  useEffect(() => {
    setLocationsList(locations);
  }, [locations]);

  useEffect(() => {
    setFactionsList(factions);
  }, [factions]);

  // Initialize wizard data with hook context or GM-Inbox-Prefill if provided
  const getInitialWizardData = (): WizardData => {
    const hookName = hookContext?.hook?.name && hookContext.hook.name.trim().toLowerCase() !== "unbekannt" 
      ? hookContext.hook.name 
      : "";
    const prefillNameTrim = (prefillName ?? "").trim();
    const name = hookName || prefillNameTrim || "";
    
    const initialContextNPCs: Array<{ npcId: string; relationType: string }> = [];
    if (hookContext?.sourceNPCId && hookContext?.hook?.role) {
      const relationType = hookContext.hook.role || "Andere";
      initialContextNPCs.push({
        npcId: hookContext.sourceNPCId,
        relationType: relationType,
      });
    }

    // Erstelle Kontext-Notiz für Hook-Promotion oder GM-Inbox-Prefill
    let initialBriefing = "";
    if (hookContext?.sourceNPCName && hookContext?.hook?.role && hookName) {
      initialBriefing = `Dieser Charakter ist ${hookContext.hook.role} von ${hookContext.sourceNPCName}.`;
      if (hookContext.hook.description) {
        initialBriefing += ` ${hookContext.hook.description}`;
      }
    }
    if (prefillDescription?.trim()) {
      initialBriefing = initialBriefing ? `${initialBriefing} ${prefillDescription.trim()}` : prefillDescription.trim();
    }

    // Optionaler zusätzlicher Briefing-Prefix (z.B. Fraktions-Kontext)
    if (defaultBriefingPrefix) {
      initialBriefing = `${defaultBriefingPrefix.trim()}${initialBriefing ? " " + initialBriefing : ""}`;
    }

    const role = hookContext?.hook?.role || (prefillRole ?? "").trim() || "";

    return {
      name,
      race: "",
      role,
      status: hookContext?.hook?.is_alive !== false ? "Alive" : "Deceased",
      alignment: "",
      briefing: initialBriefing,
      faction_id: defaultFactionId || "",
      current_location_id: "",
      home_location_id: "",
      selectedContextNPCs: initialContextNPCs,
      inferenceSuggestions: {},
      selectedInferenceSuggestions: new Set(),
      processedHooks: new Set<string>(), // Initialisiere processedHooks als leeres Set
    };
  };

  const [wizardData, setWizardData] = useState<WizardData>(getInitialWizardData());

  // Load context NPCs when entering step 3
  useEffect(() => {
    if (currentStep === 3 && (wizardData.current_location_id || wizardData.faction_id)) {
      setIsLoadingContext(true);
      const loadContextNPCs = async () => {
        try {
          const context = await getNPCsByContext(
            campaignId,
            wizardData.current_location_id || null,
            wizardData.faction_id || null,
            null
          );
          setContextNPCs(context);
          
          // Transitive Hooks: Wenn ein Hook-Kontext vorhanden ist, lade andere Hooks des Ursprungs-NPCs
          if (hookContext?.sourceNPCId) {
            try {
              const sourceHooks = await getNPCNarrativeHooks(hookContext.sourceNPCId);
              // Filtere den aktuellen Hook heraus und schlage die anderen vor
              const otherHooks = (sourceHooks || []).filter(
                (hook: any) => hook.name !== hookContext.hook?.name && hook.role !== hookContext.hook?.role
              );
              
              if (otherHooks.length > 0) {
                // Konvertiere Hooks zu foundNPCs-Format für die Anzeige
                const transitiveSuggestions = otherHooks.map((hook: any) => ({
                  name: hook.name || "Unbenannter NPC",
                  role: hook.role || "",
                  suggestedRelationType: hook.role || "Andere",
                  context: `Transitiver Hook: ${hook.description || ""}`,
                  existsInCampaign: false,
                }));
                
                setFoundNPCs((prev) => [...prev, ...transitiveSuggestions]);
              }
            } catch (error) {
              console.error("Fehler beim Laden der transitiven Hooks:", error);
            }
          }
        } catch (error) {
          console.error("Fehler beim Laden der Kontext-NPCs:", error);
          setContextNPCs({ sameLocation: [], nearbyLocations: [], sameFaction: [] });
        } finally {
          setIsLoadingContext(false);
        }
      };
      loadContextNPCs();
    } else if (currentStep !== 3) {
      setContextNPCs(null);
    }
  }, [currentStep, wizardData.current_location_id, wizardData.faction_id, campaignId, hookContext]);

  const handleStep1Next = async () => {
    if (!wizardData.name.trim()) {
      alert("Bitte geben Sie einen Namen für den NPC ein.");
      return;
    }
    
    setIsTransitioning(true);
    setTransitionMessage("Sammle Informationen...");
    
    // Fraktions-Kontext (falls Fraktion ausgewählt)
    let enrichedBriefing = wizardData.briefing || "";
    if (wizardData.faction_id) {
      const selectedFaction = factionsList.find((f: any) => f.id === wizardData.faction_id);
      if (selectedFaction) {
        const parts: string[] = [];
        parts.push(`FRAKTIONS-KONTEXT: Der NPC ist Mitglied der Fraktion "${selectedFaction.name}".`);
        if (selectedFaction.appearance) {
          parts.push(`Erscheinungsbild der Fraktion: ${selectedFaction.appearance}`);
        }
        if (selectedFaction.philosophy) {
          parts.push(`Philosophie/Ziele der Fraktion: ${selectedFaction.philosophy}`);
        }
        if (selectedFaction.structure) {
          parts.push(`Organisationsstruktur der Fraktion: ${selectedFaction.structure}`);
        }
        const factionContextBlock = parts.join(" ");
        enrichedBriefing = `${factionContextBlock}${enrichedBriefing ? "\n\n" + enrichedBriefing : ""}`;
      }
    }

    if (enrichedBriefing && enrichedBriefing.trim()) {
      setIsAnalyzingWorld(true);
      setIsAnalyzingBriefing(true);
      setTransitionMessage("KI analysiert deine Vorgaben...");
      try {
        const [worldAnalysis, npcAnalysis] = await Promise.all([
          analyzeWorldContext(
            campaignId,
            enrichedBriefing,
            locationsList.map((loc: any) => ({ id: loc.id, name: loc.name, type: loc.type })),
            factionsList.map((f: any) => ({ id: f.id, name: f.name, type: undefined }))
          ),
          (async () => {
            const existingNPCs = await getNPCsForAnalysis(campaignId);
            return await analyzeBriefingForNPCs(
              campaignId,
              enrichedBriefing,
              (existingNPCs as any[]).map((npc: any) => ({ id: npc.id, name: npc.name })),
              wizardData.faction_id || null,
              wizardData.name || null
            );
          })()
        ]);
        
        const allFactions = [
          ...(worldAnalysis.factions || []),
          ...(npcAnalysis.factions || []),
        ];
        const allLocations = [
          ...(worldAnalysis.locations || []),
          ...(npcAnalysis.locations || []),
        ];
        
        const uniqueFactions = (allFactions || []).filter((faction: any, index: number, self: any[]) =>
          index === self.findIndex((f: any) => f.name.toLowerCase().trim() === faction.name.toLowerCase().trim())
        );
        const uniqueLocations = (allLocations || []).filter((location: any, index: number, self: any[]) =>
          index === self.findIndex((l: any) => l.name.toLowerCase().trim() === location.name.toLowerCase().trim())
        );
        
        const entities: { locations: WorldEntity[]; factions: WorldEntity[] } = {
          locations: uniqueLocations.map((loc: any) => ({
            name: loc.name,
            type: loc.type,
            parent_location_name: loc.parent_location_name || "",
            isSelected: true,
          })),
          factions: uniqueFactions.map((faction: any) => ({
            name: faction.name,
            type: faction.type,
            headquarters_location_name: faction.headquarters_location_name || "",
            isSelected: true,
          })),
        };
        
        setWorldEntities(entities);
        setWizardData(prev => ({ ...prev, worldEntities: entities }));
        
        if (npcAnalysis.factions && npcAnalysis.factions.length > 0) {
          for (const faction of npcAnalysis.factions) {
            const existingFaction = factionsList.find(
              (f: any) => f.name.toLowerCase().trim() === faction.name.toLowerCase().trim()
            );
            if (existingFaction && !wizardData.faction_id) {
              updateWizardData({ faction_id: existingFaction.id });
              break;
            }
          }
        }
        
        if (npcAnalysis.locations && npcAnalysis.locations.length > 0) {
          for (const location of npcAnalysis.locations) {
            const existingLocation = locationsList.find(
              (l: any) => l.name.toLowerCase().trim() === location.name.toLowerCase().trim()
            );
            if (existingLocation && !wizardData.current_location_id) {
              updateWizardData({ current_location_id: existingLocation.id });
              break;
            }
          }
        }
        
        const existingNPCs = await getNPCsForAnalysis(campaignId);
        setCampaignNPCs(existingNPCs);
        
        const npcsWithExistenceCheck = (npcAnalysis.npcs || []).map((npc: any) => {
          const exists = (existingNPCs as any[]).some(
            (existing: any) => existing.name.toLowerCase().trim() === npc.name.toLowerCase().trim()
          );
          return {
            ...npc,
            existsInCampaign: exists,
          };
        });
        
        setFoundNPCs(npcsWithExistenceCheck);
        setFactionRelationship(npcAnalysis.factionRelationship || "");
      } catch (error: any) {
        console.error("Analysis error:", error);
        setWorldEntities({ locations: [], factions: [] });
        setFoundNPCs([]);
        setFactionRelationship("");
      } finally {
        setIsAnalyzingWorld(false);
        setIsAnalyzingBriefing(false);
      }
    } else {
      setWorldEntities({ locations: [], factions: [] });
      setFoundNPCs([]);
      setFactionRelationship("");
    }
    
    setTransitionMessage("Webbe Schicksalsfäden...");
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsTransitioning(false);
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    if (worldEntities) {
      const createdLocations: Array<{ id: string; name: string; type: string }> = [];
      const createdFactions: Array<{ id: string; name: string }> = [];
      
      for (const loc of worldEntities.locations.filter((l: any) => l.isSelected && !l.id)) {
        try {
          let parentId: string | null = null;
          if (loc.parent_location_name) {
            const parent = locationsList.find((l: any) => l.name.toLowerCase() === loc.parent_location_name?.toLowerCase());
            if (parent) {
              parentId = parent.id;
            } else {
              // Try to find in lore entries (Welt/Region types)
              const supabase = createClient();
              const { data: parentLore } = await (supabase.from("world_lore") as any)
                .select("id")
                .eq("campaign_id", campaignId)
                .ilike("name", loc.parent_location_name)
                .in("type", ["Welt", "Region", "Stadt", "Land"])
                .limit(1)
                .maybeSingle();
              
              if (parentLore) {
                // Check if this lore entry has a corresponding location
                const { data: parentLocation } = await (supabase.from("locations") as any)
                  .select("id")
                  .eq("id", (parentLore as any).id)
                  .single();
                
                if (parentLocation) {
                  parentId = (parentLocation as any).id;
                } else {
                  // Create location for the parent lore entry
                  const parentLoc = await createLocationQuick({
                    campaign_id: campaignId,
                    name: loc.parent_location_name,
                    type: "Region",
                    parent_location_id: null,
                    description: null,
                  });
                  parentId = parentLoc.id;
                  setLocationsList(prev => [...prev, { id: parentLoc.id, name: parentLoc.name, type: "Region" }]);
                }
              } else {
                // Create new parent location
                const parentLoc = await createLocationQuick({
                  campaign_id: campaignId,
                  name: loc.parent_location_name,
                  type: "Region",
                  parent_location_id: null,
                  description: null,
                });
                parentId = parentLoc.id;
                setLocationsList(prev => [...prev, { id: parentLoc.id, name: parentLoc.name, type: "Region" }]);
              }
            }
          }
          
          const newLoc = await createLocationQuick({
            campaign_id: campaignId,
            name: loc.name,
            type: loc.type,
            parent_location_id: parentId,
            description: null,
          });
          
          createdLocations.push({ id: newLoc.id, name: newLoc.name, type: loc.type });
          setLocationsList(prev => [...prev, { id: newLoc.id, name: newLoc.name, type: loc.type }]);
          
          setWorldEntities(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              locations: prev.locations.map((l: any) => l.name === loc.name ? { ...l, id: newLoc.id } : l),
            };
          });
        } catch (error: any) {
          console.error(`Error creating location ${loc.name}:`, error);
        }
      }
      
      for (const faction of worldEntities.factions.filter((f: any) => f.isSelected && !f.id)) {
        try {
          let headquartersId: string | null = null;
          if (faction.headquarters_location_name) {
            const hq = locationsList.find((l: any) => l.name.toLowerCase() === faction.headquarters_location_name?.toLowerCase());
            if (hq) {
              headquartersId = hq.id;
            } else {
              const hqLoc = await createLocationQuick({
                campaign_id: campaignId,
                name: faction.headquarters_location_name,
                type: "Gebäude",
                parent_location_id: null,
                description: null,
              });
              headquartersId = hqLoc.id;
              setLocationsList(prev => [...prev, { id: hqLoc.id, name: hqLoc.name, type: "Gebäude" }]);
            }
          }
          
          const newFaction = await createFactionQuick({
            campaign_id: campaignId,
            name: faction.name,
            type: faction.type,
            location_id: headquartersId,
            description: null,
          });
          
          createdFactions.push({ id: newFaction.id, name: newFaction.name });
          setFactionsList(prev => [...prev, { id: newFaction.id, name: newFaction.name }]);
          
          setWorldEntities(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              factions: prev.factions.map((f: any) => f.name === faction.name ? { ...f, id: newFaction.id } : f),
            };
          });
        } catch (error: any) {
          console.error(`Error creating faction ${faction.name}:`, error);
        }
      }
      
      if (createdLocations.length > 0 && !wizardData.current_location_id) {
        updateWizardData({ current_location_id: createdLocations[0].id });
      }
      if (createdFactions.length > 0 && !wizardData.faction_id) {
        updateWizardData({ faction_id: createdFactions[0].id });
      }
    }
    
    setIsTransitioning(true);
    setTransitionMessage("Webbe Schicksalsfäden...");
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsTransitioning(false);
    setCurrentStep(3);
  };

  const handleStep4Generate = async () => {
    setIsGenerating(true);
    try {
      // Lade Location- und Faction-Details mit GM-Notizen für die KI-Generierung
      let locationDetails = null;
      let factionDetails = null;

      if (wizardData.current_location_id) {
        try {
          locationDetails = await getLocationDetailsForAI(wizardData.current_location_id, campaignId);
        } catch (error) {
          console.error("Fehler beim Laden der Location-Details:", error);
        }
      }

      if (wizardData.faction_id) {
        try {
          factionDetails = await getFactionDetailsForAI(wizardData.faction_id, campaignId);
        } catch (error) {
          console.error("Fehler beim Laden der Faction-Details:", error);
        }
      }

      let prompt = `Erstelle einen NPC namens "${wizardData.name}"`;
      if (wizardData.race) prompt += `, Rasse: ${wizardData.race}`;
      if (wizardData.role) prompt += `, Rolle: ${wizardData.role}`;
      if (wizardData.status) prompt += `, Status: ${wizardData.status}`;
      if (wizardData.alignment) prompt += `, Gesinnung: ${wizardData.alignment}`;
      
      if (wizardData.briefing && wizardData.briefing.trim()) {
        prompt += `. WICHTIGE CHARAKTER-EIGENSCHAFTEN: ${wizardData.briefing}`;
      }
      
      const faction = factionsList.find((f: any) => f.id === wizardData.faction_id);
      if (faction) prompt += `, Fraktion: ${(faction as any).name}`;
      
      const location = locationsList.find((l: any) => l.id === wizardData.current_location_id);
      if (location) {
        prompt += `, Aktueller Ort: ${(location as any).name} (${(location as any).type})`;
      }
      
      const homeLocation = locationsList.find((l: any) => l.id === wizardData.home_location_id);
      if (homeLocation) prompt += `, Heimatort: ${homeLocation.name} (${homeLocation.type})`;

      if (hookContext?.hook) {
        prompt += `. WICHTIGER KONTEXT AUS STORY-HOOK: ${hookContext.hook.description}. Die Rolle "${hookContext.hook.role}" ist ein unveränderlicher Fakt.`;
        if (hookContext.sourceNPCName) {
          prompt += ` Der NPC hat eine Beziehung zu ${hookContext.sourceNPCName} (${hookContext.hook.role}).`;
        }
      }

      if (wizardData.selectedContextNPCs.length > 0) {
        const contextInfo = wizardData.selectedContextNPCs.map((ctx: any) => {
          const npc = [
            ...(contextNPCs?.sameLocation || []),
            ...(contextNPCs?.nearbyLocations || []),
            ...(contextNPCs?.sameFaction || []),
          ].find((n: any) => n.id === ctx.npcId);
          return npc
            ? `NPC "${(npc as any).name}" (${ctx.relationType})`
            : `NPC (${ctx.relationType})`;
        }).join(", ");
        prompt += `. WICHTIG: Der NPC hat folgende Beziehungen: ${contextInfo}. Berücksichtige diese Beziehungen bei der Generierung.`;
      }

      const result = await generateNPC(
        campaignId,
        prompt,
        wizardData.selectedContextNPCs,
        locationDetails,
        factionDetails
      );

      setWizardData((prev) => ({
        ...prev,
        aiGenerated: {
          description: result.description || "",
          appearance: result.appearance || "",
          personality_traits: result.personality_traits || "",
          gm_notes: result.gm_notes || "",
          title: result.title || "",
          narrative_hooks: result.narrative_hooks || [],
          discoveries: result.discoveries || [],
          is_secret_antagonist: result.is_secret_antagonist || false,
          hidden_agenda: result.hidden_agenda || "",
          true_nature: result.true_nature || "",
          secret_entry: result.secret_entry || "",
        },
        finalData: {
          description: result.description || "",
          appearance: result.appearance || "",
          personality_traits: result.personality_traits || "",
          gm_notes: result.gm_notes || "",
          title: result.title || "",
          image_url: "",
          player_notes: "",
          is_revealed: false,
          is_secret_antagonist: result.is_secret_antagonist || false,
          hidden_agenda: result.hidden_agenda || "",
          true_nature: result.true_nature || "",
          check_results: result.check_results || [],
        },
      }));
      
      setIsTransitioning(true);
      setTransitionMessage("KI generiert die Geschichte...");
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsTransitioning(false);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der KI-Generierung.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStep4Next = () => {
    if (!wizardData.aiGenerated) {
      alert("Bitte generieren Sie zuerst die NPC-Daten mit der KI.");
      return;
    }
    setCurrentStep(5);
  };

  const handleStep5Create = async () => {
    if (!wizardData.finalData) return;

    startTransition(async () => {
      try {
        const normalizedFactionId = wizardData.faction_id && wizardData.faction_id.trim() !== "" ? wizardData.faction_id : null;
        const normalizedCurrentLocationId = wizardData.current_location_id && wizardData.current_location_id.trim() !== "" ? wizardData.current_location_id : null;
        const normalizedHomeLocationId = wizardData.home_location_id && wizardData.home_location_id.trim() !== "" ? wizardData.home_location_id : null;

        // Typ-Sicherung für finalData mit unbekannten Properties
        const finalFields = (wizardData.finalData as any);

        const createdNPC = await createNPC({
          campaign_id: campaignId,
          name: wizardData.name,
          title: finalFields?.title || undefined,
          role: wizardData.role || undefined,
          race: wizardData.race || undefined,
          status: wizardData.status || "Alive",
          alignment: wizardData.alignment || undefined,
          description: finalFields?.description || undefined,
          appearance: finalFields?.appearance || undefined,
          personality_traits: finalFields?.personality_traits || undefined,
          gm_notes: finalFields?.gm_notes || undefined,
          player_notes: finalFields?.player_notes || undefined,
          image_url: finalFields?.image_url || undefined,
          faction_id: normalizedFactionId,
          current_location_id: normalizedCurrentLocationId,
          home_location_id: normalizedHomeLocationId || undefined,
          is_revealed: finalFields?.is_revealed,
          narrative_hooks: wizardData.aiGenerated?.narrative_hooks || undefined,
          is_secret_antagonist: finalFields?.is_secret_antagonist || false,
          hidden_agenda: finalFields?.hidden_agenda || undefined,
          true_nature: finalFields?.true_nature || undefined,
          check_results: finalFields?.check_results && (finalFields.check_results?.length ?? 0) > 0 ? finalFields.check_results : undefined,
        });

        const relationPromises = wizardData.selectedContextNPCs.map((ctx: any) => {
          const followUps: Array<{
            sourceNpcId: string;
            targetNpcId: string;
            relationType: string;
            description?: string | null;
          }> = [];

          const suggestions = wizardData.inferenceSuggestions[ctx.npcId] || [];
          suggestions.forEach((suggestion) => {
            const key = `${ctx.npcId}-${suggestion.targetNpcId}`;
            if (wizardData.selectedInferenceSuggestions.has(key)) {
              followUps.push({
                sourceNpcId: createdNPC.id,
                targetNpcId: suggestion.targetNpcId,
                relationType: suggestion.relationType,
                description: `Automatisch vorgeschlagen: ${suggestion.reason}`,
              });
            }
          });

          if (followUps.length > 0) {
            return createNPCRelation(
              campaignId,
              ctx.npcId,
              createdNPC.id,
              ctx.relationType,
              `Automatisch erstellt beim NPC-Erstellungsprozess`,
              followUps
            ).catch((error) => {
              console.error(`Fehler beim Erstellen der Relation zu NPC ${ctx.npcId}:`, error);
              return null;
            });
          } else {
            return createNPCRelationManually(
              campaignId,
              ctx.npcId,
              createdNPC.id,
              ctx.relationType,
              `Automatisch erstellt beim NPC-Erstellungsprozess`
            ).catch((error) => {
              console.error(`Fehler beim Erstellen der Relation zu NPC ${ctx.npcId}:`, error);
              return null;
            });
          }
        });

        await Promise.all(relationPromises);

        // Erstelle Entdeckungen als Secrets
        if (wizardData.aiGenerated?.discoveries && wizardData.aiGenerated.discoveries.length > 0) {
          const secretPromises = wizardData.aiGenerated.discoveries.map((discovery: any) =>
            createSecret(
              campaignId,
              createdNPC.id,
              "npc",
              discovery.content,
              discovery.title,
              discovery.skill_check
            ).catch((error) => {
              console.error(`Fehler beim Erstellen des Secrets für Entdeckung "${discovery.title}":`, error);
              return null;
            })
          );
          await Promise.all(secretPromises);
        }

        if (hookContext?.sourceNPCId && hookContext.hook) {
          const sourceNPCAlreadyInRelations = wizardData.selectedContextNPCs.some(
            (ctx: any) => ctx.npcId === hookContext.sourceNPCId
          );
          
          if (!sourceNPCAlreadyInRelations && hookContext.hook?.role) {
            try {
              // Verwende createNPCRelationFromHook für Hook-Relationen (nutzt target_name)
              const hookName = hookContext.hook.name || wizardData.name;
              const hookPayload = {
                name: hookContext.hook.name,
                role: hookContext.hook.role,
                description: hookContext.hook.description ?? "",
                is_alive: hookContext.hook.is_alive ?? true,
              };
              const result = await createNPCRelationFromHook(
                campaignId,
                hookContext.sourceNPCId,
                hookName, // target_name = Name des Hooks (z.B. "Sandra")
                hookPayload
              );

              // Prüfe, ob die Relation bereits existierte
              if (result.alreadyExisted) {
                console.log("ℹ️ [AIGenerationWizard] Hook-Relation existierte bereits:", hookName);
              }

              // Wenn der NPC erfolgreich erstellt wurde, aktualisiere die Hook-Relationen
              // (konvertiere target_name zu npc_id_2)
              try {
                const updateResult = await updateHookRelationsToNPC(
                  campaignId,
                  hookContext.sourceNPCId,
                  hookName,
                  createdNPC.id
                );
                console.log("✅ [AIGenerationWizard] Hook-Relationen aktualisiert:", updateResult);
              } catch (updateError) {
                // Warnung, aber kein Fehler - NPC wurde bereits erstellt
                console.warn("⚠️ [AIGenerationWizard] Hook-Relationen-Update fehlgeschlagen:", updateError);
              }
            } catch (error) {
              console.error("Fehler beim Erstellen der Hook-Relation:", error);
            }
          }
        }

        // Redirect zur Detailseite des neuen NPCs
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/campaigns/${campaignId}/npcs/${createdNPC.id}`);
          router.refresh();
        }
        onClose();
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Fehler beim Erstellen des NPCs.");
      }
    });
  };

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateFinalData = useCallback((updates: Partial<WizardData["finalData"]>) => {
    setWizardData((prev) => ({
      ...prev,
      finalData: prev.finalData ? { ...prev.finalData, ...updates } : undefined,
    }));
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setWizardData((prev) => ({ ...prev, name: value }));
  }, []);

  const handleRaceChange = useCallback((value: string) => {
    setWizardData((prev) => ({ ...prev, race: value }));
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setWizardData((prev) => ({ ...prev, role: value }));
  }, []);

  const handleBriefingChange = useCallback((value: string) => {
    setWizardData((prev) => ({ ...prev, briefing: value }));
  }, []);

  // Prepare WizardContent props
  const wizardContentProps = {
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
  };

  const content = <WizardContent {...wizardContentProps} />;

  if (!embedded) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="relative w-full max-w-5xl h-[90vh] max-h-[90vh] rounded-lg overflow-hidden flex flex-col shadow-2xl border-2 border-accent-gold/50"
          style={{
            backgroundColor: "#18181b",
            backgroundImage: "url('/images/scroll-paper.png')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {/* Dunkle Ebene für Kontrast und Lesbarkeit */}
          <div
            className="absolute inset-0 bg-black/50 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden text-gray-100">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0a1f16] rounded-lg border-2 border-hero-border shadow-2xl overflow-hidden flex flex-col">
      {content}
    </div>
  );
}
