/**
 * BattlemapContainerOverlayLayer — Behälter auf der Battlemap (Kiste, Fass, etc.)
 */
"use client";

import type { CSSProperties } from "react";
import { Box, Eye, Lock, LockOpen, Skull, Trash2, Zap, Wrench } from "lucide-react";
import type {
  BattlemapGridConfig,
  SessionBattlemapContainer,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import {
  CONTAINER_TYPE_LABELS,
  containerTrapDisarmPending,
  isAdjacentToContainer,
} from "@/src/lib/session/battlemap-container-model";

const SELECTED_RING =
  "ring-[3px] ring-accent-gold border-2 border-accent-gold shadow-[0_0_0_1px_#cab926]";

type Props = {
  containers: SessionBattlemapContainer[];
  config: BattlemapGridConfig;
  isGm?: boolean;
  interactive?: boolean;
  playerDisarmActive?: boolean;
  ownCharacterGrid?: { x: number; y: number } | null;
  selectedContainerId?: string | null;
  onSelectContainer?: (containerId: string | null) => void;
  onDeleteContainer?: (containerId: string) => void;
  onMarkTrapDiscovered?: (containerId: string) => void;
  onTriggerTrap?: (containerId: string) => void;
  onDisarmTrap?: (containerId: string) => void;
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

export function BattlemapContainerOverlayLayer({
  containers,
  config,
  isGm = false,
  interactive = false,
  playerDisarmActive = false,
  ownCharacterGrid = null,
  selectedContainerId = null,
  onSelectContainer,
  onDeleteContainer,
  onMarkTrapDiscovered,
  onTriggerTrap,
  onDisarmTrap,
}: Props) {
  const canInteract = Boolean(isGm && interactive);
  const visible = containers.filter((c) => {
    if (isGm) return true;
    if (c.is_open) return true;
    if (c.trap_visible_to_players || c.is_trap_triggered) return true;
    return false;
  });

  if (visible.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 ${canInteract ? "z-[48]" : "z-[36]"} pointer-events-none`}
      aria-hidden={!canInteract}
    >
      {visible.map((container) => {
        const selected = selectedContainerId === container.id;
        const hasTrap = container.has_trap;
        const trapTriggered = container.is_trap_triggered;
        const trapDetected = container.is_trap_detected;
        const trapDisarmed = container.is_trap_disarmed;
        const fill = trapTriggered
          ? "bg-red-600/30 border-red-400/60"
          : container.is_open
            ? "bg-emerald-600/15 border-emerald-400/40"
            : trapDetected && trapDisarmed
              ? "bg-amber-500/20 border-amber-300/50"
              : trapDetected
                ? "bg-amber-500/25 border-amber-300/60"
                : "bg-slate-800/40 border-slate-500/50 border-dashed";

        const playerCanDisarm =
          playerDisarmActive &&
          !isGm &&
          hasTrap &&
          trapDetected &&
          !trapTriggered &&
          !trapDisarmed &&
          ownCharacterGrid != null &&
          isAdjacentToContainer(container, ownCharacterGrid.x, ownCharacterGrid.y);

        const typeLabel = CONTAINER_TYPE_LABELS[container.container_type] ?? "Behälter";
        const pending = containerTrapDisarmPending(container);

        return (
          <div key={container.id} className="contents">
            <div
              style={cellBox(container.grid_x, container.grid_y, config)}
              className={`absolute box-border border ${fill} ${
                selected ? SELECTED_RING : ""
              } ${canInteract || playerCanDisarm ? "pointer-events-auto cursor-pointer" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (playerCanDisarm && onDisarmTrap) {
                  onDisarmTrap(container.id);
                  return;
                }
                if (canInteract) onSelectContainer?.(container.id);
              }}
              title={`${typeLabel}: ${container.name}`}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-0.5">
                {container.is_open ? (
                  <LockOpen className="h-3.5 w-3.5 text-emerald-300/90" />
                ) : container.is_locked ? (
                  <Lock className="h-3.5 w-3.5 text-amber-300/90" />
                ) : (
                  <Box className="h-3.5 w-3.5 text-slate-300/90" />
                )}
                {hasTrap && trapTriggered ? (
                  <Skull className="h-3 w-3 text-red-400" />
                ) : hasTrap && trapDetected ? (
                  <span className="font-barlow text-[7px] font-bold uppercase text-amber-200">
                    Falle
                  </span>
                ) : null}
              </div>
            </div>

            {canInteract && selected ? (
              <div
                style={{
                  ...cellBox(container.grid_x, container.grid_y, config),
                  transform: "translateY(-100%)",
                }}
                className="pointer-events-auto absolute flex items-center gap-0.5 p-0.5"
              >
                {hasTrap && !trapDetected ? (
                  <button
                    type="button"
                    title="Falle entdeckt"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkTrapDiscovered?.(container.id);
                    }}
                    className="grid h-6 w-6 place-items-center rounded border border-amber-600/60 bg-amber-950/90 text-amber-200 hover:border-amber-400"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                ) : null}
                {hasTrap && !trapTriggered && !trapDisarmed ? (
                  <button
                    type="button"
                    title="Falle auslösen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerTrap?.(container.id);
                    }}
                    className="grid h-6 w-6 place-items-center rounded border border-red-700/60 bg-red-950/90 text-red-300 hover:border-red-500"
                  >
                    <Zap className="h-3 w-3" />
                  </button>
                ) : null}
                {hasTrap && trapDetected && !trapTriggered && !trapDisarmed ? (
                  <button
                    type="button"
                    title="Entschärfen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisarmTrap?.(container.id);
                    }}
                    className="grid h-6 w-6 place-items-center rounded border border-emerald-700/60 bg-emerald-950/90 text-emerald-300 hover:border-emerald-500"
                  >
                    <Wrench className="h-3 w-3" />
                  </button>
                ) : null}
                {pending ? (
                  <span className="rounded bg-accent-gold/20 px-1 font-barlow text-[7px] font-bold uppercase text-accent-gold">
                    Entschärfen…
                  </span>
                ) : null}
                <button
                  type="button"
                  title="Behälter löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContainer?.(container.id);
                  }}
                  className="grid h-6 w-6 place-items-center rounded border border-red-800/60 bg-red-950/90 text-red-400 hover:border-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
