"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Calendar, MapPin, Users, BookOpen, Sparkles, Loader2, CheckCircle, AlertTriangle, Sword } from "lucide-react";
import { createSessionWithScenes, getSessionWizardContext } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { createNPC } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { createLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { createQuest } from "@/src/app/dashboard/campaigns/[id]/quest-actions";
import { generateNPC, generateLore, generateSessionHook } from "@/src/app/dashboard/campaigns/[id]/ai-actions";

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  locations: Array<{ id: string; name: string; type: string }>;
  npcs: Array<{ id: string; name: string; title: string | null }>;
  onSuccess: () => void;
};


export function SessionWizardModal({ campaignId, isOpen, onClose, locations, npcs, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // Track which AI is generating

  // Step 1: Logistics
  const [logistics, setLogistics] = useState({
    title: "",
    date: "",
    time: "",
    duration: "4", // Default 4 hours
  });

  // Step 2: Location
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Step 3: NPCs
  const [selectedNPCIds, setSelectedNPCIds] = useState<string[]>([]);

  // Step 0: Context (loaded automatically)
  const [wizardContext, setWizardContext] = useState<{
    averagePartyLevel: number;
    lastSession: {
      id: string;
      title: string;
      status: string;
      end_time: string | null;
      summary: string;
    } | null;
  } | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [recapText, setRecapText] = useState("");

  // Step 4: Scene & Quest
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedScene, setGeneratedScene] = useState<{
    name: string;
    goal_description: string;
    gm_notes: string;
    weather_context: string;
    combat_suggestion?: string;
  } | null>(null);
  const [questSuggestion, setQuestSuggestion] = useState<{
    title: string;
    description: string;
    gm_notes: string;
    rewards: string;
    type: string;
  } | null>(null);
  const [createQuestChecked, setCreateQuestChecked] = useState(false);

  // Step 0: Load Context on Open
  useEffect(() => {
    if (isOpen && !wizardContext && !isLoadingContext) {
      setIsLoadingContext(true);
      getSessionWizardContext(campaignId)
        .then((context) => {
          setWizardContext(context);
          // Pre-fill recap with last session summary
          if (context.lastSession?.summary) {
            setRecapText(context.lastSession.summary);
          }
        })
        .catch((error) => {
          console.error("Error loading wizard context:", error);
        })
        .finally(() => {
          setIsLoadingContext(false);
        });
    }
  }, [isOpen, campaignId, wizardContext, isLoadingContext]);

  // Reset on close
  const handleClose = () => {
    setCurrentStep(1);
    setLogistics({
      title: "",
      date: "",
      time: "",
      duration: "4",
    });
    setSelectedLocationId("");
    setSelectedNPCIds([]);
    setUserPrompt("");
    setGeneratedScene(null);
    setQuestSuggestion(null);
    setCreateQuestChecked(false);
    setRecapText("");
    setWizardContext(null);
    setIsGenerating(null);
    onClose();
  };

  // Step 2: Generate Location Inline
  const handleGenerateLocation = async () => {
    const prompt = window.prompt("Beschreibe kurz den Ort für diese Session:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating("location");
    try {
      const result = await generateLore(campaignId, prompt);
      
      // Create the location
      const newLocation = await createLoreEntry({
        campaign_id: campaignId,
        name: result.name || "",
        type: "Location",
        description: result.description || undefined,
        gm_notes: result.gm_notes || undefined,
      });

      // Auto-select it
      setSelectedLocationId(newLocation.id);
      alert(`Ort "${newLocation.name}" wurde erstellt und ausgewählt!`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der Generierung.");
    } finally {
      setIsGenerating(null);
    }
  };

  // Step 3: Generate NPC Group Inline
  const handleGenerateNPCGroup = async () => {
    const prompt = window.prompt("Beschreibe kurz die NPC-Gruppe (z.B. 'Drei Räuber in der Taverne'):");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating("npc-group");
    try {
      // Generate multiple NPCs (we'll create 2-3 based on prompt)
      const npcPrompts = [
        `${prompt} - Erster NPC`,
        `${prompt} - Zweiter NPC`,
        `${prompt} - Dritter NPC`,
      ];

      const generatedNPCs: any[] = [];
      for (const npcPrompt of npcPrompts.slice(0, 3)) {
        try {
          const result = await generateNPC(campaignId, npcPrompt);
          const newNPC = await createNPC({
            campaign_id: campaignId,
            name: result.name || "",
            title: result.title || undefined,
            description: result.description || undefined,
            gm_notes: result.gm_notes || undefined,
          });
          generatedNPCs.push(newNPC.id);
        } catch (err) {
          console.error("Error generating NPC:", err);
        }
      }

      // Auto-select them
      setSelectedNPCIds((prev) => [...prev, ...generatedNPCs]);
      alert(`${generatedNPCs.length} NPCs wurden erstellt und ausgewählt!`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der Generierung.");
    } finally {
      setIsGenerating(null);
    }
  };

  // Step 4: Generate Scene & Quest with AI
  const handleGenerateScenario = async () => {
    if (!userPrompt.trim()) {
      alert("Bitte beschreibe, was in dieser Session passieren soll.");
      return;
    }

    setIsGenerating("scenario");
    try {
      // Get location name
      const selectedLocation = locations.find((l) => l.id === selectedLocationId);
      const locationName = selectedLocation?.name || "";

      // Get NPC names
      const selectedNPCs = npcs.filter((n) => selectedNPCIds.includes(n.id));
      const npcNames = selectedNPCs.map((n) => n.name);

      // Build last session context string
      const lastSessionContext = wizardContext?.lastSession
        ? `Letzte Session: "${wizardContext.lastSession.title}" (Status: ${wizardContext.lastSession.status})\nZusammenfassung: ${recapText || wizardContext.lastSession.summary || "Keine Zusammenfassung"}`
        : "";

      const result = await generateSessionHook(
        campaignId,
        locationName,
        npcNames,
        userPrompt,
        wizardContext?.averagePartyLevel || 1,
        lastSessionContext
      );

      // Set generated scene
      setGeneratedScene({
        name: result.name || "",
        goal_description: result.goal_description || "",
        gm_notes: result.gm_notes || "",
        weather_context: result.weather_context || "",
        combat_suggestion: result.combat_suggestion || "",
      });

      // Set quest suggestion if present
      if (result.new_quest_suggestion) {
        setQuestSuggestion(result.new_quest_suggestion);
        setCreateQuestChecked(true); // Auto-check if quest is suggested
      } else {
        setQuestSuggestion(null);
        setCreateQuestChecked(false);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Fehler bei der Generierung.");
    } finally {
      setIsGenerating(null);
    }
  };

  // Final: Create Session, Scene & Quest
  const handleSubmit = () => {
    if (!logistics.title || !logistics.date || !logistics.time) {
      alert("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    if (!generatedScene || !generatedScene.name || !generatedScene.goal_description) {
      alert("Bitte generiere zuerst ein Szenario.");
      return;
    }

    startTransition(async () => {
      try {
        // Combine date and time
        const dateTimeString = `${logistics.date}T${logistics.time}:00`;
        const startTime = new Date(dateTimeString);
        const durationHours = parseInt(logistics.duration, 10);
        const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

        // Build gm_notes with combat suggestion
        let finalGmNotes = generatedScene.gm_notes || "";
        if (generatedScene.combat_suggestion) {
          finalGmNotes += `\n\n--- VTT PREP ---\n${generatedScene.combat_suggestion}`;
        }

        // Create Session with Scene
        await createSessionWithScenes({
          campaign_id: campaignId,
          title: logistics.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location_id: selectedLocationId || null,
          scenes: [
            {
              title: generatedScene.name,
              description: `${generatedScene.goal_description}\n\n${generatedScene.weather_context ? `Atmosphäre: ${generatedScene.weather_context}` : ""}`,
              gm_notes: finalGmNotes,
              order: 0,
            },
          ],
        });

        // Create Quest if suggested and checked
        if (questSuggestion && createQuestChecked) {
          // Find first selected NPC as quest giver (if any)
          const questGiverId = selectedNPCIds.length > 0 ? selectedNPCIds[0] : null;

          await createQuest({
            campaign_id: campaignId,
            title: questSuggestion.title,
            type: questSuggestion.type || "Side Quest",
            status: "Active",
            quest_giver_id: questGiverId,
            location_id: selectedLocationId || null,
            description: questSuggestion.description,
            rewards: questSuggestion.rewards,
            gm_notes: questSuggestion.gm_notes,
            is_revealed: false,
          });
        }

        onSuccess();
        handleClose();
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Fehler beim Speichern der Session.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-lg border border-hero-dark bg-background-card shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between border-b border-hero-dark bg-background-card p-6">
          <div>
            <h2 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
              🪄 Session planen
            </h2>
            <p className="mt-1 font-libre text-sm text-gray-400">
              Schritt {currentStep} von 4
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="border-b border-hero-dark bg-background-dark px-6 py-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded ${
                  step <= currentStep ? "bg-hero-vibrant" : "bg-hero-dark"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Logistics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow font-bold text-xl text-white uppercase">
                  Logistik
                </h3>
              </div>

              {/* Last Session Alert (if Paused) */}
              {wizardContext?.lastSession && 
               (wizardContext.lastSession.status === "Paused" || wizardContext.lastSession.status === "In Progress") && (
                <div className="rounded border-2 border-yellow-600/50 bg-yellow-900/20 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-barlow font-bold text-sm text-yellow-400 uppercase mb-1">
                      ⚠️ Letzte Session wurde unterbrochen
                    </p>
                    <p className="font-libre text-sm text-yellow-200">
                      Die letzte Session "{wizardContext.lastSession.title}" wurde nicht abgeschlossen (Status: {wizardContext.lastSession.status}).
                      Die KI wird diese Szene beim Generieren fortsetzen.
                    </p>
                  </div>
                </div>
              )}

              {/* Recap Box */}
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Was bisher geschah... (Recap)
                </label>
                <textarea
                  value={recapText}
                  onChange={(e) => setRecapText(e.target.value)}
                  placeholder="Zusammenfassung der letzten Session oder was die Spieler wissen sollten..."
                  rows={4}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  {wizardContext?.lastSession
                    ? `Vorausgefüllt aus: "${wizardContext.lastSession.title}"`
                    : "Dieser Text wird der KI als Kontext für die Session-Generierung übergeben."}
                </p>
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Titel der Session *
                </label>
                <input
                  type="text"
                  value={logistics.title}
                  onChange={(e) => setLogistics((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="z.B. 'Die Höhle der Goblins'"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={logistics.date}
                    onChange={(e) => setLogistics((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Uhrzeit *
                  </label>
                  <input
                    type="time"
                    value={logistics.time}
                    onChange={(e) => setLogistics((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Dauer (Stunden)
                </label>
                <select
                  value={logistics.duration}
                  onChange={(e) => setLogistics((prev) => ({ ...prev, duration: e.target.value }))}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="2">2 Stunden</option>
                  <option value="3">3 Stunden</option>
                  <option value="4">4 Stunden</option>
                  <option value="5">5 Stunden</option>
                  <option value="6">6 Stunden</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow font-bold text-xl text-white uppercase">
                  Die Bühne (Ort)
                </h3>
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Ort auswählen
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Kein Ort ausgewählt --</option>
                  {locations
                    .filter((l) => l.type === "Location")
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 border-t border-hero-dark">
                <button
                  type="button"
                  onClick={handleGenerateLocation}
                  disabled={isGenerating === "location" || isPending}
                  className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === "location" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ✨ Neuen Ort generieren
                    </>
                  )}
                </button>
                <p className="mt-2 font-libre text-xs text-gray-500">
                  Falls der gewünschte Ort noch nicht existiert, kannst du ihn hier direkt generieren.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: NPCs */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow font-bold text-xl text-white uppercase">
                  Die Besetzung (NPCs)
                </h3>
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  NPCs auswählen (Mehrfachauswahl)
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 rounded border border-hero-dark bg-slate-900 p-3">
                  {npcs.length === 0 ? (
                    <p className="font-libre text-sm text-gray-500 text-center py-4">
                      Noch keine NPCs vorhanden.
                    </p>
                  ) : (
                    npcs.map((npc) => (
                      <label
                        key={npc.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNPCIds.includes(npc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNPCIds((prev) => [...prev, npc.id]);
                            } else {
                              setSelectedNPCIds((prev) => prev.filter((id) => id !== npc.id));
                            }
                          }}
                          className="rounded border-hero-dark"
                        />
                        <span className="font-libre text-white">
                          {npc.name}
                          {npc.title && <span className="text-gray-500"> ({npc.title})</span>}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-hero-dark">
                <button
                  type="button"
                  onClick={handleGenerateNPCGroup}
                  disabled={isGenerating === "npc-group" || isPending}
                  className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === "npc-group" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ⚡ NPC-Gruppe generieren
                    </>
                  )}
                </button>
                <p className="mt-2 font-libre text-xs text-gray-500">
                  Generiere schnell eine Gruppe von NPCs für diese Session.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Scene & Quest */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow font-bold text-xl text-white uppercase">
                  Die Handlung (Szenario & Quest)
                </h3>
              </div>

              {/* User Prompt */}
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Was soll in dieser Session passieren? *
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="z.B. 'Die Helden entdecken eine geheimnisvolle Höhle und werden von Goblins überfallen. Ein alter Magier bittet um Hilfe bei der Rettung seines Lehrlings.'"
                  rows={4}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Beschreibe kurz die Idee für diese Session. Die KI wird daraus ein Szenario und ggf. eine Quest erstellen.
                </p>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateScenario}
                  disabled={!userPrompt.trim() || isGenerating === "scenario" || isPending}
                  className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === "scenario" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ✨ Szenario entwerfen
                    </>
                  )}
                </button>
              </div>

              {/* Generated Scene (Editable) */}
              {generatedScene && (
                <div className="rounded border border-hero-dark bg-background-dark p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-accent-gold" />
                    <h4 className="font-barlow font-bold text-lg text-white uppercase">
                      Generierte Szene
                    </h4>
                  </div>

                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      Titel der Szene *
                    </label>
                    <input
                      type="text"
                      value={generatedScene.name}
                      onChange={(e) =>
                        setGeneratedScene((prev) => (prev ? { ...prev, name: e.target.value } : null))
                      }
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      Ziel / Was sollen die Spieler tun? *
                    </label>
                    <textarea
                      value={generatedScene.goal_description}
                      onChange={(e) =>
                        setGeneratedScene((prev) =>
                          prev ? { ...prev, goal_description: e.target.value } : null
                        )
                      }
                      rows={3}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none text-sm resize-none font-libre"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      Wetter / Atmosphäre
                    </label>
                    <input
                      type="text"
                      value={generatedScene.weather_context}
                      onChange={(e) =>
                        setGeneratedScene((prev) =>
                          prev ? { ...prev, weather_context: e.target.value } : null
                        )
                      }
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      GM Notizen (Geheimnisse, Tipps, mögliche Wendungen)
                    </label>
                    <textarea
                      value={generatedScene.gm_notes}
                      onChange={(e) =>
                        setGeneratedScene((prev) =>
                          prev ? { ...prev, gm_notes: e.target.value } : null
                        )
                      }
                      rows={3}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none text-sm resize-none font-libre"
                    />
                  </div>

                  {/* Combat Suggestion */}
                  {generatedScene.combat_suggestion && (
                    <div className="rounded border-2 border-hero-vibrant/50 bg-hero-vibrant/10 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sword className="h-5 w-5 text-hero-vibrant" />
                        <h5 className="font-barlow font-bold text-sm text-hero-vibrant uppercase">
                          ⚔️ VTT / Kampf-Vorbereitung
                        </h5>
                      </div>
                      <p className="font-libre text-sm text-gray-200">
                        {generatedScene.combat_suggestion}
                      </p>
                      <p className="mt-2 font-libre text-xs text-gray-500">
                        Diese Information wird in den GM Notizen gespeichert, damit du weißt, welche Token du in Foundry vorbereiten musst.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quest Suggestion Card */}
              {questSuggestion && (
                <div className="rounded border-2 border-accent-gold/50 bg-accent-gold/5 p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-accent-gold" />
                    <h4 className="font-barlow font-bold text-lg text-accent-gold uppercase">
                      Quest-Vorschlag
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-barlow font-bold text-sm text-gray-300 uppercase">
                        Titel:
                      </span>
                      <p className="font-libre text-white mt-1">{questSuggestion.title}</p>
                    </div>

                    <div>
                      <span className="font-barlow font-bold text-sm text-gray-300 uppercase">
                        Aufgabe:
                      </span>
                      <p className="font-libre text-gray-300 mt-1">{questSuggestion.description}</p>
                    </div>

                    {questSuggestion.rewards && (
                      <div>
                        <span className="font-barlow font-bold text-sm text-gray-300 uppercase">
                          Belohnung:
                        </span>
                        <p className="font-libre text-accent-gold mt-1">{questSuggestion.rewards}</p>
                      </div>
                    )}

                    <div>
                      <span className="font-barlow font-bold text-sm text-gray-300 uppercase">
                        Typ:
                      </span>
                      <p className="font-libre text-gray-300 mt-1">{questSuggestion.type}</p>
                    </div>
                  </div>

                  {/* Checkbox: Create Quest */}
                  <label className="flex items-center gap-3 p-3 rounded border border-hero-dark bg-background-dark cursor-pointer hover:border-hero-vibrant transition-colors">
                    <input
                      type="checkbox"
                      checked={createQuestChecked}
                      onChange={(e) => setCreateQuestChecked(e.target.checked)}
                      className="rounded border-hero-dark w-5 h-5 text-accent-gold focus:ring-accent-gold"
                    />
                    <span className="font-barlow font-bold text-sm text-white">
                      [x] Diese Quest automatisch anlegen
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation (Fixed) */}
        <div className="flex-none flex items-center justify-between border-t border-hero-dark bg-background-card p-6">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurück
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold text-sm uppercase text-white hover:bg-hero-vibrant transition-colors"
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold text-sm uppercase text-white hover:bg-hero-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Speichere..." : "Session erstellen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

