"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Coins, Loader2, Package } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import {
  claimLootItemFromContainer,
  gmClearLootGoldFromStage,
  gmRemoveLootItemFromStage,
  openLootChestOnStage,
  requestLootItemIdentify,
  resolveLootItemIdentify,
  takeAllLootGoldFromContainer,
} from "@/src/lib/actions/loot-actions";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";
import {
  parseIdentifyRequests,
  parseLootItemRow,
  type LootIdentifyRequestRow,
  type LootItemRow,
} from "@/src/lib/loot/loot-item-model";
import {
  CHEST_IMG_CLOSED,
  CHEST_IMG_OPEN,
  computeRingLayout,
  MAX_STAGE_LOOT_ITEMS,
  type ContainerRow,
} from "./stage-loot-item-cards.utils";
import { StageLootCoinBurst } from "./StageLootCoinBurst";
import { StageLootFlipCard } from "./StageLootFlipCard";

type Props = {
  sessionId: string;
  campaignId: string;
  containerId: string;
  characterId: string | null;
  isGM: boolean;
  isCombatMode: boolean;
};

export function StageLootItemCards({ sessionId, campaignId, containerId, characterId, isGM, isCombatMode }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [row, setRow] = useState<ContainerRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [identifyBusyId, setIdentifyBusyId] = useState<string | null>(null);
  const [resolveBusyId, setResolveBusyId] = useState<string | null>(null);
  const [openBusy, setOpenBusy] = useState(false);
  const [goldBusy, setGoldBusy] = useState(false);
  const [clearGoldBusy, setClearGoldBusy] = useState(false);
  const chestMotion = useAnimationControls();
  const chestOpenedBefore = useRef(false);
  const isFirstPaint = useRef(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 360, h: 360 });
  const [coinBurstKey, setCoinBurstKey] = useState(0);

  const loadRow = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, name, gp_remaining, sp_remaining, chest_opened, items_json, identify_requests")
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
      .channel(`stage_loot_${containerId}`)
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

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({
        w: Math.max(220, Math.round(r.width)),
        h: Math.max(240, Math.round(r.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerId, row?.id]);

  const items = useMemo(() => {
    if (!row?.items_json || !Array.isArray(row.items_json)) return [];
    return (row.items_json as unknown[])
      .map(parseLootItemRow)
      .filter((x): x is LootItemRow => x != null);
  }, [row?.items_json]);

  const identifyRequests = useMemo(() => parseIdentifyRequests(row?.identify_requests), [row?.identify_requests]);

  const gp = Math.max(0, Math.round(Number(row?.gp_remaining ?? 0)));
  const sp = Math.max(0, Math.round(Number(row?.sp_remaining ?? 0)));
  const hasGold = gp > 0 || sp > 0;
  const chestOpened = Boolean(row?.chest_opened);

  useEffect(() => {
    if (isFirstPaint.current) {
      isFirstPaint.current = false;
      if (chestOpened) chestOpenedBefore.current = true;
      return;
    }
    if (chestOpened && !chestOpenedBefore.current) {
      chestOpenedBefore.current = true;
      setCoinBurstKey((k) => k + 1);
      void chestMotion.start({
        rotate: [0, -7, 6, -4, 3, 0],
        transition: {
          duration: 0.58,
          ease: [0.34, 1.25, 0.64, 1],
        },
      });
    }
    if (!chestOpened) {
      chestOpenedBefore.current = false;
    }
  }, [chestOpened, chestMotion]);

  function hasPendingIdentify(itemId: string): boolean {
    if (!characterId) return false;
    return identifyRequests.some((r) => r.item_id === itemId && r.character_id === characterId);
  }

  async function handleIdentify(itemId: string) {
    if (!characterId) return;
    setIdentifyBusyId(itemId);
    try {
      const res = await requestLootItemIdentify(sessionId, characterId, containerId, itemId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Anfrage an den Spielleiter gesendet.");
      await loadRow();
    } finally {
      setIdentifyBusyId(null);
    }
  }

  async function handleClaim(itemId: string) {
    if (!characterId) return;
    setClaimingId(itemId);
    try {
      const res = await claimLootItemFromContainer(sessionId, characterId, containerId, itemId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gegenstand übernommen.");
      await loadRow();
    } finally {
      setClaimingId(null);
    }
  }

  async function handleGmRemove(itemId: string) {
    const res = await gmRemoveLootItemFromStage(sessionId, campaignId, containerId, itemId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Gegenstand von der Bühne entfernt.");
    await loadRow();
  }

  async function handleResolve(req: LootIdentifyRequestRow, success: boolean) {
    setResolveBusyId(req.id);
    try {
      const res = await resolveLootItemIdentify(sessionId, campaignId, containerId, req.id, success);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(success ? "Identifikation bestätigt." : "Identifikation abgelehnt.");
      await loadRow();
    } finally {
      setResolveBusyId(null);
    }
  }

  async function handleOpenChest() {
    setOpenBusy(true);
    try {
      await chestMotion.start({
        x: [0, -11, 11, -9, 9, -7, 7, -4, 4, -2, 2, 0],
        rotate: [0, -10, 9, -8, 7, -5, 4, 0],
        transition: { duration: 0.58, ease: [0.45, 0, 0.55, 1] },
      });
      const res = await openLootChestOnStage(sessionId, campaignId, containerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Truhe geöffnet.");
      await loadRow();
    } finally {
      setOpenBusy(false);
    }
  }

  async function handleTakeAllGold() {
    if (!characterId || isGM) {
      toast.message("Nur Spieler mit eigenem Charakter können Gold nehmen.");
      return;
    }
    setGoldBusy(true);
    try {
      const res = await takeAllLootGoldFromContainer(sessionId, characterId, containerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gold übernommen.");
      await loadRow();
    } finally {
      setGoldBusy(false);
    }
  }

  async function handleGmClearGold() {
    setClearGoldBusy(true);
    try {
      const res = await gmClearLootGoldFromStage(sessionId, campaignId, containerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gold von der Bühne entfernt.");
      await loadRow();
    } finally {
      setClearGoldBusy(false);
    }
  }

  const displayItems = useMemo(() => items.slice(0, MAX_STAGE_LOOT_ITEMS), [items]);

  const ringLayout = useMemo(() => {
    if (displayItems.length === 0) return [];
    const ids = displayItems.map((it) => it.id);
    return computeRingLayout(stageSize.w, stageSize.h, ids);
  }, [displayItems, stageSize]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-black/50 px-4 py-3 font-libre text-sm text-red-200">
        {loadError}
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-amber-900/40 bg-black/35 py-8 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
        <span className="font-barlow text-xs uppercase text-gray-400">Truhe wird geladen …</span>
      </div>
    );
  }

  const hasItems = items.length > 0;
  if (!hasGold && !hasItems) {
    return null;
  }

  const hasHiddenItems = items.length > MAX_STAGE_LOOT_ITEMS;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto w-full max-w-3xl overflow-visible rounded-xl border border-amber-900/40 bg-black/40 p-4 pb-8 backdrop-blur-sm md:p-5"
      >
        <h3 className="mb-2 flex flex-wrap items-center gap-2 font-barlow text-xs font-bold uppercase text-gray-300">
          <Package className="h-3.5 w-3.5 text-accent-gold" />
          Beute
          {row.name ? (
            <span className="truncate font-libre text-[10px] font-normal normal-case text-gray-500">({row.name})</span>
          ) : null}
        </h3>
        {hasHiddenItems ? (
          <p className="mb-3 rounded-lg border border-amber-800/40 bg-black/30 px-3 py-2 font-libre text-[10px] leading-relaxed text-amber-100/90">
            In dieser Truhe liegen <span className="font-semibold text-accent-gold">{items.length}</span> Gegenstände.
            Auf der Bühne werden maximal <span className="font-semibold">{MAX_STAGE_LOOT_ITEMS}</span> als Karten im
            Ring angezeigt — entfernt oder verteilte Gegenstände machen Platz für weitere.
          </p>
        ) : null}

        <div
          ref={stageRef}
          className="relative mx-auto min-h-[min(40vh,380px)] w-full max-w-xl overflow-visible py-4 sm:min-h-[min(42vh,420px)] md:max-w-2xl"
        >
          <div className="absolute left-1/2 top-1/2 w-0 -translate-x-1/2 -translate-y-1/2">
            {chestOpened && coinBurstKey > 0 ? <StageLootCoinBurst burstKey={coinBurstKey} /> : null}

            <div className="pointer-events-auto absolute left-1/2 top-1/2 z-30 flex w-[min(88%,18rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <motion.div
                className="relative aspect-square w-full max-w-[13.5rem] drop-shadow-[0_12px_32px_rgba(0,0,0,0.75)]"
                animate={chestMotion}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chestOpened ? "chest-open" : "chest-closed"}
                    className="absolute inset-0"
                    initial={{
                      opacity: chestOpened ? 0 : 0.9,
                      scale: chestOpened ? 1.16 : 0.9,
                    }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Image
                      src={chestOpened ? CHEST_IMG_OPEN : CHEST_IMG_CLOSED}
                      alt={chestOpened ? "Geöffnete Schatztruhe" : "Geschlossene Schatztruhe"}
                      fill
                      className="object-contain"
                      sizes="216px"
                      unoptimized
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              {!chestOpened && isGM ? (
                <div className="pointer-events-auto mt-4 flex w-full max-w-[16rem] flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={openBusy}
                    onClick={() => void handleOpenChest()}
                    className="rounded-lg border border-accent-gold/80 bg-accent-gold/20 px-6 py-2.5 font-barlow text-sm font-extrabold uppercase tracking-wide text-accent-gold shadow-lg transition-colors hover:bg-accent-gold/30 disabled:opacity-40"
                  >
                    {openBusy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Öffnen"}
                  </button>
                  {hasGold ? (
                    <button
                      type="button"
                      disabled={clearGoldBusy}
                      onClick={() => void handleGmClearGold()}
                      className="rounded border border-red-800/70 bg-red-950/40 px-3 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-red-200 hover:bg-red-900/50 disabled:opacity-40"
                    >
                      {clearGoldBusy ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "Gold von der Bühne entfernen"
                      )}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {!chestOpened && !isGM ? (
                <p className="mt-3 max-w-xs text-center font-libre text-xs text-gray-400">
                  Der Spielleiter öffnet die Truhe …
                </p>
              ) : null}
            </div>

            {chestOpened && displayItems.length > 0
              ? displayItems.map((it, i) => {
                  const lay = ringLayout[i] ?? { tx: 0, ty: 0, delay: 0, flyRotateZ: 0 };
                  return (
                    <StageLootFlipCard
                      key={it.id}
                      item={it}
                      isGM={isGM}
                      isCombatMode={isCombatMode}
                      characterId={characterId}
                      identifyPending={hasPendingIdentify(it.id) || identifyBusyId === it.id}
                      claiming={claimingId === it.id}
                      ringIndex={i}
                      flyDelay={lay.delay}
                      flyTx={lay.tx}
                      flyTy={lay.ty}
                      flyRotateZ={lay.flyRotateZ}
                      onIdentify={() => void handleIdentify(it.id)}
                      onClaim={() => void handleClaim(it.id)}
                      onGmRemove={() => void handleGmRemove(it.id)}
                    />
                  );
                })
              : null}
          </div>
        </div>
      </motion.div>

      {/* Gold: schwebend unten, nicht über der Truhe */}
      {chestOpened && hasGold ? (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[92] w-[min(96vw,28rem)] -translate-x-1/2 rounded-xl border border-amber-900/60 bg-background-card/98 px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
            <Coins className="h-4 w-4 shrink-0" />
            Münzen in der Truhe
          </div>
          <div className="mb-2">
            <DndCoinDisplay pouch={{ gp, sp }} size="md" />
          </div>
          <div className="flex flex-wrap gap-2">
            {!isGM && characterId ? (
              <button
                type="button"
                disabled={goldBusy}
                onClick={() => void handleTakeAllGold()}
                className="rounded border border-emerald-700/60 bg-emerald-950/50 px-3 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant hover:bg-emerald-900/40 disabled:opacity-40"
              >
                {goldBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alles Gold nehmen"}
              </button>
            ) : null}
            {isGM ? (
              <button
                type="button"
                disabled={clearGoldBusy}
                onClick={() => void handleGmClearGold()}
                className="rounded border border-red-800/70 bg-red-950/40 px-3 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-red-200 hover:bg-red-900/50 disabled:opacity-40"
              >
                {clearGoldBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gold von der Bühne entfernen"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isGM && identifyRequests.length > 0 ? (
        <div className="pointer-events-auto fixed left-4 top-24 z-[100] flex max-h-[min(70vh,28rem)] w-[min(92vw,22rem)] flex-col gap-2 overflow-y-auto rounded-xl border border-hero-border bg-background-card/98 p-3 shadow-2xl backdrop-blur-md">
          <p className="font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold">Identifikation</p>
          {identifyRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-lg border border-amber-900/50 bg-background-dark/90 p-3 font-libre text-xs text-gray-200"
            >
              <p className="leading-snug">
                <span className="font-barlow font-bold text-gray-100">{req.character_name}</span> möchte{" "}
                <span className="text-accent-gold">{req.item_label}</span> identifizieren. War die Prüfung erfolgreich?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={resolveBusyId === req.id}
                  onClick={() => void handleResolve(req, true)}
                  className="flex-1 rounded border border-hero-vibrant/80 bg-hero-vibrant/20 py-2 font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-40"
                >
                  Ja
                </button>
                <button
                  type="button"
                  disabled={resolveBusyId === req.id}
                  onClick={() => void handleResolve(req, false)}
                  className="flex-1 rounded border border-amber-800/80 bg-amber-950/50 py-2 font-barlow text-[10px] font-extrabold uppercase text-amber-200 hover:bg-amber-900/40 disabled:opacity-40"
                >
                  Nein
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
