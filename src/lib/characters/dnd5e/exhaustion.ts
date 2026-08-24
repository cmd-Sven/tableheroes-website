/** D&D 5e 2024 Exhaustion: 1–10 levels, −1 per level on d20 tests, −5 ft speed per level, death at 10. */

export const EXHAUSTION_MAX = 10;

export function clampExhaustionLevel(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(EXHAUSTION_MAX, Math.round(n)));
}

/** Penalty applied to d20 tests (ability checks, attacks, saves) and spell DCs. Negative number. */
export function exhaustionD20Penalty(level: number): number {
  return -clampExhaustionLevel(level);
}

export function exhaustionSpeedPenaltyFeet(level: number): number {
  return clampExhaustionLevel(level) * 5;
}

/** −1,5 m je Stufe (Anzeige). */
export function exhaustionSpeedPenaltyMeters(level: number): number {
  return clampExhaustionLevel(level) * 1.5;
}

export function isDeadFromExhaustion(level: number): boolean {
  return clampExhaustionLevel(level) >= EXHAUSTION_MAX;
}

export function reduceExhaustionOnLongRest(level: number): number {
  return Math.max(0, clampExhaustionLevel(level) - 1);
}

/**
 * Farbskala für Badge / UI: Stufe 1 mild (gelbgrün) → Stufe 10 kritisch (tiefrot).
 * HSL: Hue 85→0, Saturation/Lightness steigen leicht.
 */
export function exhaustionBadgeColors(level: number): {
  bg: string;
  border: string;
  text: string;
  glow: string;
} {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0) {
    return {
      bg: "rgba(55, 65, 81, 0.9)",
      border: "rgba(156, 163, 175, 0.5)",
      text: "#e5e7eb",
      glow: "transparent",
    };
  }
  const t = (lvl - 1) / (EXHAUSTION_MAX - 1);
  const hue = Math.round(85 - t * 85); // gelbgrün → rot
  const sat = Math.round(70 + t * 25);
  const light = Math.round(42 - t * 12);
  const bg = `hsla(${hue}, ${sat}%, ${light}%, 0.95)`;
  const border = `hsla(${hue}, ${Math.min(100, sat + 10)}%, ${Math.min(70, light + 22)}%, 0.95)`;
  const text = lvl >= 7 ? "#fff5f5" : "#0b0f0a";
  const glow = `hsla(${hue}, ${sat}%, ${light + 10}%, ${0.35 + t * 0.45})`;
  return { bg, border, text, glow };
}

export function formatExhaustionTooltipDe(level: number): string {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0) return "Keine Erschöpfung (2024).";
  if (lvl >= EXHAUSTION_MAX) {
    return "Erschöpfung Stufe 10 — automatischer Tod. Bewegung 0.";
  }
  const d20 = exhaustionD20Penalty(lvl);
  const meters = exhaustionSpeedPenaltyMeters(lvl);
  const metersLabel = Number.isInteger(meters)
    ? String(meters)
    : meters.toFixed(1).replace(".", ",");
  return [
    `Erschöpfung Stufe ${lvl}/${EXHAUSTION_MAX}`,
    `Malus auf W20-Proben & Zauber-SG: ${d20}`,
    `Bewegung: −${metersLabel} m (−${exhaustionSpeedPenaltyFeet(lvl)} Fuß)`,
  ].join("\n");
}

export function formatExhaustionTooltipEn(level: number): string {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0) return "No exhaustion (2024).";
  if (lvl >= EXHAUSTION_MAX) {
    return "Exhaustion level 10 — automatic death. Speed 0.";
  }
  const d20 = exhaustionD20Penalty(lvl);
  return [
    `Exhaustion level ${lvl}/${EXHAUSTION_MAX}`,
    `Penalty on d20 tests & spell DCs: ${d20}`,
    `Speed: −${exhaustionSpeedPenaltyFeet(lvl)} ft (−${exhaustionSpeedPenaltyMeters(lvl)} m)`,
  ].join("\n");
}
