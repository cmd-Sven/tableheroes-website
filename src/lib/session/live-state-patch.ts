/**
 * live-state-patch — Bühnen-Broadcast plus Merge.
 * Ein veraltetes oder unvollständiges Postgres-Payload darf neuere lokale Felder nicht löschen.
 */
import type { LiveState } from "@/src/components/session/live-board/live-session-types";

export const SESSION_LIVE_PATCH_BROADCAST = "session_live_patch";
export const SESSION_LIVE_PATCH_EVENT = "th:session-live-patch";

export const LOOT_STAGE_CHANGED_BROADCAST = "loot_stage_changed";
export const LOOT_STAGE_CHANGED_EVENT = "th:loot-stage-changed";

/** Große Felder bleiben beim Broadcast weg — sie laufen weiter über Postgres. */
const BROADCAST_OMIT = new Set([
  "system_logs",
  "journal_text",
  "fap_allocations",
  "downtime_config",
  "guest_slots",
]);

const PENDING_MS = 45_000;

type PendingField = { at: number; value: unknown };

const pendingFields = new Map<string, PendingField>();

export type SessionLivePatchDetail = {
  patch: Partial<LiveState>;
  sentAt: number;
  senderId?: string | null;
  remote?: boolean;
};

export type LootStageChangedDetail = {
  containerId: string;
  senderId?: string | null;
  remote?: boolean;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function rememberLivePatch(patch: Partial<LiveState>, at = Date.now()): void {
  for (const [key, value] of Object.entries(patch)) {
    if (key === "system_logs") continue;
    pendingFields.set(key, { at, value });
  }
}

export function forgetLivePatch(keys: string[]): void {
  for (const key of keys) pendingFields.delete(key);
}

export function broadcastableLivePatch(patch: Partial<LiveState>): Partial<LiveState> {
  const next: Partial<LiveState> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (BROADCAST_OMIT.has(key)) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

export function dispatchSessionLivePatch(
  detail: Omit<SessionLivePatchDetail, "remote" | "senderId">,
): void {
  if (typeof window === "undefined") return;
  const patch = broadcastableLivePatch(detail.patch);
  if (Object.keys(patch).length === 0) return;
  rememberLivePatch(patch, detail.sentAt);
  window.dispatchEvent(
    new CustomEvent(SESSION_LIVE_PATCH_EVENT, {
      detail: { patch, sentAt: detail.sentAt, remote: false } satisfies SessionLivePatchDetail,
    }),
  );
}

export function dispatchLootStageChanged(containerId: string): void {
  if (typeof window === "undefined" || !containerId) return;
  window.dispatchEvent(
    new CustomEvent(LOOT_STAGE_CHANGED_EVENT, {
      detail: { containerId, remote: false } satisfies LootStageChangedDetail,
    }),
  );
}

const fieldAppliedAt = new Map<string, number>();

/** Wendet einen Broadcast an. Ältere sentAt-Werte für dasselbe Feld fallen weg. */
export function applySessionLivePatch(prev: LiveState, detail: SessionLivePatchDetail): LiveState {
  const sentAt = Number.isFinite(detail.sentAt) ? detail.sentAt : Date.now();
  const accepted: Partial<LiveState> = {};
  const next: LiveState = { ...prev };
  for (const [key, value] of Object.entries(detail.patch)) {
    if (BROADCAST_OMIT.has(key)) continue;
    const prevAt = fieldAppliedAt.get(key) ?? 0;
    if (sentAt < prevAt) continue;
    fieldAppliedAt.set(key, sentAt);
    (next as unknown as Record<string, unknown>)[key] = value;
    (accepted as Record<string, unknown>)[key] = value;
  }
  rememberLivePatch(accepted);
  return next;
}

/**
 * Postgres liefert die ganze Zeile. Felder, die lokal oder per Broadcast jünger sind,
 * bleiben. Fehlende Schlüssel im Payload (abgeschnittenes Event) löschen nichts.
 */
export function mergeLiveStateRow<T extends object>(
  prev: T | null,
  incoming: T,
  raw: Record<string, unknown>,
): T {
  if (!prev) return incoming;
  const next = { ...incoming } as T;
  for (const key of Object.keys(prev as object)) {
    if (key === "system_logs") continue;
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      (next as Record<string, unknown>)[key] = (prev as Record<string, unknown>)[key];
    }
  }
  const now = Date.now();
  for (const [key, held] of pendingFields) {
    if (now - held.at > PENDING_MS) {
      pendingFields.delete(key);
      continue;
    }
    const incomingValue = (incoming as Record<string, unknown>)[key];
    if (Object.prototype.hasOwnProperty.call(raw, key) && valuesEqual(incomingValue, held.value)) {
      pendingFields.delete(key);
      continue;
    }
    (next as Record<string, unknown>)[key] = held.value;
  }
  return next;
}
