"use client";

import { useMemo } from "react";
import { Eye, Flag, Skull } from "lucide-react";
import type { BattlemapTokenSide } from "@/src/lib/session/battlemap-types";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";

type TrayNpc = {
  id: string;
  name: string;
  title: string | null;
  image_url: string | null;
};

type TrayCreature = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
};

type TokenEntry =
  | { kind: "npc"; item: TrayNpc; stackIndex: number }
  | { kind: "creature"; item: TrayCreature; stackIndex: number };

type PropEntry =
  | { kind: "npc_card"; item: TrayNpc; stackIndex: number }
  | { kind: "scene_image"; item: StageSceneMediaItem; stackIndex: number };

type Props = {
  npcs: TrayNpc[];
  creatures: TrayCreature[];
  scenes: StageSceneMediaItem[];
  onStartTokenPlacement: (draft: {
    kind: "npc" | "creature";
    refId: string;
    name: string;
    imageUrl: string | null;
    tokenSide: BattlemapTokenSide;
    sizeCells: number;
    isVisibleToPlayers: boolean;
  }) => void;
  onStartPropDrag: (draft: {
    kind: "npc_card" | "scene_image";
    npcId?: string;
    sceneMediaId?: string;
    imageUrl: string | null;
    label: string;
    width: number;
    height: number;
  }) => void;
};

