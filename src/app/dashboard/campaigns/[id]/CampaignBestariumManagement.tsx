"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PawPrint, Search, Filter } from "lucide-react";
import { toggleBestariumReveal } from "./bestarium-actions";
import type { CampaignBestariumCreature } from "./bestarium-queries";
import type { BestariumPlayerListRow } from "./bestarium-queries";
import {
  BestariumGridCard,
  type BestariumCardCreature,
} from "@/src/components/dashboard/campaigns/BestariumGridCard";

type UnifiedCard = BestariumCardCreature & { sort_order: number; is_revealed?: boolean };

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
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterGattung, setFilterGattung] = useState<string>("all");
  const [filterOrt, setFilterOrt] = useState<string>("all");

  const unifiedList: UnifiedCard[] = useMemo(() => {
    if (isGM) {
      return gmCreatures.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order,
        image_url: c.image_url,
        creature_type: c.creature_type,
        subtype: c.subtype,
        location_name: c.location_name,
        is_revealed: c.is_revealed,
      }));
    }
    return playerList.map((c) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      image_url: c.image_url,
      creature_type: c.creature_type,
      subtype: null,
      location_name: c.location_name,
      is_revealed: true,
    }));
  }, [isGM, gmCreatures, playerList]);

  const gattungOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of unifiedList) {
      const t = c.creature_type?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [unifiedList]);

  const ortOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of unifiedList) {
      const n = c.location_name?.trim();
      if (n) set.add(n);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [unifiedList]);

  const filtered = useMemo(() => {
    let list = unifiedList;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const hay =
          `${c.name} ${c.creature_type ?? ""} ${c.subtype ?? ""} ${c.location_name ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterGattung !== "all") {
      list = list.filter((c) => (c.creature_type ?? "").trim() === filterGattung);
    }
    if (filterOrt !== "all") {
      list = list.filter((c) => (c.location_name ?? "").trim() === filterOrt);
    }
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "de"));
  }, [unifiedList, search, filterGattung, filterOrt]);

  const handleToggle = async (creatureId: string, current: boolean) => {
    try {
      await toggleBestariumReveal(campaignId, creatureId, current);
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Sichtbarkeit konnte nicht geändert werden.");
    }
  };

  const selectClass =
    "rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none min-w-0 flex-1 sm:flex-none sm:min-w-[10rem]";

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

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, Gattung oder Ort suchen…"
            className="w-full pl-10 pr-4 py-2 rounded border border-hero-dark bg-slate-900/80 text-white font-libre placeholder-gray-500 focus:border-hero-vibrant outline-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 shrink-0">
            <Filter className="h-4 w-4" aria-hidden />
            <span className="font-barlow font-bold uppercase text-xs">Filter</span>
          </div>
          <select
            value={filterGattung}
            onChange={(e) => setFilterGattung(e.target.value)}
            className={selectClass}
            aria-label="Nach Gattung filtern"
          >
            <option value="all">Alle Gattungen</option>
            {gattungOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={filterOrt}
            onChange={(e) => setFilterOrt(e.target.value)}
            className={selectClass}
            aria-label="Nach Region oder Ort filtern"
          >
            <option value="all">Alle Orte / Regionen</option>
            {ortOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="font-libre text-center text-gray-500 py-10">
          {unifiedList.length === 0
            ? isGM
              ? "Noch keine Kreaturen in dieser Welt – lege sie im Welt-Editor unter Bestarium an."
              : "Noch keine Kreaturen für dich freigegeben."
            : "Keine Kreaturen mit diesen Filtern – Filter oder Suche anpassen."}
        </p>
      ) : (
        <>
          <p className="font-barlow text-xs uppercase text-gray-500">
            {filtered.length}{" "}
            {filtered.length === 1 ? "Eintrag" : "Einträge"}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 list-none p-0 m-0">
            {filtered.map((c) => {
              const detailHref =
                isGM && worldId
                  ? `/dashboard/worlds/${worldId}/bestarium/${c.id}`
                  : `/dashboard/campaigns/${campaignId}/bestarium/${c.id}`;
              return (
                <li key={c.id} className="min-w-0">
                  <BestariumGridCard
                    creature={c}
                    worldId={worldId}
                    isGM={isGM}
                    detailHref={detailHref}
                    onToggleReveal={
                      isGM ? (id, cur) => void handleToggle(id, cur) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
