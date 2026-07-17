import { getClassProgression } from "./catalog";
import type { ClassId } from "./types";

const STANDARD_ASI = [4, 8, 12, 16, 19];
const FIGHTER_ASI = [4, 6, 8, 12, 14, 16, 19];
const ROGUE_ASI = [4, 8, 10, 12, 16, 19];

/** ASI-Stufen: bevorzugt Katalog `asiLevels`, sonst PHB-Fallback. */
export function asiLevelsForClass(classId: ClassId | null): number[] {
  const fromCatalog = getClassProgression(classId)?.asiLevels;
  if (fromCatalog && fromCatalog.length > 0) return [...fromCatalog];
  if (classId === "fighter") return FIGHTER_ASI;
  if (classId === "rogue") return ROGUE_ASI;
  return STANDARD_ASI;
}

export function levelGrantsAsi(classId: ClassId | null, level: number): boolean {
  return asiLevelsForClass(classId).includes(Math.floor(level));
}
