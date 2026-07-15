/** PHB XP-Schwellen pro Stufe (kumulativ). Index = Stufe. */
export const DND5E_XP_BY_LEVEL: number[] = [
  0,
  0,
  300,
  900,
  2_700,
  6_500,
  14_000,
  23_000,
  34_000,
  48_000,
  64_000,
  85_000,
  100_000,
  120_000,
  140_000,
  165_000,
  195_000,
  225_000,
  265_000,
  305_000,
  355_000,
];

export function xpForLevel(level: number): number {
  const idx = Math.min(Math.max(1, Math.floor(level)), 20);
  return DND5E_XP_BY_LEVEL[idx] ?? 0;
}

export function xpToNextLevel(level: number): number | null {
  if (level >= 20) return null;
  return xpForLevel(level + 1);
}

export function xpProgressInLevel(
  currentXp: number,
  level: number,
): { current: number; needed: number; percent: number; atMaxLevel: boolean } {
  const safeLevel = Math.min(Math.max(1, Math.floor(level)), 20);
  const floor = xpForLevel(safeLevel);
  const ceiling = xpToNextLevel(safeLevel);
  if (ceiling == null) {
    return { current: currentXp, needed: 0, percent: 100, atMaxLevel: true };
  }
  const span = Math.max(1, ceiling - floor);
  const current = Math.max(0, currentXp - floor);
  const percent = Math.min(100, Math.max(0, (current / span) * 100));
  return { current, needed: span, percent, atMaxLevel: false };
}
