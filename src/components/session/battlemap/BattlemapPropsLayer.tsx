"use client";

import Image from "next/image";
import type { SessionBattlemapProp } from "@/src/lib/session/battlemap-types";

type Props = {
  props: SessionBattlemapProp[];
  mapWidth: number;
  mapHeight: number;
  isGm: boolean;
  selectedPropId?: string | null;
  onSelectProp?: (propId: string | null) => void;
};

export function BattlemapPropsLayer({
  props,
  mapWidth,
  mapHeight,
  isGm,
  selectedPropId,
  onSelectProp,
}: Props) {
  return (
    <>
      {props.map((prop) => {
        const left = prop.pos_x * mapWidth;
        const top = prop.pos_y * mapHeight;
        const width = prop.width * mapWidth;
        const height = prop.height * mapHeight;
        const isSelected = selectedPropId === prop.id;
        const hiddenFromPlayers = !prop.is_visible_to_players;

        return (
          <div
            key={prop.id}
            className={`absolute overflow-hidden rounded-md shadow-xl ${
              isGm && onSelectProp ? "cursor-pointer" : "pointer-events-none"
            } ${hiddenFromPlayers && isGm ? "opacity-50 ring-2 ring-dashed ring-accent-gold/70" : ""} ${
              isSelected ? "ring-[3px] ring-accent-gold border-2 border-accent-gold" : "border border-hero-border/40"
            }`}
            style={{
              left,
              top,
              width,
              height,
              transform: prop.rotation ? `rotate(${prop.rotation}deg)` : undefined,
              zIndex: 10 + prop.z_index,
            }}
            onClick={
              isGm && onSelectProp
                ? (e) => {
                    e.stopPropagation();
                    onSelectProp(isSelected ? null : prop.id);
                  }
                : undefined
            }
            title={prop.kind === "npc_card" ? "NSC-Karte" : "Szenen-Bild"}
          >
            {prop.image_url ? (
              <Image
                src={prop.image_url}
                alt=""
                fill
                unoptimized
                className="object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-background-card/80">
                <span className="font-barlow text-xs uppercase text-gray-400">
                  {prop.kind === "npc_card" ? "NSC" : "Szene"}
                </span>
              </div>
            )}
            {hiddenFromPlayers && isGm ? (
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase text-accent-gold">
                Versteckt
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
