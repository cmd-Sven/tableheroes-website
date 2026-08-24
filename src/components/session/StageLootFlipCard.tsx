/**
 * StageLootFlipCard — Flip card for a single loot item on the stage.
 */
"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Package, ScrollText, X } from "lucide-react";
import type { LootItemRow } from "@/src/lib/loot/loot-item-model";
import {
  displayLootItem,
  useTemporaryStageGlow,
  ITEM_CARD_BACK,
} from "./stage-loot-item-cards.utils";

type StageCardGlowStyle = CSSProperties & { "--glow-color"?: string };

const RARITY_CLASS: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-900/70 text-gray-200",
  uncommon: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  rare: "border-sky-500/50 bg-sky-950/50 text-sky-200",
  "very rare": "border-violet-500/50 bg-violet-950/50 text-violet-200",
  legendary: "border-accent-gold/70 bg-accent-gold/15 text-accent-gold",
};

export function StageLootFlipCard({
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
      className="absolute left-1/2 top-1/2 w-56 max-w-[min(90vw,14rem)] -translate-x-1/2 -translate-y-1/2"
      style={{ zIndex: zBase + ringIndex }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0.25, rotateZ: flyRotateZ }}
      animate={{
        opacity: 1,
        x: flyTx,
        y: flyTy,
        scale: combatScale * 0.9,
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
          className="relative h-72 w-full cursor-pointer rounded-xl"
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
          <div
            className="absolute inset-0 h-72 overflow-hidden rounded-xl border-2 border-amber-900/90 shadow-2xl backface-hidden"
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
                  sizes="224px"
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

          <div
            className="absolute inset-0 flex h-72 flex-col overflow-hidden rounded-xl border-2 border-amber-900/75 bg-background-dark shadow-2xl backface-hidden transform-[rotateY(180deg)]"
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
