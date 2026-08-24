/**
 * StageNpcCard — Animated NPC portrait card on the live stage with GM reputation controls.
 */
"use client";

import type { DragEvent } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  formatNpcReputationScore,
} from "@/src/lib/npc-reputation-smiley";
import {
  StageNpcShopControls,
  type LiveCampaignShopOption,
} from "@/src/app/session/[sessionId]/StageNpcShopControls";
import type {
  ActiveNpcReaction,
  CampaignNpc,
  CombatTokenPayload,
  StageCardGlowStyle,
  StagePortraitModal,
} from "./live-session-types";
import { buildNpcCombatToken } from "./live-session-combat-utils";
import { getStageCardGlowColor } from "./stage-card-utils";
import { useTemporaryStageGlow } from "./useTemporaryStageGlow";

export function StageNpcCard({
  npc,
  isSingle,
  isGM,
  isCombatMode,
  isInInitiative,
  isActiveTurn = false,
  isUpdating,
  reputationScore,
  reactions,
  onPortrait,
  onReaction,
  onRemove,
  onToggleShop,
  onAssignMerchantAndOpen,
  onDragCombatToken,
  campaignShops,
  isShopOpen,
  isShopBusy,
  linkedToStageFaction = false,
}: {
  npc: CampaignNpc;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  isInInitiative: boolean;
  isActiveTurn?: boolean;
  isUpdating: boolean;
  reputationScore: number;
  reactions: ActiveNpcReaction[];
  onPortrait: (portrait: StagePortraitModal) => void;
  onReaction: (npcId: string, amount: number) => void;
  onRemove: (npcId: string) => void;
  onToggleShop: (npc: CampaignNpc) => void;
  onAssignMerchantAndOpen: (npc: CampaignNpc, shopId: string) => void;
  onDragCombatToken: (event: DragEvent<HTMLElement>, token: CombatTokenPayload) => void;
  campaignShops: LiveCampaignShopOption[];
  isShopOpen: boolean;
  isShopBusy: boolean;
  linkedToStageFaction?: boolean;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [npc.name, npc.title].filter(Boolean).join(" — ");
  const glowColor = linkedToStageFaction
    ? getStageCardGlowColor("faction")
    : getStageCardGlowColor("npc");
  const canDragToInitiative = isGM && isCombatMode && !isInInitiative;

  return (
    <motion.div
      draggable={canDragToInitiative}
      onDragStart={(e) => {
        if (!canDragToInitiative) return;
        onDragCombatToken(e as unknown as DragEvent<HTMLElement>, buildNpcCombatToken(npc));
      }}
      className={`group relative isolate aspect-3/4 w-full max-h-[min(48vh,380px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${npc.image_url ? "cursor-zoom-in" : "cursor-default"} ${
        canDragToInitiative ? "cursor-grab active:cursor-grabbing" : ""
      } ${isInInitiative ? "ring-2 ring-accent-gold/50" : ""} ${
        isActiveTurn
          ? "ring-4 ring-accent-gold shadow-[0_0_28px_rgba(202,185,38,0.75)]"
          : ""
      } ${
        linkedToStageFaction ? "ring-2 ring-accent-gold/70" : ""
      }`}
      initial={{ opacity: 0, scale: 1.5, y: 200, rotateZ: -15 }}
      animate={
        isCombatMode
          ? { opacity: 1, scale: 0.7, y: 80, rotateZ: 0 }
          : { opacity: 1, scale: 1, y: 0, rotateZ: 0 }
      }
      exit={{
        opacity: 0,
        scale: 0.8,
        y: -50,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1 }}
    >
      <div
        className="animated-border-box"
        style={
          {
            opacity: showGlow ? 1 : 0,
            "--glow-color": glowColor,
          } as StageCardGlowStyle
        }
      />
      <div className="relative h-full overflow-hidden rounded-lg border-2 border-amber-900/70 bg-background-dark shadow-2xl hover:border-accent-gold/80">
        <button
          type="button"
          title={cardTitle}
          aria-label={`Porträt: ${npc.name}`}
          onClick={() => {
            if (npc.image_url) {
              onPortrait({
                name: npc.name,
                subtitle: npc.title,
                imageUrl: npc.image_url,
              });
            }
          }}
          className="absolute inset-0 h-full w-full focus:outline-none"
        >
          {npc.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte
            <img
              src={npc.image_url}
              alt=""
              className="pointer-events-none h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hero-dark/70">
              <span className="font-cinzel text-5xl text-accent-gold">
                {npc.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </button>

        {isActiveTurn ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
            <span className="rounded-full border border-accent-gold bg-accent-gold/25 px-3 py-1 font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold shadow-[0_0_16px_rgba(202,185,38,0.65)] backdrop-blur-sm">
              Am Zug
            </span>
          </div>
        ) : null}

        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 animate-[npc-reaction-float_3s_ease-out_forwards] text-6xl drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]"
          >
            {reaction.emoji}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent p-3">
          <p className="truncate font-barlow text-sm font-bold uppercase text-white">
            {npc.name}
          </p>
          {npc.title && (
            <p className="truncate font-libre text-[10px] text-gray-300">
              {npc.title}
            </p>
          )}
        </div>

        {isGM && (
          <div className="absolute inset-x-2 top-2 z-30 flex items-start justify-between gap-2">
            {canDragToInitiative ? (
              <span className="pointer-events-none rounded-full border border-accent-gold/50 bg-black/70 px-2 py-0.5 font-barlow text-[9px] font-extrabold uppercase text-accent-gold shadow-lg backdrop-blur">
                → Initiative
              </span>
            ) : isInInitiative ? (
              <span className="pointer-events-none rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-0.5 font-barlow text-[9px] font-extrabold uppercase text-accent-gold shadow-lg backdrop-blur">
                In Initiative
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center overflow-hidden rounded-full border border-amber-900/70 bg-background-dark/90 shadow-lg backdrop-blur">
            <button
              type="button"
              aria-label={`Ruf bei ${npc.name} senken`}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(String(npc.id), -5);
              }}
              disabled={isUpdating}
                className="flex h-8 w-8 items-center justify-center bg-red-950/90 font-barlow text-sm font-bold text-red-300 hover:bg-red-900 disabled:opacity-50"
            >
              -
            </button>
              <span
                className="flex min-w-[3.25rem] items-center justify-center px-1.5 font-barlow text-sm font-extrabold tabular-nums leading-none text-accent-gold"
                title={`Ruf ${formatNpcReputationScore(reputationScore)}`}
                aria-label={`Ruf ${formatNpcReputationScore(reputationScore)}`}
              >
                {formatNpcReputationScore(reputationScore)}
              </span>
            <button
              type="button"
              aria-label={`Ruf bei ${npc.name} erhöhen`}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(String(npc.id), 5);
              }}
              disabled={isUpdating}
                className="flex h-8 w-8 items-center justify-center bg-emerald-950/90 font-barlow text-sm font-bold text-hero-vibrant hover:bg-emerald-900 disabled:opacity-50"
            >
              +
            </button>
            </div>
            <button
              type="button"
              aria-label={`${npc.name} von der Bühne entfernen`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(String(npc.id));
              }}
              className="grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 shadow-lg backdrop-blur transition-colors hover:bg-red-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {isGM ? (
              <StageNpcShopControls
                npcName={npc.name}
                isMerchant={Boolean(npc.is_merchant && npc.shop_id)}
                isShopOpen={isShopOpen}
                shops={campaignShops}
                isBusy={isShopBusy}
                onAssignAndOpen={(shopId) => onAssignMerchantAndOpen(npc, shopId)}
                onToggleShop={() => onToggleShop(npc)}
              />
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}
