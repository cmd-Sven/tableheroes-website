"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Gift,
  MapPin,
  Shield,
  ShieldAlert,
  Sparkles,
  Skull,
  X,
  Zap,
} from "lucide-react";
import { resolveBestariumImageUrl } from "@/src/lib/bestarium-image";
import {
  BEAST_DISCOVERY_LABELS,
  type BeastDiscoveryKey,
  type BeastDiscoveries,
} from "@/src/lib/beast-check-results";
import type { CampaignCreatureStateRow } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";

export type StageCreature = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
  physical_description: string | null;
};

type StagePortraitModal = {
  name: string;
  subtitle: string | null;
  imageUrl: string;
};

const DISCOVERY_ICON: Record<
  BeastDiscoveryKey,
  { Icon: typeof Shield; className: string }
> = {
  category: { Icon: BookOpen, className: "text-gray-200" },
  weaknesses: { Icon: ShieldAlert, className: "text-red-400" },
  immunities: { Icon: Shield, className: "text-sky-400" },
  special: { Icon: Zap, className: "text-emerald-400" },
  loot: { Icon: Gift, className: "text-amber-300" },
  habitat: { Icon: MapPin, className: "text-violet-300" },
};

type Props = {
  creature: StageCreature;
  isSingle: boolean;
  isGM: boolean;
  isUpdating: boolean;
  discoveries: BeastDiscoveries;
  creatureState?: CampaignCreatureStateRow | null;
  onPortrait: (portrait: StagePortraitModal) => void;
  onRemove: (creatureId: string) => void;
  onToggleDiscovery?: (key: BeastDiscoveryKey, value: boolean) => void;
  onMarkDefeated?: () => void;
  onSuggestLoot?: () => void;
};

export function StageBeastCard({
  creature,
  isSingle,
  isGM,
  isUpdating,
  discoveries,
  creatureState,
  onPortrait,
  onRemove,
  onToggleDiscovery,
  onMarkDefeated,
  onSuggestLoot,
}: Props) {
  const img = resolveBestariumImageUrl(creature.image_url);
  const visibleKeys = (Object.keys(BEAST_DISCOVERY_LABELS) as BeastDiscoveryKey[]).filter(
    (k) => discoveries[k] === true,
  );
  const isDefeated = creatureState?.is_defeated === true;

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(48vh,380px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${creature.image_url ? "cursor-zoom-in" : "cursor-default"} ${
        isDefeated ? "opacity-60 grayscale" : ""
      }`}
      initial={{ opacity: 0, scale: 1.5, y: 200, rotateZ: -15 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateZ: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -50, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1 }}
    >
      <div
        className={`relative h-full overflow-hidden rounded-lg border-2 bg-background-dark shadow-2xl ${
          isDefeated
            ? "border-gray-600"
            : "border-emerald-900/70 hover:border-emerald-500/80"
        }`}
      >
        <button
          type="button"
          title={creature.name}
          aria-label={`Kreatur: ${creature.name}`}
          onClick={() => {
            if (creature.image_url) {
              onPortrait({
                name: creature.name,
                subtitle: creature.creature_type,
                imageUrl: img,
              });
            }
          }}
          className="absolute inset-0 h-full w-full focus:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt=""
            className="pointer-events-none h-full w-full object-cover object-top"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
          <p className="font-cinzel text-lg text-white drop-shadow-md">{creature.name}</p>
          {creature.creature_type ? (
            <p className="font-libre text-[11px] text-gray-300 capitalize">{creature.creature_type}</p>
          ) : null}
        </div>

        {visibleKeys.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1 max-w-[85%]">
            {visibleKeys.map((key) => {
              const { Icon, className } = DISCOVERY_ICON[key];
              return (
                <span
                  key={key}
                  title={BEAST_DISCOVERY_LABELS[key]}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/65 p-1.5 shadow-lg"
                >
                  <Icon className={`h-3.5 w-3.5 ${className}`} />
                </span>
              );
            })}
          </div>
        )}

        {isDefeated && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-gray-500 bg-black/70 p-1.5">
            <Skull className="h-4 w-4 text-gray-400" />
          </div>
        )}

        {isGM && (
          <div className="absolute inset-x-0 top-0 flex flex-wrap justify-end gap-1 p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {onMarkDefeated && !isDefeated ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDefeated();
                }}
                className="rounded border border-gray-500/60 bg-black/80 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-gray-200 hover:border-red-500"
                title="Als besiegt markieren"
              >
                Besiegt
              </button>
            ) : null}
            {onSuggestLoot && isDefeated ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation();
                  onSuggestLoot();
                }}
                className="inline-flex items-center gap-1 rounded border border-amber-600/60 bg-black/80 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-amber-200 hover:border-amber-400"
              >
                <Gift className="h-3 w-3" />
                Loot
              </button>
            ) : null}
            <button
              type="button"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(creature.id);
              }}
              className="rounded border border-red-900/60 bg-black/80 p-1 text-red-300 hover:text-white"
              aria-label="Von Bühne nehmen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isGM && onToggleDiscovery && (
          <details className="absolute bottom-14 left-2 right-2 z-10 rounded border border-hero-border/40 bg-black/85 text-left shadow-xl open:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <summary className="cursor-pointer px-2 py-1.5 font-barlow text-[9px] font-bold uppercase text-accent-gold list-none flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Analyse freischalten
            </summary>
            <div className="border-t border-hero-border/30 px-2 py-2 space-y-1 max-h-32 overflow-y-auto">
              {(Object.keys(BEAST_DISCOVERY_LABELS) as BeastDiscoveryKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 font-libre text-[10px] text-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={discoveries[key] === true}
                    onChange={(e) => onToggleDiscovery(key, e.target.checked)}
                    className="rounded"
                  />
                  {BEAST_DISCOVERY_LABELS[key]}
                </label>
              ))}
            </div>
          </details>
        )}
      </div>
    </motion.div>
  );
}
