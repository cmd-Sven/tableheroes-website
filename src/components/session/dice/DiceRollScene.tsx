"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { dieScale } from "@/src/lib/session/dice-3d-math";
import {
  buildDiceTrajectories,
  DICE_PHYSICS_DURATION_MS,
  sampleTrajectory,
  type DieKeyframe,
} from "@/src/lib/session/dice-physics";
import { DieFaceMesh } from "./DieFaceMesh";

type DieMeshProps = {
  sides: number;
  frames: DieKeyframe[];
  index: number;
  startAt: number;
  aimX: number;
  aimZ: number;
  durationMs?: number;
  onSettled?: (index: number) => void;
};

function AnimatedDie({
  sides,
  frames,
  index,
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
      onSettled?.(index);
    }
  });

  return (
    <group ref={group} position={[aimX, 0.5, aimZ]}>
      <DieFaceMesh sides={sides} />
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
  const settled = useRef<Set<number>>(new Set());
  const done = useRef(false);
  const expected = faces.length;

  const trajectories = useMemo(
    () => buildDiceTrajectories({ sides, faces, seed, aimX, aimZ }),
    [sides, faces, seed, aimX, aimZ],
  );

  const handleSettled = useCallback(
    (index: number) => {
      if (done.current) return;
      settled.current.add(index);
      if (settled.current.size >= expected) {
        done.current = true;
        onAllSettled();
      }
    },
    [expected, onAllSettled],
  );

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 10, 1]} intensity={1.1} castShadow />
      <pointLight position={[-2, 6, -1]} intensity={0.35} color="#cab926" />
      <Html position={[aimX, 0.15, aimZ]} center style={{ pointerEvents: "none" }}>
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
          frames={trajectories[i] ?? []}
          index={i}
          startAt={startAt}
          aimX={aimX}
          aimZ={aimZ}
          onSettled={handleSettled}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </>
  );
}
