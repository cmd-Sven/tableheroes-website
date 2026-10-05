/**
 * Erschöpfung: 6 Stufen.
 * Stufe 0: kein Malus.
 * Stufe 1–5: Würfelmalus = Stufe × −2 (W20-Proben und Zauber-SG).
 * Stufe 6: Tod. Kein weiterer Würfelmalus — der Charakter ist tot.
 * Bewegung: −5 Fuß / −1,5 m je Stufe 1–5; bei Tod Bewegung 0.
 */

export const EXHAUSTION_MAX = 6;

/** Letzte Stufe mit Würfelmalus. Darüber ist der Charakter tot. */
export const EXHAUSTION_PENALTY_MAX_LEVEL = 5;

export function clampExhaustionLevel(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(EXHAUSTION_MAX, Math.round(n)));
}

/**
 * Malus auf W20-Proben (Fertigkeit, Rettung, Angriff, Initiative) und Zauber-SG.
 * Negativ oder 0. Stufe 6 (Tod) gibt keinen weiteren Würfelmalus.
 */
export function exhaustionD20Penalty(level: number): number {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0 || lvl > EXHAUSTION_PENALTY_MAX_LEVEL) return 0;
  return lvl * -2;
}

export function exhaustionSpeedPenaltyFeet(level: number): number {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0 || lvl > EXHAUSTION_PENALTY_MAX_LEVEL) return 0;
  return lvl * 5;
}

/** −1,5 m je Stufe 1–5 (Anzeige). */
export function exhaustionSpeedPenaltyMeters(level: number): number {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0 || lvl > EXHAUSTION_PENALTY_MAX_LEVEL) return 0;
  return lvl * 1.5;
}

export function isDeadFromExhaustion(level: number): boolean {
  return clampExhaustionLevel(level) >= EXHAUSTION_MAX;
}

export function reduceExhaustionOnLongRest(level: number): number {
  return Math.max(0, clampExhaustionLevel(level) - 1);
}

/**
 * Setzt die Stufe (0–6). Stufe 6 setzt aktuelle LP auf 0 — dasselbe Todesmodell
 * wie bisher (kein separates Charakter-Status-Flag).
 */
export function combatWithExhaustionLevel<T extends { exhaustionLevel?: number; hpCurrent: number }>(
  combat: T,
  rawLevel: unknown,
): T {
  const level = clampExhaustionLevel(rawLevel);
  return {
    ...combat,
    exhaustionLevel: level,
    ...(isDeadFromExhaustion(level) ? { hpCurrent: 0 } : {}),
  };
}

/** Klemmt eine gespeicherte Stufe und wendet Tod (LP 0) an, falls Stufe 6. */
export function normalizeExhaustionCombat<
  T extends { exhaustionLevel?: number; hpCurrent: number },
>(combat: T): T {
  return combatWithExhaustionLevel(combat, combat.exhaustionLevel);
}

/**
 * Farbskala für Badge / UI: Stufe 1 mild (gelbgrün) → Stufe 6 Tod (tiefrot).
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
  const hue = Math.round(85 - t * 85);
  const sat = Math.round(70 + t * 25);
  const light = Math.round(42 - t * 12);
  const bg = `hsla(${hue}, ${sat}%, ${light}%, 0.95)`;
  const border = `hsla(${hue}, ${Math.min(100, sat + 10)}%, ${Math.min(70, light + 22)}%, 0.95)`;
  const text = lvl >= 5 ? "#fff5f5" : "#0b0f0a";
  const glow = `hsla(${hue}, ${sat}%, ${light + 10}%, ${0.35 + t * 0.45})`;
  return { bg, border, text, glow };
}

export function formatExhaustionTooltipDe(level: number): string {
  const lvl = clampExhaustionLevel(level);
  if (lvl <= 0) return "Keine Erschöpfung.";
  if (isDeadFromExhaustion(lvl)) {
    return "Erschöpfung Stufe 6 — Tod. Kein weiterer Würfelmalus. Bewegung 0.";
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
  if (lvl <= 0) return "No exhaustion.";
  if (isDeadFromExhaustion(lvl)) {
    return "Exhaustion level 6 — death. No further die penalty. Speed 0.";
  }
  const d20 = exhaustionD20Penalty(lvl);
  return [
    `Exhaustion level ${lvl}/${EXHAUSTION_MAX}`,
    `Penalty on d20 tests & spell DCs: ${d20}`,
    `Speed: −${exhaustionSpeedPenaltyFeet(lvl)} ft (−${exhaustionSpeedPenaltyMeters(lvl)} m)`,
  ].join("\n");
}
