"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { crimeHeatColor } from "../aurenfurt-crime-heat-color";
import type { SectorCrimeCell } from "../aurenfurt-crime-heatmap";
import { createPolygonDistrictGeometry } from "./diorama-geometry";

type Props = {
  cells: SectorCrimeCell[];
  visible: boolean;
};

function buildHeatGeometry(cells: SectorCrimeCell[]) {
  const positions: number[] = [];
  const tints: number[] = [];
  const alphas: number[] = [];
  const indices: number[] = [];

  for (const cell of cells) {
    const piece = createPolygonDistrictGeometry(cell.sector.polygon);
    const position = piece.getAttribute("position");
    const pieceIndex = piece.getIndex();
    if (!position || !pieceIndex || position.count < 3) {
      piece.dispose();
      continue;
    }
    const color = crimeHeatColor(cell.crime);
    const offset = positions.length / 3;
    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      tints.push(color.r, color.g, color.b);
      alphas.push(color.opacity);
    }
    for (let index = 0; index < pieceIndex.count; index += 1) {
      indices.push(pieceIndex.getX(index) + offset);
    }
    piece.dispose();
  }

  if (positions.length < 9 || indices.length < 3) {
    return new THREE.BufferGeometry();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("tint", new THREE.Float32BufferAttribute(tints, 3));
  geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Sektorflächen der ganzen Stadt. Deckt die Viertelflächen, lässt Mauern und Orte stehen.
 * Einblenden nur über die Opacity des Materials.
 */
export function CrimeHeatmapLayer({ cells, visible }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const fade = useRef(0);
  const held = useRef<SectorCrimeCell[]>(cells);
  const hideOnce = useRef(false);
  const [present, setPresent] = useState(visible);

  if (visible && cells.length > 0) held.current = cells;

  useEffect(() => {
    if (visible) setPresent(true);
  }, [visible]);

  const drawn = visible ? cells : held.current;
  const geometry = useMemo(() => buildHeatGeometry(drawn), [drawn]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const target = visible ? 1 : 0;
    fade.current += (target - fade.current) * Math.min(1, delta * 7);
    if (Math.abs(fade.current - target) < 0.01) fade.current = target;
    material.uniforms.fade.value = fade.current;
    if (!visible && fade.current === 0) {
      if (!hideOnce.current) {
        hideOnce.current = true;
        setPresent(false);
      }
      return;
    }
    hideOnce.current = false;
  });

  const hasMesh =
    Boolean(geometry.getAttribute("position")) &&
    (geometry.getAttribute("position")?.count ?? 0) >= 3 &&
    Boolean(geometry.getIndex()) &&
    (geometry.getIndex()?.count ?? 0) >= 3;

  if (!present || drawn.length === 0 || !hasMesh) return null;

  return (
    <mesh geometry={geometry} position={[0, 0.02, 0]} renderOrder={3} raycast={() => undefined}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={{ fade: { value: fade.current } }}
        vertexShader={`
          attribute vec3 tint;
          attribute float alpha;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = tint;
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float fade;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            gl_FragColor = vec4(vColor, vAlpha * fade);
          }
        `}
      />
    </mesh>
  );
}
