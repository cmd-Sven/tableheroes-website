"use client";

import { useState } from "react";
import {
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
  Plus,
  User,
  Shield,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  generateFactionDetails,
  generateLocationDetails,
  generateNpcDetails,
} from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { createFaction } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { createLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { createNPC } from "@/src/app/dashboard/campaigns/[id]/npc-actions";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  avatar_url?: string | null;
  age?: number | null;
  appearance?: string | null;
  personality_adjectives?: string | null; // JSON Array
  backstory_summary?: string | null;
  profession?: string | null;
  faction_membership?: string | null; // ID oder null
  goals?: string | null;
  fears?: string | null;
  rivals?: string | null;
  important_people?: string | null; // JSON Array
  // Temporäre Felder für "neue" Entitäten (müssen aus der DB-Struktur abgeleitet werden)
};

type Faction = { id: string; name: string };
type Location = { id: string; name: string };
type NPC = { id: string; name: string };

type ApplicationReviewViewProps = {
  campaignId: string;
  character: Character;
  factions: Faction[];
  locations: Location[];
  npcs: NPC[];
  onResolve: () => void; // Callback nach erfolgreicher Auflösung
};

type UnresolvedEntity = {
  type: "faction" | "location" | "npc";
  name: string;
  characterField: string;
};

