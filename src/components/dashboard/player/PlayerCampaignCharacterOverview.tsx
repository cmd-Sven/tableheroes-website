"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Globe,
  Sparkles,
  Trophy,
  BookOpen,
  Users,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { updateCharacterPlayer } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import { CharacterWealthInventoryCard } from "./CharacterWealthInventoryCard";

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
  /** Charakterportrait (URL), falls gesetzt */
  avatar_url?: string | null;
  languages?: unknown;
  language_names?: string[];
  experience_points?: number;
  pocket_gold?: number;
  character_relationships?: Relationship[];
};

function editTabHref(campaignId: string, hash?: string) {
  const base = `/dashboard/campaigns/${campaignId}?tab=character`;
  return hash ? `${base}#${hash}` : base;
}

function normalizeLangIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
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

type EditModal = "languages" | "xp" | "biography" | null;

type Props = {
  campaignId: string;
  character: Character;
  factionReputations: FactionRep[];
  lastAchievement: LastAchievement;
  /** Nächster Termin in der Kampagne: als „dabei“ gezählt (Zusage / Online / SL-Freigabe) */
  nextSessionConfirmed?: boolean;
  /** Freigegebene Sprachen (Wizard) – für Sprachen-Modal */
  availableLanguages: { id: string; name: string }[];
};

const marbleTile =
  "rounded-md border border-white/10 bg-player-marble p-4 shadow-inner";

const inputClass =
  "w-full rounded border border-stone-600 bg-stone-900/90 p-2 font-libre text-stone-100 placeholder:text-stone-500 focus:border-amber-700 focus:outline-none";

