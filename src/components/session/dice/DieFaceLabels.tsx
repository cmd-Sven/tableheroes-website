"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  faceLabelRadius,
  faceLabelSize,
  faceNormal,
} from "@/src/lib/session/dice-3d-math";

const textureCache = new Map<string, THREE.CanvasTexture>();
const _z = new THREE.Vector3(0, 0, 1);
const _normal = new THREE.Vector3();

function faceTextureKey(value: number, lightDie: boolean): string {
  return `${value}:${lightDie ? "L" : "D"}`;
}

/** Canvas-Textur für eine Augenzahl — gecacht, hoher Kontrast. */
export function getFaceNumberTexture(value: number, lightDie: boolean): THREE.CanvasTexture {
  const key = faceTextureKey(value, lightDie);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);

  // Dunkler/heller Disk für Lesbarkeit auf dem Mesh
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = lightDie ? "rgba(10, 31, 16, 0.82)" : "rgba(8, 20, 12, 0.55)";
  ctx.fill();

  const label = String(value);
  const fontPx = value >= 10 ? 58 : 72;
  ctx.font = `800 ${fontPx}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Outline für Kontrast
  ctx.lineWidth = 6;
  ctx.strokeStyle = lightDie ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.9)";
  ctx.strokeText(label, size / 2, size / 2 + 2);

  ctx.fillStyle = lightDie ? "#f5f0d8" : "#ffffff";
  ctx.fillText(label, size / 2, size / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

type DieFaceLabelsProps = {
  sides: number;
  /** Hellere Würfel (z. B. d12/d20) → dunklerer Disk / hellere Zahl. */
  lightDie?: boolean;
};

/**
 * Zahlen auf allen Faces — Kinder des Die-Groups, rotieren mit Bounce/Roll.
 * Positionen folgen denselben Normalen wie `quaternionForFaceUp` (Server-Face oben).
 */
export function DieFaceLabels({ sides, lightDie = false }: DieFaceLabelsProps) {
  const n = Math.max(2, Math.round(sides));
  const radius = faceLabelRadius(n);
  const plane = faceLabelSize(n);

  const faces = useMemo(() => {
    const list: {
      value: number;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      map: THREE.CanvasTexture;
    }[] = [];
    for (let value = 1; value <= n; value++) {
      const normal = faceNormal(n, value, _normal);
      const position = normal.clone().multiplyScalar(radius);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(_z, normal.clone());
      list.push({
        value,
        position,
        quaternion,
        map: getFaceNumberTexture(value, lightDie),
      });
    }
    return list;
  }, [n, radius, lightDie]);

  return (
    <group>
      {faces.map(({ value, position, quaternion, map }) => (
        <mesh
          key={value}
          position={position}
          quaternion={quaternion}
          renderOrder={2}
        >
          <planeGeometry args={[plane, plane]} />
          <meshBasicMaterial
            map={map}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