export function BattlemapTokenTray({
  npcs,
  creatures,
  scenes,
  onStartTokenPlacement,
  onStartPropDrag,
}: Props) {
  const tokenEntries: TokenEntry[] = useMemo(() => {
    const n = npcs.map((item, stackIndex) => ({ kind: "npc" as const, item, stackIndex }));
    const base = n.length;
    const c = creatures.map((item, i) => ({
      kind: "creature" as const,
      item,
      stackIndex: base + i,
    }));
    return [...n, ...c];
  }, [npcs, creatures]);

  const propEntries: PropEntry[] = useMemo(() => {
    const n = npcs.map((item, stackIndex) => ({
      kind: "npc_card" as const,
      item,
      stackIndex,
    }));
    const base = n.length;
    const s = scenes.map((item, i) => ({
      kind: "scene_image" as const,
      item,
      stackIndex: base + i,
    }));
    return [...n, ...s];
  }, [npcs, scenes]);

  if (tokenEntries.length === 0 && propEntries.length === 0) return null;

  return (
    <div className="pointer-events-auto rounded-lg border border-hero-dark bg-background-card/95 px-3 py-3 shadow-lg backdrop-blur-md">
      {tokenEntries.length > 0 ? (
        <>
          <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            SL-Token — NSC &amp; Kreaturen (Klick = platzieren)
          </p>
          <div className="mb-3 flex min-h-[100px] items-end overflow-x-auto overflow-y-visible pb-2 pl-3 pr-2 pt-4">
            {tokenEntries.map((entry) => (
              <TokenMiniCard
                key={`token-${entry.kind}-${entry.item.id}`}
                entry={entry}
                onStartTokenPlacement={onStartTokenPlacement}
              />
            ))}
          </div>
        </>
      ) : null}

      {propEntries.length > 0 ? (
        <>
          <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Tisch-Props — Karten &amp; Szenen (ziehen auf Map)
          </p>
          <div className="flex min-h-[88px] items-end overflow-x-auto overflow-y-visible pb-2 pl-3 pr-2 pt-4">
            {propEntries.map((entry) => (
              <PropMiniCard
                key={`prop-${entry.kind}-${entry.item.id}`}
                entry={entry}
                onStartPropDrag={onStartPropDrag}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TokenMiniCard({
  entry,
  onStartTokenPlacement,
}: {
  entry: TokenEntry;
  onStartTokenPlacement: Props["onStartTokenPlacement"];
}) {
  const { kind, item, stackIndex } = entry;
  const isCreature = kind === "creature";
  const tooltip = isCreature
    ? [item.name, (item as TrayCreature).creature_type].filter(Boolean).join(" — ")
    : [item.name, (item as TrayNpc).title].filter(Boolean).join(" — ");

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      onClick={() =>
        onStartTokenPlacement({
          kind,
          refId: item.id,
          name: item.name,
          imageUrl: item.image_url,
          tokenSide: isCreature ? "hostile" : "neutral",
          sizeCells: isCreature ? 2 : 1,
          isVisibleToPlayers: true,
        })
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartTokenPlacement({
            kind,
            refId: item.id,
            name: item.name,
            imageUrl: item.image_url,
            tokenSide: isCreature ? "hostile" : "neutral",
            sizeCells: isCreature ? 2 : 1,
            isVisibleToPlayers: true,
          });
        }
      }}
      aria-label={tooltip}
      className={[
        "relative h-[88px] w-[64px] shrink-0 cursor-pointer select-none rounded-md border-2 bg-background-dark shadow-md transition-transform duration-200 overflow-hidden",
        "hover:z-[60] hover:-translate-y-2 hover:scale-105",
        isCreature
          ? "border-red-800/60 hover:border-red-500/80"
          : "border-hero-border/50 hover:border-hero-vibrant/80",
      ].join(" ")}
      style={{
        marginLeft: stackIndex === 0 ? 0 : -28,
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
            isCreature ? "bg-red-950/50" : "bg-hero-dark/40"
          }`}
        >
          {isCreature ? (
            <Skull className="h-7 w-7 text-red-400/90" />
          ) : (
            <span className="font-cinzel text-xl text-accent-gold">
              {item.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      )}
      <span className="absolute bottom-0 inset-x-0 truncate bg-black/70 px-1 py-0.5 text-center font-barlow text-[8px] font-bold uppercase text-white">
        {isCreature ? "Kreatur" : "NSC"}
      </span>
    </div>
  );
}

function PropMiniCard({
  entry,
  onStartPropDrag,
}: {
  entry: PropEntry;
  onStartPropDrag: Props["onStartPropDrag"];
}) {
  const isScene = entry.kind === "scene_image";
  const item = entry.item;
  const label = isScene ? (item as StageSceneMediaItem).title : (item as TrayNpc).name;
  const imageUrl = isScene
    ? (item as StageSceneMediaItem).image_url
    : (item as TrayNpc).image_url;

  const payload = isScene
    ? {
        kind: "scene_image" as const,
        sceneMediaId: item.id,
        imageUrl,
        label,
        width: 0.22,
        height: 0.14,
      }
    : {
        kind: "npc_card" as const,
        npcId: item.id,
        imageUrl,
        label,
        width: 0.12,
        height: 0.18,
      };

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${label} — auf Map ziehen`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-battlemap-prop",
          JSON.stringify(payload),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => onStartPropDrag(payload)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartPropDrag(payload);
        }
      }}
      aria-label={label}
      className={[
        "relative h-[72px] w-[52px] shrink-0 cursor-grab select-none rounded border-2 bg-background-dark shadow-md transition-transform duration-200 overflow-hidden",
        "hover:z-[60] hover:-translate-y-2 hover:scale-105 active:cursor-grabbing",
        isScene
          ? "border-accent-gold/50 hover:border-accent-gold/80"
          : "border-hero-border/50 hover:border-hero-vibrant/80",
      ].join(" ")}
      style={{
        marginLeft: entry.stackIndex === 0 ? 0 : -24,
        zIndex: entry.stackIndex + 100,
      }}
    >
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-hero-dark/40">
          {isScene ? (
            <Eye className="h-6 w-6 text-accent-gold/80" />
          ) : (
            <Flag className="h-6 w-6 text-accent-gold/80" />
          )}
        </div>
      )}
      <span className="absolute bottom-0 inset-x-0 truncate bg-black/70 px-0.5 py-0.5 text-center font-barlow text-[7px] font-bold uppercase text-white">
        {isScene ? "Szene" : "Karte"}
      </span>
    </div>
  );
}
