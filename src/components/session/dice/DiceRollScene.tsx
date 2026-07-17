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

type DieMeshProps = {
  sides: number;
  face: number;
  seed: string;
  index: number;
  count: number;
  startAt: number;
  durationMs?: number;
  onSettled?: () => void;
  showFaceLabel: boolean;
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
  durationMs = DICE_PHYSICS_DURATION_MS,
  onSettled,
  showFaceLabel,
}: DieMeshProps) {
  const group = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const pos = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());
  const scale = dieScale(sides);
  const color = dieColor(sides);

  const frames = useMemo(
    () => buildDieTrajectory({ sides, face, seed, index, count }),
    [sides, face, seed, index, count],
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
    <group ref={group} position={[0, 1.5, 0]}>
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
      {showFaceLabel ? (
        <Html center distanceFactor={5.5} style={{ pointerEvents: "none" }}>
          <div className="select-none font-barlow text-2xl font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {face}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

type DiceSceneProps = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
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
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 9, 3]} intensity={1.2} castShadow />
      <pointLight position={[-3, 4, -2]} intensity={0.45} color="#cab926" />
      <Html position={[0, 2.35, 0]} center style={{ pointerEvents: "none" }}>
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
          onSettled={handleSettled}
          showFaceLabel={showResult}
        />
      ))}
      {/* Tischfläche */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[7.2, 5.2]} />
        <meshStandardMaterial
          color="#0f2416"
          metalness={0.08}
          roughness={0.92}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <ringGeometry args={[2.4, 3.05, 64]} />
        <meshStandardMaterial color="#217d42" transparent opacity={0.35} roughness={0.8} />
      </mesh>
    </>
  );
}
