"use client";

import { useState, useMemo } from "react";
import {
  Check,
  X,
  Sparkles,
  User,
  Shield,
  MapPin,
  AlertCircle,
  Save,
  Loader2,
  Plus,
} from "lucide-react";
import { proposeCharacterChanges, approveCharacter } from "@/src/app/dashboard/campaigns/[id]/character-review-actions";
import { AddPersonModal } from "./AddPersonModal";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  age?: number | null;
  physical_traits?: string | null;
  personality_adjectives?: string[] | null;
  backstory_summary?: string | null;
  profession?: string | null;
  faction_id?: string | null;
  current_location_id?: string | null;
  temp_location_name?: string | null;
  goals?: string | null;
  fears?: string | null;
  important_people?: any[] | null;
  status: string;
  modification_log?: any[] | null;
};

type Faction = { id: string; name: string };
type Location = { id: string; name: string };
type NPC = { id: string; name: string; faction_id?: string | null; factions?: { name: string } | null };

type GMCharacterReviewProps = {
  campaignId: string;
  character: Character;
  factions: Faction[];
  locations: Location[];
  npcs: NPC[];
  onResolve: () => void;
};

type Change = {
  field: string;
  old_value: any;
  new_value: any;
};

export function GMCharacterReview({
  campaignId,
  character,
  factions,
  locations,
  npcs,
  onResolve,
}: GMCharacterReviewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);

  // Editable State (Kopie des Characters)
  const [formData, setFormData] = useState({
    name: character.name,
    class: character.class,
    race: character.race,
    level: character.level,
    age: character.age || null,
    physical_traits: character.physical_traits || "",
    personality_adjectives: character.personality_adjectives || [],
    backstory_summary: character.backstory_summary || "",
    profession: character.profession || "",
    faction_id: character.faction_id || "",
    current_location_id: character.current_location_id || "",
    temp_location_name: character.temp_location_name || "",
    goals: character.goals || "",
    fears: character.fears || "",
    important_people: character.important_people || [],
  });

  // Change Tracking
  const changes = useMemo<Change[]>(() => {
    const tracked: Change[] = [];

    if (formData.name !== character.name)
      tracked.push({ field: "name", old_value: character.name, new_value: formData.name });
    if (formData.class !== character.class)
      tracked.push({ field: "class", old_value: character.class, new_value: formData.class });
    if (formData.race !== character.race)
      tracked.push({ field: "race", old_value: character.race, new_value: formData.race });
    if (formData.level !== character.level)
      tracked.push({ field: "level", old_value: character.level, new_value: formData.level });
    if (formData.age !== (character.age || null))
      tracked.push({ field: "age", old_value: character.age, new_value: formData.age });
    if (formData.physical_traits !== (character.physical_traits || ""))
      tracked.push({
        field: "physical_traits",
        old_value: character.physical_traits,
        new_value: formData.physical_traits,
      });
    if (JSON.stringify(formData.personality_adjectives) !== JSON.stringify(character.personality_adjectives || []))
      tracked.push({
        field: "personality_adjectives",
        old_value: character.personality_adjectives,
        new_value: formData.personality_adjectives,
      });
    if (formData.backstory_summary !== (character.backstory_summary || ""))
      tracked.push({
        field: "backstory_summary",
        old_value: character.backstory_summary,
        new_value: formData.backstory_summary,
      });
    if (formData.profession !== (character.profession || ""))
      tracked.push({
        field: "profession",
        old_value: character.profession,
        new_value: formData.profession,
      });
    if (formData.faction_id !== (character.faction_id || ""))
      tracked.push({
        field: "faction_id",
        old_value: character.faction_id,
        new_value: formData.faction_id,
      });
    if (formData.current_location_id !== (character.current_location_id || ""))
      tracked.push({
        field: "current_location_id",
        old_value: character.current_location_id,
        new_value: formData.current_location_id,
      });
    if (formData.temp_location_name !== (character.temp_location_name || ""))
      tracked.push({
        field: "temp_location_name",
        old_value: character.temp_location_name,
        new_value: formData.temp_location_name,
      });
    if (formData.goals !== (character.goals || ""))
      tracked.push({ field: "goals", old_value: character.goals, new_value: formData.goals });
    if (formData.fears !== (character.fears || ""))
      tracked.push({ field: "fears", old_value: character.fears, new_value: formData.fears });
    if (JSON.stringify(formData.important_people) !== JSON.stringify(character.important_people || []))
      tracked.push({
        field: "important_people",
        old_value: character.important_people,
        new_value: formData.important_people,
      });

    return tracked;
  }, [formData, character]);

  function handleAddPerson(person: any) {
    setFormData({
      ...formData,
      important_people: [...formData.important_people, person],
    });
    setShowPersonModal(false);
  }

  function handleRemovePerson(index: number) {
    setFormData({
      ...formData,
      important_people: formData.important_people.filter((_, i) => i !== index),
    });
  }

  async function handleProposeChanges() {
    setIsProcessing(true);
    setError(null);

    try {
      await proposeCharacterChanges({
        characterId: character.id,
        campaignId,
        changes: changes.length > 0 ? changes : undefined,
        ...formData,
        age: formData.age ?? undefined,
      });
      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Vorschlagen von Änderungen.");
      setIsProcessing(false);
    }
  }

  async function handleApprove() {
    if (!confirm("Charakter direkt akzeptieren? (Resolver-Logik wird ausgeführt)")) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Speichere aktuelle Änderungen zuerst
      if (changes.length > 0) {
        await proposeCharacterChanges({
          characterId: character.id,
          campaignId,
          changes,
          ...formData,
          age: formData.age ?? undefined,
        });
      }

      // Dann approve (mit Resolver-Logik)
      await approveCharacter(character.id, campaignId);
      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Akzeptieren.");
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
          Charakter-Review: {character.name}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleProposeChanges}
            disabled={isProcessing || changes.length === 0}
            className="flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold text-xs uppercase text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Änderungen vorschlagen
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold text-xs uppercase text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Direkt akzeptieren
          </button>
        </div>
      </div>

      {/* Changes Indicator */}
      {changes.length > 0 && (
        <div className="rounded-lg border-2 border-yellow-600/50 bg-yellow-950/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <p className="font-barlow font-bold text-sm text-yellow-400 uppercase">
              {changes.length} Änderung{changes.length > 1 ? "en" : ""} erkannt
            </p>
          </div>
          <ul className="space-y-1 font-libre text-sm text-gray-300">
            {changes.map((change, i) => (
              <li key={i}>
                <span className="font-bold">{change.field}:</span> "{change.old_value}" → "{change.new_value}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unresolved Entities Warning */}
      {(character.temp_location_name || (character.important_people || []).some((p: any) => !p.npc_id)) && (
        <div className="rounded-lg border-2 border-red-600/50 bg-red-950/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="font-barlow font-bold text-sm text-red-400 uppercase">
              Unaufgelöste Elemente
            </p>
          </div>
          <ul className="space-y-1 font-libre text-sm text-gray-300">
            {character.temp_location_name && (
              <li>
                <MapPin className="inline h-4 w-4 mr-1" />
                Detail-Ort: "{character.temp_location_name}" (wird beim Akzeptieren erstellt)
              </li>
            )}
            {(character.important_people || [])
              .filter((p: any) => !p.npc_id)
              .map((p: any, i: number) => (
                <li key={i}>
                  <User className="inline h-4 w-4 mr-1" />
                  NPC: "{p.name}" (wird beim Akzeptieren erstellt)
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Editable Form */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Klasse *
            </label>
            <input
              type="text"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Rasse *
            </label>
            <input
              type="text"
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Level
            </label>
            <input
              type="number"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Alter
            </label>
            <input
              type="number"
              value={formData.age || ""}
              onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Fraktion
            </label>
            <select
              value={formData.faction_id || ""}
              onChange={(e) => setFormData({ ...formData, faction_id: (e.target.value || null) as any })}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">-- Keine Fraktion --</option>
              {factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Äußerliche Merkmale
          </label>
          <textarea
            value={formData.physical_traits}
            onChange={(e) => setFormData({ ...formData, physical_traits: e.target.value })}
            rows={3}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
          />
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Persönlichkeits-Adjektive
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="text"
                value={formData.personality_adjectives[i] || ""}
                onChange={(e) => {
                  const newAdj = [...formData.personality_adjectives];
                  newAdj[i] = e.target.value;
                  setFormData({ ...formData, personality_adjectives: newAdj });
                }}
                placeholder={`Adjektiv ${i + 1}`}
                className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Backstory
          </label>
          <textarea
            value={formData.backstory_summary}
            onChange={(e) => setFormData({ ...formData, backstory_summary: e.target.value })}
            rows={6}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
          />
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Beruf
          </label>
          <input
            type="text"
            value={formData.profession}
            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
          />
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Ort (Basis)
          </label>
          <select
            value={formData.current_location_id || ""}
            onChange={(e) => setFormData({ ...formData, current_location_id: (e.target.value || null) as any })}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
          >
            <option value="">-- Kein Ort --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {formData.current_location_id && (
          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Detail-Ort
            </label>
            <input
              type="text"
              value={formData.temp_location_name}
              onChange={(e) => setFormData({ ...formData, temp_location_name: e.target.value })}
              placeholder="z.B. Das Waisenhaus"
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>
        )}

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Ziele
          </label>
          <textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            rows={3}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
          />
        </div>

        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
            Ängste
          </label>
          <textarea
            value={formData.fears}
            onChange={(e) => setFormData({ ...formData, fears: e.target.value })}
            rows={3}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none resize-none font-libre"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-barlow font-bold uppercase text-sm text-gray-300">
              Wichtige Personen
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
          {formData.important_people.length === 0 ? (
            <p className="text-sm text-gray-500 font-libre italic">Keine Personen hinzugefügt.</p>
          ) : (
            <div className="space-y-2">
              {formData.important_people.map((person: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border border-hero-dark bg-background-dark p-3"
                >
                  <div className="flex-1">
                    <p className="font-barlow font-bold text-white">{person.name}</p>
                    <p className="font-libre text-sm text-gray-400">
                      {person.relation} • {person.age} Jahre • {person.alignment}
                      {!person.npc_id && <span className="ml-2 text-accent-gold">(Neu)</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(index)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Person Modal */}
      {showPersonModal && (
        <AddPersonModal
          isOpen={showPersonModal}
          onClose={() => setShowPersonModal(false)}
          onAdd={handleAddPerson}
          npcs={npcs}
          getFactionName={(npc) => (npc.factions?.name ? `${npc.name} (${npc.factions.name})` : npc.name)}
        />
      )}
    </div>
  );
}





