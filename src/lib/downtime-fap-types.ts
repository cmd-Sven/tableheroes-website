import type { Json } from "@/src/lib/database.types";

/** Einzelne FAP-Zeile in der Tagesplanung */
export type FapAllocationLine = {
  activity: string;
  fap: number;
  /** character_items.id — Fortschritt auf Langzeit-Item */
  targetItemId?: string;
};

/** Pro Charakter-ID in session_live_states.fap_allocations */
export type FapCharacterDayState = {
  status: "planning" | "ready";
  allocations: FapAllocationLine[];
};

export type FapAllocationsMap = Record<string, FapCharacterDayState>;

export function isFapCharacterDayState(value: unknown): value is FapCharacterDayState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.status !== "planning" && v.status !== "ready") return false;
  if (!Array.isArray(v.allocations)) return false;
  return v.allocations.every((line) => {
    if (!line || typeof line !== "object") return false;
    const l = line as Record<string, unknown>;
    return typeof l.activity === "string" && typeof l.fap === "number" && Number.isFinite(l.fap);
  });
}

export function parseFapAllocations(raw: Json | undefined | null): FapAllocationsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: FapAllocationsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || !isFapCharacterDayState(val)) continue;
    out[key] = val;
  }
  return out;
}

export function fapAllocationsToJson(map: FapAllocationsMap): Json {
  return map as unknown as Json;
}

/** Pflicht-Schlaf-FAP: 3 bei Schlafdefizit, sonst 2 */
export function requiredSleepFap(sleepDebtFap: number): number {
  return sleepDebtFap > 0 ? 3 : 2;
}

/** Gesamtbudget pro Reisetag */
export const FAP_DAILY_TOTAL = 6;

/** Obergrenze für FAP auf allen Aktivitäten außer „Schlaf“ (Hunger-Malus: −1 FAP pro hungerndem Tag). */
export function maxNonSleepFapBudget(needSleep: number, starvationDays: number): number {
  const need = Math.max(0, Math.min(FAP_DAILY_TOTAL, Math.round(Number(needSleep) || 0)));
  const starv = Math.max(0, Math.round(Number(starvationDays) || 0));
  return Math.max(0, FAP_DAILY_TOTAL - need - starv);
}

/** Mindest-Schlaf-FAP, damit Non-Sleep das Hunger-Budget nicht überschreitet. */
export function minSleepFapForStarvation(needSleep: number, starvationDays: number): number {
  const maxNon = maxNonSleepFapBudget(needSleep, starvationDays);
  return Math.max(
    Math.max(0, Math.min(FAP_DAILY_TOTAL, Math.round(Number(needSleep) || 0))),
    FAP_DAILY_TOTAL - maxNon,
  );
}

export function sleepFapSum(allocations: FapAllocationLine[]): number {
  return allocations
    .filter((a) => a.activity.trim().toLowerCase() === "schlaf")
    .reduce((s, a) => s + Math.max(0, Math.round(a.fap)), 0);
}

export function nonSleepFapSum(allocations: FapAllocationLine[]): number {
  return allocations
    .filter((a) => a.activity.trim().toLowerCase() !== "schlaf")
    .reduce((s, a) => s + Math.max(0, Math.round(a.fap)), 0);
}