export function ApplicationReviewView({
  campaignId,
  character,
  factions,
  locations,
  npcs,
  onResolve,
}: ApplicationReviewViewProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse JSON fields
  const personalityAdjectives = character.personality_adjectives
    ? JSON.parse(character.personality_adjectives)
    : [];
  const importantPeople = character.important_people
    ? JSON.parse(character.important_people)
    : [];

  // Find unresolved entities
  const unresolvedEntities: UnresolvedEntity[] = [];

  // Check faction (wenn faction_membership null ist, aber ein Name vorhanden sein könnte)
  // Hier nehmen wir an, dass wir die "neue" Fraktion aus einem temporären Feld lesen
  // Für jetzt prüfen wir, ob faction_membership null ist und ob es einen Namen gibt
  if (!character.faction_membership) {
    // Prüfe ob es einen "neuen" Namen gibt (müsste aus DB kommen)
    // Für Demo: Wir nehmen an, dass es ein Feld "faction_name_new" gibt
  }

  // Parse important_people und finde neue NPCs
  importantPeople.forEach((person: any, index: number) => {
    if (!person.npc_id && person.name) {
      unresolvedEntities.push({
        type: "npc",
        name: person.name,
        characterField: `important_people[${index}]`,
      });
    }
  });

  async function handleGenerateFaction(name: string) {
    if (!character.backstory_summary) {
      alert("Keine Biografie vorhanden für KI-Generierung.");
      return;
    }

    setIsGenerating(`faction-${name}`);
    setError(null);

    try {
      const details = await generateFactionDetails(campaignId, name, character.backstory_summary);

      // Erstelle die Fraktion
      await createFaction({
        campaign_id: campaignId,
        name,
        type: "Fraktion",
        description: details.description,
        current_status: details.alignment,
        gm_notes: `Ziele: ${details.goals}`,
      });

      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung.");
      setIsGenerating(null);
    }
  }

  async function handleGenerateLocation(name: string) {
    if (!character.backstory_summary) {
      alert("Keine Biografie vorhanden für KI-Generierung.");
      return;
    }

    setIsGenerating(`location-${name}`);
    setError(null);

    try {
      const details = await generateLocationDetails(campaignId, name, character.backstory_summary);

      await createLoreEntry({
        campaign_id: campaignId,
        name,
        type: details.type,
        description: details.description,
        gm_notes: `Atmosphäre: ${details.atmosphere}`,
      });

      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung.");
      setIsGenerating(null);
    }
  }

  async function handleGenerateNPC(person: any) {
    if (!character.backstory_summary) {
      alert("Keine Biografie vorhanden für KI-Generierung.");
      return;
    }

    setIsGenerating(`npc-${person.name}`);
    setError(null);

    try {
      const details = await generateNpcDetails(
        campaignId,
        {
          name: person.name,
          relation: person.relation,
          age: person.age || 0,
        },
        character.backstory_summary
      );

      await createNPC({
        campaign_id: campaignId,
        name: person.name,
        title: person.relation,
        description: details.description,
        gm_notes: `${details.secret_notes}\n\nAussehen: ${details.appearance}`,
      });

      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung.");
      setIsGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Character Overview */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant mb-4">
          Charakter-Übersicht
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Name</p>
            <p className="font-libre text-white">{character.name}</p>
          </div>
          <div>
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Klasse</p>
            <p className="font-libre text-white">{character.class}</p>
          </div>
          <div>
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Rasse</p>
            <p className="font-libre text-white">{character.race}</p>
          </div>
          <div>
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Level</p>
            <p className="font-libre text-white">{character.level}</p>
          </div>
          {character.age && (
            <div>
              <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Alter</p>
              <p className="font-libre text-white">{character.age}</p>
            </div>
          )}
          {character.profession && (
            <div>
              <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Beruf</p>
              <p className="font-libre text-white">{character.profession}</p>
            </div>
          )}
        </div>

        {character.appearance && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">
              Äußerliche Merkmale
            </p>
            <p className="font-libre text-gray-300">{character.appearance}</p>
          </div>
        )}

        {personalityAdjectives.length > 0 && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">
              Persönlichkeits-Adjektive
            </p>
            <div className="flex flex-wrap gap-2">
              {personalityAdjectives.map((adj: string, i: number) => (
                <span
                  key={i}
                  className="rounded bg-hero-dark px-2 py-1 font-libre text-xs text-accent-gold"
                >
                  {adj}
                </span>
              ))}
            </div>
          </div>
        )}

        {character.backstory_summary && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">
              Backstory
            </p>
            <p className="font-libre text-gray-300 whitespace-pre-wrap">
              {character.backstory_summary}
            </p>
          </div>
        )}

        {character.goals && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Ziele</p>
            <p className="font-libre text-gray-300">{character.goals}</p>
          </div>
        )}

        {character.fears && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Ängste</p>
            <p className="font-libre text-gray-300">{character.fears}</p>
          </div>
        )}

        {character.rivals && (
          <div className="mt-4">
            <p className="font-barlow font-bold text-sm text-gray-400 uppercase mb-1">Rivalen</p>
            <p className="font-libre text-gray-300">{character.rivals}</p>
          </div>
        )}
      </div>

      {/* Unresolved Entities */}
      {unresolvedEntities.length > 0 && (
        <div className="rounded-lg border-2 border-yellow-600/50 bg-yellow-950/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <h3 className="font-barlow font-bold text-lg uppercase text-yellow-400">
              Neue Elemente zum Auflösen
            </h3>
          </div>

          <div className="space-y-4">
            {unresolvedEntities.map((entity, index) => (
              <div
                key={index}
                className="rounded border border-yellow-700/50 bg-background-dark p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-barlow font-bold text-white">
                      {entity.type === "faction" && <Shield className="inline h-4 w-4 mr-2" />}
                      {entity.type === "location" && <MapPin className="inline h-4 w-4 mr-2" />}
                      {entity.type === "npc" && <User className="inline h-4 w-4 mr-2" />}
                      {entity.name}
                    </p>
                    <p className="font-libre text-sm text-gray-400 mt-1">
                      {entity.type === "faction" && "Neue Fraktion"}
                      {entity.type === "location" && "Neuer Ort"}
                      {entity.type === "npc" && "Neuer NPC"}
                    </p>
                  </div>
                  <span className="rounded bg-red-900/30 text-red-400 px-2 py-1 font-barlow text-xs uppercase">
                    Unaufgelöst
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implement link to existing entity
                      alert("Verknüpfen-Funktion wird implementiert...");
                    }}
                    className="flex items-center gap-2 rounded border border-hero-border bg-background-card px-3 py-1.5 font-barlow font-bold text-xs uppercase text-gray-300 hover:bg-hero-dark transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Verknüpfen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implement manual create
                      alert("Manuell erstellen wird implementiert...");
                    }}
                    className="flex items-center gap-2 rounded border border-hero-border bg-background-card px-3 py-1.5 font-barlow font-bold text-xs uppercase text-gray-300 hover:bg-hero-dark transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Manuell erstellen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (entity.type === "faction") {
                        handleGenerateFaction(entity.name);
                      } else if (entity.type === "location") {
                        handleGenerateLocation(entity.name);
                      } else if (entity.type === "npc") {
                        const person = importantPeople.find((p: any) => p.name === entity.name);
                        if (person) handleGenerateNPC(person);
                      }
                    }}
                    disabled={isGenerating === `${entity.type}-${entity.name}`}
                    className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-50"
                  >
                    {isGenerating === `${entity.type}-${entity.name}` ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        ✨ KI Generieren
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important People */}
      {importantPeople.length > 0 && (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h3 className="font-barlow font-bold text-xl uppercase text-hero-vibrant mb-4">
            Wichtige Personen
          </h3>
          <div className="space-y-3">
            {importantPeople.map((person: any, index: number) => (
              <div
                key={index}
                className={`rounded border p-4 ${
                  !person.npc_id
                    ? "border-yellow-700/50 bg-yellow-950/10"
                    : "border-hero-dark bg-background-dark"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-barlow font-bold text-white">{person.name}</p>
                    <p className="font-libre text-sm text-gray-400">
                      {person.relation} • {person.age} Jahre • {person.alignment}
                    </p>
                    {!person.npc_id && (
                      <span className="mt-2 inline-block rounded bg-red-900/30 text-red-400 px-2 py-1 font-barlow text-xs uppercase">
                        Unaufgelöst
                      </span>
                    )}
                  </div>
                  {!person.npc_id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateNPC(person)}
                        disabled={isGenerating === `npc-${person.name}`}
                        className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-50"
                      >
                        {isGenerating === `npc-${person.name}` ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generiere...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            ✨ KI Generieren
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
    </div>
  );
}





