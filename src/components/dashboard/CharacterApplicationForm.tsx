"use client";

import { useState, useMemo } from "react";
import {
  X,
  User,
  Shield,
  Sparkles,
  BookOpen,
  Target,
  Heart,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { AutocompleteCombobox } from "./AutocompleteCombobox";
import { AddPersonModal } from "./AddPersonModal";
import { submitCharacterApplication } from "@/src/app/dashboard/campaigns/[id]/application-actions";

type Faction = { id: string; name: string; type?: string };
type Location = { id: string; name: string; type?: string };
type NPC = { id: string; name: string; faction_id?: string | null; factions?: { name: string } | null };
type ImportantPerson = {
  name: string;
  relation: string;
  age: number;
  alignment: string;
  npc_id?: string | null;
};

type CharacterApplicationFormProps = {
  campaignId: string;
  factions: Faction[]; // Bereits gefiltert: is_revealed = true
  locations: Location[]; // Bereits gefiltert: is_revealed = true, type IN ('Stadt', 'Region', 'Dorf')
  npcs: NPC[]; // Bereits gefiltert: is_revealed = true
  onClose: () => void;
  onSuccess?: () => void;
};

export function CharacterApplicationForm({
  campaignId,
  factions,
  locations,
  npcs,
  onClose,
  onSuccess,
}: CharacterApplicationFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);

  // Step 1: Basis
  const [name, setName] = useState("");
  const [class_name, setClass_name] = useState("");
  const [race, setRace] = useState("");
  const [level, setLevel] = useState("1");
  const [avatar_url, setAvatar_url] = useState("");
  const [age, setAge] = useState("");
  const [physical_traits, setPhysical_traits] = useState("");
  const [personality1, setPersonality1] = useState("");
  const [personality2, setPersonality2] = useState("");
  const [personality3, setPersonality3] = useState("");

  // Step 2: Geschichte & Welt (REIHENFOLGE: Fraktionen VOR NPCs)
  const [backstory, setBackstory] = useState("");
  const [profession, setProfession] = useState("");
  const [selectedFactionId, setSelectedFactionId] = useState<string>(""); // Strict Dropdown
  const [selectedLocationId, setSelectedLocationId] = useState<string>(""); // Parent Location
  const [tempLocationName, setTempLocationName] = useState(""); // Optional Detail

  // Step 3: Persönlichkeit & NPCs
  const [goals, setGoals] = useState("");
  const [fears, setFears] = useState("");
  const [importantPeople, setImportantPeople] = useState<ImportantPerson[]>([]);

  const basicsValid = name.trim().length > 0 && class_name.trim().length > 0 && race.trim().length > 0;

  // NPCs sortiert nach gewählter Fraktion (für Step 3)
  const sortedNPCs = useMemo(() => {
    if (!selectedFactionId) return npcs;

    const factionNPCs = npcs.filter((npc) => npc.faction_id === selectedFactionId);
    const otherNPCs = npcs.filter((npc) => npc.faction_id !== selectedFactionId);

    return [...factionNPCs, ...otherNPCs];
  }, [npcs, selectedFactionId]);

  // Finde Fraktionsname für NPC-Display
  const getFactionName = (npc: NPC): string => {
    if (npc.factions?.name) {
      return `${npc.name} (${npc.factions.name})`;
    }
    return npc.name;
  };

  function goNext() {
    if (step === 1 && !basicsValid) {
      setError("Bitte fülle alle Pflichtfelder im ersten Schritt aus.");
      return;
    }
    setError(null);
    setStep((prev) => (prev === 1 ? 2 : 3));
  }

  function goBack() {
    setError(null);
    setStep((prev) => (prev === 3 ? 2 : 1));
  }

  function handleAddPerson(person: ImportantPerson) {
    setImportantPeople([...importantPeople, person]);
    setShowPersonModal(false);
  }

  function handleRemovePerson(index: number) {
    setImportantPeople(importantPeople.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!basicsValid) {
      setError("Bitte fülle alle Pflichtfelder aus.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitCharacterApplication({
        campaignId,
        // Step 1
        name,
        class: class_name,
        race,
        level: parseInt(level) || 1,
        avatar_url: avatar_url || undefined,
        age: age ? parseInt(age) : undefined,
        physical_traits: physical_traits || undefined,
        personality_adjectives: [personality1, personality2, personality3].filter(Boolean),
        // Step 2
        backstory_summary: backstory || undefined,
        profession: profession || undefined,
        faction_id: selectedFactionId || null, // Strict: Nur ID
        current_location_id: selectedLocationId || null,
        temp_location_name: tempLocationName || null,
        // Step 3
        goals: goals || undefined,
        fears: fears || undefined,
        important_people: importantPeople.length > 0 ? importantPeople : undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern der Bewerbung.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <div>
            <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
              Charakter erstellen
            </h2>
            <p className="mt-1 font-barlow text-xs uppercase text-gray-400">
              Schritt {step} von 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form id="character-application-form" className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: BASIS */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-4">
                Die Basis
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    <User className="inline h-4 w-4 mr-2" />
                    Charaktername *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Thorin Eisenschild"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    <Shield className="inline h-4 w-4 mr-2" />
                    Klasse *
                  </label>
                  <input
                    type="text"
                    value={class_name}
                    onChange={(e) => setClass_name(e.target.value)}
                    placeholder="z.B. Krieger, Magier"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    <Sparkles className="inline h-4 w-4 mr-2" />
                    Rasse *
                  </label>
                  <input
                    type="text"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    placeholder="z.B. Zwerg, Elf"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    Level
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    Alter
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="z.B. 25"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatar_url}
                    onChange={(e) => setAvatar_url(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  Äußerliche Merkmale
                </label>
                <textarea
                  value={physical_traits}
                  onChange={(e) => setPhysical_traits(e.target.value)}
                  rows={3}
                  placeholder="Beschreibe das Aussehen des Charakters..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                />
              </div>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  Persönlichkeits-Adjektive (3)
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={personality1}
                    onChange={(e) => setPersonality1(e.target.value)}
                    placeholder="z.B. mutig"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                  <input
                    type="text"
                    value={personality2}
                    onChange={(e) => setPersonality2(e.target.value)}
                    placeholder="z.B. loyal"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                  <input
                    type="text"
                    value={personality3}
                    onChange={(e) => setPersonality3(e.target.value)}
                    placeholder="z.B. ehrgeizig"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GESCHICHTE & WELT (Fraktionen VOR NPCs) */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-4">
                Geschichte & Welt
              </h3>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  <BookOpen className="inline h-4 w-4 mr-2" />
                  Backstory
                </label>
                <textarea
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  rows={6}
                  placeholder="Erzähle die Geschichte deines Charakters..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                />
              </div>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  Beruf
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="z.B. Schmied, Händler"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>

              {/* Fraktion: STRICT DROPDOWN */}
              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  <Shield className="inline h-4 w-4 mr-2" />
                  Fraktion / Zugehörigkeit
                </label>
                <select
                  value={selectedFactionId}
                  onChange={(e) => setSelectedFactionId(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Keine Fraktion --</option>
                  {factions.map((faction) => (
                    <option key={faction.id} value={faction.id}>
                      {faction.name} {faction.type ? `(${faction.type})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Du kannst nur aus existierenden, sichtbaren Fraktionen wählen.
                </p>
              </div>

              {/* Ort: HYBRID (Parent + optional Detail) */}
              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Aktueller Ort (Basis)
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => {
                    setSelectedLocationId(e.target.value);
                    if (!e.target.value) setTempLocationName(""); // Reset Detail wenn kein Parent
                  }}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Kein Ort gewählt --</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} {location.type ? `(${location.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detail-Ort (nur wenn Parent gewählt) */}
              {selectedLocationId && (
                <div>
                  <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                    Genauer Ort / Gebäude (Optional)
                  </label>
                  <input
                    type="text"
                    value={tempLocationName}
                    onChange={(e) => setTempLocationName(e.target.value)}
                    placeholder="z.B. Das Waisenhaus, Die Taverne 'Zum Drachen'"
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                  />
                  <p className="mt-1 font-libre text-xs text-gray-500">
                    Optional: Spezifiziere einen Detail-Ort innerhalb des gewählten Ortes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PERSÖNLICHKEIT & NPCs */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-4">
                Persönlichkeit & NPCs
              </h3>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  <Target className="inline h-4 w-4 mr-2" />
                  Ziele
                </label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  placeholder="Was möchte der Charakter erreichen?"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                />
              </div>

              <div>
                <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
                  Ängste
                </label>
                <textarea
                  value={fears}
                  onChange={(e) => setFears(e.target.value)}
                  rows={3}
                  placeholder="Wovor hat der Charakter Angst?"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-none font-libre"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-barlow font-bold uppercase text-sm text-gray-300">
                    <Heart className="inline h-4 w-4 mr-2" />
                    Wichtige Personen
                    {selectedFactionId && (
                      <span className="ml-2 text-xs text-accent-gold">
                        (NPCs deiner Fraktion werden zuerst angezeigt)
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPersonModal(true)}
                    className="flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-3 py-1.5 font-barlow font-bold text-xs uppercase text-white hover:bg-hero-vibrant transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Person hinzufügen
                  </button>
                </div>

                {importantPeople.length === 0 ? (
                  <p className="text-sm text-gray-500 font-libre italic">
                    Noch keine Personen hinzugefügt.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {importantPeople.map((person, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded border border-hero-dark bg-background-dark p-3"
                      >
                        <div className="flex-1">
                          <p className="font-barlow font-bold text-white">{person.name}</p>
                          <p className="font-libre text-sm text-gray-400">
                            {person.relation} • {person.age} Jahre • {person.alignment}
                            {person.npc_id === null && (
                              <span className="ml-2 text-accent-gold">(Neu)</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(index)}
                          className="rounded p-1.5 text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-hero-dark bg-background-dark/50">
          <div className="flex items-center justify-between gap-2">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
                >
                  <ChevronLeft className="inline h-4 w-4 mr-1" />
                  Zurück
                </button>
              )}
            </div>
            <div className="ml-auto">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && !basicsValid}
                  className="rounded border border-hero-border bg-hero-vibrant px-6 py-2 font-barlow font-bold uppercase text-xs text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Weiter
                  <ChevronRight className="inline h-4 w-4 ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded border border-hero-border bg-hero-vibrant px-6 py-2 font-barlow font-bold uppercase text-xs text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? "Wird gespeichert..." : "Zur Prüfung einreichen"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Person Modal */}
      {showPersonModal && (
        <AddPersonModal
          isOpen={showPersonModal}
          onClose={() => setShowPersonModal(false)}
          onAdd={handleAddPerson}
          npcs={sortedNPCs}
          getFactionName={getFactionName}
        />
      )}
    </div>
  );
}
