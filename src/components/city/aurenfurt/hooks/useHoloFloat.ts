"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

export function useHoloFloat(group: RefObject<Group | null>, amplitude = 0.055) {
  useFrame((state) => {
    if (!group.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (amplitude <= 0) {
      if (group.current.position.y !== 0) group.current.position.y = 0;
      return;
    }
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * amplitude;
  });
}
