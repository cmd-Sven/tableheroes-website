"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

/** Gemeinsame Schwebe-Parameter — Karte und Nachtlichter müssen identisch sein. */
export const HOLO_FLOAT_SPEED = 0.65;
export const HOLO_FLOAT_AMPLITUDE = 0.055;

export function holoFloatY(elapsedTime: number, amplitude = HOLO_FLOAT_AMPLITUDE) {
  if (amplitude <= 0) return 0;
  return Math.sin(elapsedTime * HOLO_FLOAT_SPEED) * amplitude;
}

export function useHoloFloat(
  group: RefObject<Group | null>,
  amplitude = HOLO_FLOAT_AMPLITUDE,
) {
  useFrame((state) => {
    if (!group.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const nextY = holoFloatY(state.clock.elapsedTime, amplitude);
    if (group.current.position.y !== nextY) group.current.position.y = nextY;
  });
}
