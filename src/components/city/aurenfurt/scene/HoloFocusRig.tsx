"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { findBuilding } from "../aurenfurt-districts";
import { surfacePoint } from "./diorama-geometry";

type Controls = { target: THREE.Vector3 } | null;

type Props = {
  selectedId: string | null;
};

export function HoloFocusRig({ selectedId }: Props) {
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const home = useMemo(() => new THREE.Vector3(0, 0.12, 0), []);
  const focus = useMemo(() => {
    const building = findBuilding(selectedId);
    return building ? surfacePoint(building.u, building.v) : null;
  }, [selectedId]);
  const until = useRef(0);

  useEffect(() => {
    until.current = performance.now() + 1300;
  }, [selectedId]);

  useFrame((_, delta) => {
    const controls = get().controls as Controls;
    if (!controls?.target) return;
    const settling = performance.now() < until.current;
    const dest = focus ?? home;
    if (focus || settling) {
      const k = 1 - Math.exp(-3.2 * delta);
      controls.target.lerp(dest, k);
    }
    if (!settling) return;
    const offset = camera.position.clone().sub(controls.target);
    const dist = offset.length();
    if (dist < 0.001) return;
    const desired = focus ? 3.5 : 6.3;
    offset.setLength(THREE.MathUtils.damp(dist, desired, 2.5, delta));
    camera.position.copy(controls.target).add(offset);
  });

  return null;
}