export function PlayerCampaignCharacterOverview({
  campaignId,
  character,
  factionReputations,
  lastAchievement,
  nextSessionConfirmed = false,
  availableLanguages,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<EditModal>(null);
  const [draftLangs, setDraftLangs] = useState<string[]>([]);
  const [draftXp, setDraftXp] = useState(0);
  const [draftBio, setDraftBio] = useState("");

  const savedLangIds = normalizeLangIds(character.languages);

  const languageChoices = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const l of availableLanguages) map.set(l.id, l);
    const names = character.language_names ?? [];
    for (const id of savedLangIds) {
      if (!map.has(id)) {
        const idx = savedLangIds.indexOf(id);
        const label =
          idx >= 0 && names[idx] && names[idx] !== id
            ? names[idx]
            : `Gespeichert (${id.slice(0, 8)}…)`;
        map.set(id, { id, name: label });
      }
    }
    for (const id of draftLangs) {
      if (!map.has(id)) {
        map.set(id, { id, name: `Gespeichert (${id.slice(0, 8)}…)` });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableLanguages, savedLangIds, character.language_names, draftLangs]);

  const openModal = (m: Exclude<EditModal, null>) => {
    if (m === "languages") setDraftLangs([...savedLangIds]);
    if (m === "xp") setDraftXp(Number(character.experience_points ?? 0));
    if (m === "biography") setDraftBio(character.biography ?? "");
    setModal(m);
  };

  const closeModal = () => setModal(null);

  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const saveLanguages = () => {
    startTransition(async () => {
      try {
        await updateCharacterPlayer({
          character_id: character.id,
          campaign_id: campaignId,
          languages: draftLangs,
        });
        closeModal();
        router.refresh();
      } catch (e: unknown) {
        alert((e as Error).message || "Speichern fehlgeschlagen.");
      }
    });
  };

  const saveXp = () => {
    startTransition(async () => {
      try {
        await updateCharacterPlayer({
          character_id: character.id,
          campaign_id: campaignId,
          experience_points: Math.max(0, Math.floor(draftXp) || 0),
        });
        closeModal();
        router.refresh();
      } catch (e: unknown) {
        alert((e as Error).message || "Speichern fehlgeschlagen.");
      }
    });
  };

  const saveBiography = () => {
    startTransition(async () => {
      try {
        await updateCharacterPlayer({
          character_id: character.id,
          campaign_id: campaignId,
          biography: draftBio.trim() || null,
        });
        closeModal();
        router.refresh();
      } catch (e: unknown) {
        alert((e as Error).message || "Speichern fehlgeschlagen.");
      }
    });
  };

  const avatarSrc = character.avatar_url?.trim() || null;
  const langCount = character.language_names?.filter(Boolean).length ?? 0;
  const langs =
    langCount > 0 ? (character.language_names ?? []).filter(Boolean).join(", ") : "—";
  const xp = Number(character.experience_points ?? 0);
  const rels = character.character_relationships ?? [];
  const preview = buildContactPreview(campaignId, factionReputations, rels);

  const toggleLang = (id: string) => {
    setDraftLangs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <section className="rounded-xl border border-stone-700/40 bg-player-paper p-6 space-y-6">
      {modal ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overview-edit-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Dialog schließen"
            onClick={closeModal}
          />
          <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border-2 border-amber-900/50 bg-player-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-600/50 px-4 py-3">
              <h3
                id="overview-edit-modal-title"
                className="font-barlow font-bold text-lg uppercase tracking-wide text-stone-900"
              >
                {modal === "languages" && "Sprachen"}
                {modal === "xp" && "Erfahrungspunkte"}
                {modal === "biography" && "Biografie"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded p-1 text-stone-600 hover:bg-stone-800/30 hover:text-stone-900"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {modal === "languages" && (
                <div className="space-y-2">
                  <p className="font-libre text-sm text-stone-600 mb-3">
                    Wähle alle Sprachen, die dein Charakter spricht.
                  </p>
                  {languageChoices.length === 0 ? (
                    <p className="font-libre text-sm text-stone-500 italic">
                      Keine Sprachen in der Kampagne freigegeben. Bitte den Spielleiter oder nutze
                      das vollständige Charakterblatt.
                    </p>
                  ) : (
                    <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                      {languageChoices.map((l) => (
                        <li key={l.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded border border-stone-600/40 bg-stone-900/30 px-3 py-2 hover:border-amber-800/50">
                            <input
                              type="checkbox"
                              checked={draftLangs.includes(l.id)}
                              onChange={() => toggleLang(l.id)}
                              className="h-4 w-4 rounded border-stone-500 text-amber-800 focus:ring-amber-700"
                            />
                            <span className="font-libre text-stone-200">{l.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {modal === "xp" && (
                <div>
                  <label className="mb-2 block font-barlow text-xs font-bold uppercase text-stone-500">
                    Aktuelle Erfahrungspunkte
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftXp}
                    onChange={(e) => setDraftXp(parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                  />
                </div>
              )}
              {modal === "biography" && (
                <div>
                  <label className="mb-2 block font-barlow text-xs font-bold uppercase text-stone-500">
                    Biografie &amp; Hintergrund
                  </label>
                  <textarea
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    rows={12}
                    className={`${inputClass} min-h-[200px] resize-y`}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-stone-600/50 px-4 py-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded border border-stone-600 px-4 py-2 font-barlow text-sm font-bold uppercase text-stone-700 hover:bg-stone-200/80 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (modal === "languages") saveLanguages();
                  else if (modal === "xp") saveXp();
                  else if (modal === "biography") saveBiography();
                }}
                className="inline-flex items-center gap-2 rounded border border-amber-900/60 bg-amber-900/90 px-4 py-2 font-barlow text-sm font-bold uppercase text-amber-50 hover:bg-amber-800 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Speichern
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-stone-600/40 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5 min-w-0 flex-1">
          {avatarSrc ? (
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border-2 border-amber-900/45 shadow-md bg-stone-900/20">
              <Image
                src={avatarSrc}
                alt=""
                fill
                className="object-cover"
                sizes="128px"
                unoptimized={
                  avatarSrc.startsWith("http://") ||
                  avatarSrc.startsWith("data:") ||
                  avatarSrc.includes("localhost") ||
                  avatarSrc.includes("supabase.co")
                }
              />
              {nextSessionConfirmed ? (
                <span
                  className="absolute bottom-0 left-0 right-0 bg-hero-vibrant/95 px-1.5 py-1 text-center font-barlow text-[9px] font-bold uppercase leading-tight text-black shadow-sm"
                  title="Next session: confirmed"
                >
                  Next session: confirmed
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-stone-900 flex flex-wrap items-center gap-2">
              <User className="h-7 w-7 text-amber-800 shrink-0" aria-hidden />
              {character.name}
              {!avatarSrc && nextSessionConfirmed ? (
                <span className="rounded bg-hero-vibrant/90 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-black">
                  Next session: confirmed
                </span>
              ) : null}
            </h2>
            <p className="font-libre text-sm text-stone-700 mt-1">
              Stufe {character.level} · {character.class} · {character.race}
            </p>
          </div>
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
        <button
          type="button"
          onClick={() => openModal("languages")}
          className="btn-player-edit-gold shrink-0"
        >
          Bearbeiten
        </button>
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
        <button
          type="button"
          onClick={() => openModal("xp")}
          className="btn-player-edit-gold shrink-0"
        >
          Bearbeiten
        </button>
      </div>

      <CharacterWealthInventoryCard
        character={{
          id: character.id,
          name: character.name,
          class: character.class,
          level: character.level,
          avatar_url: character.avatar_url ?? null,
        }}
      />

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
        <button
          type="button"
          onClick={() => openModal("biography")}
          className="btn-player-edit-gold shrink-0"
        >
          Bearbeiten
        </button>
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
