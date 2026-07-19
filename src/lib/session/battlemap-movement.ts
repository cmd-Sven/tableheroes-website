/** D&D 5e Standard: 5 ft pro Rasterzelle (Quadrat-Grid). */
export const FEET_PER_GRID_CELL = 5;

/**
 * Chebyshev-Distanz (max(|dx|, |dy|)) — üblich für Square-Grid-VTTs:
 * jede Nachbarzelle inkl. Diagonale = 1 Zelle / 5 ft.
 */
export function chebyshevDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
}

export function feetToMovementCells(speedFt: number): number {
  if (!Number.isFinite(speedFt) || speedFt <= 0) return 0;
  return Math.floor(speedFt / FEET_PER_GRID_CELL);
}

export function movementCellsForBurst(baseCells: number, useDash: boolean): number {
  const base = Math.max(0, baseCells);
  return useDash ? base * 2 : base;
}

export function isWithinMovementRange(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  maxCells: number,
): boolean {
  if (maxCells < 0) return true;
  return chebyshevDistance(fromX, fromY, toX, toY) <= maxCells;
}
