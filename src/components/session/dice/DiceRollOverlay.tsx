"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Dices } from "lucide-react";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import {
  DICE_ANIMATION_DURATION_MS,
  dispatchDiceAnimComplete,
  isDiceAnimMeta,
  shouldAnimateDiceEntry,
} from "@/src/lib/session/dice-animation";
import { DICE_PHYSICS_MAX_MS } from "@/src/lib/session/dice-physics";
import { estimateRollDurationMs } from "@/src/lib/session/dice-slingshot";
import { supports3dDice } from "@/src/lib/session/dice-roll";
import {
  cancelDiceDropPlacement,
  confirmDiceDropPlacement,
  useDicePlacementPending,
} from "@/src/lib/session/dice-placement-store";
import { markDiceEntryRevealed } from "@/src/lib/session/dice-reveal-store";
import {
  clientToDropNorm,
  dropNormToTablePoint,
} from "@/src/lib/session/dice-screen-project";
import {
  computeSlingshotThrow,
  slingshotStretchRatio,
  SLINGSHOT_MAX_STRETCH_PX,
} from "@/src/lib/session/dice-slingshot";
import {
  rollMoodFromFaces,
  type DieNatHighlight,
} from "@/src/lib/session/dice-nat-highlight";
import { DiceRollMoodFx } from "./DiceRollMoodFx";
import { playDiceRollSound } from "@/src/lib/session/dice-nat-sounds";

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
  dieSides?: number[];
  seed: string;
  use3d: boolean;
  dropNx: number;
  dropNy: number;
  aimX: number;
  aimZ: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
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

