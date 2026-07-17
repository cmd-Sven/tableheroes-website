import {
  clientToDropNorm,
  dropNormToTablePoint,
} from "@/src/lib/session/dice-screen-project";

/** Unterhalb → Tap-Default statt Slingshot. */
export const SLINGSHOT_TAP_THRESHOLD_PX = 10;
/** Max. Zugweite (px) → Stärke = 1. */
export const SLINGSHOT_MAX_STRETCH_PX = 180;

export const SLINGSHOT_MIN_SPEED = 2.0;
export const SLINGSHOT_DEFAULT_SPEED = 3.45;
export const SLINGSHOT_MAX_SPEED = 5.9;

export type SlingshotThrow = {
  isTap: boolean;
  throwDirX?: number;
  throwDirZ?: number;
  /** 0…1 — skaliert Impuls-Magnitude. */
  throwStrength?: number;
};

/**
 * Viewport-Drag → Tisch-Richtung (XZ) + Stärke.
 * Wurfvektor = −Drag (Zwille: zurückziehen → loslassen entgegen dem Zug).
 */
export function computeSlingshotThrow(
  originClientX: number,
  originClientY: number,
  releaseClientX: number,
  releaseClientY: number,
  aspect = 16 / 9,
): SlingshotThrow {
  const dragPx = Math.hypot(
    releaseClientX - originClientX,
    releaseClientY - originClientY,
  );

  if (dragPx < SLINGSHOT_TAP_THRESHOLD_PX) {
    return { isTap: true, throwStrength: 0.42 };
  }

  const oNorm = clientToDropNorm(originClientX, originClientY);
  const rNorm = clientToDropNorm(releaseClientX, releaseClientY);
  const oTable = dropNormToTablePoint(oNorm.dropNx, oNorm.dropNy, aspect);
  const rTable = dropNormToTablePoint(rNorm.dropNx, rNorm.dropNy, aspect);

  const tdx = rTable.x - oTable.x;
  const tdz = rTable.z - oTable.z;
  const tableDist = Math.hypot(tdx, tdz);

  if (tableDist < 0.02) {
    return { isTap: true, throwStrength: 0.42 };
  }

  const throwDirX = -tdx / tableDist;
  const throwDirZ = -tdz / tableDist;
  const strength = Math.min(1, dragPx / SLINGSHOT_MAX_STRETCH_PX);

  return {
    isTap: false,
    throwDirX,
    throwDirZ,
    throwStrength: strength,
  };
}

/** Stärke 0…1 → Planar-Speed (mit Tap-Fallback). */
export function slingshotSpeedFromStrength(
  strength: number | undefined,
  isTap: boolean,
  jitter = 0,
): number {
  if (isTap || strength === undefined) {
    return SLINGSHOT_DEFAULT_SPEED + jitter * 0.35;
  }
  const s = Math.min(1, Math.max(0, strength));
  return (
    SLINGSHOT_MIN_SPEED +
    s * (SLINGSHOT_MAX_SPEED - SLINGSHOT_MIN_SPEED) +
    jitter * 0.4
  );
}

/** 0…1 für UI-Feedback (Dehnung relativ zu Max-Stretch). */
export function slingshotStretchRatio(dragPx: number): number {
  return Math.min(1, Math.max(0, dragPx / SLINGSHOT_MAX_STRETCH_PX));
}
