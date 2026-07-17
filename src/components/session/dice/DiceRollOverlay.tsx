"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Dices } from "lucide-react";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import {
  DICE_ANIMATION_DURATION_MS,
  dispatchDiceAnimComplete,
  formatDiceResultLabel,
  isDiceAnimMeta,
  shouldAnimateDiceEntry,
} from "@/src/lib/session/dice-animation";
import { supports3dDice } from "@/src/lib/session/dice-roll";
import {
  cancelDiceDropPlacement,
  confirmDiceDropPlacement,
  useDicePlacementPending,
} from "@/src/lib/session/dice-placement-store";
import {
  clientToDropNorm,
  dropNormToTablePoint,
} from "@/src/lib/session/dice-screen-project";

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
  dropNx: number;
  dropNy: number;
  aimX: number;
  aimZ: number;
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

function readDropNorm(meta: Record<string, unknown>): { dropNx: number; dropNy: number } {
  const dropNx =
    typeof meta.dropNx === "number" && Number.isFinite(meta.dropNx)
      ? Math.min(1, Math.max(0, meta.dropNx))
      : 0.5;
  const dropNy =
    typeof meta.dropNy === "number" && Number.isFinite(meta.dropNy)
      ? Math.min(1, Math.max(0, meta.dropNy))
      : 0.42;
  return { dropNx, dropNy };
}

/**
 * Overlay-Layer über dem Live-Tisch: Placement-Cursor + 3D-Würfel (oder 2D-Fallback).
 * Kein Abdunkeln; Placement blockiert kurz, Animation ist pointer-events-none.
 */
