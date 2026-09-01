/**
 * BattlemapTrapOverlayLayer — Die Fallen, die man erst sieht, wenn es zu spät ist.
 * Trigger-Felder und AoE-Hinweise für den SL; Spieler sehen nur, was ausgelöst/entdeckt wurde.
 */
"use client";

import type { CSSProperties } from "react";
import { Eye, Skull, Trash2, Zap, Wrench } from "lucide-react";
import type {
  BattlemapGridConfig,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import {
  trapEffectCells,
  trapTriggerCell,
  canDisarmTrapAtDistance,
} from "@/src/lib/session/battlemap-trap-geometry";
import { trapDisarmPending } from "@/src/lib/session/battlemap-trap-model";

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
  /** Spieler: eigener Token in Entschärfnähe */
  playerDisarmActive?: boolean;
  ownCharacterGrid?: { x: number; y: number } | null;
  selectedTrapId?: string | null;
  onSelectTrap?: (trapId: string | null) => void;
  onDeleteTrap?: (trapId: string) => void;
  onMarkDiscovered?: (trapId: string) => void;
  onTriggerTrap?: (trapId: string) => void;
  onDisarmTrap?: (trapId: string) => void;
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
  playerDisarmActive = false,
  ownCharacterGrid = null,
  selectedTrapId = null,
  onSelectTrap,
  onDeleteTrap,
  onMarkDiscovered,
  onTriggerTrap,
  onDisarmTrap,
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
      className={`absolute inset-0 ${canInteract ? "z-[49]" : "z-[37]"} pointer-events-none`}
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
          : trap.is_disarmed
            ? "bg-emerald-600/20 border-emerald-400/50"
            : trap.is_detected
            ? "bg-amber-500/25 border-amber-300/60"
            : "bg-red-900/20 border-red-700/40 border-dashed";
        const playerCanDisarm =
          playerDisarmActive &&
          !isGm &&
          trap.is_detected &&
          !triggered &&
          !trap.is_disarmed &&
          ownCharacterGrid != null &&
          canDisarmTrapAtDistance(trap, ownCharacterGrid.x, ownCharacterGrid.y);

        return (
          <div key={trap.id} className="contents">
            {effectCells.map((c) => {
              const isTrigger = c.x === trigger.x && c.y === trigger.y;
              const selectable = canInteract && isTrigger;
              const playerClickable = playerCanDisarm && isTrigger;
              return (
                <div
                  key={`${trap.id}-${c.x}-${c.y}`}
                  data-battlemap-trap={isTrigger ? trap.id : undefined}
                  role={selectable || playerClickable ? "button" : undefined}
                  className={`absolute border ${fill} ${
                    selectable || playerClickable
                      ? "pointer-events-auto cursor-pointer hover:brightness-125"
                      : ""
                  } ${selected && isTrigger ? SELECTED_RING : ""}`}
                  style={cellBox(c.x, c.y, config)}
                  title={
                    selectable
                      ? `${trap.name} — auswählen · Entf löscht`
                      : playerClickable
                        ? `${trap.name} — Entschärfen`
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
                      : playerClickable
                        ? (e) => {
                            if (e.button !== 0) return;
                            e.stopPropagation();
                            e.preventDefault();
                            onDisarmTrap?.(trap.id);
                          }
                        : undefined
                  }
                />
              );
            })}
            {isTriggerVisible(isGm, trap) ? (
              <div
                className={`absolute flex items-center justify-center pointer-events-none ${
                  selected ? "z-[2]" : "z-[1]"
                }`}
                style={cellBox(trigger.x, trigger.y, config)}
                aria-hidden
              >
                <div
                  className={`grid h-[78%] w-[78%] place-items-center rounded-full border-2 shadow-md ${
                    triggered
                      ? "border-red-400/90 bg-red-950/90"
                      : trap.is_detected
                        ? "border-amber-300/80 bg-amber-950/80"
                        : "border-red-700/60 bg-red-950/70"
                  }`}
                >
                  <Skull
                    className={`h-[72%] w-[72%] ${
                      triggered
                        ? "text-red-200"
                        : trap.is_detected
                          ? "text-amber-200"
                          : "text-red-300/80"
                    }`}
                    strokeWidth={2.4}
                    fill="currentColor"
                    fillOpacity={0.35}
                  />
                </div>
                {canInteract && selected ? (
                  <div className="pointer-events-auto absolute -right-1.5 -top-1.5 z-[3] flex gap-0.5">
                    {!trap.is_detected && !trap.is_triggered && onMarkDiscovered ? (
                      <button
                        type="button"
                        title="Als entdeckt markieren (aktive Suche)"
                        className="grid h-5 w-5 place-items-center rounded-full border border-amber-400/80 bg-amber-950 text-[9px] font-bold text-amber-200 hover:bg-amber-800"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkDiscovered(trap.id);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    ) : null}
                    {trap.is_detected &&
                    !trap.is_triggered &&
                    !trap.is_disarmed &&
                    onTriggerTrap ? (
                      <button
                        type="button"
                        title="Falle auslösen"
                        className="grid h-5 w-5 place-items-center rounded-full border border-red-500/80 bg-red-950 text-[9px] font-bold text-red-200 hover:bg-red-800"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerTrap(trap.id);
                        }}
                      >
                        <Zap className="h-3 w-3" />
                      </button>
                    ) : null}
                    {trapDisarmPending(trap)?.status === "player_submitted" &&
                    onDisarmTrap ? (
                      <button
                        type="button"
                        title="Entschärfung prüfen"
                        className="grid h-5 w-5 place-items-center rounded-full border border-emerald-500/80 bg-emerald-950 text-[9px] font-bold text-emerald-200 hover:bg-emerald-800"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisarmTrap(trap.id);
                        }}
                      >
                        <Wrench className="h-3 w-3" />
                      </button>
                    ) : null}
                    {onDeleteTrap ? (
                      <button
                        type="button"
                        title="Falle löschen"
                        className="grid h-5 w-5 place-items-center rounded-full border border-red-500/80 bg-red-950 text-[10px] font-bold text-red-200 hover:bg-red-800"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTrap(trap.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {trap.is_detected && !triggered && !trap.is_disarmed ? (
                  <span className="pointer-events-none absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded bg-amber-950/90 px-1 font-barlow text-[7px] font-bold uppercase tracking-wide text-amber-200">
                    Entdeckt
                  </span>
                ) : null}
                {playerCanDisarm ? (
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded bg-emerald-950/90 px-1 font-barlow text-[7px] font-bold uppercase tracking-wide text-emerald-200">
                    <Wrench className="inline h-2.5 w-2.5" /> Entschärfen
                  </span>
                ) : null}
                {trap.is_disarmed ? (
                  <span className="pointer-events-none absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded bg-emerald-950/90 px-1 font-barlow text-[7px] font-bold uppercase tracking-wide text-emerald-200">
                    Entschärft
                  </span>
                ) : null}
              </div>
            ) : null}
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

function isTriggerVisible(isGm: boolean, trap: SessionBattlemapTrap): boolean {
  if (trap.is_triggered) return true;
  if (trap.is_detected && trap.is_visible_to_players) return true;
  return isGm && trap.is_armed;
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
