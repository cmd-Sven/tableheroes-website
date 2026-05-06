"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";
import { Coins, Loader2, Package, ScrollText, X } from "lucide-react";
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
import {
  disguisedLootDesc,
  disguisedLootTitle,
  parseIdentifyRequests,
  parseLootItemRow,
  type LootIdentifyRequestRow,
  type LootItemRow,
} from "@/src/lib/loot/loot-item-model";

/** Geschlossene Truhe (Nutzer-Asset). */
const CHEST_IMG_CLOSED = "/images/Session_ui/truhe_zu.webp";
/** Geöffnete Truhe — gleicher Ordner (`public/images/Session_ui/`). */
const CHEST_IMG_OPEN = "/images/Session_ui/truhe_offen.webp";
/** Kartenrückseite vor dem Umdrehen (`public/images/Session_ui/`). */
const ITEM_CARD_BACK = "/images/Session_ui/itemcard_backside.webp";

type ContainerRow = {
  id: string;
  name: string;
  gp_remaining: number;
  sp_remaining: number;
  chest_opened?: boolean;
  items_json: unknown;
  identify_requests?: unknown;
};

type StageCardGlowStyle = CSSProperties & { "--glow-color"?: string };

const RARITY_CLASS: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

function useTemporaryStageGlow() {
  const [showGlow, setShowGlow] = useState(false);
  useEffect(() => {
    setShowGlow(true);
    const t = window.setTimeout(() => setShowGlow(false), 4000);
    return () => window.clearTimeout(t);
  }, []);
  return showGlow;
}

function displayLootItem(it: LootItemRow): { title: string; desc: string } {
  return { title: disguisedLootTitle(it), desc: disguisedLootDesc(it) };
}

function stableRotateFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 26) - 13;
}

