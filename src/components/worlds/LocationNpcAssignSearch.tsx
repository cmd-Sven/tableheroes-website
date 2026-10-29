"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";
import {
  assignExistingNpcToLocation,
  searchWorldNpcsForLocation,
  type LocationNpcPlacement,
  type LocationNpcSearchHit,
} from "@/src/app/dashboard/worlds/location-npc-assign-actions";

type Props = {
  worldId: string;
  locationId: string;
  /** Ort wird von der Stadtsimulation aufgenommen. Die Suche filtert serverseitig zusätzlich. */
  citySimulationLocation?: boolean;
};

export function LocationNpcAssignSearch({
  worldId,
  locationId,
  citySimulationLocation = false,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LocationNpcSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ticketRef = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;

  useEffect(() => {
    const ticket = ++ticketRef.current;
    if (!canSearch) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearching(true);
      searchWorldNpcsForLocation(worldId, locationId, trimmed)
        .then((result) => {
          if (ticket !== ticketRef.current) return;
          setHits(result.hits);
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (ticket !== ticketRef.current) return;
          setHits([]);
          setSearchError(error instanceof Error ? error.message : "Suche fehlgeschlagen.");
        })
        .finally(() => {
          if (ticket === ticketRef.current) setSearching(false);
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [canSearch, trimmed, worldId, locationId]);

  const assign = (npcId: string, placement: LocationNpcPlacement) => {
    setAssignError(null);
    setNotice(null);
    setPendingKey(`${npcId}:${placement}`);
    startTransition(async () => {
      try {
        await assignExistingNpcToLocation(worldId, locationId, npcId, placement);
        setQuery("");
        setHits([]);
        setNotice(placement === "resident" ? "Als ansässig zugeordnet." : "Als Gast zugeordnet.");
        router.refresh();
      } catch (error: unknown) {
        setAssignError(error instanceof Error ? error.message : "Zuordnung fehlgeschlagen.");
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label htmlFor={`npc-search-${locationId}`} className="mb-1 block font-barlow font-bold text-sm uppercase text-gray-300">
          Bestehenden NPC suchen
        </label>
        <p className="mb-2 font-libre text-xs text-gray-400 leading-relaxed">
          {citySimulationLocation
            ? "Dieser Ort gehört zur Stadtsimulation. Die Suche zeigt nur NPCs mit dem Merkmal „für die Stadtsimulation“."
            : "Suche nach Name oder Rolle. Die Trefferliste bleibt kurz."}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            id={`npc-search-${locationId}`}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setNotice(null);
            }}
            placeholder="Name oder Rolle…"
            autoComplete="off"
            className="w-full rounded border border-hero-dark bg-slate-900 py-2 pl-8 pr-3 font-libre text-white outline-none focus:border-hero-vibrant"
          />
        </div>
        {trimmed.length > 0 && trimmed.length < 2 ? (
          <p className="mt-1 font-libre text-xs text-gray-500">Mindestens zwei Zeichen.</p>
        ) : null}
      </div>

      {searching ? (
        <p className="inline-flex items-center gap-2 font-libre text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Suche…
        </p>
      ) : null}

      {searchError ? <p className="font-libre text-sm text-red-300">{searchError}</p> : null}
      {assignError ? <p className="font-libre text-sm text-red-300">{assignError}</p> : null}
      {notice ? <p className="font-libre text-sm text-hero-vibrant">{notice}</p> : null}

      {canSearch && !searching && !searchError && hits.length === 0 ? (
        <p className="font-libre text-sm text-gray-500">Keine passenden NPCs.</p>
      ) : null}

      {hits.length > 0 ? (
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {hits.map((hit) => (
            <li
              key={hit.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-hero-dark bg-slate-900/70 px-3 py-2"
            >
              <span className="font-libre text-sm text-gray-200">
                {hit.name}
                {hit.role ? <span className="text-gray-500"> ({hit.role})</span> : null}
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending || hit.homeHere}
                  onClick={() => assign(hit.id, "resident")}
                  className="rounded border border-hero-border px-2 py-1 font-barlow text-xs font-bold uppercase text-hero-vibrant hover:bg-hero-dark/30 disabled:opacity-50"
                >
                  {pendingKey === `${hit.id}:resident` ? "…" : hit.homeHere ? "Bereits ansässig" : "Ansässig"}
                </button>
                <button
                  type="button"
                  disabled={isPending || hit.guestHere || hit.homeHere}
                  onClick={() => assign(hit.id, "guest")}
                  title={hit.homeHere ? "Ist hier bereits ansässig." : undefined}
                  className="rounded border border-hero-border px-2 py-1 font-barlow text-xs font-bold uppercase text-gray-200 hover:bg-hero-dark/30 disabled:opacity-50"
                >
                  {pendingKey === `${hit.id}:guest` ? "…" : hit.guestHere ? "Bereits Gast" : "Gast"}
                </button>
              </span>
            </li>
          ))}
        </motion.ul>
      ) : null}

      <p className="font-libre text-xs text-gray-500">
        Ansässig schreibt den Heimatort, Gast den aktuellen Aufenthaltsort.
      </p>

      <Link
        href={`/dashboard/worlds/${worldId}/npcs/create?locationId=${locationId}`}
        className="inline-flex items-center gap-2 font-barlow text-sm font-bold uppercase text-hero-vibrant hover:underline"
      >
        <Plus className="h-4 w-4" />
        Neuen NPC anlegen
      </Link>
      {citySimulationLocation ? (
        <p className="font-libre text-xs text-gray-400">
          Der Wizard legt die neue Figur ebenfalls für die Stadtsimulation an.
        </p>
      ) : null}
    </div>
  );
}
