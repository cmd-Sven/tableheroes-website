"use client";

import {
  User,
  Shield,
  MapPin,
  BookOpen,
  Users,
  Skull,
  Heart,
} from "lucide-react";

type CharacterRelationship = {
  relationship_type: string;
  description: string | null;
  npcs: {
    id: string;
    name: string;
    role: string | null;
    title: string | null;
  } | null;
};

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  status?: string | null;
  biography: string | null;
  faction_membership: string | null;
  character_relationships?: CharacterRelationship[];
};

type Props = {
  character: Character;
};

export function CharacterSheet({ character }: Props) {
  const relationships = character.character_relationships || [];
  const status = character.status || "Alive";
  const isAlive = status === "Alive";
  const isDead = status === "Dead";

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
                {character.name}
              </h2>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1 font-barlow font-bold uppercase text-xs ${
                  isAlive
                    ? "bg-green-900/30 text-green-400 border border-green-700"
                    : isDead
                    ? "bg-red-900/30 text-red-400 border border-red-700"
                    : "bg-gray-700/30 text-gray-400 border border-gray-600"
                }`}
              >
                {isDead ? (
                  <Skull className="h-3.5 w-3.5" />
                ) : (
                  <Heart className="h-3.5 w-3.5" />
                )}
                {status === "Alive"
                  ? "Lebend"
                  : status === "Dead"
                  ? "Tot"
                  : status === "Archived"
                  ? "Archiviert"
                  : status === "Paused"
                  ? "Pausiert"
                  : status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent-gold" />
                <span className="font-libre text-gray-300">
                  <span className="font-semibold text-white">Klasse:</span>{" "}
                  {character.class}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent-gold" />
                <span className="font-libre text-gray-300">
                  <span className="font-semibold text-white">Rasse:</span>{" "}
                  {character.race}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-libre text-gray-300">
                  <span className="font-semibold text-white">Level:</span>{" "}
                  {character.level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Biography */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-xl text-accent-gold mb-4 flex items-center gap-2 border-b border-hero-border pb-2">
              <BookOpen className="h-5 w-5" />
              Biografie / Hintergrundgeschichte
            </h3>
            {character.biography ? (
              <div className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {character.biography}
              </div>
            ) : (
              <p className="font-libre text-gray-500 italic">
                Noch keine Biografie vorhanden.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Relationships */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-xl text-accent-gold mb-4 flex items-center gap-2 border-b border-hero-border pb-2">
              <Users className="h-5 w-5" />
              Beziehungen & Kontakte
            </h3>
            {relationships.length > 0 ? (
              <div className="space-y-3">
                {relationships.map((rel, index) => {
                  const npc = rel.npcs;
                  if (!npc) return null;

                  return (
                    <div
                      key={index}
                      className="p-3 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <div className="font-libre text-white font-semibold">
                        {npc.name}
                        {npc.title && (
                          <span className="text-gray-400 ml-2">
                            ({npc.title})
                          </span>
                        )}
                        {npc.role && !npc.title && (
                          <span className="text-gray-400 ml-2">
                            ({npc.role})
                          </span>
                        )}
                      </div>
                      <div className="font-libre text-sm text-gray-400 mt-1">
                        <span className="text-accent-gold">
                          {rel.relationship_type}
                        </span>
                        {rel.description && (
                          <span className="ml-2">- {rel.description}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-libre text-gray-500 italic text-sm">
                Noch keine Beziehungen definiert.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
