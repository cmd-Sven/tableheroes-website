import { resolveClassId } from "@/src/lib/characters/dnd5e/progression/class-ids";
import type { ClassId } from "@/src/lib/characters/dnd5e/progression/types";

/**
 * Typische DnD-Community-/PHB-Farbassoziationen pro Klasse.
 * Abgeleitet über `resolveClassId` (DE/EN-Namen) — kein DB-Feld nötig.
 */
export const CLASS_PLAYER_COLORS: Record<ClassId, string> = {
  barbarian: "#E7623E", // rot/orange
  bard: "#AB6DAC", // lila/magenta
  cleric: "#E8DCC8", // weiß/gold/hell
  druid: "#7A9148", // grün
  fighter: "#8B7355", // grau/stahl/braun
  monk: "#51A5C5", // hellblau/cyan
  paladin: "#B59E54", // gold/gelb
  ranger: "#507F62", // olive/waldgrün
  rogue: "#555752", // schwarz/dunkelgrau
  sorcerer: "#E052A0", // pink/magenta-rot
  warlock: "#7B469B", // lila-dunkel
  wizard: "#2A50A1", // blau
};

/** Fallback wenn Klasse fehlt oder nicht auflösbar. */
export const FALLBACK_PLAYER_COLOR = "#9CA3AF";

export function getPlayerColorForClass(className: string | null | undefined): string {
  const classId = resolveClassId(className);
  if (!classId) return FALLBACK_PLAYER_COLOR;
  return CLASS_PLAYER_COLORS[classId];
}

/** Hex → `rgba(...)` für dezente Hintergründe/Ränder. */
export function playerColorAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
