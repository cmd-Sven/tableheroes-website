"use client";

import { useMemo } from "react";
import { Flag } from "lucide-react";
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
  npcs: HandNpc[];
  factions: HandFaction[];
  scenes?: StageSceneMediaItem[];
  onPlace: (kind: "npc" | "faction" | "scene", id: string) => void;
};

export function StageDeckHand({ npcs, factions, scenes = [], onPlace }: Props) {
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

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card/90 px-3 py-3 shadow-lg">
      <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Deck — NSC, Fraktionen & Szenen. Ziehen oder doppelklicken.
      </p>
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
            <DeckMiniCard key={`${entry.kind}-${entry.item.id}`} entry={entry} onPlace={onPlace} />
          ),
        )}
      </div>
    </div>
  );
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
        "relative h-[104px] w-[76px] shrink-0 cursor-grab select-none rounded-md border-2 bg-background-dark shadow-md transition-transform duration-200 active:cursor-grabbing overflow-hidden",
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
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.image_url}
          alt=""
          className="h-full w-full object-cover pointer-events-none"
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
