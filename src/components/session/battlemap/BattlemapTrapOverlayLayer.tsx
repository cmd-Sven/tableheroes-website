/**
 * BattlemapTrapOverlayLayer — Die Fallen, die man erst sieht, wenn es zu spät ist.
 * Trigger-Felder und AoE-Hinweise für den SL; Spieler sehen nur, was ausgelöst wurde.
 */
"use client";

import type { CSSProperties } from "react";
import type {
  BattlemapGridConfig,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import {
  trapEffectCells,
  trapTriggerCell,
} from "@/src/lib/session/battlemap-trap-geometry";

/** Klare SL-Auswahl: goldener Rahmen um die Trigger-Zelle. */
const SELECTED_RING =
  "ring-[3px] ring-accent-gold border-2 border-accent-gold shadow-[0_0_0_1px_#cab926]";

type Props = {
  traps: SessionBattlemapTrap[];
  config: BattlemapGridConfig;
  /** SL sieht scharfe Fallen schwach; Spieler nur nach Trigger/Detection */
  isGm?: boolean;
  /** true = Klick im Auswählen-Tool aktiv */
  interactive?: boolean;
  selectedTrapId?: string | null;
  onSelectTrap?: (trapId: string | null) => void;
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

/**
 * Fallen-Overlay:
 * - armed / detected: nur die eine Trigger-Zelle
 * - triggered + AoE: volle Effekt-Fläche (Gaswolke etc.)
 * - Select: Klick nur auf die Trigger-Zelle
 */
export function BattlemapTrapOverlayLayer({
  traps,
  config,
  isGm = false,
  interactive = false,
  selectedTrapId = null,
  onSelectTrap,
}: Props) {
  const canInteract = Boolean(isGm && interactive);
  const visible = traps.filter((t) => {
    if (t.is_triggered) return true;
    if (t.is_detected && t.is_visible_to_players) return true;
    if (isGm && t.is_armed) return true;
    return false;
  });

  if (visible.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 ${canInteract ? "z-[47]" : "z-[37]"} pointer-events-none`}
      aria-hidden={!canInteract}
    >
      {visible.map((trap) => {
        const trigger = trapTriggerCell(trap);
        const triggered = trap.is_triggered;
        const showAoe = triggered && trap.is_area_effect;
        const effectCells = showAoe ? trapEffectCells(trap) : [trigger];
        const selected = selectedTrapId === trap.id;
        const fill = triggered
          ? "bg-red-600/35 border-red-400/70"
          : trap.is_detected
            ? "bg-amber-500/25 border-amber-300/60"
            : "bg-red-900/20 border-red-700/40 border-dashed";

        return (
          <div key={trap.id} className="contents">
            {effectCells.map((c) => {
              const isTrigger = c.x === trigger.x && c.y === trigger.y;
              const selectable = canInteract && isTrigger;
              return (
                <div
                  key={`${trap.id}-${c.x}-${c.y}`}
                  data-battlemap-trap={isTrigger ? trap.id : undefined}
                  role={selectable ? "button" : undefined}
                  className={`absolute border ${fill} ${
                    selectable
                      ? "pointer-events-auto cursor-pointer hover:brightness-125"
                      : ""
                  } ${selected && isTrigger ? SELECTED_RING : ""}`}
                  style={cellBox(c.x, c.y, config)}
                  title={
                    selectable
                      ? `${trap.name} — auswählen · Entf löscht`
                      : trap.name
                  }
                  onPointerDown={
                    selectable
                      ? (e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          e.preventDefault();
                          onSelectTrap?.(trap.id);
                        }
                      : undefined
                  }
                />
              );
            })}
            {showAoe && trap.effect_shape === "circle" ? (
              <div
                className="absolute rounded-full border-2 border-red-400/80 bg-red-500/15 pointer-events-none"
                style={circleStyle(trap, config)}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function circleStyle(
  trap: SessionBattlemapTrap,
  config: BattlemapGridConfig,
): CSSProperties {
  const cell = config.cellSizePx;
  const center = gridToPixel(trap.grid_x, trap.grid_y, config);
  const radiusPx = trap.effect_radius * cell + cell / 2;
  return {
    left: center.x + cell / 2 - radiusPx,
    top: center.y + cell / 2 - radiusPx,
    width: radiusPx * 2,
    height: radiusPx * 2,
  };
}
