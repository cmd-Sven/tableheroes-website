"use client";

import { useEffect, useMemo } from "react";
import {
  buildDieFaceMesh,
  disposeDieFaceMesh,
} from "@/src/lib/session/die-face-mesh";

type Props = {
  sides: number;
};

/**
 * Opaker Multi-Material-Würfel: Zahl als Canvas-Textur direkt auf jeder Face
 * (keine schwebenden Planes, normales depthTest).
 */
export function DieFaceMesh({ sides }: Props) {
  const n = Math.max(2, Math.round(sides));

  const meshData = useMemo(() => buildDieFaceMesh(n), [n]);

  useEffect(() => {
    return () => disposeDieFaceMesh(meshData);
  }, [meshData]);

  return (
    <mesh
      castShadow
      receiveShadow
      geometry={meshData.geometry}
      material={meshData.materials}
    />
  );
}
