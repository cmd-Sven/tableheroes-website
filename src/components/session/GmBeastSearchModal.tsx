"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Search, X } from "lucide-react";

export type GmBeastSearchRow = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
  is_revealed?: boolean | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  creatures: GmBeastSearchRow[];
  stageDeckCreatureIds: string[] | null;
  activeCreatureIds: Set<string>;
  onPlaceOnStage: (creatureId: string) => void | Promise<void>;
};

export function GmBeastSearchModal({
  open,
  onClose,
  creatures,
  stageDeckCreatureIds,
  activeCreatureIds,
  onPlaceOnStage,
}: Props) {
  const [q, setQ] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setOnlyHidden(false);
    }
  }, [open]);

  const pool = useMemo(() => {
    if (stageDeckCreatureIds == null) return creatures;
    const deck = new Set(stageDeckCreatureIds.map(String));
    if (deck.size === 0) return creatures;
    return creatures.filter((c) => deck.has(String(c.id)));
  }, [creatures, stageDeckCreatureIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = pool;
    if (onlyHidden) rows = rows.filter((c) => !c.is_revealed);
    if (term) {
      rows = rows.filter((c) =>
        `${c.name} ${c.creature_type ?? ""}`.toLowerCase().includes(term),
      );
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [pool, q, onlyHidden]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 p-4 pt-[10vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal
          aria-labelledby="gm-beast-search-title"
          className="w-full max-w-lg max-h-[75vh] flex flex-col rounded-lg border border-hero-border bg-background-card shadow-2xl"
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-hero-dark px-4 py-3">
            <h2
              id="gm-beast-search-title"
              className="font-barlow font-bold uppercase text-sm text-hero-vibrant"
            >
              Kreaturen auf die Bühne
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-hero-dark px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500 shrink-0" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name oder Typ …"
                className="flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white outline-none focus:border-hero-vibrant"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 font-libre text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyHidden}
                onChange={(e) => setOnlyHidden(e.target.checked)}
              />
              Nur noch nicht freigegebene
            </label>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center font-libre text-sm text-gray-500">
                Keine Kreaturen gefunden.
              </li>
            ) : (
              filtered.map((c) => {
                const onStage = activeCreatureIds.has(String(c.id));
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={onStage}
                      onClick={() => {
                        void onPlaceOnStage(String(c.id));
                      }}
                      className="flex w-full items-center gap-3 rounded border border-hero-border/30 bg-background-dark px-3 py-2 text-left hover:border-emerald-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="h-10 w-8 shrink-0 overflow-hidden rounded border border-hero-border/40 bg-hero-dark">
                        {c.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center font-cinzel text-sm text-accent-gold">
                            {c.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-barlow font-bold text-sm text-white truncate">
                          {c.name}
                        </p>
                        {c.creature_type ? (
                          <p className="font-libre text-[11px] text-gray-500 capitalize truncate">
                            {c.creature_type}
                          </p>
                        ) : null}
                      </div>
                      {c.is_revealed ? (
                        <span title="Freigegeben">
                          <Eye className="h-4 w-4 shrink-0 text-green-400" />
                        </span>
                      ) : (
                        <span title="Verborgen">
                          <EyeOff className="h-4 w-4 shrink-0 text-amber-500" />
                        </span>
                      )}
                      <span className="font-barlow text-[10px] uppercase text-gray-500 shrink-0">
                        {onStage ? "Auf Bühne" : "Legen"}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