function StageLootFlipCard({
  item,
  isGM,
  isCombatMode,
  characterId,
  identifyPending,
  claiming,
  ringIndex,
  flyDelay,
  flyTx,
  flyTy,
  flyRotateZ,
  onIdentify,
  onClaim,
  onGmRemove,
}: {
  item: LootItemRow;
  isGM: boolean;
  isCombatMode: boolean;
  characterId: string | null;
  identifyPending: boolean;
  claiming: boolean;
  ringIndex: number;
  flyDelay: number;
  flyTx: number;
  flyTy: number;
  flyRotateZ: number;
  onIdentify: () => void;
  onClaim: () => void;
  onGmRemove: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [backImageBroken, setBackImageBroken] = useState(false);
  const showGlow = useTemporaryStageGlow();
  const { title, desc } = displayLootItem(item);
  const rarityKey = item.rarity.trim().toLowerCase();
  const rarityCls = RARITY_CLASS[rarityKey] ?? RARITY_CLASS.common;
  const canPlayerInteract = Boolean(characterId) && !isGM;
  const needsIdentify = item.isMagical && !item.identified;
  const showIdentifyBtn = canPlayerInteract && needsIdentify;
  const showClaimBtn = canPlayerInteract;
  const combatScale = isCombatMode ? 0.78 : 1;

  function toggleFlip() {
    setFlipped((f) => !f);
  }

  const zBase = 45;

  return (
    <motion.div
      className="absolute left-1/2 top-[40%] w-64 max-w-[min(92vw,16rem)] -translate-x-1/2 -translate-y-1/2"
      style={{ zIndex: zBase + ringIndex }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0.25, rotateZ: flyRotateZ }}
      animate={{
        opacity: 1,
        x: flyTx,
        y: flyTy,
        scale: combatScale,
        rotateZ: 0,
      }}
      transition={{
        delay: flyDelay,
        type: "spring",
        stiffness: 100,
        damping: 12,
        mass: 0.9,
      }}
    >
      <div
        className="animated-border-box pointer-events-none absolute inset-[-3px] rounded-xl"
        style={
          {
            opacity: showGlow ? 1 : 0,
            "--glow-color": "rgba(202, 185, 38, 0.75)",
          } as StageCardGlowStyle
        }
      />
      <div className="relative perspective-[1200px]" style={{ perspective: "1200px" }}>
        <motion.div
          className="relative h-80 w-full cursor-pointer rounded-xl"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={toggleFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          aria-label={flipped ? "Karte umdrehen (Rückseite)" : "Karte umdrehen (Details)"}
        >
          {/* Erste sichtbare Seite: Grafik-Rückseite */}
          <div
            className="absolute inset-0 h-80 overflow-hidden rounded-xl border-2 border-amber-900/90 shadow-2xl backface-hidden"
            style={{
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
            }}
          >
            {backImageBroken ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-b from-background-card to-background-dark">
                <span className="font-cinzel text-6xl font-bold text-accent-gold drop-shadow-md">?</span>
                <p className="mt-3 px-3 text-center font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Karte umdrehen
                </p>
              </div>
            ) : (
              <>
                <Image
                  src={ITEM_CARD_BACK}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="256px"
                  unoptimized
                  onError={() => setBackImageBroken(true)}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent px-2 py-3">
                  <p className="text-center font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-200">
                    Klicken zum Umdrehen
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Nach dem Drehen: Item-Infos */}
          <div
            className="absolute inset-0 flex h-80 flex-col overflow-hidden rounded-xl border-2 border-amber-900/75 bg-background-dark shadow-2xl backface-hidden transform-[rotateY(180deg)]"
            style={{
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
            }}
          >
            <button
              type="button"
              className="absolute left-2 top-2 z-40 rounded border border-amber-800/60 bg-black/60 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-gray-200 hover:text-accent-gold"
              onClick={(e) => {
                e.stopPropagation();
                setFlipped(false);
              }}
            >
              Zurück
            </button>
            {isGM ? (
              <button
                type="button"
                aria-label="Gegenstand von der Bühne entfernen"
                onClick={(e) => {
                  e.stopPropagation();
                  onGmRemove();
                }}
                className="absolute right-2 top-2 z-40 grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 hover:bg-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-11">
              <div className="mb-2 flex shrink-0 items-center gap-2">
                <Package className="h-5 w-5 shrink-0 text-accent-gold/90" aria-hidden />
                <p className="truncate font-barlow text-sm font-bold uppercase text-white">{title}</p>
              </div>
              <div
                className={`min-h-0 flex-1 overflow-y-auto rounded border px-2 py-2 font-libre text-sm leading-relaxed text-gray-200 ${rarityCls}`}
              >
                {desc || "—"}
              </div>
              {needsIdentify ? (
                <p className="mt-1 shrink-0 font-barlow text-[10px] font-bold uppercase text-amber-300/90">
                  Nicht identifiziert
                </p>
              ) : null}
              {item.isMagical && item.identified ? (
                <p className="mt-0.5 shrink-0 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                  Identifiziert
                </p>
              ) : null}
            </div>

            {!isGM && (showIdentifyBtn || showClaimBtn) ? (
              <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex flex-col gap-1.5 border-t border-amber-900/40 bg-background-dark/95 pt-2">
                {showIdentifyBtn ? (
                  <button
                    type="button"
                    disabled={identifyPending || claiming}
                    onClick={(e) => {
                      e.stopPropagation();
                      onIdentify();
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded border border-accent-gold/70 bg-background-dark/95 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold hover:bg-accent-gold/15 disabled:opacity-40"
                  >
                    {identifyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScrollText className="h-3.5 w-3.5" />}
                    {identifyPending ? "…" : "Identifizieren"}
                  </button>
                ) : null}
                {showClaimBtn ? (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaim();
                    }}
                    className="w-full rounded border border-emerald-700/70 bg-emerald-950/80 py-2 font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant disabled:opacity-40"
                  >
                    {claiming ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Einstecken"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

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
    if (chestOpened && !chestOpenedBefore.current) {
      chestOpenedBefore.current = true;
      void chestMotion.start({
        rotate: [0, -7, 6, -3, 0],
        scale: [1, 1.1, 1.04, 1],
        y: [0, -14, 0],
        transition: {
          type: "spring",
          stiffness: 280,
          damping: 14,
          mass: 0.85,
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

  const ringLayout = useMemo(() => {
    const n = Math.max(1, items.length);
    const r = Math.min(560, Math.max(300, 200 + n * 38));
    return items.map((it, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        tx: Math.cos(angle) * r,
        ty: Math.sin(angle) * r,
        delay: 0.09 * i,
        flyRotateZ: stableRotateFromId(it.id),
      };
    });
  }, [items]);

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

  return (
    <>
      <div className="relative z-10 mx-auto w-full max-w-5xl rounded-xl border border-amber-900/40 bg-black/40 p-4 pb-10 backdrop-blur-sm md:p-6">
        <h3 className="mb-4 flex flex-wrap items-center gap-2 font-barlow text-xs font-bold uppercase text-gray-300">
          <Package className="h-3.5 w-3.5 text-accent-gold" />
          Beute
          {row.name ? (
            <span className="truncate font-libre text-[10px] font-normal normal-case text-gray-500">({row.name})</span>
          ) : null}
        </h3>

        <div className="relative mx-auto min-h-[min(58vh,560px)] w-full max-w-5xl">
          {/* Truhe (Mitte) */}
          <div className="absolute left-1/2 top-[38%] z-30 flex w-[min(88%,20rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <motion.div
              className="relative aspect-square w-full max-w-56 drop-shadow-[0_12px_32px_rgba(0,0,0,0.75)]"
              animate={chestMotion}
            >
              <Image
                src={chestOpened ? CHEST_IMG_OPEN : CHEST_IMG_CLOSED}
                alt={chestOpened ? "Geöffnete Schatztruhe" : "Geschlossene Schatztruhe"}
                fill
                className="object-contain"
                sizes="224px"
                unoptimized
              />
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

          {/* Item-Karten im Ring */}
          {chestOpened && hasItems
            ? items.map((it, i) => {
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

      {/* Gold: schwebend unten, nicht über der Truhe */}
      {chestOpened && hasGold ? (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[92] w-[min(96vw,28rem)] -translate-x-1/2 rounded-xl border border-amber-900/60 bg-background-card/98 px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
            <Coins className="h-4 w-4 shrink-0" />
            Münzen in der Truhe
          </div>
          <p className="mb-2 font-libre text-sm text-gray-200">
            {gp} Gold · {sp} Silber
          </p>
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
