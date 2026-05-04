"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Gift, Loader2, Package, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import {
  claimLootItemFromContainer,
  takeAllLootGoldFromContainer,
  type LootItemRow,
} from "@/src/lib/actions/loot-actions";

type ContainerRow = {
  id: string;
  name: string;
  gp_remaining: number;
  sp_remaining: number;
  items_json: unknown;
};

const RARITY_CLASS: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

function parseItems(raw: unknown): LootItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(o.name ?? "Gegenstand").slice(0, 160),
        desc: String(o.desc ?? ""),
        rarity: String(o.rarity ?? "common").toLowerCase(),
        price: Math.max(0, Math.round(Number(o.price ?? 0))),
        isMagical: Boolean(o.isMagical ?? o.is_magical),
      };
    })
    .filter((x): x is LootItemRow => x != null);
}

type Props = {
  sessionId: string;
  containerId: string;
  characterId: string | null;
  isGM: boolean;
};

export function LootChestOverlay({ sessionId, containerId, characterId, isGM }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [row, setRow] = useState<ContainerRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isGoldPending, startGold] = useTransition();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadRow = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, name, gp_remaining, sp_remaining, items_json")
      .eq("id", containerId)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setRow(null);
      return;
    }
    if (!data) {
      setRow(null);
      return;
    }
    setRow(data as ContainerRow);
  }, [supabase, containerId]);

  useEffect(() => {
    void loadRow();
  }, [loadRow]);

  useEffect(() => {
    const channel = supabase
      .channel(`loot_container_${containerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_loot_containers",
          filter: `id=eq.${containerId}`,
        },
        () => void loadRow(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, containerId, loadRow]);

  const items = useMemo(() => parseItems(row?.items_json), [row?.items_json]);
  const gp = Math.max(0, Math.round(Number(row?.gp_remaining ?? 0)));
  const sp = Math.max(0, Math.round(Number(row?.sp_remaining ?? 0)));
  const hasGold = gp > 0 || sp > 0;
  const hasItems = items.length > 0;
  const canInteract = Boolean(characterId) && !isGM;
  const isEmpty = !hasGold && !hasItems;

  function rarityClass(r: string) {
    const key = r.trim().toLowerCase();
    return RARITY_CLASS[key] ?? RARITY_CLASS.common;
  }

  function handleTakeAllGold() {
    if (!characterId || isGM) {
      toast.message("Nur Spieler mit eigenem Charakter können Gold nehmen.");
      return;
    }
    startGold(async () => {
      const res = await takeAllLootGoldFromContainer(sessionId, characterId, containerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gold übernommen.");
      await loadRow();
    });
  }

  async function handleClaimItem(itemId: string) {
    if (!characterId || isGM) {
      toast.message("Nur Spieler mit eigenem Charakter können Items einstecken.");
      return;
    }
    setClaimingId(itemId);
    try {
      const res = await claimLootItemFromContainer(sessionId, characterId, containerId, itemId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Item ins Inventar gelegt.");
      await loadRow();
    } finally {
      setClaimingId(null);
    }
  }

  if (loadError) {
    return (
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[25] w-[min(92vw,22rem)] -translate-x-1/2 rounded-xl border border-red-900/60 bg-black/80 px-3 py-2 font-libre text-xs text-red-200 backdrop-blur-md">
        {loadError}
      </div>
    );
  }

  if (!row && !loadError) {
    return (
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[25] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-900/50 bg-black/70 px-4 py-2 backdrop-blur-md">
        <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
        <span className="font-barlow text-xs uppercase text-gray-300">Truhe wird geladen …</span>
      </div>
    );
  }

  if (row && isEmpty) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[25] -translate-x-1/2">
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="group relative flex flex-col items-center gap-1 rounded-2xl border border-accent-gold/50 bg-linear-to-b from-emerald-950/95 to-background-dark/95 px-5 py-3 shadow-[0_0_24px_rgba(55,152,6,0.25)] backdrop-blur-md"
        >
          <Package className="h-10 w-10 text-accent-gold transition-transform group-hover:scale-105" />
          <span className="max-w-[12rem] truncate font-barlow text-[10px] font-extrabold uppercase tracking-wide text-hero-vibrant">
            {row?.name ?? "Beute"}
          </span>
          <span className="font-libre text-[9px] text-gray-400">
            {hasGold ? `${gp} gp / ${sp} sp` : "Kein Gold"}{" "}
            {hasItems ? `· ${items.length} Item(s)` : ""}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loot-chest-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28 }}
              className="relative flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-hero-border bg-background-card shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-hero-border/60 px-4 py-3">
                <div>
                  <h2
                    id="loot-chest-title"
                    className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant"
                  >
                    {row?.name ?? "Beute"}
                  </h2>
                  <p className="font-libre text-xs text-gray-400">
                    {isGM
                      ? "Spieler öffnen die Truhe mit ihrem Charakter."
                      : canInteract
                        ? "Nimm Gold oder steck dir Gegenstände ein."
                        : "Verknüpfe einen Charakter mit deinem Account, um Beute zu nehmen."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-amber-900/50 p-1.5 text-gray-300 hover:bg-black/30"
                  aria-label="Schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {hasGold ? (
                  <div className="rounded-xl border border-amber-900/40 bg-black/35 p-3">
                    <div className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                      <Coins className="h-4 w-4" />
                      Münzen
                    </div>
                    <p className="mb-2 font-libre text-sm text-gray-200">
                      {gp} Gold, {sp} Silber
                    </p>
                    <button
                      type="button"
                      disabled={!canInteract || isGoldPending}
                      onClick={handleTakeAllGold}
                      className="w-full rounded border border-emerald-700/60 bg-emerald-950/50 py-2 font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isGoldPending ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "Alles Gold nehmen"
                      )}
                    </button>
                  </div>
                ) : null}

                {hasItems ? (
                  <div>
                    <div className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-400">
                      <Gift className="h-4 w-4 text-accent-gold" />
                      Gegenstände
                    </div>
                    <ul className="space-y-3">
                      {items.map((it) => (
                        <li
                          key={it.id}
                          className={`rounded-xl border p-3 ${rarityClass(it.rarity)}`}
                        >
                          <div className="mb-1 font-cinzel text-base font-bold text-accent-gold">
                            {it.name}
                          </div>
                          <p className="mb-2 whitespace-pre-wrap font-libre text-xs leading-relaxed text-gray-200">
                            {it.desc || "—"}
                          </p>
                          <div className="mb-2 flex flex-wrap gap-2 font-barlow text-[10px] uppercase text-gray-400">
                            <span>{it.rarity}</span>
                            {it.price ? <span>{it.price} gp</span> : null}
                            {it.isMagical ? <span className="text-accent-gold">Magisch</span> : null}
                          </div>
                          <button
                            type="button"
                            disabled={!canInteract || claimingId === it.id}
                            onClick={() => void handleClaimItem(it.id)}
                            className="w-full rounded border border-hero-border/80 bg-background-dark/80 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-gray-200 hover:border-accent-gold/60 hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {claimingId === it.id ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                              "Einstecken"
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!hasGold && !hasItems ? (
                  <p className="text-center font-libre text-sm text-gray-400">Diese Truhe ist leer.</p>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
