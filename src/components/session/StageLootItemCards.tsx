"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Package, ScrollText, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import {
  claimLootItemFromContainer,
  gmRemoveLootItemFromStage,
  requestLootItemIdentify,
  resolveLootItemIdentify,
} from "@/src/lib/actions/loot-actions";
import {
  disguisedLootDesc,
  disguisedLootTitle,
  parseIdentifyRequests,
  parseLootItemRow,
  type LootIdentifyRequestRow,
  type LootItemRow,
} from "@/src/lib/loot/loot-item-model";

type ContainerRow = {
  id: string;
  name: string;
  gp_remaining: number;
  sp_remaining: number;
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

function StageLootItemCard({
  item,
  isSingle,
  isGM,
  isCombatMode,
  characterId,
  identifyPending,
  claiming,
  onIdentify,
  onClaim,
  onGmRemove,
}: {
  item: LootItemRow;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  characterId: string | null;
  identifyPending: boolean;
  claiming: boolean;
  onIdentify: () => void;
  onClaim: () => void;
  onGmRemove: () => void;
}) {
  const showGlow = useTemporaryStageGlow();
  const { title, desc } = displayLootItem(item);
  const rarityKey = item.rarity.trim().toLowerCase();
  const rarityCls = RARITY_CLASS[rarityKey] ?? RARITY_CLASS.common;
  const canPlayerInteract = Boolean(characterId) && !isGM;
  const needsIdentify = item.isMagical && !item.identified;
  const showIdentifyBtn = canPlayerInteract && needsIdentify;
  const showClaimBtn = canPlayerInteract;

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(48vh,380px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      }`}
      initial={{ opacity: 0, scale: 1.5, y: 200, rotateZ: -15 }}
      animate={
        isCombatMode
          ? { opacity: 1, scale: 0.7, y: 80, rotateZ: 0 }
          : { opacity: 1, scale: 1, y: 0, rotateZ: 0 }
      }
      exit={{ opacity: 0, scale: 0.8, y: -50, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1 }}
    >
      <div
        className="animated-border-box"
        style={
          {
            opacity: showGlow ? 1 : 0,
            "--glow-color": "rgba(202, 185, 38, 0.75)",
          } as StageCardGlowStyle
        }
      />
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border-2 border-amber-900/70 bg-background-dark shadow-2xl hover:border-accent-gold/80">
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-linear-to-b from-hero-dark/40 to-background-dark pt-10">
          <Package className="h-16 w-16 text-accent-gold/85 drop-shadow-lg" aria-hidden />
          <span className="mt-2 font-cinzel text-4xl font-bold text-accent-gold/50">
            {title[0]?.toUpperCase() ?? "?"}
          </span>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 max-h-[55%] bg-linear-to-t from-black/92 via-black/55 to-transparent p-3 pt-10 ${
            !isGM && (showIdentifyBtn || showClaimBtn) ? "pb-20" : "pb-3"
          }`}
        >
          <p className="truncate font-barlow text-sm font-bold uppercase text-white">{title}</p>
          <p className={`mt-1 line-clamp-3 font-libre text-[10px] leading-snug text-gray-200 ${rarityCls} rounded border px-1.5 py-1`}>
            {desc || "—"}
          </p>
          {needsIdentify && !item.identified ? (
            <p className="mt-1 font-barlow text-[9px] font-bold uppercase text-amber-300/90">Nicht identifiziert</p>
          ) : null}
          {item.isMagical && item.identified ? (
            <p className="mt-1 font-barlow text-[9px] font-bold uppercase text-accent-gold">Identifiziert</p>
          ) : null}
        </div>

        {!isGM && (showIdentifyBtn || showClaimBtn) ? (
          <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex flex-col gap-1.5">
            {showIdentifyBtn ? (
              <button
                type="button"
                disabled={identifyPending || claiming}
                onClick={onIdentify}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent-gold/70 bg-background-dark/95 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-accent-gold shadow backdrop-blur hover:bg-accent-gold/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {identifyPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <ScrollText className="h-3.5 w-3.5" aria-hidden />
                )}
                {identifyPending ? "Anfrage beim SL …" : "Identifizieren"}
              </button>
            ) : null}
            {showClaimBtn ? (
              <button
                type="button"
                disabled={claiming}
                onClick={onClaim}
                className="w-full rounded-md border border-emerald-700/70 bg-emerald-950/80 py-1.5 font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant shadow backdrop-blur hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {claiming ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Einstecken"}
              </button>
            ) : null}
          </div>
        ) : null}

        {isGM ? (
          <button
            type="button"
            aria-label={`${title} von der Bühne entfernen`}
            onClick={onGmRemove}
            className="pointer-events-auto absolute right-2 top-2 z-30 grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 shadow-lg backdrop-blur transition-colors hover:bg-red-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
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

  const loadRow = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, name, gp_remaining, sp_remaining, items_json, identify_requests")
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

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-black/50 px-4 py-3 font-libre text-sm text-red-200">
        {loadError}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-amber-900/40 bg-black/35 p-4 backdrop-blur-sm">
        <h3 className="mb-3 flex items-center gap-2 font-barlow text-xs font-bold uppercase text-gray-300">
          <Package className="h-3.5 w-3.5 text-accent-gold" />
          Beute auf der Bühne
          {row?.name ? (
            <span className="truncate font-libre text-[10px] font-normal normal-case text-gray-500">
              ({row.name})
            </span>
          ) : null}
        </h3>
        <div
          className={
            items.length === 1 ? "flex justify-center" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          }
        >
          <AnimatePresence mode="popLayout">
            {items.map((it) => (
              <StageLootItemCard
                key={it.id}
                item={it}
                isSingle={items.length === 1}
                isGM={isGM}
                isCombatMode={isCombatMode}
                characterId={characterId}
                identifyPending={hasPendingIdentify(it.id) || identifyBusyId === it.id}
                claiming={claimingId === it.id}
                onIdentify={() => void handleIdentify(it.id)}
                onClaim={() => void handleClaim(it.id)}
                onGmRemove={() => void handleGmRemove(it.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isGM && identifyRequests.length > 0 ? (
        <div className="pointer-events-auto fixed bottom-4 left-4 z-[70] flex max-h-[min(70vh,28rem)] w-[min(92vw,22rem)] flex-col gap-2 overflow-y-auto rounded-xl border border-hero-border bg-background-card/98 p-3 shadow-2xl backdrop-blur-md">
          <p className="font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold">
            Identifikation
          </p>
          {identifyRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-lg border border-amber-900/50 bg-background-dark/90 p-3 font-libre text-xs text-gray-200"
            >
              <p className="leading-snug">
                <span className="font-barlow font-bold text-gray-100">{req.character_name}</span> möchte{" "}
                <span className="text-accent-gold">{req.item_label}</span> identifizieren. War die Prüfung
                erfolgreich?
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
