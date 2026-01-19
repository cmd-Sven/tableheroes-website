"use client";

import { useState } from "react";
import { Trash2, User, Shield, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { deleteCharacter } from "./characters/actions";
import Link from "next/link";

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  avatar_url: string | null;
  campaign_id: string | null;
};

type CharacterManagerProps = {
  characters: Character[];
};

export function CharacterManager({ characters }: CharacterManagerProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  async function handleDelete(characterId: string, characterName: string) {
    if (isDeleting) return;
    if (!confirm(`${characterName} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;

    setIsDeleting(characterId);
    try {
      await deleteCharacter(characterId);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Löschen");
      setIsDeleting(null);
    }
  }

  const availableCharacters = characters.filter((c) => c.campaign_id === null);
  const activeCharacters = characters.filter((c) => c.campaign_id !== null);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
          Meine Charaktere
        </h2>
        <p className="mt-2 font-libre text-sm text-gray-400">
          Deine Charaktere, die du in Kampagnen verwendest.
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border-2 border-yellow-600/50 bg-yellow-950/10 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-yellow-900/30 p-3 border border-yellow-700/50">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-barlow font-bold text-lg text-yellow-400 uppercase mb-2">
                Noch keine Charaktere
              </h3>
              <p className="font-libre text-sm text-gray-300 mb-4 leading-relaxed">
                Um einen Charakter zu erstellen, musst du dich zuerst bei einer Kampagne bewerben.
                Sobald du akzeptiert wurdest, kannst du dort deinen Charakter erstellen.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-background-dark text-sm shadow-lg transition-all hover:scale-105"
              >
                Zur Kampagnen-Übersicht
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Available Characters (On the Bench) */}
          {availableCharacters.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                Verfügbare Charaktere ({availableCharacters.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === character.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Characters (In Campaigns) */}
          {activeCharacters.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-white mb-3">
                Aktive Charaktere ({activeCharacters.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === character.id}
                    isActive
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  onDelete,
  isDeleting,
  isActive = false,
}: {
  character: Character;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
  isActive?: boolean;
}) {
  return (
    <div
      className={`rounded-md border bg-background-card p-4 shadow-lg transition-colors group ${
        isActive
          ? "border-green-700/50 bg-green-950/10"
          : "border-hero-border hover:border-hero-vibrant"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-hero-dark text-white font-bold flex items-center justify-center border border-hero-border">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg">{character.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <h4 className="font-cinzel font-bold text-white">{character.name}</h4>
            <p className="font-barlow text-xs text-gray-500 uppercase">Level {character.level}</p>
          </div>
        </div>
        {!isActive && (
          <button
            onClick={() => onDelete(character.id, character.name)}
            disabled={isDeleting}
            className="rounded-md p-2 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Charakter löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Shield className="h-4 w-4 text-accent-gold" />
          <span>{character.class}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Sparkles className="h-4 w-4 text-accent-gold" />
          <span>{character.race}</span>
        </div>
      </div>

      {isActive && (
        <div className="mt-3 rounded bg-green-900/30 border border-green-700/50 px-2 py-1 text-center">
          <p className="font-barlow text-xs uppercase text-green-400">
            In Kampagne aktiv
          </p>
        </div>
      )}
    </div>
  );
}

