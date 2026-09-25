"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

export function useHoloFloat(group: RefObject<Group | null>, amplitude = 0.055) {
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * amplitude;
  });
}
