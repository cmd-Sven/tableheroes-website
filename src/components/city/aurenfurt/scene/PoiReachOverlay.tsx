"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { PoiReachCell } from "../aurenfurt-sector-reach";
import { createPolygonDistrictGeometry } from "./diorama-geometry";

type Props = {
  cells: PoiReachCell[];
  visible: boolean;
};

const REACH_COLOR = "#cab926";

function opacityForDistance(distance: number) {
  if (distance <= 0) return 0.55;
  if (distance === 1) return 0.38;
  return 0.22;
}

/**
 * Transparente Sektorflächen für den Einflussbereich eines besonderen Orts.
 * Leicht über die Viertelfläche gehoben (wie die Crime-Heatmap), sonst z-fightet
 * das Gold unsichtbar mit dem Diorama. Ohne Raycast bleibt die Karte bedienbar.
 */
export function PoiReachOverlay({ cells, visible }: Props) {
  const meshes = useMemo(() => {
    return cells
      .filter((cell) => Array.isArray(cell.sector.polygon) && cell.sector.polygon.length >= 3)
      .map((cell) => ({
        id: cell.sector.id,
        geometry: createPolygonDistrictGeometry(cell.sector.polygon),
        opacity: opacityForDistance(cell.distance),
      }));
  }, [cells]);

  useEffect(
    () => () => {
      for (const mesh of meshes) mesh.geometry.dispose();
    },
    [meshes],
  );

  if (!visible || meshes.length === 0) return null;

  return (
    <group position={[0, 0.012, 0]}>
      {meshes.map((mesh) => (
        <mesh key={mesh.id} geometry={mesh.geometry} renderOrder={6} raycast={() => undefined}>
          <meshBasicMaterial
            color={REACH_COLOR}
            transparent
            opacity={mesh.opacity}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
