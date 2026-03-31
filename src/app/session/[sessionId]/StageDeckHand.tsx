"use client";

import { useMemo } from "react";
import { Flag } from "lucide-react";

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
  | { kind: "faction"; item: HandFaction; stackIndex: number };

type Props = {
  npcs: HandNpc[];
  factions: HandFaction[];
  onPlace: (kind: "npc" | "faction", id: string) => void;
};

export function StageDeckHand({ npcs, factions, onPlace }: Props) {
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
    return [...n, ...f];
  }, [npcs, factions]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card/90 px-3 py-3 shadow-lg">
      <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Deck — Karten überlappen; mit der Maus anheben, auf die Bühne ziehen oder doppelklicken
      </p>
      <div className="flex min-h-[132px] items-end overflow-x-auto overflow-y-visible pb-2 pl-3 pr-2 pt-5">
        {entries.map((entry) => (
          <DeckMiniCard key={`${entry.kind}-${entry.item.id}`} entry={entry} onPlace={onPlace} />
        ))}
      </div>
    </div>
  );
}

function DeckMiniCard({
  entry,
  onPlace,
}: {
  entry: DeckEntry;
  onPlace: (kind: "npc" | "faction", id: string) => void;
}) {
  const { kind, item, stackIndex } = entry;
  const isFaction = kind === "faction";

  return (
    <div
      role="button"
      tabIndex={0}
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
      className={[
        "relative h-[104px] w-[76px] shrink-0 cursor-grab select-none rounded-md border-2 bg-background-dark/95 shadow-md transition-transform duration-200 active:cursor-grabbing",
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
      <div className="flex h-full flex-col overflow-hidden rounded-[4px]">
        <div
          className={`relative h-[52px] w-full shrink-0 overflow-hidden ${
            isFaction ? "bg-amber-950/50" : "bg-hero-dark/40"
          }`}
        >
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {isFaction ? (
                <Flag className="h-7 w-7 text-accent-gold/90" />
              ) : (
                <span className="font-cinzel text-xl text-accent-gold">
                  {item.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center px-1.5 py-1">
          <p className="line-clamp-2 text-center font-barlow text-[10px] font-bold uppercase leading-tight text-gray-100">
            {item.name}
          </p>
          {(isFaction ? item.type : item.title) ? (
            <p className="mt-0.5 line-clamp-1 text-center font-libre text-[8px] text-gray-500">
              {isFaction ? item.type : item.title}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
