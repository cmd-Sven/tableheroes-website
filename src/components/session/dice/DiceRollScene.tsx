"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { dieColor, dieScale } from "@/src/lib/session/dice-3d-math";
import {
  buildDieTrajectory,
  DICE_PHYSICS_DURATION_MS,
  sampleTrajectory,
} from "@/src/lib/session/dice-physics";
import { DieFaceLabels } from "./DieFaceLabels";

type DieMeshProps = {
  sides: number;
  face: number;
  seed: string;
  index: number;
  count: number;
  startAt: number;
  aimX: number;
  aimZ: number;
  durationMs?: number;
  onSettled?: () => void;
};

function DieGeometry({ sides }: { sides: number }) {
  const s = Math.round(sides);
  if (s === 4) return <tetrahedronGeometry args={[1, 0]} />;
  if (s === 6) return <boxGeometry args={[1.15, 1.15, 1.15]} />;
  if (s === 8) return <octahedronGeometry args={[1, 0]} />;
  if (s === 10) return <coneGeometry args={[0.85, 1.35, 10]} />;
  if (s === 12) return <dodecahedronGeometry args={[0.95, 0]} />;
  return <icosahedronGeometry args={[1, 0]} />;
}

export function AnimatedDie({
  sides,
  face,
  seed,
  index,
  count,
  startAt,
  aimX,
  aimZ,
  durationMs = DICE_PHYSICS_DURATION_MS,
  onSettled,
}: DieMeshProps) {
  const group = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const pos = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());
  const scale = dieScale(sides);
  const color = dieColor(sides);
  const lightDie = sides >= 12;

  const frames = useMemo(
    () => buildDieTrajectory({ sides, face, seed, index, count, aimX, aimZ }),
    [sides, face, seed, index, count, aimX, aimZ],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const elapsed = performance.now() - startAt;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    const done = sampleTrajectory(frames, t, pos.current, quat.current);
    g.position.copy(pos.current);
    g.quaternion.copy(quat.current);
    g.scale.setScalar(scale);

    if (done && !settledRef.current) {
      settledRef.current = true;
      onSettled?.();
    }
  });

  return (
    <group ref={group} position={[aimX, 2.2, aimZ]}>
      <mesh castShadow receiveShadow>
        <DieGeometry sides={sides} />
        <meshStandardMaterial
          color={color}
          metalness={0.28}
          roughness={0.32}
          emissive={sides === 20 ? "#3a3208" : "#0a1f10"}
          emissiveIntensity={0.32}
        />
      </mesh>
      <DieFaceLabels sides={sides} lightDie={lightDie} />
    </group>
  );
}

type DiceSceneProps = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  aimX: number;
  aimZ: number;
  onAllSettled: () => void;
  /** Nach Landung: Total-Zeile (z. B. „17 + 3 = 20“). */
  resultLabel?: string | null;
  showResult?: boolean;
};

export function DiceRollScene({
  sides,
  faces,
  seed,
  startAt,
  aimX,
  aimZ,
  onAllSettled,
  resultLabel,
  showResult = false,
}: DiceSceneProps) {
  const settledCount = useRef(0);
  const done = useRef(false);

  function handleSettled() {
    settledCount.current += 1;
    if (!done.current && settledCount.current >= faces.length) {
      done.current = true;
      onAllSettled();
    }
  }

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 9, 3]} intensity={1.25} castShadow />
      <pointLight position={[-3, 4, -2]} intensity={0.4} color="#cab926" />
      <Html position={[aimX, 2.5, aimZ]} center style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1">
          <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold drop-shadow">
            {faces.length > 1 ? `${faces.length}×W${sides}` : `W${sides}`}
          </p>
          {showResult && resultLabel ? (
            <p className="font-barlow text-2xl font-extrabold text-hero-vibrant drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {resultLabel}
            </p>
          ) : null}
        </div>
      </Html>
      {faces.map((face, i) => (
        <AnimatedDie
          key={`${seed}-${i}-${face}`}
          sides={sides}
          face={face}
          seed={seed}
          index={i}
          count={faces.length}
          startAt={startAt}
          aimX={aimX}
          aimZ={aimZ}
          onSettled={handleSettled}
        />
      ))}
      {/* Unsichtbare Empfangsfläche — Tisch bleibt sichtbar darunter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </>
  );
}
