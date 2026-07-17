"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  DICE_ANIM_COMPLETE_EVENT,
  DICE_ANIMATION_STALE_MS,
  type DiceAnimCompleteDetail,
  isDiceAnimMeta,
  shouldAnimateDiceEntry,
} from "@/src/lib/session/dice-animation";

const revealed = new Set<string>();
const listeners = new Set<() => void>();
/** Monoton steigend — zuverlässiger als Set-Größe für useSyncExternalStore. */
let revealVersion = 0;

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return revealVersion;
}

/** Chat-Reveal sofort (sync) — unabhängig vom Window-Event-Pfad. */
export function markDiceEntryRevealed(sourceId: string): void {
  if (!sourceId || revealed.has(sourceId)) return;
  revealed.add(sourceId);
  revealVersion += 1;
  emit();
}

/** Globaler Listener (einmal mounten): Animation-Complete → Reveal (FX-Fallback). */
export function useDiceRevealBridge() {
  useEffect(() => {
    function onComplete(ev: Event) {
      const detail = (ev as CustomEvent<DiceAnimCompleteDetail>).detail;
      if (detail?.sourceId) markDiceEntryRevealed(detail.sourceId);
    }
    window.addEventListener(DICE_ANIM_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(DICE_ANIM_COMPLETE_EVENT, onComplete);
  }, []);
}

export function useDiceRevealVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

export function isDiceEntryRevealed(
  entry: { id?: string | null; at?: string | null; meta?: unknown },
  now = Date.now(),
): boolean {
  if (!entry.id) return true;
  if (revealed.has(entry.id)) return true;
  if (!isDiceAnimMeta(entry.meta) || entry.meta.animate !== true) return true;
  // Late join / stale
  if (!shouldAnimateDiceEntry(entry, now)) return true;
  const at = entry.at ? Date.parse(entry.at) : NaN;
  if (Number.isFinite(at) && now - at > DICE_ANIMATION_STALE_MS) return true;
  return false;
}

export function useIsDiceEntryRevealed(
  entry: { id?: string | null; at?: string | null; meta?: unknown },
): boolean {
  useDiceRevealVersion();
  return isDiceEntryRevealed(entry);
}

export function useOnDiceAnimComplete(handler: (sourceId: string) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    function onComplete(ev: Event) {
      const detail = (ev as CustomEvent<DiceAnimCompleteDetail>).detail;
      if (detail?.sourceId) handlerRef.current(detail.sourceId);
    }
    window.addEventListener(DICE_ANIM_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(DICE_ANIM_COMPLETE_EVENT, onComplete);
  }, []);
}
