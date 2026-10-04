"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DIORAMA_DEPTH, DIORAMA_WIDTH } from "./diorama-geometry";

type Controls = {
  target: THREE.Vector3;
  update: () => void;
} | null;

/** Feste Draufsicht: senkrecht von oben, ganze Stadtscheibe im Blick. */
const TOP_DOWN_HEIGHT = Math.max(
  DIORAMA_WIDTH,
  DIORAMA_DEPTH,
) * 1.15;

type Props = {
  active: boolean;
};

/**
 * Verriegelt die Kamera in senkrechter Draufsicht, solange Straßen gezeichnet werden.
 * Beim Beenden bleibt die Pose stehen — Orbit wird nur wieder freigegeben.
 */
export function StreetDrawCameraRig({ active }: Props) {
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const homeTarget = useMemo(() => new THREE.Vector3(0, 0.12, 0), []);
  const homePosition = useMemo(
    () => new THREE.Vector3(0, TOP_DOWN_HEIGHT, 0.0001),
    [],
  );
  const wasActive = useRef(false);
  const settleUntil = useRef(0);

  useEffect(() => {
    if (active && !wasActive.current) {
      settleUntil.current = performance.now() + 700;
    }
    wasActive.current = active;
  }, [active]);

  useFrame((_, delta) => {
    if (!active) return;
    const controls = get().controls as Controls;
    if (!controls?.target) return;

    const settling = performance.now() < settleUntil.current;
    if (settling) {
      const k = 1 - Math.exp(-5.5 * delta);
      controls.target.lerp(homeTarget, k);
      camera.position.lerp(homePosition, k);
    } else {
      controls.target.copy(homeTarget);
      camera.position.copy(homePosition);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(controls.target);
    controls.update();
  });

  return null;
}
