"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, User, ChevronRight, ChevronLeft, Plus, Trash2, Loader2, Info, Image } from "lucide-react";
import { createCharacterWithRelations, getCharacterWizardLoreData } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  uploadCharacterPortrait,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import { getNPCsByFactionForOnboarding } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getChildLocationsForOnboarding } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import {
  buildLevel1Sheet,
  planLevel1Creation,
  resolveRaceId,
  STANDARD_ARRAY,
  type AbilityKeyShort,
  type ClassId,
  type RaceId,
} from "@/src/lib/characters/dnd5e/progression";
import {
  CharacterCreateRulesPanel,
  spellsStepValid,
} from "@/src/components/dashboard/CharacterCreateRulesPanel";
import {
  filterRacesForCulture,
  formatLoreRaceBonusesForDisplay,
  resolveLoreRaceBonuses,
  setSheetCampaignLore,
  getSheetCampaignLore,
} from "@/src/lib/lore-race-bonuses";

type Faction = {
  id: string;
  name: string;
  type: string;
};

type Location = {
  id: string;
  name: string;
  type: string;
};

/** Erlaubte Heimatort-Typen (wie in DB, case-insensitive): Stadt, Region, Ort, Akademie, Tempel, Gilde */
const LARGE_LOCATION_TYPES = ["Stadt", "Region", "Ort", "Akademie", "Tempel", "Gilde"];
const locationTypeMatches = (type: string | null | undefined) =>
  LARGE_LOCATION_TYPES.some((t) => String(t).toLowerCase() === String(type ?? "").toLowerCase());

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
};

type ExistingContact = {
  npc_id: string;
  relationship_type: string;
};

type NewContact = {
  name: string;
  role: string;
  relationship_to_character: string;
  description?: string;
  status: "Alive" | "Deceased" | "Missing" | "Unknown";
};

type CreateStepId =
  | "identity"
  | "class"
  | "abilities"
  | "spells"
  | "origin"
  | "world"
  | "contacts"
  | "avatar";

const STEP_LABELS: Record<CreateStepId, string> = {
  identity: "Identität",
  class: "Klasse",
  abilities: "Attribute",
  spells: "Zauber",
  origin: "Herkunft",
  world: "Welt",
  contacts: "Kontakte",
  avatar: "Bild",
};

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  factions?: Faction[];
  locations?: Location[];
  npcs?: NPC[];
  mode?: "modal" | "page";
};

const DEFAULT_ABILITIES: Record<AbilityKeyShort, number> = {
  str: STANDARD_ARRAY[0],
  dex: STANDARD_ARRAY[1],
  con: STANDARD_ARRAY[2],
  int: STANDARD_ARRAY[3],
  wis: STANDARD_ARRAY[4],
  cha: STANDARD_ARRAY[5],
};

