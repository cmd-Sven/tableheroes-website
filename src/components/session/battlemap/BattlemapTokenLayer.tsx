"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import { CHARACTER_CONDITION_DEFINITIONS } from "@/src/lib/characters/condition-tokens";
import type { ActiveCombatTurnHighlight } from "@/src/lib/combat-initiative";
import type { BattlemapGridConfig, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

const TOKEN_DRAG_THRESHOLD_PX = 7;
const TOKEN_MOVE_MIN_MS = 280;
const TOKEN_MOVE_MAX_MS = 1400;
const TOKEN_MOVE_MS_PER_CELL = 220;

function moveDurationForCells(cellDist: number): number {
  if (cellDist <= 0) return TOKEN_MOVE_MIN_MS;
  return Math.min(
    TOKEN_MOVE_MAX_MS,
    Math.max(TOKEN_MOVE_MIN_MS, cellDist * TOKEN_MOVE_MS_PER_CELL),
  );
}

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

/** z. B. „Grimmisch ist bezaubert, vergiftet." */
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
  /** Aktiver Initiative-Zug — Token visuell hervorheben */
  activeTurnHighlight?: ActiveCombatTurnHighlight | null;
  isGm?: boolean;
  selectedTokenId?: string | null;
  hpByRef?: Record<string, TokenHpInfo>;
  ownCharacterId?: string | null;
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  onSelectToken?: (tokenId: string | null) => void;
  onTokenContextMenu?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  canDragToken?: (token: SessionBattlemapToken) => boolean;
  onTokenDragPreview?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  onTokenDragEnd?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  onTokenDragCancel?: () => void;
};

export const BattlemapTokenLayer = memo(function BattlemapTokenLayer({
  tokens,
  config,
  highlightCharacterId,
  activeTurnHighlight,
  isGm = false,
  selectedTokenId,
  hpByRef,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  onSelectToken,
  onTokenContextMenu,
  canDragToken,
  onTokenDragPreview,
  onTokenDragEnd,
  onTokenDragCancel,
}: Props) {
  const dragRef = useRef<{
    token: SessionBattlemapToken;
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);

  return (
    <>
      {tokens.map((token) => (
        <AnimatedToken
          key={token.id}
          token={token}
          config={config}
          highlightCharacterId={highlightCharacterId}
          activeTurnHighlight={activeTurnHighlight}
          isGm={isGm}
          selectedTokenId={selectedTokenId}
          hpByRef={hpByRef}
          ownCharacterId={ownCharacterId}
          characterDisplayUrlById={characterDisplayUrlById}
          characterConditionsById={characterConditionsById}
          onSelectToken={onSelectToken}
          onTokenContextMenu={onTokenContextMenu}
          canDrag={Boolean(canDragToken?.(token))}
          dragRef={dragRef}
          onTokenDragPreview={onTokenDragPreview}
          onTokenDragEnd={onTokenDragEnd}
          onTokenDragCancel={onTokenDragCancel}
        />
      ))}
    </>
  );
});

