import {
  clientToDropNorm,
  dropNormToTablePoint,
} from "@/src/lib/session/dice-screen-project";

/** Unterhalb → Tap-Default statt Slingshot. */
export const SLINGSHOT_TAP_THRESHOLD_PX = 10;
/** Max. Zugweite (px) → Stärke = 1. */
export const SLINGSHOT_MAX_STRETCH_PX = 180;

/** Schwacher Zug → kurzes, langsames Rollen. */
export const SLINGSHOT_MIN_SPEED = 1.35;
/** Tap ohne Zug. */
export const SLINGSHOT_DEFAULT_SPEED = 3.1;
/** Voller Zug → weites, schnelles Rollen. */
export const SLINGSHOT_MAX_SPEED = 8.4;

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

  // pullVector = Richtung vom Origin weg gezogen (Release − Origin)
  const pullX = rTable.x - oTable.x;
  const pullZ = rTable.z - oTable.z;
  const tableDist = Math.hypot(pullX, pullZ);

  if (tableDist < 0.02) {
    return { isTap: true, throwStrength: 0.42 };
  }

  // throwDir = normalize(origin − pull) — entgegen Spannrichtung (Zwille)
  const throwDirX = (oTable.x - rTable.x) / tableDist;
  const throwDirZ = (oTable.z - rTable.z) / tableDist;
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
  // Leicht gekrümmt: schwache Würfe langsamer, starke deutlich schneller
  const curved = s * (0.25 + 0.75 * s);
  return (
    SLINGSHOT_MIN_SPEED +
    curved * (SLINGSHOT_MAX_SPEED - SLINGSHOT_MIN_SPEED) +
    jitter * 0.35
  );
}

/** Grobe Roll-Dauer für 2D-Fallback (strength → Reibungs-Auslauf). */
export function estimateRollDurationMs(
  strength?: number,
  isTap?: boolean,
): number {
  const speed = slingshotSpeedFromStrength(strength, isTap === true);
  return Math.min(5000, Math.max(550, Math.round(350 + speed * 340)));
}

/** 0…1 für UI-Feedback (Dehnung relativ zu Max-Stretch). */
export function slingshotStretchRatio(dragPx: number): number {
  return Math.min(1, Math.max(0, dragPx / SLINGSHOT_MAX_STRETCH_PX));
}
