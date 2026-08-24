/**
 * StageFactionCard — Animated faction banner/emblem card on the live stage.
 */
"use client";

import { motion } from "framer-motion";
import { Flag, X } from "lucide-react";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";
import type {
  CampaignFaction,
  StageCardGlowStyle,
  StagePortraitModal,
} from "./live-session-types";
import { StageFactionPlayerNotesButton } from "./StageFactionPlayerNotesButton";
import { getFactionStatusVisual, getStageCardGlowColor } from "./stage-card-utils";
import { useTemporaryStageGlow } from "./useTemporaryStageGlow";

export function StageFactionCard({
  faction,
  isSingle,
  isGM,
  isCombatMode,
  campaignId,
  onPortrait,
  onRemove,
}: {
  faction: CampaignFaction;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  campaignId: string;
  onPortrait: (portrait: StagePortraitModal) => void;
  onRemove: (factionId: string) => void;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [faction.name, faction.type].filter(Boolean).join(" — ");
  const glowColor = getStageCardGlowColor("faction");
  const statusVisual = getFactionStatusVisual(faction.current_status);
  const bannerDisplay = normalizeImageDisplay(faction.banner_display ?? null);
  const emblemDisplay = normalizeImageDisplay(faction.image_display ?? null);
  const stageImageUrl = faction.banner_url || faction.image_url;

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(42vh,320px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${stageImageUrl ? "cursor-zoom-in" : "cursor-default"}`}
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
      <button
        type="button"
        title={cardTitle}
        aria-label={`Fraktion: ${faction.name}`}
        onClick={() => {
          if (faction.banner_url) {
            onPortrait({
              name: faction.name,
              subtitle: faction.type,
              imageUrl: faction.banner_url,
            });
          }
        }}
        className="relative h-full w-full overflow-hidden rounded-lg border-2 border-amber-800/70 bg-amber-950/40 shadow-lg hover:border-amber-500/80"
      >
        {faction.banner_url ? (
          <div
            className="pointer-events-none h-full w-full"
            style={imageDisplayBackdropStyle(bannerDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte */}
            <img
              src={faction.banner_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(bannerDisplay)}
            />
          </div>
        ) : faction.image_url ? (
          <div
            className="pointer-events-none h-full w-full"
            style={imageDisplayBackdropStyle(emblemDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte Fallback */}
            <img
              src={faction.image_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(emblemDisplay)}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-amber-950/50">
            <Flag className="h-14 w-14 text-accent-gold/90" />
          </div>
        )}
        {faction.image_url && faction.banner_url ? (
          <div
            className="pointer-events-none absolute left-2 top-2 z-10 h-10 w-10 overflow-hidden rounded border border-amber-200/70 bg-black/50 shadow-md"
            style={imageDisplayBackdropStyle(emblemDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Wappen-Overlay */}
            <img
              src={faction.image_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(emblemDisplay)}
            />
          </div>
        ) : null}
      </button>
      {statusVisual ? (
        <span
          className={`pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-full border border-black/40 bg-black/70 px-2 py-1 backdrop-blur ${statusVisual.color}`}
          title={statusVisual.label}
        >
          <statusVisual.Icon className="h-3.5 w-3.5" />
          <span className="font-barlow text-[9px] font-bold uppercase">{statusVisual.label}</span>
        </span>
      ) : null}
      {!isGM ? (
        <StageFactionPlayerNotesButton
          campaignId={campaignId}
          factionId={String(faction.id)}
          factionName={faction.name}
        />
      ) : null}
      {isGM ? (
        <button
          type="button"
          aria-label={`${faction.name} von der Bühne entfernen`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(String(faction.id));
          }}
          className="absolute right-2 top-2 z-30 grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 shadow-lg backdrop-blur transition-colors hover:bg-red-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </motion.div>
  );
}
