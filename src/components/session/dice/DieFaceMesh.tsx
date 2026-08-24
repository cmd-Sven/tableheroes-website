"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildDieFaceMesh,
  disposeDieFaceMesh,
  type DieFaceMeshData,
} from "@/src/lib/session/die-face-mesh";
import { getDiceSkin, type DiceSkinId } from "@/src/lib/session/dice-skins";

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
  return buildDieFaceMesh(sides, null);
}

/**
 * Opaker Multi-Material-Würfel: Zahl als Canvas-Textur direkt auf jeder Face
 * (keine schwebenden Planes, normales depthTest).
 * Skins färben den 3D-Würfel — sie ersetzen ihn nicht durch Text-UI.
 */
export function DieFaceMesh({ sides, skinId = null }: Props) {
  const n = Math.max(2, Math.round(sides));
  const pattern = getDiceSkin(skinId).pattern;
  const meshRef = useRef<THREE.Mesh>(null);
  const swirlPhase = useRef(0);

  const meshData = useMemo(
    () => safeBuildDieFaceMesh(n, skinId),
    [n, skinId],
  );

  useEffect(() => {
    const data = meshData;
    return () => {
      queueMicrotask(() => disposeDieFaceMesh(data));
    };
  }, [meshData]);

  useFrame((_, delta) => {
    if (pattern !== "void-swirl") return;
    const mesh = meshRef.current;
    if (!mesh) return;

    swirlPhase.current += delta;
    const t = swirlPhase.current;
    const offset = t * 0.035;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of materials) {
      if (!(raw instanceof THREE.MeshStandardMaterial)) continue;
      // Nur Albedo (Swirl) verschieben — emissiveMap (Zahl) bleibt UV-fixiert mittig.
      if (raw.map) {
        raw.map.offset.set(offset % 1, (offset * 0.75) % 1);
      }
      if (raw.emissiveMap) {
        raw.emissiveIntensity = 0.82 + 0.14 * Math.sin(t * 2.2);
      } else {
        raw.emissive.set("#4a2080");
        raw.emissiveIntensity = 0.14 + 0.1 * Math.sin(t * 2.2);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      geometry={meshData.geometry}
      material={meshData.materials}
    />
  );
}