export function DiceRollOverlay({ logs }: Props) {
  const seenRef = useRef<Set<string>>(new Set());
  const finishingRef = useRef<string | null>(null);
  const settledOnceRef = useRef(false);
  const activeRef = useRef<ActiveRoll | null>(null);
  const cursorElRef = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<ActiveRoll[]>([]);
  const [webgl, setWebgl] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const placement = useDicePlacementPending();
  const placementId = placement?.id ?? null;
  const active = queue[0] ?? null;
  const activeId = active?.sourceId ?? null;
  activeRef.current = active;

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  useEffect(() => {
    setShowResult(false);
  }, [activeId]);

  // Cursor: DOM via ref — kein setState bei mousemove (verhindert Update-Depth-Loop)
  useEffect(() => {
    if (!placementId) return;
    const el = cursorElRef.current;
    const setPos = (x: number, y: number) => {
      if (!el) return;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    setPos(window.innerWidth * 0.5, window.innerHeight * 0.42);

    const onMove = (e: PointerEvent) => {
      setPos(e.clientX, e.clientY);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDiceDropPlacement();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [placementId]);

  const handlePlacementPointer = useCallback(
    (e: React.PointerEvent) => {
      if (!placement) return;
      e.preventDefault();
      e.stopPropagation();
      const { dropNx, dropNy } = clientToDropNorm(e.clientX, e.clientY);
      confirmDiceDropPlacement({ dropNx, dropNy });
    },
    [placement],
  );

  useEffect(() => {
    const now = Date.now();
    const fresh: ActiveRoll[] = [];
    const staleCompleteIds: string[] = [];
    const aspect =
      typeof window !== "undefined"
        ? window.innerWidth / Math.max(1, window.innerHeight)
        : 16 / 9;
    for (const entry of logs) {
      if (!entry?.id || seenRef.current.has(entry.id)) continue;
      if (!shouldAnimateDiceEntry(entry, now)) {
        if (isDiceAnimMeta(entry.meta) && entry.meta.animate) {
          seenRef.current.add(entry.id);
          staleCompleteIds.push(entry.id);
        }
        continue;
      }
      const meta = entry.meta!;
      const faces = (meta.faces as number[]).filter((n) => Number.isFinite(n));
      const sides = Math.round(Number(meta.sides) || 20);
      if (faces.length === 0) continue;
      seenRef.current.add(entry.id);
      const { dropNx, dropNy } = readDropNorm(meta as Record<string, unknown>);
      const { x: aimX, z: aimZ } = dropNormToTablePoint(dropNx, dropNy, aspect);
      fresh.push({
        sourceId: entry.id,
        sides,
        faces: faces.slice(0, 12),
        seed: typeof meta.seed === "string" ? meta.seed : entry.id,
        startAt: performance.now(),
        use3d: webgl && supports3dDice(sides),
        resultLabel: formatDiceResultLabel(meta),
        dropNx,
        dropNy,
        aimX,
        aimZ,
      });
    }
    if (fresh.length > 0) {
      setQueue((q) => [...q, ...fresh]);
    }
    // Reveal/Chat erst nach dem Effect — nie synchron während Queue-Update
    if (staleCompleteIds.length > 0) {
      queueMicrotask(() => {
        for (const id of staleCompleteIds) dispatchDiceAnimComplete(id);
      });
    }
  }, [logs, webgl]);

  const finishActive = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    if (finishingRef.current === current.sourceId) return;
    finishingRef.current = current.sourceId;
    const sourceId = current.sourceId;
    setQueue((q) => (q[0]?.sourceId === sourceId ? q.slice(1) : q));
    // Store-Update (LiveSessionActivityPanel) nie im setState-Updater / Render-Pfad
    queueMicrotask(() => dispatchDiceAnimComplete(sourceId));
  }, []);

  /** Erst wenn ALLE Würfel der Scene liegen (onAllSettled) → Result + Chat/Bubble. */
  const handleAllSettled = useCallback(() => {
    if (settledOnceRef.current) return;
    settledOnceRef.current = true;
    setShowResult(true);
    window.setTimeout(finishActive, RESULT_HOLD_MS);
  }, [finishActive]);

  useEffect(() => {
    finishingRef.current = null;
    settledOnceRef.current = false;
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    // Safety: nie vor voller Physik-Dauer + Hold; Chat erst via finishActive
    const t = window.setTimeout(
      finishActive,
      DICE_ANIMATION_DURATION_MS + RESULT_HOLD_MS + 900,
    );
    return () => window.clearTimeout(t);
  }, [activeId, finishActive]);

  const fallbackLabel = useMemo(() => {
    if (!active) return "";
    if (showResult) return active.resultLabel;
    if (active.faces.length === 1) return `W${active.sides}`;
    return `${active.faces.length}×W${active.sides}`;
  }, [active, showResult]);

  const fallbackStyle = useMemo(() => {
    if (!active) return undefined;
    return {
      left: `${active.dropNx * 100}%`,
      top: `${active.dropNy * 100}%`,
      transform: "translate(-50%, -50%)",
    } as const;
  }, [active]);

  return (
    <>
      {placement ? (
        <div
          className="fixed inset-0 z-[70] cursor-none"
          style={{ background: "transparent" }}
          onPointerDown={handlePlacementPointer}
          role="presentation"
        >
          <div
            ref={cursorElRef}
            className="pointer-events-none fixed z-[71] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{
              left: "50%",
              top: "42%",
              willChange: "left, top",
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-hero-border bg-background-card/90 text-accent-gold shadow-lg">
              <Dices className="h-7 w-7" strokeWidth={2.25} />
            </div>
            <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold drop-shadow">
              {placement.count > 1
                ? `${placement.count}×W${placement.sides} · Klick zum Ablegen`
                : `W${placement.sides} · Klick zum Ablegen`}
            </span>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {active ? (
          <motion.div
            key={active.sourceId}
            className="pointer-events-none fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {active.use3d ? (
              <div className="absolute inset-0">
                <DiceCanvas
                  sides={active.sides}
                  faces={active.faces}
                  seed={active.seed}
                  startAt={active.startAt}
                  aimX={active.aimX}
                  aimZ={active.aimZ}
                  onSettled={handleAllSettled}
                  resultLabel={active.resultLabel}
                  showResult={showResult}
                />
              </div>
            ) : (
              <motion.div
                className="absolute flex flex-col items-center gap-3 rounded-md border border-hero-border bg-background-card/95 px-8 py-6 shadow-2xl"
                style={fallbackStyle}
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.35 }}
                onAnimationComplete={() => {
                  window.setTimeout(handleAllSettled, DICE_ANIMATION_DURATION_MS);
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
    </>
  );
}
