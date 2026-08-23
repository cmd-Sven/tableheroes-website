"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { dieScale } from "@/src/lib/session/dice-3d-math";
import {
  buildDiceTrajectories,
  DICE_PHYSICS_MAX_MS,
  sampleTrajectory,
  type DieKeyframe,
} from "@/src/lib/session/dice-physics";
import {
  dieNatHighlight,
  natHighlightLabelDe,
  type DieNatHighlight,
} from "@/src/lib/session/dice-nat-highlight";
import type { DiceSkinId } from "@/src/lib/session/dice-skins";
import { DieFaceMesh } from "./DieFaceMesh";

type DieMeshProps = {
  sides: number;
  frames: DieKeyframe[];
  index: number;
  playbackStartRef: RefObject<number>;
  aimX: number;
  aimZ: number;
  durationMs?: number;
  showResult?: boolean;
  natHighlight?: DieNatHighlight | null;
  skinId?: DiceSkinId | null;
  onSettled?: (index: number) => void;
};

function DieNatRevealBadge({ kind }: { kind: DieNatHighlight }) {
  const isCrit = kind === "crit";
  return (
    <div
      className={`pointer-events-none flex flex-col items-center gap-1 ${
        isCrit ? "animate-pulse" : ""
      }`}
      style={{ transform: "translateY(-52px)" }}
    >
      <div
        className={`rounded-full border-2 ${
          isCrit
            ? "border-accent-gold bg-accent-gold/15"
            : "border-accent-blood bg-accent-blood/20"
        }`}
        style={{
          width: 56,
          height: 56,
          boxShadow: isCrit
            ? "0 0 22px rgba(202,185,38,0.75), inset 0 0 12px rgba(202,185,38,0.25)"
            : "0 0 18px rgba(88,24,13,0.65), inset 0 0 10px rgba(88,24,13,0.3)",
        }}
      />
      <span
        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-center font-barlow text-[9px] font-bold uppercase tracking-wide drop-shadow-lg ${
          isCrit ? "text-accent-gold" : "text-accent-blood"
        }`}
      >
        {isCrit ? "⚡ " : "💀 "}
        {natHighlightLabelDe(kind)}
      </span>
    </div>
  );
}

function AnimatedDie({
  sides,
  frames,
  index,
  playbackStartRef,
  aimX,
  aimZ,
  durationMs = DICE_PHYSICS_MAX_MS,
  showResult = false,
  natHighlight = null,
  skinId = null,
  onSettled,
}: DieMeshProps) {
  const group = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const revealPhase = useRef(0);
  const pos = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());
  const scale = dieScale(sides);
  const highlight = showResult ? natHighlight : null;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const startAt = playbackStartRef.current;
    if (!startAt) return;
    const elapsed = performance.now() - startAt;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    const done = sampleTrajectory(frames, t, pos.current, quat.current);
    g.position.copy(pos.current);
    g.quaternion.copy(quat.current);

    if (highlight && done) {
      revealPhase.current += delta;
      if (highlight === "crit") {
        const pulse = 1 + 0.13 * Math.sin(revealPhase.current * 5.5);
        g.scale.setScalar(scale * pulse);
      } else {
        const damp = Math.max(0, 1 - revealPhase.current / 1.8);
        const shake = Math.sin(revealPhase.current * 24) * 0.04 * damp;
        g.position.x = pos.current.x + shake;
        g.scale.setScalar(scale * (1 - 0.04 * (1 - damp)));
      }
    } else {
      g.scale.setScalar(scale);
    }

    if (done && !settledRef.current) {
      settledRef.current = true;
      onSettled?.(index);
    }
  });

  return (
    <group ref={group} position={[aimX, 0.5, aimZ]}>
      <DieFaceMesh sides={sides} skinId={skinId} />
      {highlight === "crit" ? (
        <pointLight color="#cab926" intensity={2.4} distance={2.2} decay={2} />
      ) : null}
      {highlight === "fumble" ? (
        <pointLight color="#58180D" intensity={1.6} distance={1.8} decay={2} />
      ) : null}
      {highlight ? (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <DieNatRevealBadge kind={highlight} />
        </Html>
      ) : null}
    </group>
  );
}

type DiceSceneProps = {
  sides: number;
  faces: number[];
  dieSides?: number[];
  seed: string;
  aimX: number;
  aimZ: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
  skinId?: DiceSkinId | null;
  onAllSettled: () => void;
  showResult?: boolean;
};

export function DiceRollScene({
  sides,
  faces,
  dieSides,
  seed,
  aimX,
  aimZ,
  throwDirX,
  throwDirZ,
  throwStrength,
  isTap,
  skinId = null,
  onAllSettled,
  showResult = false,
}: DiceSceneProps) {
  const settled = useRef<Set<number>>(new Set());
  const done = useRef(false);
  const expected = faces.length;
  /** Playback-Start erst nach Trajektorie + Canvas-Mount — nicht beim Log-Enqueue. */
  const playbackStartRef = useRef(0);
  const onAllSettledRef = useRef(onAllSettled);
  onAllSettledRef.current = onAllSettled;

  const rollKey = `${seed}:${faces.join(",")}:${aimX}:${aimZ}:${throwDirX}:${throwDirZ}:${throwStrength}:${isTap}`;

  const { trajectories, durationMs } = useMemo(
    () =>
      buildDiceTrajectories({
        sides,
        faces,
        dieSides,
        seed,
        aimX,
        aimZ,
        throwDirX,
        throwDirZ,
        throwStrength,
        isTap,
      }),
    [sides, faces, dieSides, seed, aimX, aimZ, throwDirX, throwDirZ, throwStrength, isTap],
  );

  useLayoutEffect(() => {
    playbackStartRef.current = performance.now();
    settled.current.clear();
    done.current = false;

    // Wall-clock Fallback: Reveal darf nicht von useFrame/rAF abhängen (z. B. Tab-Throttle).
    const timeout = window.setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onAllSettledRef.current();
    }, durationMs + 80);

    return () => window.clearTimeout(timeout);
  }, [rollKey, durationMs]);

  const handleSettled = useCallback(
    (index: number) => {
      if (done.current) return;
      settled.current.add(index);
      if (settled.current.size >= expected) {
        done.current = true;
        onAllSettledRef.current();
      }
    },
    [expected],
  );

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 10, 1]} intensity={1.1} castShadow />
      <pointLight position={[-2, 6, -1]} intensity={0.35} color="#cab926" />
      {faces.map((face, i) => {
        const dieS = dieSides?.[i] ?? sides;
        return (
        <AnimatedDie
          key={`${seed}-${i}-${dieS}-${face}-${skinId ?? "default"}`}
          sides={dieS}
          frames={trajectories[i] ?? []}
          index={i}
          playbackStartRef={playbackStartRef}
          aimX={aimX}
          aimZ={aimZ}
          durationMs={durationMs}
          showResult={showResult}
          natHighlight={dieNatHighlight(dieS, face)}
          skinId={skinId}
          onSettled={handleSettled}
        />
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </>
  );
}
