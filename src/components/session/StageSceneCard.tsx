"use client";

import { motion } from "framer-motion";
import { ImageIcon, X } from "lucide-react";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";

export type StageSceneMediaItem = {
  id: string;
  title: string;
  image_url: string;
  category: string;
  player_notes?: string | null;
  image_is_ai_generated?: boolean;
};

type Props = {
  scene: StageSceneMediaItem;
  isGM: boolean;
  onPortrait: (payload: { name: string; subtitle: string | null; imageUrl: string }) => void;
  onRemove?: () => void;
};

export function StageSceneCard({ scene, isGM, onPortrait, onRemove }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 1.2, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="relative mx-auto w-full max-w-md"
    >
      <button
        type="button"
        onClick={() =>
          onPortrait({
            name: scene.title,
            subtitle: scene.category,
            imageUrl: scene.image_url,
          })
        }
        className="group relative block w-full overflow-hidden rounded-xl border-2 border-accent-gold/50 bg-black/50 shadow-2xl cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.image_url}
          alt={scene.title}
          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-3 text-left">
          <p className="font-cinzel text-sm font-bold text-white">{scene.title}</p>
          <p className="font-barlow text-[10px] uppercase tracking-wide text-accent-gold/90">
            {scene.category}
          </p>
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-barlow text-[10px] uppercase text-gray-200">
          Szene
        </span>
      </button>
      {scene.image_is_ai_generated ? (
        <NpcPortraitAttribution isAiGenerated className="mt-1" />
      ) : null}
      {scene.player_notes?.trim() ? (
        <p className="mt-2 rounded border border-hero-border/40 bg-black/40 px-3 py-2 font-libre text-xs text-gray-300">
          {scene.player_notes}
        </p>
      ) : null}
      {isGM && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-hero-border bg-background-dark p-1.5 text-gray-400 hover:border-red-500 hover:text-red-400"
          aria-label="Szene von der Bühne nehmen"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </motion.div>
  );
}

export function StageSceneDeckMiniCard({
  scene,
  stackIndex,
  onPlace,
}: {
  scene: StageSceneMediaItem;
  stackIndex: number;
  onPlace: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={scene.title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ kind: "scene", id: scene.id }),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => onPlace(scene.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlace(scene.id);
        }
      }}
      aria-label={scene.title}
      className="relative h-[76px] w-[110px] shrink-0 cursor-grab select-none overflow-hidden rounded-md border-2 border-accent-gold/40 bg-background-dark shadow-md transition-transform duration-200 hover:z-[60] hover:-translate-y-3 hover:scale-105 active:cursor-grabbing"
      style={{
        marginLeft: stackIndex === 0 ? 0 : -40,
        zIndex: stackIndex,
      }}
    >
      {scene.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={scene.image_url} alt="" className="h-full w-full object-cover pointer-events-none" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-hero-dark/40">
          <ImageIcon className="h-6 w-6 text-accent-gold/70" />
        </div>
      )}
    </div>
  );
}