export function CharacterCreator({ campaignId, isOpen, onClose, factions = [], locations = [], npcs = [], mode = "modal" }: Props) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Lore-Daten für Rasse/Kultur/Sprache/Religion
  type WizardRace = {
    id: string;
    name: string;
    culture_id: string | null;
    race_traits: string | null;
  };
  type WizardCulture = {
    id: string;
    name: string;
    race_ids: string[];
    language_ids: string[];
    religion_ids: string[];
  };
  type WizardLanguage = { id: string; name: string };
  type WizardReligion = { id: string; name: string };

  const [wizardRaces, setWizardRaces] = useState<WizardRace[]>([]);
  const [wizardCultures, setWizardCultures] = useState<WizardCulture[]>([]);
  const [wizardLanguages, setWizardLanguages] = useState<WizardLanguage[]>([]);
  const [wizardReligions, setWizardReligions] = useState<WizardReligion[]>([]);
  const [loreLoading, setLoreLoading] = useState(true);
  const [selectedReligionIds, setSelectedReligionIds] = useState<string[]>([]);

  // D&D 5e Katalog
  const [classId, setClassId] = useState<ClassId | "">("");
  const [subclassId, setSubclassId] = useState("");
  const [srdRaceId, setSrdRaceId] = useState<RaceId>("human");
  const [baseAbilities, setBaseAbilities] =
    useState<Record<AbilityKeyShort, number>>(DEFAULT_ABILITIES);
  const [applyRacialBonuses, setApplyRacialBonuses] = useState(true);
  const [spellIds, setSpellIds] = useState<string[]>([]);

  // Step: Identität
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [raceCustom, setRaceCustom] = useState("");
  const [selectedCultureId, setSelectedCultureId] = useState("");
  /** Lore-IDs (`world_lore.id`) – muss mit Server-Validierung (campaign_visibility) übereinstimmen, nicht Anzeigenamen. */
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [biography, setBiography] = useState("");

  // Welt-Integration
  const [faction_id, setFactionId] = useState("");
  const [location_id, setLocationId] = useState("");
  const [selectedOriginId, setSelectedOriginId] = useState("");
  const [factionMembers, setFactionMembers] = useState<{ id: string; name: string; title: string | null; role: string | null }[]>([]);
  const [childLocations, setChildLocations] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loadingFactionMembers, setLoadingFactionMembers] = useState(false);
  const [loadingChildLocations, setLoadingChildLocations] = useState(false);

  // Beziehungen
  const [existingContacts, setExistingContacts] = useState<ExistingContact[]>([]);
  const [newContacts, setNewContacts] = useState<NewContact[]>([]);

  // Avatar
  const [avatar_url, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);

  const showSpellsStep = useMemo(() => {
    if (!classId) return false;
    try {
      const plan = planLevel1Creation({
        classId,
        subclassId: subclassId || null,
      });
      if (!plan.spellcasting) return false;
      return (
        plan.spellcasting.cantripsToLearn > 0 || plan.spellcasting.spellsToLearn > 0
      );
    } catch {
      return false;
    }
  }, [classId, subclassId]);

  const createSteps = useMemo((): CreateStepId[] => {
    const list: CreateStepId[] = ["identity", "class", "origin", "abilities"];
    if (showSpellsStep) list.push("spells");
    list.push("world", "contacts", "avatar");
    return list;
  }, [showSpellsStep]);

  const step = createSteps[Math.min(stepIndex, createSteps.length - 1)] ?? "identity";

  useEffect(() => {
    if (stepIndex >= createSteps.length) {
      setStepIndex(Math.max(0, createSteps.length - 1));
    }
  }, [createSteps.length, stepIndex]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState<NewContact>({
    name: "",
    role: "",
    relationship_to_character: "",
    description: "",
    status: "Alive",
  });

  // Spieler: Fraktionen/Orte/NPCs kommen serverseitig nur mit Freigaben der jeweiligen Kampagne (campaign_visibility)
  const revealedFactions = factions;
  const revealedLocations = locations;
  const revealedNPCs = npcs;
  const largeLocations = revealedLocations.filter((l) => locationTypeMatches(l.type));

  // Rassen/Kulturen/Sprachen/Religionen laden
  useEffect(() => {
    if (!isOpen) return;
    setLoreLoading(true);
    getCharacterWizardLoreData(campaignId)
      .then(({ races, cultures, languages, religions }) => {
        setWizardRaces(races);
        setWizardCultures(cultures);
        setWizardLanguages(languages);
        setWizardReligions(religions ?? []);
      })
      .finally(() => setLoreLoading(false));
  }, [isOpen, campaignId]);

  // Hierarchie: Kultur → Rassen + Sprachen + Religionen
  const selectedCulture = wizardCultures.find((c) => c.id === selectedCultureId);

  // Rassen der gewählten Kultur (race_ids ∪ culture_id; Exilanten-Fallback)
  const racesForCulture = filterRacesForCulture(wizardRaces, selectedCulture);
  const hasRacesForCulture = racesForCulture.length > 0;

  const selectedRaceLore =
    race && race !== "__custom"
      ? racesForCulture.find((r) => r.name === race) ||
        wizardRaces.find((r) => r.name === race) ||
        null
      : null;
  const selectedRaceLoreId = selectedRaceLore?.id ?? null;

  const loreRaceBonusLines = useMemo(() => {
    const effective = race === "__custom" ? raceCustom : race;
    if (!effective) return [];
    const spec = resolveLoreRaceBonuses({
      raceName: effective,
      raceTraitsRaw: selectedRaceLore?.race_traits,
    });
    return formatLoreRaceBonusesForDisplay(spec);
  }, [race, raceCustom, selectedRaceLore?.race_traits]);

  // Sprachen der gewählten Kultur
  const languagesForCulture = selectedCulture
    ? wizardLanguages.filter((l) => selectedCulture.language_ids.includes(l.id))
    : [];
  const availableLanguages = languagesForCulture.length > 0 ? languagesForCulture : wizardLanguages;

  const religionsForCulture = selectedCulture
    ? wizardReligions.filter((r) => selectedCulture.religion_ids.includes(r.id))
    : [];

  // Bei Kulturwechsel: Rasse zurücksetzen, vorrangige Sprachen + Religionen übernehmen
  useEffect(() => {
    setRace("");
    setRaceCustom("");
    if (!selectedCultureId) {
      setSelectedLanguages([]);
      setSelectedReligionIds([]);
      return;
    }
    const cult = wizardCultures.find((c) => c.id === selectedCultureId);
    if (!cult) return;
    const langIds =
      cult.language_ids.length > 0
        ? cult.language_ids.filter((id) => wizardLanguages.some((l) => l.id === id))
        : [];
    setSelectedLanguages(langIds);
    const relIds =
      cult.religion_ids.length > 0
        ? cult.religion_ids.filter((id) => wizardReligions.some((r) => r.id === id))
        : [];
    setSelectedReligionIds(relIds);
  }, [selectedCultureId, wizardCultures, wizardLanguages, wizardReligions]);

  // Lore-Rasse → SRD-Mapping vorschlagen
  useEffect(() => {
    const effective = race === "__custom" ? raceCustom : race;
    if (!effective) return;
    const resolved = resolveRaceId(effective);
    if (resolved !== "unknown") setSrdRaceId(resolved);
  }, [race, raceCustom]);

  // Fraktions-Kontext: NPCs der gewählten Fraktion laden (für "Bekannte Mitglieder" & Schritt Kontakte)
  useEffect(() => {
    if (!faction_id) {
      setFactionMembers([]);
      return;
    }
    setLoadingFactionMembers(true);
    getNPCsByFactionForOnboarding(campaignId, faction_id)
      .then(setFactionMembers)
      .finally(() => setLoadingFactionMembers(false));
  }, [campaignId, faction_id]);

  // Orts-Kontext: Gebäude/Institutionen unter gewähltem Heimatort laden
  useEffect(() => {
    if (!selectedOriginId) {
      setChildLocations([]);
      return;
    }
    setLoadingChildLocations(true);
    getChildLocationsForOnboarding(campaignId, selectedOriginId)
      .then(setChildLocations)
      .finally(() => setLoadingChildLocations(false));
  }, [campaignId, selectedOriginId]);

  const addExistingContact = () => {
    setExistingContacts([...existingContacts, { npc_id: "", relationship_type: "" }]);
  };

  const removeExistingContact = (index: number) => {
    setExistingContacts(existingContacts.filter((_, i) => i !== index));
  };

  const updateExistingContact = (index: number, field: "npc_id" | "relationship_type", value: string) => {
    const updated = [...existingContacts];
    updated[index] = { ...updated[index], [field]: value };
    setExistingContacts(updated);
  };

  const addNewContact = () => {
    if (!newContactForm.name || !newContactForm.role || !newContactForm.relationship_to_character) {
      alert("Bitte fülle alle Pflichtfelder aus.");
      return;
    }
    setNewContacts([...newContacts, { ...newContactForm }]);
    setNewContactForm({ name: "", role: "", relationship_to_character: "", description: "", status: "Alive" });
    setShowNewContactModal(false);
  };

  const removeNewContact = (index: number) => {
    setNewContacts(newContacts.filter((_, i) => i !== index));
  };

  const effectiveRace = race === "__custom" ? raceCustom : race;

  const handleSubmit = () => {
    if (!name || !classId || !effectiveRace) {
      alert("Bitte fülle alle Pflichtfelder aus (Name, Klasse, Rasse).");
      return;
    }
    if (planLevel1Creation({ classId, subclassId: subclassId || null }).needsSubclass && !subclassId) {
      alert("Bitte wähle eine Subklasse / Domäne.");
      return;
    }

    startTransition(async () => {
      try {
        let finalAvatarUrl = avatar_url.trim() || null;
        let finalAvatarPath: string | null = null;

        if (avatarFile) {
          const r = await uploadCharacterPortrait(avatarFile, {});
          if ("error" in r) {
            alert(r.error);
            return;
          }
          finalAvatarUrl = r.publicUrl;
          finalAvatarPath = r.path;
        }

        const built = buildLevel1Sheet({
          classId,
          subclassId: subclassId || null,
          raceName: effectiveRace,
          raceId: srdRaceId,
          baseAbilities,
          applyRacialBonuses,
          spellIds,
          skillKeys: [],
          loreRaceTraitsRaw: selectedRaceLore?.race_traits ?? null,
          loreRaceLoreId: selectedRaceLoreId,
          preferLoreAbilityBonuses: true,
        });

        let sheetData = built.sheet;
        if (selectedReligionIds.length > 0) {
          const names = selectedReligionIds
            .map((id) => wizardReligions.find((r) => r.id === id)?.name)
            .filter((n): n is string => Boolean(n?.trim()));
          sheetData = setSheetCampaignLore(sheetData, {
            ...getSheetCampaignLore(sheetData),
            religionIds: selectedReligionIds,
            religionNames: names,
          });
        }

        await createCharacterWithRelations({
          campaign_id: campaignId,
          name,
          class: built.meta.className,
          subclass: built.meta.subclass,
          race: effectiveRace,
          level: 1,
          biography: biography || null,
          avatar_url: finalAvatarUrl,
          avatar_storage_path: finalAvatarPath,
          faction_id: faction_id || null,
          location_id: location_id || null,
          culture_lore_id: selectedCultureId || null,
          languages: selectedLanguages,
          existing_contacts: existingContacts.filter((c) => c.npc_id && c.relationship_type),
          new_contacts: newContacts,
          sheet_data: sheetData,
        });
        if (mode === "page") {
          router.push(`/dashboard/campaigns/${campaignId}`);
        } else {
          onClose();
          window.location.reload();
        }
      } catch (error: any) {
        alert(error.message || "Fehler beim Erstellen des Charakters.");
      }
    });
  };

  if (!isOpen && mode !== "page") return null;

  const canGoNext = () => {
    if (step === "identity") return Boolean(name.trim());
    if (step === "class") {
      if (!classId) return false;
      const plan = planLevel1Creation({ classId, subclassId: subclassId || null });
      if (plan.needsSubclass && !subclassId) return false;
      return true;
    }
    if (step === "abilities") return true;
    if (step === "spells") return spellsStepValid(classId, subclassId, spellIds);
    if (step === "origin") return Boolean(effectiveRace);
    if (step === "world") return true;
    if (step === "contacts") return true;
    if (step === "avatar") return Boolean(name && classId && effectiveRace);
    return false;
  };

  const isPageMode = mode === "page";
  const isLastStep = stepIndex >= createSteps.length - 1;

  return (
    <div className={isPageMode ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"}>
      <div
        className={`relative w-full rounded-lg border border-accent-gold/30 shadow-2xl flex flex-col overflow-hidden ${isPageMode ? "" : "max-w-4xl max-h-[90vh]"}`}
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-accent-gold/20 bg-background-dark/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-hero-dark p-2">
              <User className="h-6 w-6 text-accent-gold" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-2xl text-white">Charakter erstellen</h2>
              <p className="font-libre text-sm text-gray-400">
                Schritt {stepIndex + 1} von {createSteps.length}: {STEP_LABELS[step]}
              </p>
            </div>
          </div>
          {!isPageMode && (
            <button
              onClick={onClose}
              className="rounded p-2 transition-colors hover:bg-hero-dark hover:text-white"
              disabled={isPending}
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex-none px-6 py-4 border-b border-accent-gold/20 bg-background-dark/70">
          <div className="flex items-center gap-1 overflow-x-auto">
            {createSteps.map((s, i) => (
              <div key={s} className="flex min-w-0 flex-1 items-center">
                <div
                  className={`flex-1 h-2 rounded ${
                    i <= stepIndex ? "bg-hero-vibrant" : "bg-hero-dark"
                  }`}
                  title={STEP_LABELS[s]}
                />
                {i < createSteps.length - 1 && (
                  <ChevronRight
                    className={`h-3 w-3 mx-0.5 shrink-0 ${
                      i < stepIndex ? "text-hero-vibrant" : "text-gray-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-background-dark/60">
          {step === "identity" && (
            <div className="space-y-5">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                Identität
              </h3>
              <p className="font-libre text-sm text-gray-400">
                Charaktererstellung auf Stufe 1 mit D&amp;D-5e-Katalogregeln.
              </p>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  placeholder="z.B. Aria Mondlicht"
                />
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Biografie / Hintergrundgeschichte (Optional)
                </label>
                <textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={6}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-y"
                  placeholder="Erzähle die Hintergrundgeschichte deines Charakters... Wo kommt er her? Was hat ihn geprägt? Was sind seine Ziele?"
                />
                <p className="mt-1 text-xs text-gray-500 font-libre italic">
                  Optional: Beschreibe die Vergangenheit und Motivation deines Charakters.
                </p>
              </div>

            </div>
          )}

          {step === "class" && (
            <CharacterCreateRulesPanel
              mode="class"
              classId={classId}
              onClassId={setClassId}
              subclassId={subclassId}
              onSubclassId={setSubclassId}
              srdRaceId={srdRaceId}
              onSrdRaceId={setSrdRaceId}
              baseAbilities={baseAbilities}
              onBaseAbilities={setBaseAbilities}
              applyRacialBonuses={applyRacialBonuses}
              onApplyRacialBonuses={setApplyRacialBonuses}
              spellIds={spellIds}
              onSpellIds={setSpellIds}
            />
          )}

          {step === "abilities" && (
            <CharacterCreateRulesPanel
              mode="abilities"
              classId={classId}
              onClassId={setClassId}
              subclassId={subclassId}
              onSubclassId={setSubclassId}
              srdRaceId={srdRaceId}
              onSrdRaceId={setSrdRaceId}
              baseAbilities={baseAbilities}
              onBaseAbilities={setBaseAbilities}
              applyRacialBonuses={applyRacialBonuses}
              onApplyRacialBonuses={setApplyRacialBonuses}
              spellIds={spellIds}
              onSpellIds={setSpellIds}
            />
          )}

          {step === "spells" && (
            <CharacterCreateRulesPanel
              mode="spells"
              classId={classId}
              onClassId={setClassId}
              subclassId={subclassId}
              onSubclassId={setSubclassId}
              srdRaceId={srdRaceId}
              onSrdRaceId={setSrdRaceId}
              baseAbilities={baseAbilities}
              onBaseAbilities={setBaseAbilities}
              applyRacialBonuses={applyRacialBonuses}
              onApplyRacialBonuses={setApplyRacialBonuses}
              spellIds={spellIds}
              onSpellIds={setSpellIds}
            />
          )}

          {step === "origin" && (
            <div className="space-y-5">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                Herkunft (Kampagnen-Lore)
              </h3>
              {/* Kultur → Rasse → Sprachen (Hierarchie) */}
              {loreLoading ? (
                <div className="flex items-center gap-2 p-3 font-libre text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Lade Lore-Daten...
                </div>
              ) : wizardCultures.length > 0 ? (
                <>
                  {/* 1. Kultur wählen */}
                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      Kultur
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedCultureId}
                        onChange={(e) => setSelectedCultureId(e.target.value)}
                        className="flex-1 rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                      >
                        <option value="">-- Kultur wählen --</option>
                        {wizardCultures
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      {selectedCultureId && (
                        <a
                          href={`/dashboard/campaigns/${campaignId}/lore/${selectedCultureId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded border border-hero-dark bg-slate-900/80 p-3 text-gray-500 hover:text-accent-gold hover:border-accent-gold transition-colors"
                          title={`Mehr über diese Kultur erfahren`}
                        >
                          <Info className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 font-libre italic">
                      Die Kultur bestimmt die verfügbaren Rassen und Sprachen.
                    </p>
                  </div>

                  {/* 2. Rasse wählen (gefiltert nach Kultur) */}
                  <div>
                    <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                      Rasse *
                    </label>
                    {selectedCultureId && hasRacesForCulture ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={race}
                          onChange={(e) => setRace(e.target.value)}
                          className="flex-1 rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                        >
                          <option value="">-- Rasse wählen --</option>
                          {racesForCulture
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((r) => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          <option value="__custom">Andere (Freitext)</option>
                        </select>
                        {selectedRaceLoreId && (
                          <a
                            href={`/dashboard/campaigns/${campaignId}/lore/${selectedRaceLoreId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded border border-hero-dark bg-slate-900/80 p-3 text-gray-500 hover:text-accent-gold hover:border-accent-gold transition-colors"
                            title={`Mehr über diese Rasse erfahren`}
                          >
                            <Info className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    ) : wizardRaces.length > 0 && !selectedCultureId ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={race}
                          onChange={(e) => setRace(e.target.value)}
                          className="flex-1 rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                        >
                          <option value="">-- Rasse wählen --</option>
                          {wizardRaces
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((r) => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          <option value="__custom">Andere (Freitext)</option>
                        </select>
                        {selectedRaceLoreId && (
                          <a
                            href={`/dashboard/campaigns/${campaignId}/lore/${selectedRaceLoreId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded border border-hero-dark bg-slate-900/80 p-3 text-gray-500 hover:text-accent-gold hover:border-accent-gold transition-colors"
                            title={`Mehr über diese Rasse erfahren`}
                          >
                            <Info className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={race === "__custom" ? raceCustom : race}
                        onChange={(e) => {
                          setRace("__custom");
                          setRaceCustom(e.target.value);
                        }}
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                        placeholder="Rasse eingeben..."
                      />
                    )}
                    {race === "__custom" && selectedCultureId && hasRacesForCulture && (
                      <input
                        type="text"
                        value={raceCustom}
                        onChange={(e) => setRaceCustom(e.target.value)}
                        className="mt-2 w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                        placeholder="Rasse eingeben..."
                      />
                    )}
                    {loreRaceBonusLines.length > 0 ? (
                      <div className="mt-3 rounded border border-accent-gold/40 bg-accent-gold/5 p-3 space-y-1.5">
                        <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                          Rassenboni / Besonderheiten
                        </p>
                        <ul className="space-y-1 font-libre text-xs text-gray-200 leading-relaxed list-disc pl-4">
                          {loreRaceBonusLines.map((line) => (
                            <li key={line.slice(0, 48)}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Rasse *
                  </label>
                  <input
                    type="text"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Elf"
                  />
                </div>
              )}

              {/* 3. Sprachen (aus Kultur vorrangig vorausgewählt) */}
              {availableLanguages.length > 0 && (
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Sprachen
                  </label>
                  <p className="mb-2 font-libre text-xs text-gray-500 italic">
                    Bei Kulturwahl werden die vorrangigen Sprachen der Kultur vorausgewählt.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableLanguages
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((lang) => {
                        const isSelected = selectedLanguages.includes(lang.id);
                        return (
                          <div
                            key={lang.id}
                            className={`flex items-center rounded border p-2.5 transition-colors ${
                              isSelected
                                ? "border-accent-gold bg-accent-gold/10 text-white"
                                : "border-hero-dark bg-slate-900/80 text-gray-300 hover:border-hero-vibrant"
                            }`}
                          >
                            <label className="flex flex-1 items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedLanguages(selectedLanguages.filter((l) => l !== lang.id));
                                  } else {
                                    setSelectedLanguages([...selectedLanguages, lang.id]);
                                  }
                                }}
                                className="accent-accent-gold"
                              />
                              <span className="font-libre text-sm">{lang.name}</span>
                            </label>
                            <a
                              href={`/dashboard/campaigns/${campaignId}/lore/${lang.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto rounded p-1 text-gray-500 hover:text-accent-gold transition-colors"
                              title={`Mehr über „${lang.name}" erfahren`}
                            >
                              <Info className="h-4 w-4" />
                            </a>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 4. Religion (aus Kultur) */}
              {religionsForCulture.length > 0 && (
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Religion
                  </label>
                  <p className="mb-2 font-libre text-xs text-gray-500 italic">
                    Zugehörige Religion(en) der Kultur — vorausgewählt, anpassbar.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {religionsForCulture
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((rel) => {
                        const isSelected = selectedReligionIds.includes(rel.id);
                        return (
                          <label
                            key={rel.id}
                            className={`flex items-center gap-2 rounded border p-2.5 cursor-pointer transition-colors ${
                              isSelected
                                ? "border-accent-gold bg-accent-gold/10 text-white"
                                : "border-hero-dark bg-slate-900/80 text-gray-300 hover:border-hero-vibrant"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedReligionIds(selectedReligionIds.filter((id) => id !== rel.id));
                                } else {
                                  setSelectedReligionIds([...selectedReligionIds, rel.id]);
                                }
                              }}
                              className="accent-accent-gold"
                            />
                            <span className="font-libre text-sm">{rel.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}


            </div>
          )}

          {/* Welt-Integration */}
          {step === "world" && (
            <div className="space-y-5">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                Welt-Integration
              </h3>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Fraktions-Zugehörigkeit (Optional)
                </label>
                <select
                  value={faction_id}
                  onChange={(e) => setFactionId(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                >
                  <option value="">-- Keine Fraktion --</option>
                  {revealedFactions
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((faction) => (
                      <option key={faction.id} value={faction.id}>
                        {faction.name || "Unbekannte Fraktion"} ({faction.type || "—"})
                      </option>
                    ))}
                </select>
                {faction_id && (
                  <div className="mt-3 rounded border border-hero-border/30 bg-hero-dark/20 p-3">
                    <p className="mb-2 font-barlow font-semibold text-sm uppercase text-accent-gold">
                      Bekannte Mitglieder
                    </p>
                    {loadingFactionMembers ? (
                      <p className="font-libre text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Lade…
                      </p>
                    ) : factionMembers.length === 0 ? (
                      <p className="font-libre text-sm text-gray-500 italic">Keine Mitglieder für Onboarding freigegeben.</p>
                    ) : (
                      <ul className="space-y-1 font-libre text-sm text-gray-200">
                        {factionMembers.map((npc) => (
                          <li key={npc.id}>
                            {npc.name}
                            {(npc.title || npc.role) && (
                              <span className="text-gray-500 ml-1">({npc.title || npc.role})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Heimatort: value = world_lore.id, label = world_lore.name (Daten aus world_lore, allow_pc_origin) */}
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Heimatort – Große Orte (Stadt/Region, Optional)
                </label>
                <select
                  value={selectedOriginId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedOriginId(id);
                    setLocationId(id);
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                >
                  <option value="">-- Kein Ort --</option>
                  {[...largeLocations]
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name || "Unbekannter Ort"} ({location.type || "—"})
                      </option>
                    ))}
                </select>
              </div>

              {selectedOriginId && (
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Spezifischer Startpunkt – Gebäude/Institution (Optional)
                  </label>
                  {loadingChildLocations ? (
                    <p className="font-libre text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lade Gebäude…
                    </p>
                  ) : (
                    <select
                      value={childLocations.some((c) => c.id === location_id) ? location_id : ""}
                      onChange={(e) => setLocationId(e.target.value || selectedOriginId)}
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                    >
                      <option value="">-- Nur Ort, kein Gebäude --</option>
                      {childLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name || "Unbekannter Ort"} ({loc.type || "—"})
                        </option>
                      ))}
                    </select>
                  )}
                  {!loadingChildLocations && childLocations.length === 0 && (
                    <p className="mt-1 font-libre text-xs text-gray-500 italic">
                      Keine Gebäude/Institutionen für diesen Ort freigegeben.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Beziehungen & NPCs */}
          {step === "contacts" && (
            <div className="space-y-6">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                Beziehungen & NPCs
              </h3>

              {/* Vorgeschlagene Kontakte (aus gewählter Fraktion) */}
              {factionMembers.length > 0 && (
                <div className="rounded border border-accent-gold/30 bg-accent-gold/5 p-4">
                  <p className="mb-3 font-barlow font-semibold text-sm uppercase text-accent-gold">
                    Vorgeschlagene Kontakte (deine Fraktion)
                  </p>
                  <p className="mb-3 font-libre text-xs text-gray-400">
                    Diese NPCs gehören zu deiner gewählten Fraktion. Füge sie bei Bedarf als Kontakte hinzu.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {factionMembers
                      .filter((npc) => !existingContacts.some((c) => c.npc_id === npc.id))
                      .map((npc) => (
                        <button
                          key={npc.id}
                          type="button"
                          onClick={() => {
                            setExistingContacts([
                              ...existingContacts,
                              { npc_id: npc.id, relationship_type: "Mitglied" },
                            ]);
                          }}
                          className="flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-3 py-2 font-libre text-sm text-gray-200 hover:bg-hero-vibrant/20 hover:border-hero-vibrant transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-hero-vibrant" />
                          {npc.name}
                          {(npc.title || npc.role) && (
                            <span className="text-gray-500">({npc.title || npc.role})</span>
                          )}
                        </button>
                      ))}
                    {factionMembers.every((npc) => existingContacts.some((c) => c.npc_id === npc.id)) &&
                      factionMembers.length > 0 && (
                        <span className="font-libre text-xs text-gray-500 italic">
                          Alle vorgeschlagenen Kontakte hinzugefügt.
                        </span>
                      )}
                  </div>
                </div>
              )}

              {/* Liste 1: Bekannte Kontakte */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
                    Bekannte Kontakte (Existierende NPCs)
                  </label>
                  <button
                    type="button"
                    onClick={addExistingContact}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Kontakt hinzufügen
                  </button>
                </div>

                {existingContacts.length === 0 ? (
                  <p className="text-xs text-gray-500 font-libre italic">
                    Noch keine Kontakte hinzugefügt.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {existingContacts.map((contact, index) => {
                      const availableNPCs = revealedNPCs.filter(
                        (npc) =>
                          contact.npc_id === npc.id ||
                          !existingContacts.some((c, i) => i !== index && c.npc_id === npc.id)
                      );

                      return (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded border border-hero-border bg-hero-dark/30"
                        >
                          <div className="flex-1 grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                                NPC
                              </label>
                              <select
                                value={contact.npc_id}
                                onChange={(e) => updateExistingContact(index, "npc_id", e.target.value)}
                                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                              >
                                <option value="">-- NPC wählen --</option>
                                {availableNPCs
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((npc) => (
                                    <option key={npc.id} value={npc.id}>
                                      {npc.name}
                                      {npc.title ? ` (${npc.title})` : npc.role ? ` (${npc.role})` : ""}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                                Beziehungstyp
                              </label>
                              <input
                                type="text"
                                value={contact.relationship_type}
                                onChange={(e) => updateExistingContact(index, "relationship_type", e.target.value)}
                                placeholder="z.B. Mentor, Feind, Verbündeter"
                                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingContact(index)}
                            className="mt-6 p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Liste 2: Eigene Kontakte */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
                    Eigene Kontakte (Familie/Freunde)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewContactModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark text-xs font-barlow font-bold uppercase text-white hover:bg-hero-vibrant transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Eigenen NPC erstellen
                  </button>
                </div>

                {newContacts.length === 0 ? (
                  <p className="text-xs text-gray-500 font-libre italic">
                    Noch keine eigenen Kontakte erstellt.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {newContacts.map((contact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded border border-hero-border bg-hero-dark/30"
                      >
                        <div>
                          <span className="font-libre text-gray-200 font-semibold">{contact.name}</span>
                          <span className="text-gray-400 ml-2">({contact.role})</span>
                          <span className="text-gray-500 ml-2 italic">- {contact.relationship_to_character}</span>
                          <span className="text-xs text-gray-600 ml-2">({contact.status})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewContact(index)}
                          className="p-1.5 rounded text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Entfernen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Contact Modal */}
              {showNewContactModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
                  <div className="relative w-full max-w-md rounded-lg border border-hero-border bg-background-card p-6">
                    <h4 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                      Eigenen NPC erstellen
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={newContactForm.name}
                          onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                          placeholder="z.B. Elara Mondlicht"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                          Rolle/Beruf *
                        </label>
                        <input
                          type="text"
                          value={newContactForm.role}
                          onChange={(e) => setNewContactForm({ ...newContactForm, role: e.target.value })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                          placeholder="z.B. Bäcker, Mutter, Händler"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                          Beziehung zum Charakter *
                        </label>
                        <input
                          type="text"
                          value={newContactForm.relationship_to_character}
                          onChange={(e) => setNewContactForm({ ...newContactForm, relationship_to_character: e.target.value })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                          placeholder="z.B. Mutter, Jugendfreund, Mentor"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                          Beschreibung (Optional, für GM)
                        </label>
                        <textarea
                          value={newContactForm.description || ""}
                          onChange={(e) => setNewContactForm({ ...newContactForm, description: e.target.value })}
                          rows={2}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
                          placeholder="Kurze Beschreibung oder Kontext für den GM"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-300">
                          Status
                        </label>
                        <select
                          value={newContactForm.status}
                          onChange={(e) => setNewContactForm({ ...newContactForm, status: e.target.value as any })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none transition-all focus:border-accent-gold"
                        >
                          <option value="Alive">Lebend</option>
                          <option value="Deceased">Verstorben</option>
                          <option value="Missing">Vermisst</option>
                          <option value="Unknown">Unbekannt</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addNewContact}
                          className="flex-1 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
                        >
                          Hinzufügen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewContactModal(false);
                            setNewContactForm({ name: "", role: "", relationship_to_character: "", description: "", status: "Alive" });
                          }}
                          className="px-4 py-2 rounded border border-hero-border font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Charakterbild / Avatar */}
          {step === "avatar" && (
            <div className="space-y-5">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
                <Image className="h-5 w-5 text-accent-gold" />
                Charakterbild (Optional)
              </h3>
              <p className="font-libre text-gray-300">
                Lade ein Portrait hoch (JPEG, PNG oder WebP) oder trage eine Bild-URL ein.
              </p>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Datei hochladen
                </label>
                <input
                  type="file"
                  accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
                  className="w-full max-w-md text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-accent-gold"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) return;
                    const msg = validateProfileImageFile(f);
                    if (msg) {
                      alert(msg);
                      return;
                    }
                    setAvatarFile(f);
                    setAvatarUrl("");
                  }}
                />
                <label className="mb-2 mt-5 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Bild-URL (falls kein Upload)
                </label>
                <input
                  type="url"
                  value={avatar_url}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setAvatarFile(null);
                  }}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  placeholder="https://example.com/charakterbild.jpg"
                />
                {(avatarBlobUrl || avatar_url.trim()) && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-hero-border bg-hero-dark">
                      <img
                        src={(avatarBlobUrl || avatar_url.trim()) as string}
                        alt="Vorschau"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <p className="font-libre text-sm text-gray-400">
                      Vorschau deines Charakterbilds
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-accent-gold/20 bg-background-dark/80 backdrop-blur-sm">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => stepIndex > 0 && setStepIndex(stepIndex - 1)}
              disabled={stepIndex === 0 || isPending}
              className="flex items-center gap-2 rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setStepIndex(stepIndex + 1)}
                disabled={!canGoNext() || isPending}
                className="flex items-center gap-2 rounded bg-accent-gold px-6 py-2.5 font-barlow font-bold uppercase text-background-dark transition-colors hover:bg-yellow-400 disabled:opacity-40 shadow-md"
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canGoNext() || isPending}
                className="flex items-center gap-2 rounded bg-accent-gold px-6 py-2.5 font-barlow font-bold uppercase text-background-dark transition-colors hover:bg-yellow-400 disabled:opacity-40 shadow-lg shadow-accent-gold/30"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  "Charakter erstellen"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

