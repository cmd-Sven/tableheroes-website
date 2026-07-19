"use client";

import Image from "next/image";
import type { BattlemapGridConfig, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

const SIDE_BORDER: Record<string, string> = {
  party: "border-hero-vibrant/80",
  friendly: "border-sky-400/80",
  neutral: "border-amber-500/80",
  hostile: "border-red-600/90",
};

type Props = {
  tokens: SessionBattlemapToken[];
  config: BattlemapGridConfig;
  highlightCharacterId?: string | null;
  isGm?: boolean;
  selectedTokenId?: string | null;
  onSelectToken?: (tokenId: string | null) => void;
};

export function BattlemapTokenLayer({
  tokens,
  config,
  highlightCharacterId,
  isGm = false,
  selectedTokenId,
  onSelectToken,
}: Props) {
  return (
    <>
      {tokens.map((token) => {
        const { x, y, size } = gridToPixel(token.grid_x, token.grid_y, config);
        const pxSize = size * token.size_cells;
        const isHighlight = highlightCharacterId && token.character_id === highlightCharacterId;
        const isSelected = selectedTokenId === token.id;
        const isGmToken = !token.character_id;
        const hiddenFromPlayers = !token.is_visible_to_players;
        const borderClass =
          SIDE_BORDER[token.token_side] ?? "border-hero-vibrant/80";

        return (
          <div
            key={token.id}
            role={isGm && isGmToken && onSelectToken ? "button" : undefined}
            tabIndex={isGm && isGmToken && onSelectToken ? 0 : undefined}
            className={`absolute flex items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 shadow-lg ${
              isHighlight ? "border-accent-gold ring-2 ring-accent-gold/60" : borderClass
            } ${hiddenFromPlayers && isGm ? "opacity-45 ring-2 ring-dashed ring-accent-gold/60" : ""} ${
              isSelected ? "ring-2 ring-accent-gold z-[50]" : "z-[20]"
            } ${isGm && isGmToken ? "cursor-pointer hover:brightness-110" : ""}`}
            style={{
              left: x,
              top: y,
              width: pxSize,
              height: pxSize,
            }}
            title={token.label ?? undefined}
            onClick={
              isGm && isGmToken && onSelectToken
                ? (e) => {
                    e.stopPropagation();
                    onSelectToken(isSelected ? null : token.id);
                  }
                : undefined
            }
            onKeyDown={
              isGm && isGmToken && onSelectToken
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectToken(isSelected ? null : token.id);
                    }
                  }
                : undefined
            }
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
            {hiddenFromPlayers && isGm ? (
              <span className="absolute bottom-0 inset-x-0 bg-black/75 py-px text-center font-barlow text-[7px] font-bold uppercase text-accent-gold">
                Versteckt
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
