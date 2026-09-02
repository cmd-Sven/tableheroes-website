/**
 * BattlemapContainerOverlayLayer — runde Behälter-Tokens auf der Battlemap.
 */
"use client";

import type { CSSProperties } from "react";
import {
  Barrel,
  Box,
  EyeOff,
  Lock,
  LockOpen,
  Package,
  Skull,
  Archive,
} from "lucide-react";
import type {
  BattlemapContainerType,
  BattlemapGridConfig,
  SessionBattlemapContainer,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import {
  CONTAINER_TYPE_LABELS,
  canPlayerInteractWithContainer,
  containerTrapDisarmPending,
  isContainerVisibleToPlayers,
} from "@/src/lib/session/battlemap-container-model";

const SELECTED_RING =
  "ring-[3px] ring-accent-gold border-2 border-accent-gold shadow-[0_0_0_1px_#cab926]";

type Props = {
  containers: SessionBattlemapContainer[];
  config: BattlemapGridConfig;
  isGm?: boolean;
  /** SL-Auswählen-Tool aktiv */
  interactive?: boolean;
  /** Spieler: eigener Token vorhanden → Interaktion möglich wenn benachbart */
  playerInteractActive?: boolean;
  ownCharacterGrid?: { x: number; y: number } | null;
  selectedContainerId?: string | null;
  onSelectContainer?: (containerId: string | null) => void;
  /** Klick öffnet Radial (Spieler benachbart / SL immer bei sichtbaren). */
  onContainerOpenMenu?: (
    container: SessionBattlemapContainer,
    clientX: number,
    clientY: number,
  ) => void;
};

function cellBox(
  gridX: number,
  gridY: number,
  config: BattlemapGridConfig,
): CSSProperties {
  const origin = gridToPixel(gridX, gridY, config);
  return {
    left: origin.x,
    top: origin.y,
    width: config.cellSizePx,
    height: config.cellSizePx,
  };
}

function ContainerGlyph({
  type,
  className,
}: {
  type: BattlemapContainerType;
  className?: string;
}) {
  switch (type) {
    case "barrel":
      return <Barrel className={className} />;
    case "crate":
      return <Package className={className} />;
    case "urn":
    case "sarcophagus":
      return <Archive className={className} />;
    case "chest":
    case "other":
    default:
      return <Box className={className} />;
  }
}

export function BattlemapContainerOverlayLayer({
  containers,
  config,
  isGm = false,
  interactive = false,
  playerInteractActive = false,
  ownCharacterGrid = null,
  selectedContainerId = null,
  onSelectContainer,
  onContainerOpenMenu,
}: Props) {
  const canGmSelect = Boolean(isGm && interactive);
  const visible = containers.filter((c) => {
    if (isGm) return true;
    return isContainerVisibleToPlayers(c);
  });

  if (visible.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 ${
        canGmSelect || playerInteractActive ? "z-[48]" : "z-[36]"
      } pointer-events-none`}
      aria-hidden={!(canGmSelect || playerInteractActive)}
    >
      {visible.map((container) => {
        const selected = selectedContainerId === container.id;
        const hasTrap = container.has_trap;
        const trapTriggered = container.is_trap_triggered;
        const trapDetected = container.is_trap_detected;
        const trapDisarmed = container.is_trap_disarmed;
        const hiddenUndiscovered =
          container.is_hidden && !container.is_discovered;
        const fill = trapTriggered
          ? "border-red-400/80 bg-red-950/85"
          : container.is_open
            ? "border-emerald-400/70 bg-emerald-950/80"
            : trapDetected && trapDisarmed
              ? "border-amber-300/60 bg-amber-950/75"
              : trapDetected
                ? "border-amber-300/70 bg-amber-950/80"
                : hiddenUndiscovered
                  ? "border-slate-600/50 bg-slate-950/60 opacity-55 border-dashed"
                  : "border-slate-400/55 bg-slate-900/80";

        const playerCanOpen =
          playerInteractActive &&
          !isGm &&
          ownCharacterGrid != null &&
          canPlayerInteractWithContainer(
            container,
            ownCharacterGrid.x,
            ownCharacterGrid.y,
          );

        const gmCanOpen = isGm && Boolean(onContainerOpenMenu);
        const clickable = playerCanOpen || gmCanOpen || canGmSelect;

        const typeLabel = CONTAINER_TYPE_LABELS[container.container_type] ?? "Behälter";
        const pending = containerTrapDisarmPending(container);

        return (
          <div key={container.id} className="contents">
            <div
              style={cellBox(container.grid_x, container.grid_y, config)}
              className={`absolute box-border flex items-center justify-center ${
                clickable ? "pointer-events-auto cursor-pointer" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (playerCanOpen && onContainerOpenMenu) {
                  onContainerOpenMenu(container, e.clientX, e.clientY);
                  return;
                }
                if (gmCanOpen && onContainerOpenMenu) {
                  onContainerOpenMenu(container, e.clientX, e.clientY);
                  if (canGmSelect) onSelectContainer?.(container.id);
                  return;
                }
                if (canGmSelect) onSelectContainer?.(container.id);
              }}
              title={`${typeLabel}: ${container.name}${
                hiddenUndiscovered ? " (versteckt)" : ""
              } · ${container.hp_current}/${container.hp_max} TP${
                pending ? " · Entschärfen…" : ""
              }`}
            >
              <div
                className={`relative grid h-[78%] w-[78%] place-items-center rounded-full border-2 shadow-md ${fill} ${
                  selected ? SELECTED_RING : ""
                }`}
              >
                {container.is_open ? (
                  <LockOpen className="h-[42%] w-[42%] text-emerald-300" />
                ) : container.is_locked ? (
                  <Lock className="absolute right-[8%] top-[8%] h-[28%] w-[28%] text-amber-300" />
                ) : null}
                <ContainerGlyph
                  type={container.container_type}
                  className={`h-[48%] w-[48%] ${
                    container.is_open
                      ? "text-emerald-200/90"
                      : trapTriggered
                        ? "text-red-200"
                        : "text-slate-100/90"
                  }`}
                />
                {isGm && hiddenUndiscovered ? (
                  <EyeOff className="absolute bottom-[6%] left-[10%] h-[22%] w-[22%] text-slate-400" />
                ) : null}
                {hasTrap && trapTriggered ? (
                  <Skull className="absolute bottom-[6%] right-[8%] h-[26%] w-[26%] text-red-400" />
                ) : hasTrap && trapDetected ? (
                  <span className="absolute bottom-[4%] left-1/2 -translate-x-1/2 font-barlow text-[7px] font-bold uppercase text-amber-200">
                    Falle
                  </span>
                ) : null}
                {isGm ? (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap rounded bg-background-dark/90 px-0.5 font-barlow text-[7px] font-bold text-gray-300">
                    {container.hp_current}/{container.hp_max}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
