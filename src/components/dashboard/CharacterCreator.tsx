"use client";

import { useState, useTransition, useEffect } from "react";
import { X, User, ChevronRight, ChevronLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { createCharacterWithRelations } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import { getNPCsByFactionForOnboarding } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getChildLocationsForOnboarding } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

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

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  factions?: Faction[];
  locations?: Location[];
  npcs?: NPC[];
};

export function CharacterCreator({ campaignId, isOpen, onClose, factions = [], locations = [], npcs = [] }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step A: Basis-Daten
  const [name, setName] = useState("");
  const [class_name, setClassName] = useState("");
  const [race, setRace] = useState("");
  const [level, setLevel] = useState(1);
  const [biography, setBiography] = useState("");

  // Step B: Welt-Integration
  const [faction_id, setFactionId] = useState("");
  const [location_id, setLocationId] = useState("");
  const [selectedOriginId, setSelectedOriginId] = useState("");
  const [factionMembers, setFactionMembers] = useState<{ id: string; name: string; title: string | null; role: string | null }[]>([]);
  const [childLocations, setChildLocations] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loadingFactionMembers, setLoadingFactionMembers] = useState(false);
  const [loadingChildLocations, setLoadingChildLocations] = useState(false);

  // Step C: Beziehungen
  const [existingContacts, setExistingContacts] = useState<ExistingContact[]>([]);
  const [newContacts, setNewContacts] = useState<NewContact[]>([]);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState<NewContact>({
    name: "",
    role: "",
    relationship_to_character: "",
    description: "",
    status: "Alive",
  });

  // Filter revealed items (already filtered in parent: wizardFactions / wizardLocations aus world_lore)
  const revealedFactions = factions;
  const revealedLocations = locations;
  const revealedNPCs = npcs;
  const largeLocations = revealedLocations.filter((l) => locationTypeMatches(l.type));

  // DEBUG: Wizard-Daten prüfen (F12 → Konsole)
  useEffect(() => {
    if (isOpen) {
      console.log("DEBUG Wizard Data:", {
        factions: revealedFactions,
        locations: revealedLocations,
        npcs: revealedNPCs,
        wizardFactionsCount: revealedFactions.length,
        wizardLocationsCount: revealedLocations.length,
      });
    }
  }, [isOpen, revealedFactions, revealedLocations, revealedNPCs]);

  // Fraktions-Kontext: NPCs der gewählten Fraktion laden (für "Bekannte Mitglieder" & Schritt 3)
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

  const handleSubmit = () => {
    if (!name || !class_name || !race) {
      alert("Bitte fülle alle Pflichtfelder aus (Name, Klasse, Rasse).");
      return;
    }

    startTransition(async () => {
      try {
        await createCharacterWithRelations({
          campaign_id: campaignId,
          name,
          class: class_name,
          race,
          level,
          biography: biography || null,
          faction_id: faction_id || null,
          location_id: location_id || null,
          existing_contacts: existingContacts.filter((c) => c.npc_id && c.relationship_type),
          new_contacts: newContacts,
        });
        onClose();
        // Reload page to show new character
        window.location.reload();
      } catch (error: any) {
        alert(error.message || "Fehler beim Erstellen des Charakters.");
      }
    });
  };

  // Echtheits-Check: Wenn Arrays gefüllt, Dropdowns aber leer → Mapping der <option> prüfen (value=item.id, label=item.name)
  console.log("DROPDOWN_CHECK - Locations:", locations, "Factions:", factions);

  if (!isOpen) return null;

  const canGoNext = () => {
    if (step === 1) return name && class_name && race;
    if (step === 2) return true; // Optional fields
    if (step === 3) return true; // Optional fields
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-lg border border-hero-gold/30 bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-border/30">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-hero-dark p-2">
              <User className="h-6 w-6 text-accent-gold" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-2xl text-white">Charakter erstellen</h2>
              <p className="font-libre text-sm text-gray-400">
                Schritt {step} von 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 transition-colors hover:bg-hero-dark hover:text-white"
            disabled={isPending}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex-none px-6 py-4 border-b border-hero-border/30 bg-background-dark/50">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div
                  className={`flex-1 h-2 rounded ${
                    step >= s ? "bg-hero-vibrant" : "bg-hero-dark"
                  }`}
                />
                {s < 3 && (
                  <ChevronRight
                    className={`h-4 w-4 mx-1 ${
                      step > s ? "text-hero-vibrant" : "text-gray-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basis-Daten */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
                Basis-Daten
              </h3>

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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                    Klasse *
                  </label>
                  <input
                    type="text"
                    value={class_name}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                    placeholder="z.B. Kleriker"
                  />
                </div>

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
              </div>

              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Level
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
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

          {/* Step 2: Welt-Integration */}
          {step === 2 && (
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
          {step === 3 && (
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
        </div>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-hero-border/20 bg-background-dark/50">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1 || isPending}
              className="flex items-center gap-2 rounded border border-hero-border px-6 py-2 font-barlow font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext() || isPending}
                className="flex items-center gap-2 rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50"
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canGoNext() || isPending}
                className="flex items-center gap-2 rounded bg-hero-gold px-6 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 shadow-lg shadow-hero-gold/20"
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

