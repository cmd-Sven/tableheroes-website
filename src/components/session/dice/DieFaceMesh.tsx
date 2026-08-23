"use client";

import { useEffect, useMemo } from "react";
import {
  buildDieFaceMesh,
  disposeDieFaceMesh,
  type DieFaceMeshData,
} from "@/src/lib/session/die-face-mesh";
import type { DiceSkinId } from "@/src/lib/session/dice-skins";

type Props = {
  sides: number;
  skinId?: DiceSkinId | null;
};

function safeBuildDieFaceMesh(
  sides: number,
  skinId: DiceSkinId | null,
): DieFaceMeshData {
  try {
    return buildDieFaceMesh(sides, skinId);
  } catch (err) {
    console.warn("[DieFaceMesh] Skin-Mesh fehlgeschlagen, Fallback Default:", err);
  }
  // Default-Skin (green) — darf den Canvas nicht unmounten.
  return buildDieFaceMesh(sides, null);
}

/**
 * Opaker Multi-Material-Würfel: Zahl als Canvas-Textur direkt auf jeder Face
 * (keine schwebenden Planes, normales depthTest).
 * Skins färben den 3D-Würfel — sie ersetzen ihn nicht durch Text-UI.
 */
export function DieFaceMesh({ sides, skinId = null }: Props) {
  const n = Math.max(2, Math.round(sides));

  const meshData = useMemo(
    () => safeBuildDieFaceMesh(n, skinId),
    [n, skinId],
  );

  useEffect(() => {
    const data = meshData;
    return () => {
      // Microtask: Strict-Mode Cleanup darf denselben Frame nicht mit
      // disposed Materials rendern lassen.
      queueMicrotask(() => disposeDieFaceMesh(data));
    };
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
