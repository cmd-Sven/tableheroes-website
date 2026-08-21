import type { SessionBattlemapTrap } from "@/src/lib/session/battlemap-types";

type TrapGeom = Pick<
  SessionBattlemapTrap,
  "grid_x" | "grid_y" | "is_area_effect" | "effect_shape" | "effect_radius"
>;

/** Auslöse-/Detection-Zelle: immer genau eine Grid-Zelle (Platzierung). */
export function trapTriggerCell(
  trap: Pick<SessionBattlemapTrap, "grid_x" | "grid_y">,
): { x: number; y: number } {
  return { x: trap.grid_x, y: trap.grid_y };
}

/**
 * Zellen der Trigger-Fläche — immer nur die eine Auslösezelle.
 * (Historischer Name; Enter-Checks / Placement nutzen dies, nicht die AoE.)
 */
export function trapCoveredCells(
  trap: Pick<SessionBattlemapTrap, "grid_x" | "grid_y">,
): Array<{ x: number; y: number }> {
  return [trapTriggerCell(trap)];
}

/**
 * Schaden-/Effekt-AoE nach dem Auslösen (nicht die Trigger-Zone).
 * Ohne `is_area_effect` = nur die Trigger-Zelle.
 */
export function trapEffectCells(trap: TrapGeom): Array<{ x: number; y: number }> {
  if (!trap.is_area_effect) {
    return trapCoveredCells(trap);
  }
  const cells: Array<{ x: number; y: number }> = [];
  const r = Math.max(1, trap.effect_radius);
  if (trap.effect_shape === "rect") {
    const half = Math.floor((r - 1) / 2);
    const size = r;
    for (let dx = 0; dx < size; dx += 1) {
      for (let dy = 0; dy < size; dy += 1) {
        cells.push({ x: trap.grid_x - half + dx, y: trap.grid_y - half + dy });
      }
    }
    return cells;
  }
  for (let dx = -r; dx <= r; dx += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= r) {
        cells.push({ x: trap.grid_x + dx, y: trap.grid_y + dy });
      }
    }
  }
  return cells;
}

/** Enter-/Detection-Hit: nur die eine Trigger-Zelle. */
export function cellInTrap(
  trap: Pick<SessionBattlemapTrap, "grid_x" | "grid_y">,
  gridX: number,
  gridY: number,
): boolean {
  return trap.grid_x === gridX && trap.grid_y === gridY;
}
