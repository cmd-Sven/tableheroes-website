"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { UvPoint } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";

type Controls = {
  target: THREE.Vector3;
  update: () => void;
} | null;

/** Feste Draufsicht: senkrecht von oben, ganze Stadtscheibe im Blick. */
export const CITY_TOP_DOWN_HEIGHT = Math.max(DIORAMA_WIDTH, DIORAMA_DEPTH) * 1.15;

export type TopDownPose = {
  target: THREE.Vector3;
  height: number;
};

type Props = {
  active: boolean;
  /** Wenn gesetzt: Zoom auf diese Pose statt ganze Stadt. */
  pose?: TopDownPose | null;
};

export function cityWideTopDownPose(): TopDownPose {
  return {
    target: new THREE.Vector3(0, 0.12, 0),
    height: CITY_TOP_DOWN_HEIGHT,
  };
}

/** Senkrechte Kamera über dem Viertel-Polygon (für Sektorauswahl). */
export function districtTopDownPose(ring: UvPoint[] | undefined | null): TopDownPose {
  if (!ring || ring.length < 3) return cityWideTopDownPose();

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let sumY = 0;

  for (const point of ring) {
    if (!Number.isFinite(point.u) || !Number.isFinite(point.v)) continue;
    const world = surfacePoint(point.u, point.v);
    minX = Math.min(minX, world.x);
    maxX = Math.max(maxX, world.x);
    minZ = Math.min(minZ, world.z);
    maxZ = Math.max(maxZ, world.z);
    sumY += world.y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return cityWideTopDownPose();

  const span = Math.max(maxX - minX, maxZ - minZ, 0.9);
  const count = ring.length;
  return {
    target: new THREE.Vector3((minX + maxX) / 2, sumY / count + 0.08, (minZ + maxZ) / 2),
    height: Math.min(CITY_TOP_DOWN_HEIGHT, span * 1.95 + 1.35),
  };
}

/**
 * Verriegelt die Kamera in senkrechter Draufsicht (Straßenzeichnen / Sektorwahl).
 * Beim Beenden bleibt die Pose stehen — Orbit wird nur wieder freigegeben.
 */
export function StreetDrawCameraRig({ active, pose = null }: Props) {
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const fallback = useMemo(() => cityWideTopDownPose(), []);
  const wasActive = useRef(false);
  const settleUntil = useRef(0);
  const poseKey = pose
    ? `${pose.target.x.toFixed(3)}:${pose.target.z.toFixed(3)}:${pose.height.toFixed(2)}`
    : "city";

  useEffect(() => {
    if (active) {
      settleUntil.current = performance.now() + (wasActive.current ? 520 : 700);
    }
    wasActive.current = active;
  }, [active, poseKey]);

  useFrame((_, delta) => {
    if (!active) return;
    const controls = get().controls as Controls;
    if (!controls?.target) return;

    const next = pose ?? fallback;
    const homePosition = new THREE.Vector3(next.target.x, next.height, next.target.z + 0.0001);
    const settling = performance.now() < settleUntil.current;

    if (settling) {
      const k = 1 - Math.exp(-5.5 * delta);
      controls.target.lerp(next.target, k);
      camera.position.lerp(homePosition, k);
    } else {
      controls.target.copy(next.target);
      camera.position.copy(homePosition);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(controls.target);
    controls.update();
  });

  return null;
}
