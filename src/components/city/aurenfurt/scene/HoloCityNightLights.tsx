"use client";

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  type Group,
  InstancedMesh,
  Object3D,
  PointLight,
} from "three";
import { buildNightLightSpots, nightLightWorldPosition } from "../aurenfurt-night-lights";
import { HOLO_FLOAT_AMPLITUDE, useHoloFloat } from "../hooks/useHoloFloat";
import { MAP_SURFACE_Y } from "./diorama-geometry";

type Props = {
  /** Lerped 0–1 Nachtanteil (Ref, damit kein Re-Render nötig ist). */
  amountRef: MutableRefObject<number>;
  /** Dieselbe Amplitude wie CityModel — sonst lösen sich die Lichter von der schwebenden Karte. */
  floatAmplitude?: number;
};

function ignoreRaycast() {
  return null;
}

/** Weicher Lichtfleck — liegt flach auf der Stadttafel, kein Billboard. */
function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,242,210,1)");
  gradient.addColorStop(0.18, "rgba(255,210,140,0.85)");
  gradient.addColorStop(0.45, "rgba(255,160,70,0.28)");
  gradient.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const KIND_SIZE: Record<string, number> = {
  palace: 0.28,
  gate: 0.2,
  window: 0.11,
  street: 0.14,
};

/** Knapp über der Kartentextur — fest verankert, kein Schweben mit der Kamera. */
const SURFACE_LIFT = 0.006;

/**
 * Straßenlaternen / Fenster — als flache Lichtflecken auf der Tafel.
 * Keine Points/Sprites (Billboards), die bei Orbit/Damping Z-Fighten und „wandern“.
 */
export function HoloCityNightLights({
  amountRef,
  floatAmplitude = HOLO_FLOAT_AMPLITUDE,
}: Props) {
  const spots = useMemo(() => buildNightLightSpots(), []);
  const texture = useMemo(() => glowTexture(), []);
  const floatRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);
  useHoloFloat(floatRef, floatAmplitude);

  const layouts = useMemo(() => {
    return spots.map((spot) => {
      const pos = nightLightWorldPosition(spot, SURFACE_LIFT);
      const size = (KIND_SIZE[spot.kind] ?? 0.14) * spot.scale;
      if (spot.kind === "palace") tint.set("#fff1c9");
      else if (spot.kind === "gate") tint.set("#ffe0a0");
      else if (spot.kind === "window") tint.set("#ffc56e");
      else tint.set("#ffd089");
      tint.multiplyScalar(0.8 + spot.warmth * 0.25);
      return {
        x: pos.x,
        y: MAP_SURFACE_Y + SURFACE_LIFT,
        z: pos.z,
        size,
        color: tint.clone(),
      };
    });
  }, [spots, tint]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index];
      dummy.position.set(layout.x, layout.y, layout.z);
      // Flach auf der Karte (XZ), nicht kamera-zugewandt.
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(layout.size, layout.size, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, layout.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = layouts.length;
  }, [dummy, layouts]);

  useLayoutEffect(() => () => texture.dispose(), [texture]);

  const palace = useMemo(() => nightLightWorldPosition({ u: 0.5, v: 0.49 }, 0.02), []);
  const gateSouth = useMemo(() => nightLightWorldPosition({ u: 0.5, v: 0.88 }, 0.02), []);
  const gateNorth = useMemo(() => nightLightWorldPosition({ u: 0.5, v: 0.12 }, 0.02), []);
  const gateEast = useMemo(() => nightLightWorldPosition({ u: 0.78, v: 0.48 }, 0.02), []);

  useFrame((state) => {
    const nightAmount = amountRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;
    const visible = nightAmount > 0.02;
    mesh.visible = visible;
    const material = mesh.material as { opacity: number };
    // Nur sehr sanftes Flackern der Helligkeit — keine Größenänderung.
    const pulse = 0.94 + Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
    material.opacity = Math.min(1, nightAmount * 0.92) * pulse;
  });

  return (
    <group ref={floatRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, layouts.length)]}
        raycast={ignoreRaycast}
        frustumCulled={false}
        renderOrder={12}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
          fog={false}
        />
      </instancedMesh>

      <NightPointLight
        position={[palace.x, 0.42, palace.z]}
        color="#ffc978"
        distance={2.6}
        amountRef={amountRef}
        scale={1.25}
      />
      <NightPointLight
        position={[gateSouth.x, 0.32, gateSouth.z]}
        color="#ffb45a"
        distance={1.7}
        amountRef={amountRef}
        scale={0.85}
      />
      <NightPointLight
        position={[gateNorth.x, 0.32, gateNorth.z]}
        color="#ffb45a"
        distance={1.55}
        amountRef={amountRef}
        scale={0.7}
      />
      <NightPointLight
        position={[gateEast.x, 0.3, gateEast.z]}
        color="#ffd08a"
        distance={1.35}
        amountRef={amountRef}
        scale={0.5}
      />
    </group>
  );
}

function NightPointLight({
  position,
  color,
  distance,
  amountRef,
  scale,
}: {
  position: [number, number, number];
  color: string;
  distance: number;
  amountRef: MutableRefObject<number>;
  scale: number;
}) {
  const ref = useRef<PointLight>(null);
  useFrame(() => {
    if (ref.current) ref.current.intensity = amountRef.current * scale;
  });
  return (
    <pointLight ref={ref} position={position} color={color} intensity={0} distance={distance} decay={2} />
  );
}
