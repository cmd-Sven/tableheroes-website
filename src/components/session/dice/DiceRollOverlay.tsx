"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import {
  DICE_ANIMATION_DURATION_MS,
  dispatchDiceAnimComplete,
  formatDiceResultLabel,
  isDiceAnimMeta,
  shouldAnimateDiceEntry,
} from "@/src/lib/session/dice-animation";
import { supports3dDice } from "@/src/lib/session/dice-roll";

const DiceCanvas = dynamic(() => import("./DiceRollCanvas"), {
  ssr: false,
  loading: () => null,
});

/** Kurz nach Landung Total anzeigen, bevor Overlay schließt. */
const RESULT_HOLD_MS = 900;

type ActiveRoll = {
  sourceId: string;
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  use3d: boolean;
  resultLabel: string;
};

type Props = {
  logs: SessionActivityEntry[];
};

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/**
 * Overlay-Layer über dem Live-Tisch: 3D-Würfel (oder 2D-Fallback).
 * Blockiert den Tisch nicht dauerhaft (pointer-events-none).
 */
export function DiceRollOverlay({ logs }: Props) {
  const seenRef = useRef<Set<string>>(new Set());
  const finishingRef = useRef<string | null>(null);
  const [queue, setQueue] = useState<ActiveRoll[]>([]);
  const [webgl, setWebgl] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const active = queue[0] ?? null;

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  useEffect(() => {
    setShowResult(false);
  }, [active?.sourceId]);

  useEffect(() => {
    const now = Date.now();
    const fresh: ActiveRoll[] = [];
    for (const entry of logs) {
      if (!entry?.id || seenRef.current.has(entry.id)) continue;
      if (!shouldAnimateDiceEntry(entry, now)) {
        if (isDiceAnimMeta(entry.meta) && entry.meta.animate) {
          seenRef.current.add(entry.id);
          dispatchDiceAnimComplete(entry.id);
        }
        continue;
      }
      const meta = entry.meta!;
      const faces = (meta.faces as number[]).filter((n) => Number.isFinite(n));
      const sides = Math.round(Number(meta.sides) || 20);
      if (faces.length === 0) continue;
      seenRef.current.add(entry.id);
      fresh.push({
        sourceId: entry.id,
        sides,
        faces: faces.slice(0, 12),
        seed: typeof meta.seed === "string" ? meta.seed : entry.id,
        startAt: performance.now(),
        use3d: webgl && supports3dDice(sides),
        resultLabel: formatDiceResultLabel(meta),
      });
    }
    if (fresh.length > 0) {
      setQueue((q) => [...q, ...fresh]);
    }
  }, [logs, webgl]);

  const finishActive = useCallback(() => {
    setQueue((q) => {
      const current = q[0];
      if (!current) return q;
      if (finishingRef.current === current.sourceId) return q;
      finishingRef.current = current.sourceId;
      dispatchDiceAnimComplete(current.sourceId);
      return q.slice(1);
    });
  }, []);

  const handleSettled = useCallback(() => {
    setShowResult(true);
    window.setTimeout(finishActive, RESULT_HOLD_MS);
  }, [finishActive]);

  useEffect(() => {
    finishingRef.current = null;
  }, [active?.sourceId]);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(
      finishActive,
      DICE_ANIMATION_DURATION_MS + RESULT_HOLD_MS + 700,
    );
    return () => window.clearTimeout(t);
  }, [active, finishActive]);

  const fallbackLabel = useMemo(() => {
    if (!active) return "";
    if (showResult) return active.resultLabel;
    if (active.faces.length === 1) return `W${active.sides}`;
    return `${active.faces.length}×W${active.sides}`;
  }, [active, showResult]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key={active.sourceId}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 bg-background-dark/35" />
          {active.use3d ? (
            <div className="relative h-[min(56vh,460px)] w-[min(94vw,600px)]">
              <DiceCanvas
                sides={active.sides}
                faces={active.faces}
                seed={active.seed}
                startAt={active.startAt}
                onSettled={handleSettled}
                resultLabel={active.resultLabel}
                showResult={showResult}
              />
            </div>
          ) : (
            <motion.div
              className="relative flex flex-col items-center gap-3 rounded-md border border-hero-border bg-background-card/95 px-8 py-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.35 }}
              onAnimationComplete={() => {
                window.setTimeout(handleSettled, DICE_ANIMATION_DURATION_MS);
              }}
            >
              <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
                {showResult ? "Ergebnis" : "Würfel rollen…"}
              </p>
              <motion.div
                className="font-barlow text-5xl font-extrabold text-hero-vibrant"
                initial={{ rotate: -12, scale: 0.8 }}
                animate={
                  showResult
                    ? { rotate: 0, scale: 1 }
                    : { rotate: [0, 18, -14, 10, 0], scale: [0.85, 1.08, 1] }
                }
                transition={{
                  duration: showResult ? 0.25 : DICE_ANIMATION_DURATION_MS / 1000,
                  ease: "easeOut",
                }}
              >
                {fallbackLabel}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
