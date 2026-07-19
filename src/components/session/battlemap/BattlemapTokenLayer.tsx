"use client";

import Image from "next/image";
import type { BattlemapGridConfig, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

type Props = {
  tokens: SessionBattlemapToken[];
  config: BattlemapGridConfig;
  highlightCharacterId?: string | null;
};

export function BattlemapTokenLayer({ tokens, config, highlightCharacterId }: Props) {
  return (
    <>
      {tokens.map((token) => {
        const { x, y, size } = gridToPixel(token.grid_x, token.grid_y, config);
        const pxSize = size * token.size_cells;
        const isHighlight = highlightCharacterId && token.character_id === highlightCharacterId;
        return (
          <div
            key={token.id}
            className={`absolute flex items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 shadow-lg ${
              isHighlight ? "border-accent-gold ring-2 ring-accent-gold/60" : "border-hero-vibrant/80"
            }`}
            style={{
              left: x,
              top: y,
              width: pxSize,
              height: pxSize,
            }}
            title={token.label ?? undefined}
          >
            {token.image_url ? (
              <Image
                src={token.image_url}
                alt={token.label ?? "Token"}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
                {(token.label ?? "?")[0]}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
