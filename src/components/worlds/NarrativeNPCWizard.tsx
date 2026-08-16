"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  User,
  Users,
  MapPin,
  ListTodo,
  RefreshCw,
  ImageIcon,
  Palette,
  Swords,
} from "lucide-react";
import { processBriefing, type ProcessBriefingResult, type BriefingNewEntity } from "@/src/app/dashboard/worlds/world-npc-actions";
import { generateNPC, regenerateNPCSection, generateNPCPortrait, type GeneratedNPCResult, type RerollSection } from "@/src/app/dashboard/worlds/world-npc-actions";
import { createNPC, getNPCsByWorld } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { linkPlannedMemberByNameToNpc } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { insertWorldTasksBatch } from "@/src/app/dashboard/worlds/world-tasks-actions";
import { markChronicleInboxItemImported } from "@/src/app/dashboard/campaigns/[id]/chronicle-inbox-actions";
import type { ChronicleImportRef } from "@/src/lib/session-chronicle/chronicle-import-types";
import type { WorldBlueprint } from "@/src/types/world";
import { NpcAppearanceConfirmStep } from "@/src/components/worlds/npc-wizard/NpcAppearanceConfirmStep";
import { NpcPortraitStep } from "@/src/components/worlds/npc-wizard/NpcPortraitStep";
import { NpcCombatStatsEditor } from "@/src/components/dashboard/campaigns/npcs/NpcCombatStatsEditor";
import {
  DEFAULT_IMAGE_DISPLAY,
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import { uploadNpcPortrait, uploadNpcToken } from "@/src/lib/profile-media";
import { buildNpcPortraitMeta } from "@/src/lib/npc-portrait-meta";
import {
  DEFAULT_NPC_TOKEN_BORDER,
  mergeNpcSheetWithDefaults,
  type NpcSheetData,
  type NpcTokenBorder,
} from "@/src/lib/npcs/npc-sheet-types";
import { generateNpcCombatSheet } from "@/src/app/dashboard/worlds/world-npc-actions";

const RELATION_TYPES = [
  "Vater", "Mutter", "Sohn", "Tochter",
  "Mentor", "Schüler", "Partner", "Freund", "Feind",
  "Kollege", "Bekannter", "Vorgesetzter", "Untergebener",
  "Andere",
];

type Props = {
  worldId: string;
  worldName: string;
  worldBlueprint?: WorldBlueprint | null;
  factions: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
  /** Vorbefüllung aus Hook-Aufgabe (world_tasks), z. B. proposed_name + description. */
  initialBriefing?: string;
  /** Vorbefüllung Ort (z. B. von Orts-Detailseite) für Heimat- und Aufenthaltsort. */
  initialLocationId?: string;
  /** Vorbefüllung Name (z. B. von Fraktions-Detail „NPC anlegen“). */
  initialPrefillName?: string;
  /** Fraktions-ID: Nach Erstellung planned_member dieser Fraktion mit dem NPC verknüpfen (Name = initialPrefillName / Schritt-1-Name). */
  linkFactionId?: string;
  /** Optional: Rassen-Liste aus Welt-Lore (Type = \"Rasse\"). */
  races?: Array<{ id: string; name: string }>;
  /** Optional: Religionen aus Welt-Lore (Type = \"Religion\"). */
  religions?: Array<{ id: string; name: string }>;
  /** Optional: Gottheiten aus Welt-Lore (Type = \"Gottheit\"). */
  deities?: Array<{ id: string; name: string }>;
  /** Optional: Sprachen aus Welt-Lore (Type = \"Sprache\"). */
  languages?: Array<{ id: string; name: string }>;
  chronicleImport?: ChronicleImportRef;
  onSuccess?: (npcId: string) => void;
  onError?: (message: string) => void;
};

const stepTransition = { type: "tween" as const, duration: 0.3 };
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function NarrativeNPCWizard({
  worldId,
  worldName,
  worldBlueprint = null,
  factions,
  locations,
  initialBriefing,
  initialLocationId,
  initialPrefillName,
  linkFactionId,
  races = [],
  religions = [],
  deities = [],
  languages = [],
  chronicleImport,
  onSuccess,
  onError,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [isPending, startTransition] = useTransition();
  const [isPortraitPending, startPortraitTransition] = useTransition();

  const [step1Name, setStep1Name] = useState(initialPrefillName ?? "");
  const [homeLocationId, setHomeLocationId] = useState<string | null>(initialLocationId ?? null);
  const [race, setRace] = useState<string>("");
  const [selectedReligions, setSelectedReligions] = useState<string[]>([]);
  const [selectedDeities, setSelectedDeities] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [briefing, setBriefing] = useState(initialBriefing ?? "");
  const [briefingResult, setBriefingResult] = useState<ProcessBriefingResult | null>(null);
  const [persona, setPersona] = useState<GeneratedNPCResult | null>(null);
  const [confirmedAppearance, setConfirmedAppearance] = useState("");
  const [portraitAge, setPortraitAge] = useState("");
  const [portraitGender, setPortraitGender] = useState("");
  const [artStyleNote, setArtStyleNote] = useState("");
  const [appearanceConfirmed, setAppearanceConfirmed] = useState(false);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitIsAiGenerated, setPortraitIsAiGenerated] = useState(false);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
  const [portraitDisplay, setPortraitDisplay] = useState<ImageDisplaySettings>({
    ...DEFAULT_IMAGE_DISPLAY,
  });
  const [portraitSkipped, setPortraitSkipped] = useState(false);
  const [tokenEnabled, setTokenEnabled] = useState(false);
  const [tokenBorder, setTokenBorder] = useState<NpcTokenBorder>({
    ...DEFAULT_NPC_TOKEN_BORDER,
  });
  const [tokenFile, setTokenFile] = useState<File | null>(null);
  const [combatSheet, setCombatSheet] = useState<NpcSheetData | null>(null);
  const [portraitObjectUrl, setPortraitObjectUrl] = useState<string | null>(null);
  const [rerollSection, setRerollSection] = useState<RerollSection | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(linkFactionId ?? null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialLocationId ?? null);
  const [linkedNpcId, setLinkedNpcId] = useState<string | null>(null);
  const [linkedNpcRelationType, setLinkedNpcRelationType] = useState<string>("Andere");
  const [worldNPCs, setWorldNPCs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!portraitFile) {
      setPortraitObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(portraitFile);
    setPortraitObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [portraitFile]);

  useEffect(() => {
    if (persona?.appearance && !confirmedAppearance) {
      setConfirmedAppearance(persona.appearance);
    }
  }, [persona?.appearance, confirmedAppearance]);

  useEffect(() => {
    let cancelled = false;
    getNPCsByWorld(worldId).then((list) => {
      if (!cancelled && Array.isArray(list)) {
        setWorldNPCs(list.map((n: any) => ({ id: n.id, name: n.name || "Unbenannt" })));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [worldId]);

  const handleStep1Analyze = () => {
    if (!step1Name.trim()) {
      if (typeof window !== "undefined") alert("Bitte gib zuerst einen Namen für den NPC ein.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await processBriefing(worldId, briefing, factions, locations, step1Name.trim() || undefined, worldNPCs);
        setBriefingResult(result);
      } catch (e: any) {
        const msg = e?.message || "Fehler bei der Briefing-Analyse.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const handleStep2Generate = () => {
    startTransition(async () => {
      try {
        const namePart = step1Name.trim() ? `Name des NPCs: ${step1Name.trim()}. ` : "";
        const racePart = race.trim() ? `Rasse des NPCs: ${race.trim()}. ` : "";
        const briefingPart = briefing.trim() || (briefingResult?.summary ?? "");
        const locationPart = selectedLocationId
          ? `Aufenthaltsort (ID): ${selectedLocationId}. `
          : "";
        const homePart = homeLocationId ? `Wohnort/Heimatort (ID): ${homeLocationId}. ` : "";
        const prompt = `${namePart}${racePart}${locationPart}${homePart}${briefingPart}`.trim() || "Erstelle einen passenden NPC.";
        const data = await generateNPC(worldId, { prompt, includeSecret: false });
        setPersona(data);
        setConfirmedAppearance(data.appearance ?? "");
        setAppearanceConfirmed(false);
        setPortraitUrl(null);
        setPortraitIsAiGenerated(false);
        setUploadRightsConfirmed(false);
        setPortraitSkipped(false);
      } catch (e: any) {
        const msg = e?.message || "Fehler bei der Persona-Generierung.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const handleReroll = (section: RerollSection) => {
    if (!persona) return;
    setRerollSection(section);
    startTransition(async () => {
      try {
        const result = await regenerateNPCSection(worldId, section, {
          name: persona.name,
          role: persona.role ?? undefined,
          description: persona.description,
          appearance: persona.appearance ?? undefined,
          personality_traits: persona.personality_traits ?? undefined,
        });
        const updated = { ...persona, [section]: result[section] ?? persona[section] };
        setPersona(updated);
        if (section === "appearance") {
          setConfirmedAppearance(String(updated.appearance ?? ""));
          setAppearanceConfirmed(false);
          setPortraitUrl(null);
          setPortraitIsAiGenerated(false);
          setUploadRightsConfirmed(false);
          setPortraitSkipped(false);
        }
      } catch (e: any) {
        const msg = e?.message || "Fehler beim Neugenerieren.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      } finally {
        setRerollSection(null);
      }
    });
  };

  const handleConfirmAppearance = () => {
    setAppearanceConfirmed(true);
    if (persona) {
      setPersona({ ...persona, appearance: confirmedAppearance.trim() });
    }
  };

  const handleGeneratePortrait = () => {
    if (!appearanceConfirmed) return;
    startPortraitTransition(async () => {
      try {
        const result = await generateNPCPortrait(worldId, {
          name: step1Name.trim() || persona?.name || "NPC",
          appearance: confirmedAppearance,
          race: race.trim() || persona?.race || undefined,
          age: portraitAge.trim() || undefined,
          gender: portraitGender.trim() || undefined,
          role: persona?.role ?? undefined,
          styleOverride: artStyleNote.trim() || undefined,
        });
        setPortraitUrl(result.imageUrl);
        setPortraitFile(null);
        setPortraitIsAiGenerated(true);
        setUploadRightsConfirmed(false);
        setPortraitSkipped(false);
      } catch (e: any) {
        const msg = e?.message || "Fehler bei der Portrait-Generierung.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const handleStep7Manifest = () => {
    if (!persona) return;
    startTransition(async () => {
      try {
        let imageUrl = portraitUrl;
        let imageIsAiGenerated = portraitIsAiGenerated;
        let imageUploadRightsConfirmed: boolean | null = null;

        if (portraitFile) {
          if (!uploadRightsConfirmed) {
            throw new Error(
              "Bitte bestätige die Nutzungsrechte am hochgeladenen Bild (Schritt 4).",
            );
          }
          const upload = await uploadNpcPortrait(portraitFile, { worldId });
          if ("error" in upload) throw new Error(upload.error);
          imageUrl = upload.publicUrl;
          imageIsAiGenerated = false;
          imageUploadRightsConfirmed = true;
        } else if (imageUrl) {
          if (portraitIsAiGenerated) {
            imageIsAiGenerated = true;
            imageUploadRightsConfirmed = null;
          } else {
            const portraitMeta = buildNpcPortraitMeta({
              imageUrl,
              portraitFile: null,
              portraitIsAiGenerated: false,
              uploadRightsConfirmed: false,
              urlRightsConfirmed: uploadRightsConfirmed,
            });
            imageIsAiGenerated = portraitMeta.image_is_ai_generated;
            imageUploadRightsConfirmed = portraitMeta.image_upload_rights_confirmed;
          }
        }

        let tokenUrl: string | null = null;
        let tokenStoragePath: string | null = null;
        if (tokenEnabled && tokenFile) {
          const tokenUpload = await uploadNpcToken(tokenFile, { worldId });
          if ("error" in tokenUpload) throw new Error(tokenUpload.error);
          tokenUrl = tokenUpload.publicUrl;
          tokenStoragePath = tokenUpload.path;
        }

        const sheetPayload = combatSheet
          ? mergeNpcSheetWithDefaults(combatSheet)
          : null;

        const npc = await createNPC({
          world_id: worldId,
          name: step1Name.trim() || persona.name,
          title: persona.title ?? undefined,
          role: persona.role ?? undefined,
          race: (race.trim() || persona.race) ?? undefined,
          religions: selectedReligions.length > 0 ? selectedReligions : undefined,
          deities: selectedDeities.length > 0 ? selectedDeities : undefined,
          languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
          status: persona.status ?? "Alive",
          alignment: persona.alignment ?? undefined,
          description: persona.description ?? undefined,
          appearance: (confirmedAppearance.trim() || persona.appearance) ?? undefined,
          personality_traits: persona.personality_traits ?? undefined,
          gm_notes: persona.gm_notes ?? undefined,
          image_url: imageUrl ?? undefined,
          image_display: imageUrl ? normalizeImageDisplay(portraitDisplay) : undefined,
          image_is_ai_generated: imageIsAiGenerated,
          image_upload_rights_confirmed: imageUploadRightsConfirmed ?? undefined,
          narrative_hooks: (persona.narrative_hooks ?? undefined)?.map((h) => ({ ...h, name: h.name ?? undefined })) ?? undefined,
          check_results: (persona.check_results ?? undefined) as any,
          faction_id: selectedFactionId ?? undefined,
          current_location_id: selectedLocationId ?? undefined,
          home_location_id: homeLocationId ?? undefined,
          token_url: tokenUrl,
          token_storage_path: tokenStoragePath,
          token_border: tokenEnabled ? tokenBorder : null,
          token_size_category: sheetPayload?.sizeCategory ?? "medium",
          sheet_data: sheetPayload,
          sheet_source: sheetPayload ? "ai_wizard" : null,
        });

        const createdName = (step1Name.trim() || persona?.name || "").toLowerCase();
        const newEntities: BriefingNewEntity[] = (briefingResult?.new_entities ?? []).filter(
          (e) => e.type !== "npc" || e.proposed_name.trim().toLowerCase() !== createdName
        );
        if (newEntities.length > 0) {
          await insertWorldTasksBatch(worldId, newEntities.map((e) => ({
            type: e.type,
            proposed_name: e.proposed_name,
            description: e.description,
            source_npc_id: (npc as { id: string }).id,
          })));
        }

        const npcId = (npc as { id: string }).id;
        if (linkFactionId) {
          const memberName = (initialPrefillName || step1Name.trim() || persona?.name || "").trim();
          if (memberName) {
            try {
              await linkPlannedMemberByNameToNpc(linkFactionId, memberName, npcId);
            } catch (e) {
              console.warn("Verknüpfung Fraktions-Mitglied ↔ NPC:", e);
            }
          }
        }
        if (chronicleImport) {
          try {
            await markChronicleInboxItemImported(
              chronicleImport.sessionId,
              chronicleImport.kind,
              chronicleImport.index,
              npcId,
            );
          } catch (importErr) {
            console.warn("[NarrativeNPCWizard] Chronicle-Import markieren fehlgeschlagen:", importErr);
          }
        }
        onSuccess?.(npcId);
        router.push(`/dashboard/worlds/${worldId}/npcs/${npcId}`);
      } catch (e: any) {
        const msg = e?.message || "Fehler beim Anlegen des NPCs.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const effectivePortraitUrl = portraitUrl || portraitObjectUrl;
  const newEntities = briefingResult?.new_entities ?? [];
  const canGoStep2 = !!briefingResult;
  const canGoStep3 = !!persona;
  const canGoStep4 = !!persona && appearanceConfirmed;
  const canGoStep5 =
    !!persona &&
    appearanceConfirmed &&
    (!!portraitUrl || !!portraitFile || portraitSkipped) &&
    (!portraitFile || uploadRightsConfirmed);
  const canGoStep6 = !!persona;
  const canGoStep7 = !!persona;
  const displayName = step1Name.trim() || persona?.name || "NPC";

  return (
    <div className="rounded-lg border border-hero-border bg-background-card p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between border-b border-hero-border pb-4">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
          Narrativer NPC-Architekt
        </h1>
        <span className="font-barlow font-bold text-sm uppercase text-gray-400">
          Schritt {step} von 7
        </span>
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
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Schritt 1: Name, Orte & Briefing
            </h2>
            <p className="font-libre text-gray-200 text-sm">
              Zuerst Name und wichtigste Fakten festlegen. Aussehen und Beschreibung erstellt die KI erst in Schritt 2.
            </p>

            {/* Name & Rasse */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Name des NPCs *
                </label>
                <input
                  type="text"
                  value={step1Name}
                  onChange={(e) => setStep1Name(e.target.value)}
                  placeholder="z.B. Garrik Stormwacht"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Rasse (optional)
                </label>
                {races.length > 0 ? (
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Rasse wählen oder freilassen —</option>
                    {races.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    placeholder="z.B. Hochelf, Ork, Tiefling …"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
                  />
                )}
              </div>
            </div>

            {/* Wichtigste Fakten: Wohnort, Aufenthaltsort, Fraktion, Religion, Götter, Sprachen */}
            <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4 space-y-3">
              <h3 className="font-cinzel font-bold text-accent-gold text-sm">Wichtigste Fakten</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Wohnort / Heimatort</label>
                  <select
                    value={homeLocationId ?? ""}
                    onChange={(e) => setHomeLocationId(e.target.value || null)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Keiner —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Aktueller Aufenthaltsort</label>
                  <select
                    value={selectedLocationId ?? ""}
                    onChange={(e) => setSelectedLocationId(e.target.value || null)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Keiner —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Fraktion (optional)</label>
                  <select
                    value={selectedFactionId ?? ""}
                    onChange={(e) => setSelectedFactionId(e.target.value || null)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Keine —</option>
                    {factions.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Religion(en)</label>
                  {religions.length > 0 ? (
                    <select
                      multiple
                      value={selectedReligions}
                      onChange={(e) =>
                        setSelectedReligions(
                          Array.from(e.target.selectedOptions).map((o) => o.value)
                        )
                      }
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-xs focus:border-hero-vibrant outline-none h-20"
                    >
                      {religions.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-libre text-xs text-gray-500">
                      Lege Religionen zuerst als Lore vom Typ „Religion“ an.
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500 font-libre">
                    Mehrfachauswahl mit Strg/Cmd + Klick.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Göttliche Bezüge</label>
                  {deities.length > 0 ? (
                    <select
                      multiple
                      value={selectedDeities}
                      onChange={(e) =>
                        setSelectedDeities(
                          Array.from(e.target.selectedOptions).map((o) => o.value)
                        )
                      }
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-xs focus:border-hero-vibrant outline-none h-20"
                    >
                      {deities.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-libre text-xs text-gray-500">
                      Lege Götter zuerst als Lore vom Typ „Gottheit“ an.
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500 font-libre">
                    Mehrfachauswahl mit Strg/Cmd + Klick.
                  </p>
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Sprachen</label>
                  {languages.length > 0 ? (
                    <select
                      multiple
                      value={selectedLanguages}
                      onChange={(e) =>
                        setSelectedLanguages(
                          Array.from(e.target.selectedOptions).map((o) => o.value)
                        )
                      }
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-xs focus:border-hero-vibrant outline-none h-20"
                    >
                      {languages.map((lang) => (
                        <option key={lang.id} value={lang.name}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-libre text-xs text-gray-500">
                      Lege Sprachen zuerst als Lore vom Typ „Sprache“ an.
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500 font-libre">
                    Mehrfachauswahl mit Strg/Cmd + Klick.
                  </p>
                </div>
              </div>
            </div>

            {/* Existierenden NPC verbinden */}
            {worldNPCs.length > 0 && (
              <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4 space-y-3">
                <h3 className="font-cinzel font-bold text-accent-gold text-sm">Bereits existierenden NPC verbinden (optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">NPC</label>
                    <select
                      value={linkedNpcId ?? ""}
                      onChange={(e) => setLinkedNpcId(e.target.value || null)}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                    >
                      <option value="">— Kein NPC —</option>
                      {worldNPCs.map((n) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Beziehungsart</label>
                    <select
                      value={linkedNpcRelationType}
                      onChange={(e) => setLinkedNpcRelationType(e.target.value)}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                    >
                      {RELATION_TYPES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Briefing mit Anweisung */}
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">Briefing / Charakter-Anweisungen</label>
              <textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={4}
                placeholder="z.B.: Persönlichkeit (z. B. zurückhaltend, charismatisch), besondere Merkmale (Narbe, Akzent), Motivation und Ziele. Die KI nutzt das in Schritt 2 für Aussehen und Beschreibung."
                className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none resize-y placeholder:text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500 font-libre">
                Kurz: Persönlichkeit, besondere Merkmale, Motivation. Erst danach erstellt die KI in Schritt 2 Aussehen und Beschreibung.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStep1Analyze}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analysieren
              </button>
            </div>
            {briefingResult && (
              <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4">
                <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Erkannte Verbindungen & neue Entitäten
                </h3>
                {briefingResult.summary && (
                  <p className="font-libre text-gray-300 text-sm mb-4">{briefingResult.summary}</p>
                )}
                {briefingResult.mappings.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {briefingResult.mappings.map((m, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">„{m.mention}"</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-hero-vibrant">
                          {m.existing_name ? `${m.entity_type}: ${m.existing_name}` : `${m.entity_type} (neu)`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {newEntities.length > 0 && (
                  <p className="font-barlow font-bold text-xs uppercase text-accent-blood mt-2">
                    Als Aufgaben angelegt (nach Speichern): {newEntities.map((e) => e.proposed_name).join(", ")}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Schritt 2: Persona-Formung
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              Die KI erzeugt Aussehen, Persönlichkeit und Beschreibung – eingebettet in die erkannten Orte und Gruppen. Du kannst Sektionen neu würfeln.
            </p>
            {!persona ? (
              <button
                type="button"
                onClick={handleStep2Generate}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Persona generieren
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-barlow font-bold text-xs uppercase text-gray-400">Name / Rolle</span>
                    <span className="font-libre text-hero-vibrant">{persona.name}{persona.role ? ` · ${persona.role}` : ""}</span>
                  </div>
                </div>
                {(["description", "appearance", "personality_traits"] as const).map((section) => (
                  <div key={section} className="rounded border border-hero-border bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-barlow font-bold text-xs uppercase text-accent-gold">
                        {section === "description" ? "Beschreibung" : section === "appearance" ? "Aussehen" : "Persönlichkeit"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReroll(section)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-xs uppercase text-gray-400 hover:text-accent-gold disabled:opacity-50"
                      >
                        {rerollSection === section ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Neu
                      </button>
                    </div>
                    <p className="font-libre text-gray-300 text-sm">
                      {(persona[section] as string) ?? "–"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && persona && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Schritt 3: Aussehen bestätigen
            </h2>
            <NpcAppearanceConfirmStep
              appearance={confirmedAppearance}
              onAppearanceChange={(value) => {
                setConfirmedAppearance(value);
                setAppearanceConfirmed(false);
                setPortraitUrl(null);
                setPortraitIsAiGenerated(false);
                setUploadRightsConfirmed(false);
                setPortraitSkipped(false);
              }}
              age={portraitAge}
              onAgeChange={setPortraitAge}
              gender={portraitGender}
              onGenderChange={setPortraitGender}
              artStyleNote={artStyleNote}
              onArtStyleNoteChange={setArtStyleNote}
              worldBlueprint={worldBlueprint}
              appearanceConfirmed={appearanceConfirmed}
              onConfirm={handleConfirmAppearance}
            />
          </motion.div>
        )}

        {step === 4 && persona && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Schritt 4: Charakterportrait
            </h2>
            <NpcPortraitStep
              npcName={displayName}
              appearancePreview={confirmedAppearance}
              imageUrl={effectivePortraitUrl}
              portraitFile={portraitFile}
              onPortraitFileChange={(file) => {
                setPortraitFile(file);
                if (file) {
                  setPortraitUrl(null);
                  setPortraitIsAiGenerated(false);
                  setUploadRightsConfirmed(false);
                }
              }}
              imageDisplay={portraitDisplay}
              onImageDisplayChange={setPortraitDisplay}
              portraitSkipped={portraitSkipped}
              portraitIsAiGenerated={portraitIsAiGenerated}
              uploadRightsConfirmed={uploadRightsConfirmed}
              onUploadRightsConfirmedChange={setUploadRightsConfirmed}
              isGenerating={isPortraitPending}
              canGenerate={appearanceConfirmed}
              disabledReason={
                !appearanceConfirmed
                  ? "Bitte bestätige zuerst das Aussehen in Schritt 3."
                  : undefined
              }
              onGenerate={handleGeneratePortrait}
              onSkip={() => setPortraitSkipped(true)}
              onClearSkip={() => setPortraitSkipped(false)}
              tokenCrop={
                effectivePortraitUrl
                  ? {
                      enabled: tokenEnabled,
                      onEnabledChange: setTokenEnabled,
                      border: tokenBorder,
                      onBorderChange: setTokenBorder,
                      onTokenBlobChange: setTokenFile,
                    }
                  : undefined
              }
            />
          </motion.div>
        )}

        {step === 5 && persona && (
          <motion.div
            key="step5-combat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Schritt 5: Kampfwerte (optional)
            </h2>
            <p className="font-libre text-sm text-gray-300 mb-4">
              Optional: D&amp;D-5e-Werte für die Battlemap. Du kannst überspringen — Werte lassen
              sich später im SL-Reiter nachtragen.
            </p>
            <NpcCombatStatsEditor
              sheet={combatSheet}
              onChange={setCombatSheet}
              onGenerateAi={async ({ classHint, powerTier }) =>
                generateNpcCombatSheet(worldId, {
                  name: displayName,
                  role: persona.role,
                  race: race.trim() || persona.race,
                  appearance: confirmedAppearance || persona.appearance,
                  description: persona.description,
                  alignment: persona.alignment,
                  classHint,
                  powerTier,
                })
              }
            />
          </motion.div>
        )}

        {step === 6 && (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Schritt 6: Soziale Verwebung & To-Do
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              Zusammenfassung der Beziehungen und Zugehörigkeiten. Neue Entitäten werden nach dem Speichern als Aufgaben angelegt.
            </p>
            {persona && (
              <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4 space-y-3">
                <p className="font-libre text-gray-300">
                  <strong className="text-hero-vibrant">{persona.name}</strong>
                  {persona.role && ` (${persona.role})`} wird in der Welt verankert.
                </p>
                {briefingResult?.mappings && briefingResult.mappings.length > 0 && (
                  <div>
                    <span className="font-barlow font-bold text-xs uppercase text-gray-400">Verknüpfungen:</span>
                    <ul className="mt-1 space-y-0.5 text-sm text-gray-300">
                      {briefingResult.mappings.map((m, i) => (
                        <li key={i}>{m.mention} → {m.existing_name ?? "neu"}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {newEntities.length > 0 && (
                  <div>
                    <span className="font-barlow font-bold text-xs uppercase text-accent-blood flex items-center gap-1">
                      <ListTodo className="h-3.5 w-3.5" />
                      Werden als Aufgaben angelegt
                    </span>
                    <ul className="mt-1 space-y-1 text-sm text-gray-300">
                      {newEntities.map((e, i) => (
                        <li key={i}>
                          <span className="text-accent-gold">{e.type}</span>: {e.proposed_name} – {e.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Fraktion (optional)</label>
                    <select
                      value={selectedFactionId ?? ""}
                      onChange={(e) => setSelectedFactionId(e.target.value || null)}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                    >
                      <option value="">Keine</option>
                      {factions.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">Aufenthaltsort (optional)</label>
                    <select
                      value={selectedLocationId ?? ""}
                      onChange={(e) => setSelectedLocationId(e.target.value || null)}
                      className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                    >
                      <option value="">Keiner</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 7 && (
          <motion.div
            key="step7"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Schritt 7: Manifestation
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              NPC wird in der Welt gespeichert. Alle neuen Entitäten aus dem Briefing werden als offene Aufgaben (World Tasks) angelegt.
            </p>
            {persona && (
              <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4 mb-4">
                <p className="font-libre text-gray-300 mb-2">
                  <strong className="text-hero-vibrant">{persona.name}</strong> wird angelegt.
                </p>
                {effectivePortraitUrl && (
                  <p className="font-libre text-sm text-accent-gold mb-2">
                    Charakterportrait wird mit gespeichert.
                  </p>
                )}
                {tokenEnabled && tokenFile ? (
                  <p className="font-libre text-sm text-accent-gold mb-2">
                    Battlemap-Token wird mit gespeichert.
                  </p>
                ) : null}
                {combatSheet ? (
                  <p className="font-libre text-sm text-accent-gold mb-2">
                    Kampfwerte (SL) werden mit gespeichert.
                  </p>
                ) : null}
                {newEntities.length > 0 && (
                  <p className="font-libre text-sm text-gray-400">
                    {newEntities.length} Aufgabe(n) werden in der Welt-Übersicht erscheinen.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleStep7Manifest}
                  disabled={isPending}
                  className="mt-4 inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  NPC anlegen & abschließen
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex justify-between border-t border-hero-border pt-4">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
        {step < 7 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s < 7 ? ((s + 1) as WizardStep) : 7))}
            disabled={
              (step === 1 && !canGoStep2) ||
              (step === 2 && !canGoStep3) ||
              (step === 3 && !canGoStep4) ||
              (step === 4 && !canGoStep5) ||
              (step === 5 && !canGoStep6) ||
              (step === 6 && !canGoStep7)
            }
            className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Weiter
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
