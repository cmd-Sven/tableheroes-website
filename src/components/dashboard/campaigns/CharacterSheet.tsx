"use client";

import Link from "next/link";
import {
  User,
  Shield,
  BookOpen,
  Users,
  Skull,
  Heart,
  ExternalLink,
  Globe,
  MapPin,
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

type FactionReputation = {
  id: string;
  faction_id: string;
  faction_name: string;
  reputation: number;
  rank: string | null;
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
  avatar_url?: string | null;
  culture_name?: string | null;
  language_names?: string[];
  faction_name?: string | null;
  location_name?: string | null;
  character_relationships?: CharacterRelationship[];
};

type Props = {
  character: Character;
  campaignId?: string;
  factionReputations?: FactionReputation[];
};

function getReputationColorClasses(reputation: number): string {
  if (reputation >= 50) return "border-green-900/60 bg-green-900/20";
  if (reputation >= 20) return "border-green-800/50 bg-green-900/10";
  if (reputation < -50) return "border-red-900/60 bg-red-900/20";
  if (reputation < -20) return "border-red-800/50 bg-red-900/10";
  return "border-hero-border/40 bg-hero-dark/20";
}

function statusLabelDe(s: string): string {
  switch (s) {
    case "Alive":
    case "Active":
      return "Aktiv / Lebend";
    case "Dead":
      return "Tot";
    case "Archived":
      return "Archiviert";
    case "Paused":
      return "Pausiert";
    case "Pending_Approval":
      return "Wartet auf Freigabe";
    case "In_Review":
      return "In Prüfung";
    default:
      return s;
  }
}

export function CharacterSheet({ character, campaignId, factionReputations = [] }: Props) {
  const relationships = character.character_relationships || [];
  const status = character.status || "Alive";
  const isHealthy = status === "Alive" || status === "Active";
  const isDead = status === "Dead";
  const langs =
    character.language_names?.filter(Boolean).length ?? 0 > 0
      ? (character.language_names ?? []).filter(Boolean)
      : [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
                {character.name}
              </h2>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1 font-barlow font-bold uppercase text-xs ${
                  isHealthy
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
                {statusLabelDe(status)}
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
            {(character.culture_name ||
              langs.length > 0 ||
              character.faction_name ||
              character.location_name) && (
              <div className="mt-4 space-y-2 rounded border border-hero-border/40 bg-hero-dark/20 p-4">
                <p className="font-barlow font-bold text-xs uppercase text-gray-500">Herkunft & Zugehörigkeit</p>
                {character.culture_name ? (
                  <p className="font-libre text-sm text-gray-200">
                    <span className="text-gray-500">Kultur:</span> {character.culture_name}
                  </p>
                ) : null}
                {langs.length > 0 ? (
                  <p className="font-libre text-sm text-gray-200 flex flex-wrap items-start gap-2">
                    <Globe className="h-4 w-4 text-accent-gold shrink-0 mt-0.5" />
                    <span>
                      <span className="text-gray-500">Sprachen:</span> {langs.join(", ")}
                    </span>
                  </p>
                ) : null}
                {character.faction_name ? (
                  <p className="font-libre text-sm text-gray-200">
                    <span className="text-gray-500">Fraktion:</span> {character.faction_name}
                  </p>
                ) : null}
                {character.location_name ? (
                  <p className="font-libre text-sm text-gray-200 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-accent-gold shrink-0 mt-0.5" />
                    <span>
                      <span className="text-gray-500">Heimatort:</span> {character.location_name}
                    </span>
                  </p>
                ) : null}
              </div>
            )}
          </div>
          {character.avatar_url ? (
            <div className="h-36 w-36 shrink-0 overflow-hidden rounded-lg border border-hero-border bg-hero-dark">
              <img
                src={character.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
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

        {/* Right Column: Relationships & Ruf */}
        <div className="lg:col-span-1 space-y-6">
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
                  const npcHref = campaignId ? `/dashboard/campaigns/${campaignId}/npcs/${npc.id}` : null;

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-hero-dark p-4 shadow-lg hover:border-hero-vibrant/50 transition-colors bg-hero-dark/20"
                    >
                      {npcHref ? (
                        <Link
                          href={npcHref}
                          className="font-cinzel font-bold text-accent-gold hover:text-hero-vibrant flex items-center gap-1.5 group"
                        >
                          {npc.name}
                          <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <div className="font-cinzel font-bold text-white">{npc.name}</div>
                      )}
                      {(npc.title || npc.role) && (
                        <p className="font-libre text-xs text-gray-500 mt-0.5">{npc.title ?? npc.role}</p>
                      )}
                      <p className="font-libre text-sm text-accent-gold mt-1">{rel.relationship_type}</p>
                      {rel.description && (
                        <p className="font-libre text-sm text-gray-400 mt-1 italic">{rel.description}</p>
                      )}
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

          {factionReputations.length > 0 && campaignId && (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h3 className="font-barlow font-bold text-xl text-accent-gold mb-4 flex items-center gap-2 border-b border-hero-border pb-2">
                <Shield className="h-5 w-5" />
                Ruf bei Fraktionen
              </h3>
              <div className="space-y-3">
                {factionReputations.map((rep) => {
                  const isPrimary = character.faction_membership === rep.faction_id;
                  const colorClasses = getReputationColorClasses(rep.reputation);
                  const statusLabel =
                    rep.reputation >= 80 ? "Vertrauensperson" :
                    rep.reputation >= 50 ? "Respektiert" :
                    rep.reputation >= 20 ? "Bekannt" :
                    rep.reputation >= 0 ? "Neutral" :
                    rep.reputation >= -20 ? "Vorsicht" :
                    rep.reputation >= -50 ? "Feindlich / Schulden" :
                    "Gehasster Feind";
                  return (
                    <Link
                      key={rep.id}
                      href={`/dashboard/campaigns/${campaignId}/factions/${rep.faction_id}`}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${isPrimary ? "border-hero-vibrant/50 bg-hero-dark/30" : colorClasses}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-cinzel font-bold text-white">{rep.faction_name}</span>
                        {isPrimary && (
                          <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-xs font-bold uppercase text-hero-vibrant shrink-0">
                            Deine Fraktion
                          </span>
                        )}
                        {rep.rank && (
                          <span className="rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-xs font-bold uppercase text-accent-gold shrink-0">
                            {rep.rank}
                          </span>
                        )}
                        <span className="font-libre text-sm text-gray-500 italic">· {statusLabel}</span>
                      </div>
                      <span
                        className={`shrink-0 rounded px-3 py-1 font-barlow font-bold text-sm ${
                          rep.reputation > 0
                            ? "bg-green-900/50 text-green-400 border border-green-700"
                            : rep.reputation < 0
                            ? "bg-red-900/50 text-red-400 border border-red-700"
                            : "bg-gray-800/50 text-gray-400 border border-gray-600"
                        }`}
                      >
                        {rep.reputation > 0 ? "+" : ""}{rep.reputation}
                      </span>
                      <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
