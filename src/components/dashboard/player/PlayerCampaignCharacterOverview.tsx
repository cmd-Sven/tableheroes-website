"use client";

import Link from "next/link";
import {
  User,
  Globe,
  Sparkles,
  Coins,
  Trophy,
  BookOpen,
  Users,
  ExternalLink,
} from "lucide-react";

type Relationship = {
  relationship_type: string;
  description: string | null;
  npcs: {
    id: string;
    name: string;
    role: string | null;
    title: string | null;
  } | null;
};

type FactionRep = {
  id: string;
  faction_id: string;
  faction_name: string;
  reputation: number;
  rank: string | null;
  updated_at: string;
};

type LastAchievement = {
  name: string;
  icon: string | null;
  awarded_at: string;
} | null;

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  biography: string | null;
  language_names?: string[];
  experience_points?: number;
  pocket_gold?: number;
  character_relationships?: Relationship[];
};

function editTabHref(campaignId: string, hash?: string) {
  const base = `/dashboard/campaigns/${campaignId}?tab=character`;
  return hash ? `${base}#${hash}` : base;
}

function buildContactPreview(
  campaignId: string,
  reputations: FactionRep[],
  relationships: Relationship[],
): Array<{
  key: string;
  kind: "faction" | "npc";
  title: string;
  detail: string;
  href: string;
}> {
  const relRev = [...relationships].reverse();
  const repItems = reputations.map((r) => ({
    kind: "faction" as const,
    t: new Date(r.updated_at).getTime(),
    key: `f-${r.id}`,
    title: r.faction_name,
    detail: `Ruf ${r.reputation > 0 ? "+" : ""}${r.reputation}${r.rank ? ` · ${r.rank}` : ""}`,
    href: `/dashboard/campaigns/${campaignId}/factions/${r.faction_id}`,
  }));
  const npcItems = relRev
    .filter((rel) => rel.npcs?.id)
    .map((rel, i) => ({
      kind: "npc" as const,
      t: -(i + 1),
      key: `n-${rel.npcs!.id}-${i}`,
      title: rel.npcs!.name,
      detail: rel.relationship_type,
      href: `/dashboard/campaigns/${campaignId}/npcs/${rel.npcs!.id}`,
    }));

  return [...repItems, ...npcItems].sort((a, b) => b.t - a.t).slice(0, 3);
}

type Props = {
  campaignId: string;
  character: Character;
  factionReputations: FactionRep[];
  lastAchievement: LastAchievement;
};

const marbleTile =
  "rounded-md border border-white/10 bg-player-marble p-4 shadow-inner";

export function PlayerCampaignCharacterOverview({
  campaignId,
  character,
  factionReputations,
  lastAchievement,
}: Props) {
  const langCount = character.language_names?.filter(Boolean).length ?? 0;
  const langs =
    langCount > 0 ? (character.language_names ?? []).filter(Boolean).join(", ") : "—";
  const xp = Number(character.experience_points ?? 0);
  const gold = Number(character.pocket_gold ?? 0);
  const rels = character.character_relationships ?? [];
  const preview = buildContactPreview(campaignId, factionReputations, rels);

  return (
    <section className="rounded-xl border border-stone-700/40 bg-player-paper p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-stone-600/40 pb-4">
        <div>
          <h2 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-stone-900 flex items-center gap-2">
            <User className="h-7 w-7 text-amber-800" aria-hidden />
            {character.name}
          </h2>
          <p className="font-libre text-sm text-stone-700 mt-1">
            Stufe {character.level} · {character.class} · {character.race}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={marbleTile}>
          <p className="font-barlow font-bold text-xs uppercase text-stone-400">Klasse</p>
          <p className="font-libre text-gray-100 mt-1">{character.class}</p>
        </div>
        <div className={marbleTile}>
          <p className="font-barlow font-bold text-xs uppercase text-stone-400">Rasse</p>
          <p className="font-libre text-gray-100 mt-1">{character.race}</p>
        </div>
      </div>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${marbleTile}`}
      >
        <div className="flex items-start gap-2 min-w-0">
          <Globe className="h-5 w-5 text-accent-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-stone-400">Sprachen</p>
            <p className="font-libre text-gray-100 mt-1">{langs}</p>
          </div>
        </div>
        <Link href={editTabHref(campaignId, "character-sprachen")} className="btn-player-edit-gold shrink-0">
          Bearbeiten
        </Link>
      </div>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${marbleTile}`}
      >
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-accent-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-stone-400">
              Erfahrungspunkte (aktuell)
            </p>
            <p className="font-libre text-gray-100 mt-1 tabular-nums">{xp.toLocaleString("de-DE")}</p>
          </div>
        </div>
        <Link href={editTabHref(campaignId, "character-erfahrung")} className="btn-player-edit-gold shrink-0">
          Bearbeiten
        </Link>
      </div>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${marbleTile}`}
      >
        <div className="flex items-start gap-2">
          <Coins className="h-5 w-5 text-accent-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-stone-400">Goldbeutel</p>
            <p className="font-libre text-gray-100 mt-1 tabular-nums">
              {gold.toLocaleString("de-DE")} (mitgeführt)
            </p>
          </div>
        </div>
        <Link href={editTabHref(campaignId, "character-gold")} className="btn-player-edit-gold shrink-0">
          Bearbeiten
        </Link>
      </div>

      <div className={marbleTile}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-accent-gold" />
          <p className="font-barlow font-bold text-xs uppercase text-stone-400">Letztes Achievement</p>
        </div>
        {lastAchievement ? (
          <p className="font-cinzel font-bold text-accent-gold">{lastAchievement.name}</p>
        ) : (
          <p className="font-libre text-sm text-stone-500 italic">Noch keins vergeben.</p>
        )}
      </div>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${marbleTile}`}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <BookOpen className="h-5 w-5 text-accent-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-stone-400">
              Biografie &amp; Hintergrund
            </p>
            <p className="font-libre text-sm text-stone-300 mt-1 line-clamp-3 whitespace-pre-wrap">
              {character.biography?.trim() ? character.biography : "Noch keine Biografie."}
            </p>
          </div>
        </div>
        <Link href={editTabHref(campaignId, "character-biografie")} className="btn-player-edit-gold shrink-0">
          Bearbeiten
        </Link>
      </div>

      <div className={`${marbleTile} space-y-3`}>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-gold" />
          <p className="font-barlow font-bold text-sm uppercase text-accent-gold">
            Beziehungen &amp; Kontakte
          </p>
        </div>
        {preview.length === 0 ? (
          <p className="font-libre text-sm text-stone-500 italic">Noch keine Einträge.</p>
        ) : (
          <ul className="space-y-2">
            {preview.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-2 rounded border border-white/10 bg-black/25 px-3 py-2 hover:border-accent-gold/40 transition-colors"
                >
                  <span>
                    <span className="font-cinzel font-bold text-white group-hover:text-accent-gold">
                      {row.title}
                    </span>
                    <span className="font-libre text-sm text-stone-400 block">{row.detail}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 text-stone-500 group-hover:text-accent-gold shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={editTabHref(campaignId, "character-beziehungen")}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-xs text-amber-950 underline decoration-amber-900/60 hover:text-amber-800 hover:decoration-amber-800 transition-colors"
        >
          Alle anzeigen
        </Link>
      </div>
    </section>
  );
}
