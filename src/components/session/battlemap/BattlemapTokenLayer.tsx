"use client";

import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import { CHARACTER_CONDITION_DEFINITIONS } from "@/src/lib/characters/condition-tokens";
import type { BattlemapGridConfig, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

const SIDE_BORDER: Record<string, string> = {
  party: "border-hero-vibrant/80",
  friendly: "border-sky-400/80",
  neutral: "border-amber-500/80",
  hostile: "border-red-600/90",
};

export type TokenHpInfo = {
  current: number;
  max: number;
};

function conditionLabelDe(key: CharacterConditionKey): string {
  const def = CHARACTER_CONDITION_DEFINITIONS.find((d) => d.key === key);
  return (def?.labelDe ?? key).toLowerCase();
}

/** z. B. „Grimmisch ist bezaubert, vergiftet.“ */
export function formatTokenConditionTooltip(
  characterName: string,
  conditions: CharacterConditionKey[],
): string | null {
  if (conditions.length === 0) return null;
  const name = characterName.trim() || "Charakter";
  const labels = conditions.map(conditionLabelDe);
  return `${name} ist ${labels.join(", ")}.`;
}

type Props = {
  tokens: SessionBattlemapToken[];
  config: BattlemapGridConfig;
  highlightCharacterId?: string | null;
  isGm?: boolean;
  selectedTokenId?: string | null;
  /** characterId / npcId → HP für Balken */
  hpByRef?: Record<string, TokenHpInfo>;
  /** Eigener Charakter darf eigenes Token-Menü öffnen */
  ownCharacterId?: string | null;
  /** characterId → aktuelle Anzeige-URL (Gemüt / SL-Zustand) */
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  /** characterId → aktive SL-Zustände */
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  onSelectToken?: (tokenId: string | null) => void;
  onTokenContextMenu?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
};

export function BattlemapTokenLayer({
  tokens,
  config,
  highlightCharacterId,
  isGm = false,
  selectedTokenId,
  hpByRef,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  onSelectToken,
  onTokenContextMenu,
}: Props) {
  return (
    <>
      {tokens.map((token) => {
        const { x, y, size } = gridToPixel(token.grid_x, token.grid_y, config);
        const pxSize = size * token.size_cells;
        const isHighlight = highlightCharacterId && token.character_id === highlightCharacterId;
        const isSelected = selectedTokenId === token.id;
        const isOwnCharacter =
          Boolean(ownCharacterId) && token.character_id === ownCharacterId;
        const canOpenMenu = isGm || isOwnCharacter;
        const hiddenFromPlayers = !token.is_visible_to_players;
        const borderClass =
          SIDE_BORDER[token.token_side] ?? "border-hero-vibrant/80";

        const hpKey = token.character_id
          ? `char:${token.character_id}`
          : token.npc_id
            ? `npc:${token.npc_id}`
            : null;
        const hp = hpKey && hpByRef ? hpByRef[hpKey] : null;
        const showHp = token.show_hp_bar === true && hp && hp.max > 0;
        const hpPct = showHp ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0;

        const liveDisplay =
          token.character_id && characterDisplayUrlById
            ? characterDisplayUrlById[token.character_id]?.trim() || null
            : null;
        const imageUrl = liveDisplay || token.image_url;

        const conditions =
          token.character_id && characterConditionsById
            ? (characterConditionsById[token.character_id] ?? [])
            : [];
        const conditionTooltip = formatTokenConditionTooltip(
          token.label ?? "Charakter",
          conditions,
        );
        const title = conditionTooltip ?? token.label ?? undefined;

        return (
          <div
            key={token.id}
            role={canOpenMenu ? "button" : undefined}
            tabIndex={canOpenMenu ? 0 : undefined}
            className={`absolute ${
              isSelected ? "z-[50]" : "z-[20]"
            } ${canOpenMenu ? "cursor-pointer hover:brightness-110" : ""}`}
            style={{
              left: x,
              top: y,
              width: pxSize,
              height: pxSize,
            }}
            title={title}
            onClick={
              canOpenMenu && (onSelectToken || onTokenContextMenu)
                ? (e) => {
                    e.stopPropagation();
                    if (token.character_id && onTokenContextMenu) {
                      onTokenContextMenu(token, e.clientX, e.clientY);
                      return;
                    }
                    onSelectToken?.(isSelected ? null : token.id);
                  }
                : undefined
            }
            onContextMenu={
              canOpenMenu && onTokenContextMenu
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTokenContextMenu(token, e.clientX, e.clientY);
                  }
                : undefined
            }
            onKeyDown={
              canOpenMenu
                ? (e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    if (token.character_id && onTokenContextMenu) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      onTokenContextMenu(
                        token,
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2,
                      );
                      return;
                    }
                    onSelectToken?.(isSelected ? null : token.id);
                  }
                : undefined
            }
          >
            {showHp ? (
              <div
                className="pointer-events-none absolute left-1/2 z-[25] w-[85%] -translate-x-1/2"
                style={{ top: -6, height: 4 }}
                aria-hidden
              >
                <div className="h-full overflow-hidden rounded-full border border-black/50 bg-black/75 shadow-sm">
                  <div
                    className={`h-full rounded-full ${
                      hpPct > 50 ? "bg-hero-vibrant" : hpPct > 25 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div
              className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 shadow-lg ${
                isHighlight ? "border-accent-gold ring-2 ring-accent-gold/60" : borderClass
              } ${hiddenFromPlayers && isGm ? "opacity-45 ring-2 ring-dashed ring-accent-gold/60" : ""} ${
                isSelected ? "ring-2 ring-accent-gold" : ""
              }`}
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
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

            {conditions.length > 0 ? (
              <span
                className="pointer-events-none absolute -right-0.5 -top-0.5 z-[30] flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-accent-gold/80 bg-background-dark/95 px-1 shadow-md"
                aria-label={conditionTooltip ?? undefined}
              >
                <ShieldAlert className="h-2.5 w-2.5 shrink-0 text-accent-gold" />
                <span className="font-barlow text-[9px] font-bold tabular-nums leading-none text-accent-gold">
                  {conditions.length}
                </span>
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
