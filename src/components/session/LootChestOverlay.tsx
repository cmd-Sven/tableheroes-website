"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Loader2, Package, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import { takeAllLootGoldFromContainer } from "@/src/lib/actions/loot-actions";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";

type ContainerRow = {
  id: string;
  name: string;
  gp_remaining: number;
  sp_remaining: number;
  items_json: unknown;
};

function countLootItems(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.filter((row) => {
    if (!row || typeof row !== "object") return false;
    return String((row as Record<string, unknown>).id ?? "").trim().length > 0;
  }).length;
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

  const itemsCount = useMemo(() => countLootItems(row?.items_json), [row?.items_json]);
  const gp = Math.max(0, Math.round(Number(row?.gp_remaining ?? 0)));
  const sp = Math.max(0, Math.round(Number(row?.sp_remaining ?? 0)));
  const hasGold = gp > 0 || sp > 0;
  const hasItems = itemsCount > 0;
  const canInteract = Boolean(characterId) && !isGM;
  const isEmpty = !hasGold && !hasItems;

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
          <span className="font-libre text-[9px] text-gray-400 inline-flex flex-wrap items-center gap-1">
            {hasGold ? <DndCoinDisplay pouch={{ gp, sp }} size="xs" /> : "Kein Geld"}{" "}
            {hasItems ? `· ${itemsCount} Item(s)` : ""}
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
                      ? "Münzen hier verteilen — Gegenstände liegen als Karten auf der Bühne."
                      : canInteract
                        ? "Münzen übernehmen. Gegenstände nimmst du über die Karten auf der Bühne auf."
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
                    <div className="mb-2">
                      <DndCoinDisplay pouch={{ gp, sp }} size="md" />
                    </div>
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
                  <p className="rounded-xl border border-amber-900/30 bg-black/25 px-3 py-2 font-libre text-xs text-gray-400">
                    {itemsCount} Gegenstand/Gegenstände auf der Bühne — Identifikation und „Einstecken“ dort.
                  </p>
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
