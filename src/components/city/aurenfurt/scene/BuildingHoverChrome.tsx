"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SpotLight,
} from "three";

type Props = {
  name: string;
  /** Pointer über dem Gebäude. */
  hot: boolean;
  /** Auswahl — leichter Spotlight ohne Tooltip-Zwang. */
  selected?: boolean;
  /** Höhe über dem Boden / Pin. */
  y?: number;
};

function ignoreRaycast() {
  return null;
}

/**
 * Leichter Spotlight (kein Weißflash) plus Namens-Tooltip im dunklen Grün.
 * Auswahl zeigt einen weichen Lichtkegel; Hover bleibt kompakter.
 */
export function BuildingHoverChrome({ name, hot, selected = false, y = 0.42 }: Props) {
  if (!hot && !selected) return null;

  return (
    <group position={[0, y, 0]}>
      <BuildingSpotlight hot={hot} selected={selected} />
      {hot ? (
        <Html center position={[0, 0.12, 0]} zIndexRange={[120, 0]} style={{ pointerEvents: "none" }}>
          <div className="-translate-y-full whitespace-nowrap rounded border border-hero-border/70 bg-background-dark px-2.5 py-1 shadow-lg">
            <p className="font-barlow text-xs font-bold uppercase tracking-wide text-white">{name}</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function BuildingSpotlight({ hot, selected }: { hot: boolean; selected: boolean }) {
  const lightRef = useRef<SpotLight>(null);
  /** Target als Geschwister — nie Kind der SpotLight (sonst kippt die Richtung). */
  const target = useMemo(() => new Object3D(), []);
  const coneRef = useRef<Mesh>(null);
  const coneMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#a8d48a",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    [],
  );
  const strength = useRef(selected || hot ? 1 : 0);

  useLayoutEffect(() => () => coneMaterial.dispose(), [coneMaterial]);

  useLayoutEffect(() => {
    // Auf den Boden / Fußpunkt des Gebäudes zeigen (unter dem Chrome-Anker).
    target.position.set(0, -0.95, 0);
    const light = lightRef.current;
    if (light) light.target = target;
  }, [target]);

  useFrame((_, delta) => {
    const want = selected ? 1 : hot ? 0.72 : 0;
    const step = Math.min(1, delta * 5);
    strength.current += (want - strength.current) * step;
    const t = strength.current;

    const light = lightRef.current;
    if (light) {
      light.intensity = (hot ? 1.55 : 1.15) * t;
      light.distance = (hot ? 2.1 : 1.85) * (0.85 + 0.15 * t);
      light.angle = selected ? 0.38 : 0.3;
      light.penumbra = 0.72;
      light.target.updateMatrixWorld();
    }

    coneMaterial.opacity = (selected ? 0.14 : hot ? 0.08 : 0) * t;
    if (coneRef.current) coneRef.current.visible = t > 0.02 && coneMaterial.opacity > 0.01;
  });

  return (
    <group>
      <spotLight
        ref={lightRef}
        color="#a8d48a"
        intensity={hot ? 1.55 : 1.15}
        distance={hot ? 2.1 : 1.85}
        angle={selected ? 0.38 : 0.3}
        penumbra={0.72}
        decay={2}
        position={[0, 0.95, 0]}
      />
      <primitive object={target} />
      {/*
        Spotlight-Volumen: Spitze am Licht (oben), breite Basis auf dem Gebäude (unten).
        ConeGeometry hat die Spitze bei +Y — keine Flip-Rotation.
      */}
      <mesh
        ref={coneRef}
        position={[0, 0.12, 0]}
        material={coneMaterial}
        raycast={ignoreRaycast}
        visible={false}
        renderOrder={5}
      >
        <coneGeometry args={[0.4, 1.05, 20, 1, true]} />
      </mesh>
      <pointLight color="#a8d48a" intensity={hot ? 0.35 : selected ? 0.28 : 0} distance={0.55} decay={2} />
    </group>
  );
}