function readThrowMeta(meta: Record<string, unknown>): {
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
} {
  const throwDirX =
    typeof meta.throwDirX === "number" && Number.isFinite(meta.throwDirX)
      ? meta.throwDirX
      : undefined;
  const throwDirZ =
    typeof meta.throwDirZ === "number" && Number.isFinite(meta.throwDirZ)
      ? meta.throwDirZ
      : undefined;
  const throwStrength =
    typeof meta.throwStrength === "number" && Number.isFinite(meta.throwStrength)
      ? Math.min(1, Math.max(0, meta.throwStrength))
      : undefined;
  const isTap = meta.isTap === true;
  return { throwDirX, throwDirZ, throwStrength, isTap };
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
  const originIconRef = useRef<HTMLDivElement>(null);
  const bandLineRef = useRef<SVGLineElement>(null);
  const throwLineRef = useRef<SVGLineElement>(null);
  const stretchFillRef = useRef<HTMLDivElement>(null);
  const stretchTrackRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const aimingRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
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

  // Cursor: DOM via ref — kein setState bei pointermove (verhindert Update-Depth-Loop)
  useEffect(() => {
    if (!placementId) {
      aimingRef.current = false;
      return;
    }
    const el = cursorElRef.current;
    const originEl = originIconRef.current;
    const setPos = (x: number, y: number) => {
      if (!el || aimingRef.current) return;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    if (originEl) originEl.style.opacity = "0";
    setPos(window.innerWidth * 0.5, window.innerHeight * 0.42);

    const onMove = (e: PointerEvent) => {
      if (aimingRef.current) return;
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
      aimingRef.current = false;
    };
  }, [placementId]);

  const updateAimVisual = useCallback((x: number, y: number) => {
    const ox = originRef.current.x;
    const oy = originRef.current.y;
    const pullDx = x - ox;
    const pullDy = y - oy;
    const dragPx = Math.hypot(pullDx, pullDy);
    const line = bandLineRef.current;
    if (line) {
      line.setAttribute("x1", String(ox));
      line.setAttribute("y1", String(oy));
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(y));
    }
    const throwLine = throwLineRef.current;
    if (throwLine) {
      if (dragPx < 4) {
        throwLine.setAttribute("opacity", "0");
      } else {
        const throwLen = Math.min(dragPx * 0.9, SLINGSHOT_MAX_STRETCH_PX * 0.55);
        const ndx = -pullDx / dragPx;
        const ndy = -pullDy / dragPx;
        throwLine.setAttribute("x1", String(ox));
        throwLine.setAttribute("y1", String(oy));
        throwLine.setAttribute("x2", String(ox + ndx * throwLen));
        throwLine.setAttribute("y2", String(oy + ndy * throwLen));
        throwLine.setAttribute("opacity", String(0.35 + slingshotStretchRatio(dragPx) * 0.55));
      }
    }
    const ratio = slingshotStretchRatio(dragPx);
    if (stretchFillRef.current) {
      stretchFillRef.current.style.transform = `scaleX(${ratio})`;
    }
    if (stretchTrackRef.current && dragPx > 2) {
      const throwAngle =
        (Math.atan2(-pullDy, -pullDx) * 180) / Math.PI;
      stretchTrackRef.current.style.transform = `rotate(${throwAngle}deg)`;
    }
    if (hintRef.current) {
      hintRef.current.textContent =
        ratio < 0.05
          ? "Loslassen zum Werfen"
          : `${Math.round(ratio * 100)}% Kraft`;
    }
    const ghost = cursorElRef.current;
    if (ghost) {
      ghost.style.left = `${x}px`;
      ghost.style.top = `${y}px`;
    }
  }, []);

  const finishAim = useCallback(
    (clientX: number, clientY: number) => {
      if (!placement) return;
      const aspect =
        window.innerWidth / Math.max(1, window.innerHeight);
      const throwParams = computeSlingshotThrow(
        originRef.current.x,
        originRef.current.y,
        clientX,
        clientY,
        aspect,
      );
      const { dropNx, dropNy } = clientToDropNorm(
        originRef.current.x,
        originRef.current.y,
      );
      confirmDiceDropPlacement({
        dropNx,
        dropNy,
        ...throwParams,
      });
      aimingRef.current = false;
    },
    [placement],
  );

  const handlePlacementPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!placement || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      aimingRef.current = true;
      originRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      const originEl = originIconRef.current;
      if (originEl) {
        originEl.style.left = `${e.clientX}px`;
        originEl.style.top = `${e.clientY}px`;
        originEl.style.opacity = "1";
      }
      updateAimVisual(e.clientX, e.clientY);
    },
    [placement, updateAimVisual],
  );

  const handlePlacementPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!placement || !aimingRef.current) return;
      e.preventDefault();
      updateAimVisual(e.clientX, e.clientY);
    },
    [placement, updateAimVisual],
  );

  const handlePlacementPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!placement || !aimingRef.current) return;
      e.preventDefault();
      finishAim(e.clientX, e.clientY);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [placement, finishAim],
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
      const rawDieSides = Array.isArray(meta.dieSides)
        ? (meta.dieSides as unknown[]).map((n) => Math.round(Number(n)))
        : undefined;
      const clippedFaces = faces.slice(0, 12);
      const dieSides = rawDieSides
        ?.filter((n) => Number.isFinite(n) && n >= 2)
        .slice(0, clippedFaces.length);
      if (clippedFaces.length === 0) continue;
      seenRef.current.add(entry.id);
      const { dropNx, dropNy } = readDropNorm(meta as Record<string, unknown>);
      const throwMeta = readThrowMeta(meta as Record<string, unknown>);
      const { x: aimX, z: aimZ } = dropNormToTablePoint(dropNx, dropNy, aspect);
      const all3d = (dieSides ?? [sides]).every((s) => supports3dDice(s));
      fresh.push({
        sourceId: entry.id,
        sides,
        faces: clippedFaces,
        dieSides,
        seed: typeof meta.seed === "string" ? meta.seed : entry.id,
        use3d: webgl && all3d,
        dropNx,
        dropNy,
        aimX,
        aimZ,
        ...throwMeta,
      });
    }
    if (fresh.length > 0) {
      setQueue((q) => [...q, ...fresh]);
    }
    if (staleCompleteIds.length > 0) {
      for (const id of staleCompleteIds) {
        markDiceEntryRevealed(id);
        dispatchDiceAnimComplete(id);
      }
    }
  }, [logs, webgl]);

  const revealAndDispatch = useCallback((sourceId: string) => {
    markDiceEntryRevealed(sourceId);
    dispatchDiceAnimComplete(sourceId);
  }, []);

  /** Overlay schließen — Ergebnis-Reveal passiert nur in handleAllSettled. */
  const finishActive = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    if (finishingRef.current === current.sourceId) return;
    finishingRef.current = current.sourceId;
    const sourceId = current.sourceId;
    // Falls Physik nie „settled“ gemeldet hat: trotzdem einmal freigeben.
    if (!settledOnceRef.current) {
      settledOnceRef.current = true;
      setShowResult(true);
      revealAndDispatch(sourceId);
    }
    setQueue((q) => (q[0]?.sourceId === sourceId ? q.slice(1) : q));
  }, [revealAndDispatch]);

  /** Erst wenn ALLE Würfel der Scene liegen → Chat/Sprechblase freigeben. */
  const handleAllSettled = useCallback(() => {
    if (settledOnceRef.current) return;
    settledOnceRef.current = true;
    setShowResult(true);
    const sourceId = activeRef.current?.sourceId;
    if (sourceId) revealAndDispatch(sourceId);
    window.setTimeout(finishActive, RESULT_HOLD_MS);
  }, [finishActive, revealAndDispatch]);

  const rollDurationEstimateMs = useMemo(() => {
    if (!active) return DICE_ANIMATION_DURATION_MS;
    return estimateRollDurationMs(active.throwStrength, active.isTap);
  }, [active]);

  useEffect(() => {
    finishingRef.current = null;
    settledOnceRef.current = false;
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !active) return;
    // 3D-Canvas braucht kurz zum Laden — Sound erst mit sichtbarem Wurf.
    const delayMs = active.use3d ? 450 : 0;
    const t = window.setTimeout(() => {
      playDiceRollSound(activeId, rollDurationEstimateMs);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [activeId, active, rollDurationEstimateMs]);

  useEffect(() => {
    if (!activeId) return;
    // Safety: nur force-settle — nie vor der max. Physikdauer + Canvas-Puffer.
    const canvasBootstrapMs = active?.use3d ? 1600 : 0;
    const t = window.setTimeout(() => {
      handleAllSettled();
    }, canvasBootstrapMs + DICE_PHYSICS_MAX_MS + 200);
    return () => window.clearTimeout(t);
  }, [activeId, active?.use3d, handleAllSettled]);

  const rollMood = useMemo((): DieNatHighlight | null => {
    if (!active || !showResult) return null;
    return rollMoodFromFaces(active.faces, active.sides);
  }, [active, showResult]);

  const fallbackDieLabel = useMemo(() => {
    if (!active) return "";
    if (active.faces.length === 1) return `W${active.sides}`;
    const unique = [...new Set(active.dieSides ?? [active.sides])];
    if (unique.length === 1) return `${active.faces.length}×W${unique[0]}`;
    return unique.map((s) => `W${s}`).join("+");
  }, [active]);

  const fallbackDurationMs = rollDurationEstimateMs;

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
          className="fixed inset-0 z-[70] cursor-none touch-none"
          style={{ background: "transparent" }}
          onPointerDown={handlePlacementPointerDown}
          onPointerMove={handlePlacementPointerMove}
          onPointerUp={handlePlacementPointerUp}
          onPointerCancel={handlePlacementPointerUp}
          role="presentation"
        >
          <svg
            className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
            aria-hidden
          >
            <line
              ref={bandLineRef}
              x1={0}
              y1={0}
              x2={0}
              y2={0}
              stroke="#cab926"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="6 4"
              opacity={0.85}
            />
            <line
              ref={throwLineRef}
              x1={0}
              y1={0}
              x2={0}
              y2={0}
              stroke="#379806"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0}
              markerEnd="url(#dice-throw-arrow)"
            />
            <defs>
              <marker
                id="dice-throw-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#379806" />
              </marker>
            </defs>
          </svg>

          <div
            ref={originIconRef}
            className="pointer-events-none fixed z-[71] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 opacity-0"
            style={{ willChange: "left, top, opacity" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-hero-vibrant bg-background-card/95 text-accent-gold shadow-lg ring-2 ring-hero-vibrant/30">
              <Dices className="h-7 w-7" strokeWidth={2.25} />
            </div>
          </div>

          <div
            ref={cursorElRef}
            className="pointer-events-none fixed z-[71] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{
              left: "50%",
              top: "42%",
              willChange: "left, top, transform",
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-hero-border/80 bg-background-card/75 text-accent-gold/90 shadow-md">
              <Dices className="h-6 w-6" strokeWidth={2} />
            </div>
            <div
              ref={stretchTrackRef}
              className="h-1 w-16 overflow-hidden rounded-full bg-background-dark/80"
            >
              <div
                ref={stretchFillRef}
                className="h-full w-full origin-left bg-accent-gold/80"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <span
              ref={hintRef}
              className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold drop-shadow"
            >
              {placement.count > 1
                ? `${placement.count}×W${placement.sides} · Halten & ziehen`
                : `W${placement.sides} · Halten & ziehen`}
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
            {rollMood ? <DiceRollMoodFx kind={rollMood} /> : null}

            {active.use3d ? (
              <div className="absolute inset-0">
                <DiceCanvas
                  sides={active.sides}
                  faces={active.faces}
                  dieSides={active.dieSides}
                  seed={active.seed}
                  aimX={active.aimX}
                  aimZ={active.aimZ}
                  throwDirX={active.throwDirX}
                  throwDirZ={active.throwDirZ}
                  throwStrength={active.throwStrength}
                  isTap={active.isTap}
                  onSettled={handleAllSettled}
                  showResult={showResult}
                />
              </div>
            ) : !showResult ? (
              <motion.div
                className="absolute flex flex-col items-center gap-3 rounded-md border border-hero-border bg-background-card/95 px-8 py-6 shadow-2xl"
                style={fallbackStyle}
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                onAnimationComplete={() => {
                  window.setTimeout(handleAllSettled, fallbackDurationMs);
                }}
              >
                <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
                  Würfel rollen…
                </p>
                <motion.div
                  className="font-barlow text-2xl font-extrabold text-hero-vibrant"
                  initial={{ rotate: -12, scale: 0.8 }}
                  animate={{ rotate: [0, 18, -14, 10, 0], scale: [0.85, 1.08, 1] }}
                  transition={{
                    duration: fallbackDurationMs / 1000,
                    ease: "easeOut",
                  }}
                >
                  {fallbackDieLabel}
                </motion.div>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
