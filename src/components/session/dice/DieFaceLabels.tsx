"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  faceLabelRadius,
  faceLabelSize,
  faceNormal,
  quaternionFacingOut,
} from "@/src/lib/session/dice-3d-math";

const textureCache = new Map<string, THREE.CanvasTexture>();
const _normal = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function faceTextureKey(value: number, lightDie: boolean): string {
  return `v2:${value}:${lightDie ? "L" : "D"}`;
}

/**
 * Canvas-Textur für eine Augenzahl — opaker Disk, weiße Zahl, starker Outline.
 * (v2-Cache-Key, falls alte schwache Texturen im HMR hängen.)
 */
export function getFaceNumberTexture(value: number, lightDie: boolean): THREE.CanvasTexture {
  const key = faceTextureKey(value, lightDie);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  // Voll opaker Disk — kein Alpha-Loch, das den Kontrast killt
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = lightDie ? "#0a1f10" : "#06140c";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = lightDie ? "#cab926" : "#23c763";
  ctx.lineWidth = 8;
  ctx.stroke();

  const label = String(value);
  const fontPx = value >= 10 ? 118 : 148;
  ctx.font = `900 ${fontPx}px Arial Black, Impact, Arial Narrow, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(label, cx, cy + 4);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, cx, cy + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

type DieFaceLabelsProps = {
  sides: number;
  /** Hellere Würfel (z. B. d12/d20) → dunklerer Disk. */
  lightDie?: boolean;
};

/**
 * Zahlen auf allen Faces — Kinder des Die-Groups, rotieren mit Bounce/Roll.
 * Position = echte Face-Normale × (Inradius + Pad), damit Labels nicht im Mesh liegen.
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
      const normal = faceNormal(n, value, _normal).clone();
      const position = normal.clone().multiplyScalar(radius);
      const quaternion = quaternionFacingOut(normal, _quat).clone();
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
          renderOrder={10}
          frustumCulled={false}
        >
          <planeGeometry args={[plane, plane]} />
          <meshBasicMaterial
            map={map}
            transparent
            alphaTest={0.15}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}
