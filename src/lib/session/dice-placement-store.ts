"use client";

import { useSyncExternalStore } from "react";

export type DiceDropPoint = {
  /** Viewport-normalisiert 0…1 (links→rechts). */
  dropNx: number;
  /** Viewport-normalisiert 0…1 (oben→unten). */
  dropNy: number;
};

export type DicePlacementRequest = {
  id: string;
  sides: number;
  count: number;
};

type Pending = DicePlacementRequest & {
  resolve: (point: DiceDropPoint) => void;
  reject: (reason?: Error) => void;
};

let pending: Pending | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return version;
}

function getServerSnapshot() {
  return 0;
}

/** Initiator: Cursor-Modus starten, auf Klick-Position warten. */
export function requestDiceDropPlacement(opts: {
  sides: number;
  count: number;
}): Promise<DiceDropPoint> {
  if (typeof window === "undefined") {
    return Promise.resolve({ dropNx: 0.5, dropNy: 0.45 });
  }
  if (pending) {
    pending.reject(new Error("placement-superseded"));
    pending = null;
  }
  const id = `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise<DiceDropPoint>((resolve, reject) => {
    pending = {
      id,
      sides: Math.max(2, Math.round(opts.sides) || 20),
      count: Math.max(1, Math.round(opts.count) || 1),
      resolve,
      reject,
    };
    emit();
  });
}

export function getDicePlacementPending(): DicePlacementRequest | null {
  if (!pending) return null;
  return { id: pending.id, sides: pending.sides, count: pending.count };
}

export function confirmDiceDropPlacement(point: DiceDropPoint): boolean {
  if (!pending) return false;
  const current = pending;
  pending = null;
  emit();
  const dropNx = Math.min(1, Math.max(0, point.dropNx));
  const dropNy = Math.min(1, Math.max(0, point.dropNy));
  current.resolve({ dropNx, dropNy });
  return true;
}

export function cancelDiceDropPlacement(reason = "placement-cancelled"): boolean {
  if (!pending) return false;
  const current = pending;
  pending = null;
  emit();
  current.reject(new Error(reason));
  return true;
}

export function useDicePlacementPending(): DicePlacementRequest | null {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return getDicePlacementPending();
}
