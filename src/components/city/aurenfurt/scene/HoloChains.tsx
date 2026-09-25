"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DIORAMA_DEPTH, DIORAMA_WIDTH } from "./diorama-geometry";

const LINKS_PER_CHAIN = 20;
const CHAIN_COUNT = 4 * LINKS_PER_CHAIN;

export function HoloChains() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.TorusGeometry(1, 0.22, 5, 8), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(0.085, 0.085, 0.085);
    const euler = new THREE.Euler();
    const hx = (DIORAMA_WIDTH / 2) * 0.98;
    const hz = (DIORAMA_DEPTH / 2) * 0.98;
    const corners: Array<[number, number]> = [
      [hx, hz],
      [-hx, hz],
      [hx, -hz],
      [-hx, -hz],
    ];
    let index = 0;
    for (const [x, z] of corners) {
      const len = Math.hypot(x, z) || 1;
      const ox = x / len;
      const oz = z / len;
      for (let n = 0; n < LINKS_PER_CHAIN; n += 1) {
        const t = n / (LINKS_PER_CHAIN - 1);
        position.set(x + ox * t * 0.9, 0.08 + t * 2.85, z + oz * t * 0.9);
        const yaw = Math.atan2(oz, ox);
        euler.set(n % 2 === 0 ? Math.PI / 2 : 0, yaw, n % 2 === 0 ? 0 : Math.PI / 2);
        quaternion.setFromEuler(euler);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, CHAIN_COUNT]} frustumCulled={false}>
      <meshStandardMaterial color="#b7c0c8" metalness={0.92} roughness={0.28} />
    </instancedMesh>
  );
}
