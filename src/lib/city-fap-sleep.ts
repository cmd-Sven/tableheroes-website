import { FAP_PARTS_PER_DAY } from "@/src/lib/travel-fap-config";
import { clampExhaustionLevel, EXHAUSTION_MAX } from "@/src/lib/characters/dnd5e/exhaustion";

/** Kurzer Schlaf in der Stadt (kein Erschöpfungsgewinn beim ersten Mal). */
export const CITY_SLEEP_SHORT_FAP = 2;
/** Voller Schlaf — nach Kurzschlaf-Serie −1 Erschöpfung. */
export const CITY_SLEEP_FULL_FAP = 3;

export type CitySleepOutcome = {
  consecutiveShortSleepDays: number;
  exhaustionLevel: number;
  exhaustionDelta: number;
};

/**
 * Stadt-Schlaf:
 * - 2 FAP einmal hintereinander: keine Erschöpfung
 * - 2 FAP zweites/drittes … Mal hintereinander: je +1 Erschöpfung
 * - 3 FAP nach mind. einem Kurzschlaf: −1 Erschöpfung, Serie zurücksetzen
 */
export function applyCitySleepNight(input: {
  sleepFap: number;
  consecutiveShortSleepDays: number;
  exhaustionLevel: number;
}): CitySleepOutcome {
  const sleep = Math.max(0, Math.round(Number(input.sleepFap) || 0));
  const consecutive = Math.max(0, Math.round(Number(input.consecutiveShortSleepDays) || 0));
  const exhaustion = clampExhaustionLevel(input.exhaustionLevel);

  if (sleep >= CITY_SLEEP_FULL_FAP) {
    const recover = consecutive > 0 ? 1 : 0;
    return {
      consecutiveShortSleepDays: 0,
      exhaustionLevel: clampExhaustionLevel(exhaustion - recover),
      exhaustionDelta: -recover,
    };
  }

  const nextConsecutive = consecutive + 1;
  const gain = nextConsecutive >= 2 ? 1 : 0;
  return {
    consecutiveShortSleepDays: nextConsecutive,
    exhaustionLevel: Math.min(EXHAUSTION_MAX, exhaustion + gain),
    exhaustionDelta: gain,
  };
}

export function remainingStayFap(input: {
  currentDay: number;
  totalDays: number;
  allocatedToday: number;
}): number {
  const current = Math.max(1, Math.round(Number(input.currentDay) || 1));
  const total = Math.max(current, Math.round(Number(input.totalDays) || 1));
  const daysLeftIncludingToday = Math.max(0, total - current + 1);
  const pool = daysLeftIncludingToday * FAP_PARTS_PER_DAY;
  const used = Math.max(0, Math.round(Number(input.allocatedToday) || 0));
  return Math.max(0, pool - used);
}
