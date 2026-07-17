"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  dieColor,
  dieScale,
  quaternionForFaceUp,
  seededTumbleAxes,
} from "@/src/lib/session/dice-3d-math";
import { DICE_ANIMATION_DURATION_MS } from "@/src/lib/session/dice-animation";

type DieMeshProps = {
  sides: number;
  face: number;
  seed: string;
  index: number;
  startAt: number;
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
  startAt,
  durationMs = DICE_ANIMATION_DURATION_MS,
  onSettled,
}: DieMeshProps) {
  const group = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const targetQ = useMemo(() => quaternionForFaceUp(sides, face), [sides, face]);
  const tumbleAxis = useMemo(() => seededTumbleAxes(seed, index), [seed, index]);
  const scale = dieScale(sides);
  const color = dieColor(sides);
  const x = (index - 0.5) * 1.85;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const elapsed = performance.now() - startAt;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    // ease-out cubic
    const ease = 1 - (1 - t) ** 3;

    const spin = (1 - ease) * Math.PI * 10 * (1 + index * 0.15);
    const tumble = new THREE.Quaternion().setFromAxisAngle(tumbleAxis, spin);
    const q = new THREE.Quaternion().copy(tumble).slerp(targetQ, ease);
    g.quaternion.copy(q);

    const bounce = Math.sin(ease * Math.PI) * 0.55 * (1 - ease);
    g.position.set(x, bounce, 0);
    g.scale.setScalar(scale * (0.92 + 0.08 * ease));

    if (t >= 1 && !settledRef.current) {
      settledRef.current = true;
      onSettled?.();
    }
  });

  return (
    <group ref={group} position={[x, 0.6, 0]}>
      <mesh castShadow receiveShadow>
        <DieGeometry sides={sides} />
        <meshStandardMaterial
          color={color}
          metalness={0.25}
          roughness={0.35}
          emissive={sides === 20 ? "#3a3208" : "#0a1f10"}
          emissiveIntensity={0.35}
        />
      </mesh>
      <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div
          className="select-none font-barlow text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
          style={{ opacity: 0.95 }}
        >
          {face}
        </div>
      </Html>
    </group>
  );
}

type DiceSceneProps = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  onAllSettled: () => void;
};

export function DiceRollScene({ sides, faces, seed, startAt, onAllSettled }: DiceSceneProps) {
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
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 3]} intensity={1.15} castShadow />
      <pointLight position={[-3, 4, -2]} intensity={0.4} color="#cab926" />
      <Html position={[0, 2.1, 0]} center style={{ pointerEvents: "none" }}>
        <p className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold drop-shadow">
          {faces.length > 1 ? `${faces.length}×W${sides}` : `W${sides}`}
        </p>
      </Html>
      {faces.map((face, i) => (
        <AnimatedDie
          key={`${seed}-${i}-${face}`}
          sides={sides}
          face={face}
          seed={seed}
          index={i}
          startAt={startAt}
          onSettled={handleSettled}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#132e1b" transparent opacity={0.55} metalness={0.1} roughness={0.9} />
      </mesh>
    </>
  );
}