type AnimatedTokenProps = {
  token: SessionBattlemapToken;
  config: BattlemapGridConfig;
  highlightCharacterId?: string | null;
  activeTurnHighlight?: ActiveCombatTurnHighlight | null;
  isGm: boolean;
  selectedTokenId?: string | null;
  hpByRef?: Record<string, TokenHpInfo>;
  ownCharacterId?: string | null;
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  onSelectToken?: (tokenId: string | null) => void;
  onTokenContextMenu?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  canDrag: boolean;
  dragRef: React.RefObject<{
    token: SessionBattlemapToken;
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>;
  onTokenDragPreview?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  onTokenDragEnd?: (token: SessionBattlemapToken, clientX: number, clientY: number) => void;
  onTokenDragCancel?: () => void;
};

const AnimatedToken = memo(function AnimatedToken({
  token,
  config,
  highlightCharacterId,
  activeTurnHighlight,
  isGm,
  selectedTokenId,
  hpByRef,
  ownCharacterId,
  characterDisplayUrlById,
  characterConditionsById,
  onSelectToken,
  onTokenContextMenu,
  canDrag,
  dragRef,
  onTokenDragPreview,
  onTokenDragEnd,
  onTokenDragCancel,
}: AnimatedTokenProps) {
  const { x, y, size } = gridToPixel(token.grid_x, token.grid_y, config);
  const pxSize = size * token.size_cells;

  const visualPosRef = useRef({ x, y });
  const prevGridRef = useRef({ gx: token.grid_x, gy: token.grid_y });
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visualPos, setVisualPos] = useState({ x, y });
  const [isAnimating, setIsAnimating] = useState(false);
  const [moveDurationMs, setMoveDurationMs] = useState(TOKEN_MOVE_MIN_MS);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const isDragging = isDraggingLocal;

  useEffect(() => {
    visualPosRef.current = { x, y };
    setVisualPos({ x, y });
    prevGridRef.current = { gx: token.grid_x, gy: token.grid_y };
    setIsAnimating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Token-Wechsel hart synchronisieren
  }, [token.id]);

  useEffect(() => {
    if (isDragging) return;

    const current = visualPosRef.current;
    if (current.x === x && current.y === y) {
      prevGridRef.current = { gx: token.grid_x, gy: token.grid_y };
      return;
    }

    const cellDist = Math.max(
      Math.abs(token.grid_x - prevGridRef.current.gx),
      Math.abs(token.grid_y - prevGridRef.current.gy),
    );
    const duration = moveDurationForCells(cellDist);
    prevGridRef.current = { gx: token.grid_x, gy: token.grid_y };
    setMoveDurationMs(duration);
    setIsAnimating(true);

    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const next = { x, y };
        visualPosRef.current = next;
        setVisualPos(next);
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => {
          if (!cancelled) setIsAnimating(false);
          animTimerRef.current = null;
        }, duration);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    };
  }, [x, y, token.grid_x, token.grid_y, isDragging]);

  const isActiveTurn = Boolean(
    activeTurnHighlight &&
      ((activeTurnHighlight.characterId &&
        token.character_id === activeTurnHighlight.characterId) ||
        (activeTurnHighlight.npcId && token.npc_id === activeTurnHighlight.npcId) ||
        (activeTurnHighlight.tokenId && token.id === activeTurnHighlight.tokenId) ||
        (activeTurnHighlight.matchLabel &&
          token.label === activeTurnHighlight.matchLabel)),
  );
  const isHighlight =
    isActiveTurn ||
    Boolean(highlightCharacterId && token.character_id === highlightCharacterId);
  const isSelected = selectedTokenId === token.id;
  const isOwnCharacter = Boolean(ownCharacterId) && token.character_id === ownCharacterId;
  const canOpenMenu =
    (isGm || isOwnCharacter) && Boolean(onSelectToken || onTokenContextMenu);
  const pointerActive = canOpenMenu || canDrag;
  const hiddenFromPlayers = !token.is_visible_to_players;
  const borderClass = SIDE_BORDER[token.token_side] ?? "border-hero-vibrant/80";

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
      data-battlemap-token={token.id}
      role={pointerActive ? "button" : undefined}
      tabIndex={pointerActive ? 0 : undefined}
      className={`absolute touch-none ${
        isActiveTurn ? "z-[46]" : "z-[45]"
      } ${pointerActive ? "" : "pointer-events-none"} ${
        canDrag ? "cursor-grab active:cursor-grabbing" : canOpenMenu ? "cursor-pointer" : ""
      } ${canOpenMenu || canDrag ? "hover:brightness-110" : ""} ${
        isDragging ? "brightness-125 ring-2 ring-accent-gold/70 ring-offset-1 ring-offset-transparent" : ""
      }`}
      style={{
        left: visualPos.x,
        top: visualPos.y,
        width: pxSize,
        height: pxSize,
        transition: isAnimating && !isDragging
          ? `left ${moveDurationMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top ${moveDurationMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
          : "none",
      }}
      title={title}
      onPointerDown={
        pointerActive
          ? (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              dragRef.current = {
                token,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                dragged: false,
              };
              setIsDraggingLocal(false);
            }
          : undefined
      }
      onPointerMove={
        canDrag
          ? (e) => {
              const drag = dragRef.current;
              if (!drag || drag.token.id !== token.id) return;
              const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
              if (!drag.dragged && dist < TOKEN_DRAG_THRESHOLD_PX) return;
              if (!drag.dragged) {
                drag.dragged = true;
                setIsDraggingLocal(true);
              }
              onTokenDragPreview?.(token, e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerUp={
        pointerActive
          ? (e) => {
              const drag = dragRef.current;
              if (!drag || drag.token.id !== token.id) return;
              dragRef.current = null;
              setIsDraggingLocal(false);
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              if (drag.dragged) {
                onTokenDragEnd?.(token, e.clientX, e.clientY);
                return;
              }
              onTokenDragCancel?.();
              if (onTokenContextMenu) {
                onTokenContextMenu(token, e.clientX, e.clientY);
                return;
              }
              onSelectToken?.(isSelected ? null : token.id);
            }
          : undefined
      }
      onPointerCancel={
        pointerActive
          ? () => {
              dragRef.current = null;
              setIsDraggingLocal(false);
              onTokenDragCancel?.();
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

      {/* Token artwork stays static — no pulse/scale on the image */}
      <div
        className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 shadow-lg ${
          isActiveTurn
            ? "border-accent-gold"
            : isHighlight
              ? "border-accent-gold ring-2 ring-accent-gold/60"
              : borderClass
        } ${hiddenFromPlayers && isGm ? "opacity-45 ring-2 ring-dashed ring-accent-gold/60" : ""} ${
          isSelected && !isActiveTurn ? "ring-2 ring-accent-gold" : ""
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={token.label ?? "Token"}
            fill
            sizes="96px"
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

      {/* Active turn: only border/ring animates (opacity + transform), never the artwork */}
      {isActiveTurn ? (
        <>
          <motion.span
            className="pointer-events-none absolute -inset-1 z-[20] rounded-full border-2 border-accent-gold shadow-[0_0_14px_rgba(202,185,38,0.75)]"
            aria-hidden
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="pointer-events-none absolute -inset-[5px] z-[20] rounded-full border-2 border-dashed border-accent-gold/70"
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-[50] -translate-x-1/2 whitespace-nowrap rounded-full border border-accent-gold/80 bg-background-dark/95 px-2 py-0.5 font-barlow text-[9px] font-extrabold uppercase tracking-wide text-accent-gold shadow-lg">
            Am Zug
          </span>
        </>
      ) : null}

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
});
