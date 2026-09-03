import type { Json } from "@/src/lib/database.types";
import { FAP_PARTS_PER_DAY } from "@/src/lib/travel-fap-config";

/** Einzelne FAP-Zeile in der Tagesplanung */
export type FapAllocationLine = {
  activity: string;
  fap: number;
  /** character_items.id — Fortschritt auf Langzeit-Item */
  targetItemId?: string;
  /** Optional: Fertigkeit für eine Probe (Foundry-Key, z. B. prf) */
  skillKey?: string;
  /** SL-Notiz / Proben-Hinweis */
  skillNote?: string;
};

/** Pro Charakter-ID in session_live_states.fap_allocations */
export type FapCharacterDayState = {
  status: "planning" | "ready";
  allocations: FapAllocationLine[];
  /** SL hat die Planung gesehen/bestätigt */
  confirmed?: boolean;
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

export function parseFapAllocationLine(raw: unknown): FapAllocationLine | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Record<string, unknown>;
  if (typeof l.activity !== "string" || typeof l.fap !== "number" || !Number.isFinite(l.fap)) {
    return null;
  }
  const skillKey =
    typeof l.skillKey === "string" && l.skillKey.trim() ? l.skillKey.trim() : undefined;
  const skillNote =
    typeof l.skillNote === "string" && l.skillNote.trim() ? l.skillNote.trim() : undefined;
  const targetItemId =
    typeof l.targetItemId === "string" && l.targetItemId.trim().length >= 20
      ? l.targetItemId.trim()
      : undefined;
  return {
    activity: l.activity,
    fap: l.fap,
    targetItemId,
    skillKey,
    skillNote,
  };
}

export function parseFapAllocations(raw: Json | undefined | null): FapAllocationsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: FapAllocationsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || !isFapCharacterDayState(val)) continue;
    const v = val as FapCharacterDayState;
    out[key] = {
      status: v.status,
      allocations: v.allocations
        .map(parseFapAllocationLine)
        .filter((line): line is FapAllocationLine => line != null),
      confirmed: v.confirmed === true,
    };
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

/** Gesamtbudget pro Reisetag (= 3 Tages- + 3 Nachtabschnitte) */
export const FAP_DAILY_TOTAL = FAP_PARTS_PER_DAY;

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
