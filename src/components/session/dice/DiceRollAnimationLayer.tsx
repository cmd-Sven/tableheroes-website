/**
 * DiceRollAnimationLayer — 3D dice roll overlay (no interruptive W20 text modal).
 * If 3D is unavailable, settles silently after the estimated roll duration.
 */
"use client";

import { useEffect, type ComponentType } from "react";
import { DiceRollMoodFx } from "./DiceRollMoodFx";
import type { DieNatHighlight } from "@/src/lib/session/dice-nat-highlight";
import type { ActiveRoll } from "./dice-roll-overlay.utils";

type DiceCanvasProps = {
  sides: number;
  faces: number[];
  dieSides?: number[];
  seed: string;
  aimX: number;
  aimZ: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
  skinId?: ActiveRoll["skinId"];
  onSettled: () => void;
  showResult: boolean;
  onContextLost: () => void;
};

export type DiceRollAnimationLayerProps = {
  active: ActiveRoll;
  show3d: boolean;
  showResult: boolean;
  rollMood: DieNatHighlight | null;
  fallbackDurationMs: number;
  onAllSettled: () => void;
  onCanvasFailed: () => void;
  DiceCanvas: ComponentType<DiceCanvasProps>;
};

export function DiceRollAnimationLayer({
  active,
  show3d,
  showResult,
  rollMood,
  fallbackDurationMs,
  onAllSettled,
  onCanvasFailed,
  DiceCanvas,
}: DiceRollAnimationLayerProps) {
  // Kein Text-Modal (z. B. „W20“): bei fehlendem 3D nur still settle + Chat/Bubble freigeben.
  useEffect(() => {
    if (show3d) return;
    const t = window.setTimeout(onAllSettled, Math.max(400, fallbackDurationMs));
    return () => window.clearTimeout(t);
  }, [show3d, fallbackDurationMs, onAllSettled, active.sourceId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {rollMood ? <DiceRollMoodFx kind={rollMood} /> : null}

      {show3d ? (
        // Plain div — kein Framer-transform (sonst misst R3F oft 0×0).
        <div className="absolute inset-0 h-full w-full">
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
            skinId={active.skinId}
            onSettled={onAllSettled}
            showResult={showResult}
            onContextLost={onCanvasFailed}
          />
        </div>
      ) : null}
    </div>
  );
}
