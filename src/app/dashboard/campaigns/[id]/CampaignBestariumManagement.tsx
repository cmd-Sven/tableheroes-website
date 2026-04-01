"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, PawPrint, Search } from "lucide-react";
import { toggleBestariumReveal } from "./bestarium-actions";
import type { CampaignBestariumCreature } from "./bestarium-queries";
import type { BestariumPlayerListRow } from "./bestarium-queries";

type Props = {
  campaignId: string;
  worldId?: string;
  isGM: boolean;
  gmCreatures: CampaignBestariumCreature[];
  playerList: BestariumPlayerListRow[];
};

export function CampaignBestariumManagement({
  campaignId,
  worldId,
  isGM,
  gmCreatures,
  playerList,
}: Props) {
  const [search, setSearch] = useState("");

  const displayList = isGM
    ? gmCreatures.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order,
        is_revealed: c.is_revealed,
      }))
    : playerList.map((c) => ({ ...c, is_revealed: true }));

  const filtered = useMemo(() => {
    if (!search.trim()) return displayList;
    const q = search.trim().toLowerCase();
    return displayList.filter((c) => c.name.toLowerCase().includes(q));
  }, [displayList, search]);

  const handleToggle = async (creatureId: string, current: boolean) => {
    try {
      await toggleBestariumReveal(campaignId, creatureId, current);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Sichtbarkeit konnte nicht geändert werden.");
    }
  };

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-hero-dark pb-4">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant flex items-center gap-2">
          <PawPrint className="h-7 w-7 text-accent-gold shrink-0" />
          Bestarium
        </h1>
        {isGM && worldId && (
          <Link
            href={`/dashboard/worlds/${worldId}/bestarium`}
            className="inline-flex items-center justify-center rounded border border-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:bg-hero-vibrant hover:text-background-dark transition-colors"
          >
            Im Welt-Editor verwalten
          </Link>
        )}
      </div>

      <p className="font-libre text-sm text-gray-400">
        {isGM
          ? "Spieler:innen sehen nur Kreaturen, die du mit dem Auge freigibst – ausschließlich Beschreibung und öffentliches Wissen (keine Werte). Statblocke bearbeitest du in der Welt."
          : "Hier findest du Kreaturen, die eure Spielleitung für die Kampagne freigegeben hat."}
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="font-libre text-center text-gray-500 py-10">
          {isGM
            ? "Noch keine Kreaturen in dieser Welt – lege sie im Welt-Editor unter Bestarium an."
            : "Noch keine Kreaturen für dich freigegeben."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded border border-hero-border/50 bg-background-dark/40 px-4 py-3"
            >
              <Link
                href={
                  isGM && worldId
                    ? `/dashboard/worlds/${worldId}/bestarium/${c.id}`
                    : `/dashboard/campaigns/${campaignId}/bestarium/${c.id}`
                }
                className="flex-1 min-w-0 font-cinzel font-bold text-accent-gold hover:text-hero-vibrant transition-colors truncate"
              >
                {c.name}
              </Link>
              {isGM && "is_revealed" in c && (
                <button
                  type="button"
                  onClick={() => handleToggle(c.id, c.is_revealed)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-barlow font-bold uppercase text-xs border transition-colors ${
                    c.is_revealed
                      ? "border-hero-vibrant bg-hero-vibrant/15 text-hero-vibrant"
                      : "border-hero-dark text-gray-400 hover:border-gray-500"
                  }`}
                  title={c.is_revealed ? "Für Spieler ausblenden" : "Für Spieler freigeben"}
                >
                  {c.is_revealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {c.is_revealed ? "Sichtbar" : "Verborgen"}
                </button>
              )}
              {isGM && worldId && (
                <Link
                  href={`/dashboard/worlds/${worldId}/bestarium/${c.id}/edit`}
                  className="shrink-0 font-barlow font-bold uppercase text-xs text-gray-500 hover:text-white"
                >
                  Statblock
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
