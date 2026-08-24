"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { rollMoodFromFaces, type DieNatHighlight } from "@/src/lib/session/dice-nat-highlight";
import { playDiceRollSound } from "@/src/lib/session/dice-nat-sounds";
import { parseDiceSkinId } from "@/src/lib/session/dice-skins";
import {
  detectWebGL,
  readDropNorm,
  readThrowMeta,
  RESULT_HOLD_MS,
  type ActiveRoll,
} from "./dice-roll-overlay.utils";
import { DiceRollPlacementLayer } from "./DiceRollPlacementLayer";
import { DiceRollAnimationLayer, type DiceRollAnimationLayerProps } from "./DiceRollAnimationLayer";

const DiceCanvas = dynamic(() => import("./DiceRollCanvas"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  logs: SessionActivityEntry[];
};

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
  /** Optimistic: 3D zuerst. Nur bei bestätigtem WebGL-Fail → Text-Fallback. */
  const [webgl, setWebgl] = useState(true);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const placement = useDicePlacementPending();
  const placementId = placement?.id ?? null;
  const active = queue[0] ?? null;
  const activeId = active?.sourceId ?? null;
  activeRef.current = active;

  useEffect(() => {
    // Probe nur einmal; Context sofort freigeben (siehe detectWebGL).
    const ok = detectWebGL();
    if (!ok) setWebgl(false);
  }, []);

  useEffect(() => {
    setCanvasFailed(false);
  }, [activeId]);

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
      const sidesFor3d = dieSides && dieSides.length > 0 ? dieSides : [sides];
      const all3d = sidesFor3d.every((s) => supports3dDice(s));
      fresh.push({
        sourceId: entry.id,
        sides,
        faces: clippedFaces,
        dieSides,
        seed: typeof meta.seed === "string" ? meta.seed : entry.id,
        // Skins dürfen 3D nicht abschalten — nur fehlendes WebGL / unstützte Polyeder.
        use3d: webgl && all3d,
        dropNx,
        dropNy,
        aimX,
        aimZ,
        skinId: parseDiceSkinId(meta.diceSkin),
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

  const show3d = Boolean(active?.use3d && !canvasFailed);

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
    const delayMs = show3d ? 450 : 0;
    const t = window.setTimeout(() => {
      playDiceRollSound(activeId, rollDurationEstimateMs);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [activeId, active, show3d, rollDurationEstimateMs]);

  // Kein erzwungenes 2D-„W20“-Modal mehr: unterbricht sonst den laufenden 3D-Wurf.

  useEffect(() => {
    if (!activeId) return;
    // Safety: nur force-settle — nie vor der max. Physikdauer + Canvas-Puffer.
    const canvasBootstrapMs = show3d && !canvasFailed ? 1600 : 0;
    const t = window.setTimeout(() => {
      handleAllSettled();
    }, canvasBootstrapMs + DICE_PHYSICS_MAX_MS + 200);
    return () => window.clearTimeout(t);
  }, [activeId, show3d, canvasFailed, handleAllSettled]);

  const rollMood = useMemo((): DieNatHighlight | null => {
    if (!active || !showResult) return null;
    return rollMoodFromFaces(active.faces, active.sides);
  }, [active, showResult]);

  const fallbackDurationMs = rollDurationEstimateMs;

  return (
    <>
      {placement ? (
        <DiceRollPlacementLayer
          placement={placement}
          bandLineRef={bandLineRef}
          throwLineRef={throwLineRef}
          originIconRef={originIconRef}
          cursorElRef={cursorElRef}
          stretchFillRef={stretchFillRef}
          stretchTrackRef={stretchTrackRef}
          hintRef={hintRef}
          onPointerDown={handlePlacementPointerDown}
          onPointerMove={handlePlacementPointerMove}
          onPointerUp={handlePlacementPointerUp}
        />
      ) : null}

      {active ? (
        <DiceRollAnimationLayer
          active={active}
          show3d={show3d}
          showResult={showResult}
          rollMood={rollMood}
          fallbackDurationMs={fallbackDurationMs}
          onAllSettled={handleAllSettled}
          onCanvasFailed={() => setCanvasFailed(true)}
          DiceCanvas={DiceCanvas as DiceRollAnimationLayerProps["DiceCanvas"]}
        />
      ) : null}
    </>
  );
}
