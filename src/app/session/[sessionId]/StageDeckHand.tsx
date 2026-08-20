"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Flag, Layers } from "lucide-react";
import { StageSceneDeckMiniCard, type StageSceneMediaItem } from "@/src/components/session/StageSceneCard";

type HandNpc = {
  id: string;
  name: string;
  title: string | null;
  image_url: string | null;
};

type HandFaction = {
  id: string;
  name: string;
  type: string | null;
  image_url: string | null;
};

type DeckEntry =
  | { kind: "npc"; item: HandNpc; stackIndex: number }
  | { kind: "faction"; item: HandFaction; stackIndex: number }
  | { kind: "scene"; item: StageSceneMediaItem; stackIndex: number };

type Props = {
  open: boolean;
  onToggle: () => void;
  npcs: HandNpc[];
  factions: HandFaction[];
  scenes?: StageSceneMediaItem[];
  onPlace: (kind: "npc" | "faction" | "scene", id: string) => void;
};

export function StageDeckHand({
  open,
  onToggle,
  npcs,
  factions,
  scenes = [],
  onPlace,
}: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-th-stage-deck-hand", "true");
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--th-hand-dock-h", open ? "16rem" : "4.75rem");
    return () => {
      root.style.removeProperty("--th-hand-dock-h");
    };
  }, [open]);

  const entries: DeckEntry[] = useMemo(() => {
    const n = npcs.map((item, stackIndex) => ({
      kind: "npc" as const,
      item,
      stackIndex,
    }));
    const base = n.length;
    const f = factions.map((item, i) => ({
      kind: "faction" as const,
      item,
      stackIndex: base + i,
    }));
    const base2 = base + f.length;
    const s = scenes.map((item, i) => ({
      kind: "scene" as const,
      item,
      stackIndex: base2 + i,
    }));
    return [...n, ...f, ...s];
  }, [npcs, factions, scenes]);

  if (entries.length === 0 || !host) return null;

  const tray = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex flex-col-reverse pl-11 pr-11">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="pointer-events-auto flex w-full items-center gap-3 border-t-2 border-accent-gold bg-[#132e1b] px-4 py-2.5 text-left shadow-[0_-12px_28px_rgba(0,0,0,0.55)]"
      >
        <Layers className="h-5 w-5 shrink-0 text-accent-gold" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
            {open ? "Hand ausblenden" : "Hand einblenden"}
          </span>
          <span className="block font-libre text-[11px] text-gray-400">
            {entries.length} Karte{entries.length === 1 ? "" : "n"} aus der Vorbereitung · ziehen oder doppelklicken
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-accent-gold" />
        ) : (
          <ChevronUp className="h-5 w-5 shrink-0 text-accent-gold" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="stage-deck-hand"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto border-t border-accent-gold/40 bg-background-card/95 px-3 py-3"
          >
            <div className="flex min-h-[120px] items-end overflow-x-auto overflow-y-visible pb-2 pl-3 pr-2 pt-5">
              {entries.map((entry) =>
                entry.kind === "scene" ? (
                  <StageSceneDeckMiniCard
                    key={`scene-${entry.item.id}`}
                    scene={entry.item}
                    stackIndex={entry.stackIndex}
                    onPlace={(id: string) => onPlace("scene", id)}
                  />
                ) : (
                  <DeckMiniCard
                    key={`${entry.kind}-${entry.item.id}`}
                    entry={entry}
                    onPlace={onPlace}
                  />
                ),
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  return createPortal(tray, host);
}

function DeckMiniCard({
  entry,
  onPlace,
}: {
  entry: Extract<DeckEntry, { kind: "npc" | "faction" }>;
  onPlace: (kind: "npc" | "faction" | "scene", id: string) => void;
}) {
  const { kind, item, stackIndex } = entry;
  const isFaction = kind === "faction";
  const tooltip = isFaction
    ? [item.name, item.type].filter(Boolean).join(" — ")
    : [item.name, item.title].filter(Boolean).join(" — ");

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ kind, id: item.id }),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => onPlace(kind, item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlace(kind, item.id);
        }
      }}
      aria-label={tooltip}
      className={[
        "relative h-[104px] w-[76px] shrink-0 cursor-grab select-none overflow-hidden rounded-md border-2 bg-background-dark shadow-md transition-transform duration-200 active:cursor-grabbing",
        "hover:z-[60] hover:-translate-y-3 hover:scale-105",
        isFaction
          ? "border-amber-700/60 hover:border-amber-500/80"
          : "border-hero-border/50 hover:border-hero-vibrant/80",
      ].join(" ")}
      style={{
        marginLeft: stackIndex === 0 ? 0 : -36,
        zIndex: stackIndex,
      }}
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center ${
            isFaction ? "bg-amber-950/50" : "bg-hero-dark/40"
          }`}
        >
          {isFaction ? (
            <Flag className="h-8 w-8 text-accent-gold/90" />
          ) : (
            <span className="font-cinzel text-2xl text-accent-gold">
              {item.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
