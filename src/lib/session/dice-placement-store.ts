"use client";

import { useSyncExternalStore } from "react";

export type DiceDropPoint = {
  /** Viewport-normalisiert 0…1 (links→rechts). */
  dropNx: number;
  /** Viewport-normalisiert 0…1 (oben→unten). */
  dropNy: number;
  /** Einheitsvektor Wurf-Richtung (Tisch XZ), entgegen Drag. */
  throwDirX?: number;
  throwDirZ?: number;
  /** 0…1 Impuls-Stärke. */
  throwStrength?: number;
  /** Kurzer Tap ohne Zug → Default-Wurf. */
  isTap?: boolean;
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
/** Stabile Snapshot-Referenz — darf sich nur bei echten Pending-Änderungen ändern. */
let pendingSnapshot: DicePlacementRequest | null = null;
const listeners = new Set<() => void>();

function syncSnapshot() {
  if (!pending) {
    pendingSnapshot = null;
    return;
  }
  if (
    pendingSnapshot &&
    pendingSnapshot.id === pending.id &&
    pendingSnapshot.sides === pending.sides &&
    pendingSnapshot.count === pending.count
  ) {
    return;
  }
  pendingSnapshot = {
    id: pending.id,
    sides: pending.sides,
    count: pending.count,
  };
}

function emit() {
  syncSnapshot();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): DicePlacementRequest | null {
  return null;
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
  return pendingSnapshot;
}

export function confirmDiceDropPlacement(point: DiceDropPoint): boolean {
  if (!pending) return false;
  const current = pending;
  pending = null;
  emit();
  const dropNx = Math.min(1, Math.max(0, point.dropNx));
  const dropNy = Math.min(1, Math.max(0, point.dropNy));
  current.resolve({
    dropNx,
    dropNy,
    throwDirX: point.throwDirX,
    throwDirZ: point.throwDirZ,
    throwStrength: point.throwStrength,
    isTap: point.isTap,
  });
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
  return useSyncExternalStore(subscribe, getDicePlacementPending, getServerSnapshot);
}
