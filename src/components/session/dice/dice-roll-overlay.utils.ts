/**
 * dice-roll-overlay.utils — Helpers and types for the dice roll overlay.
 */
import type { DiceSkinId } from "@/src/lib/session/dice-skins";

/** Kurz nach Landung Total anzeigen, bevor Overlay schließt. */
export const RESULT_HOLD_MS = 900;

export type ActiveRoll = {
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
  skinId?: DiceSkinId | null;
};

export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    // Kein WEBGL_lose_context — loseContext() kann den nächsten echten
    // Dice-Canvas auf manchen GPUs sofort mit contextlost killen.
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl");
    if (!gl || typeof (gl as WebGLRenderingContext).getExtension !== "function") {
      return false;
    }
    // Canvas verwerfen; GC gibt den Kontext frei (ohne loseContext-Poisoning).
    canvas.width = 0;
    canvas.height = 0;
    return true;
  } catch {
    return false;
  }
}

export function readThrowMeta(meta: Record<string, unknown>): {
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

export function readDropNorm(meta: Record<string, unknown>): { dropNx: number; dropNy: number } {
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
