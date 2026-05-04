"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, MapPin, Search, X } from "lucide-react";

export type GmNpcSearchRow = {
  id: string;
  name: string;
  title: string | null;
  image_url: string | null;
  is_revealed?: boolean | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  npcs: GmNpcSearchRow[];
  /** null = volles Deck (alle npcs), sonst nur IDs aus dem Bühnendeck */
  stageDeckNpcIds: string[] | null;
  currentLocationLoreId: string | null;
  activeNpcIds: Set<string>;
  onPlaceOnStage: (npcId: string) => void | Promise<void>;
};

function npcMatchesLocation(n: GmNpcSearchRow, loreId: string | null): boolean {
  if (!loreId) return false;
  const L = String(loreId);
  return (
    String(n.current_location_id ?? "") === L || String(n.home_location_id ?? "") === L
  );
}

export function GmNpcSearchModal({
  open,
  onClose,
  npcs,
  stageDeckNpcIds,
  currentLocationLoreId,
  activeNpcIds,
  onPlaceOnStage,
}: Props) {
  const [q, setQ] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [onlyAtLocation, setOnlyAtLocation] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setOnlyHidden(false);
      setOnlyAtLocation(false);
    }
  }, [open]);

  const pool = useMemo(() => {
    if (stageDeckNpcIds == null) return npcs;
    const deck = new Set(stageDeckNpcIds.map(String));
    if (deck.size === 0) return npcs;
    return npcs.filter((n) => deck.has(String(n.id)));
  }, [npcs, stageDeckNpcIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = pool;
    if (onlyHidden) {
      rows = rows.filter((n) => !n.is_revealed);
    }
    if (onlyAtLocation && currentLocationLoreId) {
      rows = rows.filter((n) => npcMatchesLocation(n, currentLocationLoreId));
    }
    if (term) {
      rows = rows.filter((n) =>
        `${n.name} ${n.title ?? ""}`.toLowerCase().includes(term),
      );
    }
    const loc = currentLocationLoreId;
    const scored = rows.map((n) => ({
      n,
      score: loc && npcMatchesLocation(n, loc) ? 2 : 0,
      onStage: activeNpcIds.has(String(n.id)),
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.onStage !== b.onStage) return Number(a.onStage) - Number(b.onStage);
      return a.n.name.localeCompare(b.n.name, "de");
    });
    return scored.map((s) => s.n);
  }, [pool, q, onlyHidden, onlyAtLocation, currentLocationLoreId, activeNpcIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="gm-npc-search"
          className="fixed inset-0 z-[112] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gm-npc-search-title"
            className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-background-card/98 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hero-border/50 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="gm-npc-search-title"
                  className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant sm:text-xl"
                >
                  {"NPCs suchen & zur Bühne"}
                </h2>
                <p className="mt-1 font-libre text-xs text-gray-400 sm:text-sm">
                  Auch unenthüllte NPCs kannst du auf die Hand legen oder direkt auf die Bühne
                  stellen — Spieler sehen sie dann automatisch in der Kampagne.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 text-gray-200 hover:border-accent-gold/50 hover:text-accent-gold"
                aria-label="Modal schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="shrink-0 space-y-3 border-b border-hero-border/40 px-5 py-4">
              <div className="flex items-center gap-2 rounded border border-hero-dark bg-slate-900/90 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name oder Titel…"
                  className="min-w-0 flex-1 bg-transparent font-libre text-sm text-white outline-none placeholder:text-gray-500"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-400">
                  <input
                    type="checkbox"
                    checked={onlyHidden}
                    onChange={(e) => setOnlyHidden(e.target.checked)}
                    className="rounded border-hero-border text-hero-vibrant"
                  />
                  <EyeOff className="h-3.5 w-3.5" />
                  Nur unenthüllt
                </label>
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 font-barlow text-[10px] font-bold uppercase ${
                    currentLocationLoreId ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={onlyAtLocation}
                    onChange={(e) => setOnlyAtLocation(e.target.checked)}
                    disabled={!currentLocationLoreId}
                    className="rounded border-hero-border text-hero-vibrant disabled:opacity-40"
                  />
                  <MapPin className="h-3.5 w-3.5" />
                  Nur am Session-Ort
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {filtered.length === 0 ? (
                <p className="font-libre text-sm text-gray-500">Keine Treffer.</p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((n) => {
                    const onStage = activeNpcIds.has(String(n.id));
                    const atLoc = npcMatchesLocation(n, currentLocationLoreId);
                    return (
                      <li
                        key={n.id}
                        className="flex items-center gap-3 rounded-lg border border-hero-border/40 bg-background-dark/70 px-3 py-2"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/json",
                              JSON.stringify({ kind: "npc", id: n.id }),
                            );
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void onPlaceOnStage(String(n.id));
                            }
                          }}
                          className="relative h-14 w-11 shrink-0 cursor-grab overflow-hidden rounded border border-amber-900/50 bg-hero-dark/50"
                        >
                          {n.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={n.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-barlow text-xs font-bold text-accent-gold">
                              {n.name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-barlow text-sm font-bold text-white">
                            {n.name}
                          </p>
                          {n.title ? (
                            <p className="truncate font-libre text-[11px] text-gray-400">{n.title}</p>
                          ) : null}
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {n.is_revealed ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-950/50 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-emerald-300">
                                <Eye className="h-3 w-3" />
                                Frei
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-gray-400">
                                <EyeOff className="h-3 w-3" />
                                Verborgen
                              </span>
                            )}
                            {atLoc ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-950/60 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-amber-200">
                                <MapPin className="h-3 w-3" />
                                Ort
                              </span>
                            ) : null}
                            {onStage ? (
                              <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-hero-vibrant">
                                Auf Bühne
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={onStage}
                          onClick={() => void onPlaceOnStage(String(n.id))}
                          className="shrink-0 rounded border border-accent-gold/60 bg-accent-gold/15 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {onStage ? "Bereits live" : "Auf Bühne"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
